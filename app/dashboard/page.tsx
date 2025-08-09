"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { TherapistMetrics } from "@/components/dashboard/TherapistMetrics"
import ContactRequestsTable from "@/components/dashboard/ContactRequestsTable"
import PaymentNotifications from "@/components/dashboard/PaymentNotifications"
import { toast } from "@/hooks/use-toast"

interface ContactRequest {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  message?: string;
  status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'scheduled' | 'closed';
  created_at: string;
  rejection_reason?: string;
  response_time_hours?: number;
}

interface TherapistProfile {
  user_id: string;
  full_name: string;
  role: string;
  ranking_points: number;
  total_sessions: number;
  churn_rate_monthly: number;
}

interface TherapistMetricsData {
  averageResponseTime: number;
  churnRate: number;
  totalSessions: number;
  bimonthlyCommission: number;
  rankingPoints: number;
  hasGreenDot: boolean;
}

interface PaymentNotification {
  id: string;
  title: string;
  message: string;
  type: 'payment_warning' | 'ranking_update' | 'suspension_warning' | 'success' | 'info';
  is_read: boolean;
  created_at: string;
}

interface PaymentStatus {
  hasPendingPayments: boolean;
  daysOverdue: number;
  nextPaymentDue: string;
  suspensionRisk: boolean;
  rankingChange?: {
    previous: number;
    current: number;
    change: number;
  };
}

export default function TherapistDashboardPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TherapistProfile | null>(null)
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [metrics, setMetrics] = useState<TherapistMetricsData | null>(null)
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      
      await loadData(session.user.id)
      setLoading(false)

      // Set up real-time subscriptions for automatic updates
      const contactRequestsChannel = supabase
        .channel('contact_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contact_requests',
            filter: `therapist_id=eq.${session.user.id}`
          },
          () => {
            // Refresh data when contact requests change
            loadData(session.user.id)
          }
        )
        .subscribe()

      const sessionsChannel = supabase
        .channel('sessions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `therapist_id=eq.${session.user.id}`
          },
          () => {
            // Refresh data when sessions change
            loadData(session.user.id)
          }
        )
        .subscribe()

      const metricsChannel = supabase
        .channel('metrics_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'therapist_metrics',
            filter: `therapist_id=eq.${session.user.id}`
          },
          () => {
            // Refresh data when metrics change
            loadData(session.user.id)
          }
        )
        .subscribe()

      const notificationsChannel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'therapist_notifications',
            filter: `therapist_id=eq.${session.user.id}`
          },
          () => {
            // Refresh data when notifications change
            loadData(session.user.id)
          }
        )
        .subscribe()

      // Set up periodic refresh every 30 seconds for additional data freshness
      const refreshInterval = setInterval(() => {
        loadData(session.user.id)
      }, 30000)

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(contactRequestsChannel)
        supabase.removeChannel(sessionsChannel)
        supabase.removeChannel(metricsChannel)
        supabase.removeChannel(notificationsChannel)
        clearInterval(refreshInterval)
      }
    }
    
    const cleanup = init()
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn()
      })
    }
  }, [])

  const loadData = async (userId: string) => {
    try {
      // Load profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single()
      
      // Load therapist data
      const { data: therapistData } = await supabase
        .from("therapists")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (therapistData) {
        setProfile({
          user_id: userId,
          full_name: therapistData.full_name || prof?.full_name || "",
          role: prof?.role || "therapist",
          ranking_points: therapistData.ranking_points || 50,
          total_sessions: therapistData.total_sessions || 0,
          churn_rate_monthly: therapistData.churn_rate_monthly || 0
        })
      }

      // Load contact requests
      const { data: cr } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("therapist_id", userId)
        .order("created_at", { ascending: false })
      setRequests(cr || [])

      // Load metrics data
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01"
      const { data: metricsData } = await supabase
        .from("therapist_metrics")
        .select("*")
        .eq("therapist_id", userId)
        .eq("month_year", currentMonth)
        .single()

      // Calculate bimonthly sessions for commission
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      const { count: bimonthlySessionCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("therapist_id", userId)
        .gte("created_at", twoMonthsAgo.toISOString())

      // Check for recent ranking bonuses (green dot)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: recentBonuses } = await supabase
        .from("therapist_ranking_history")
        .select("*")
        .eq("therapist_id", userId)
        .eq("change_type", "payment_bonus")
        .gte("created_at", thirtyDaysAgo.toISOString())

      setMetrics({
        averageResponseTime: metricsData?.average_response_time_hours || 0,
        churnRate: metricsData?.churn_rate_monthly || therapistData?.churn_rate_monthly || 0,
        totalSessions: therapistData?.total_sessions || 0,
        bimonthlyCommission: (bimonthlySessionCount || 0) * 6,
        rankingPoints: therapistData?.ranking_points || 50,
        hasGreenDot: (recentBonuses && recentBonuses.length > 0) || false
      })

      // Load notifications
      const { data: notificationData } = await supabase
        .from("therapist_notifications")
        .select("*")
        .eq("therapist_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10)
      setNotifications(notificationData || [])

      // Load payment status
      const { data: pendingPayments } = await supabase
        .from("therapist_payments")
        .select("*")
        .eq("therapist_id", userId)
        .in("status", ["pending", "overdue"])
        .order("payment_due_date", { ascending: true })

      if (pendingPayments && pendingPayments.length > 0) {
        const nextPayment = pendingPayments[0]
        const dueDate = new Date(nextPayment.payment_due_date)
        const now = new Date()
        const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

        setPaymentStatus({
          hasPendingPayments: true,
          daysOverdue,
          nextPaymentDue: nextPayment.payment_due_date,
          suspensionRisk: daysOverdue > 3
        })
      } else {
        setPaymentStatus({
          hasPendingPayments: false,
          daysOverdue: 0,
          nextPaymentDue: "",
          suspensionRisk: false
        })
      }

    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status: "accepted" })
        .eq("id", requestId)

      if (error) throw error

      // Refresh data
      const session = await supabase.auth.getSession()
      if (session.data.session) {
        await loadData(session.data.session.user.id)
      }

      toast({
        title: "Success",
        description: "Client request accepted successfully",
        variant: "default"
      })
    } catch (error) {
      console.error("Error accepting request:", error)
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive"
      })
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ 
          status: "rejected",
          rejection_reason: reason
        })
        .eq("id", requestId)

      if (error) throw error

      // Refresh data
      const session = await supabase.auth.getSession()
      if (session.data.session) {
        await loadData(session.data.session.user.id)
      }

      toast({
        title: "Request Rejected",
        description: "Client request has been rejected",
        variant: "default"
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive"
      })
    }
  }

  const handleScheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) {
        throw new Error("Request not found")
      }

      if (!profile?.user_id) {
        throw new Error("User profile not loaded")
      }

      // Update request status to scheduled
      const { error: updateError } = await supabase
        .from("contact_requests")
        .update({ status: "scheduled" })
        .eq("id", requestId)

      if (updateError) {
        console.error("Update error:", updateError)
        throw new Error(`Failed to update request: ${updateError.message}`)
      }

      // Create session record
      const { error: sessionError, data: sessionData } = await supabase
        .from("sessions")
        .insert({
          therapist_id: profile.user_id,
          client_email: request.client_email,
          client_name: request.client_name,
          session_date: sessionIsoDateTime,
          duration_minutes: 60,
          price: 100,
          status: "scheduled"
        })
        .select()

      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error(`Failed to create session: ${sessionError.message}`)
      }

      console.log("Session created successfully:", sessionData)

      // Force refresh data to update stats
      await loadData(profile.user_id)

      toast({
        title: "Session Scheduled",
        description: "Session has been created for this client. Your metrics will update shortly.",
        variant: "default"
      })
    } catch (error: any) {
      console.error("Error scheduling session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session",
        variant: "destructive"
      })
    }
  }

  const handleRescheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) {
        throw new Error("Request not found")
      }

      // Create a new session record for the reschedule
      const { error: sessionError, data: sessionData } = await supabase
        .from("sessions")
        .insert({
          therapist_id: profile?.user_id,
          client_email: request.client_email,
          client_name: request.client_name,
          session_date: sessionIsoDateTime,
          duration_minutes: 60,
          price: 100,
          status: "scheduled"
        })
        .select()

      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error(`Failed to create new session: ${sessionError.message}`)
      }

      console.log("Reschedule session created successfully:", sessionData)

      // Force refresh data to update stats
      if (profile?.user_id) {
        await loadData(profile.user_id)
      }

      toast({
        title: "Session Rescheduled",
        description: "A new session has been scheduled for this client.",
        variant: "default"
      })
    } catch (error: any) {
      console.error("Error rescheduling session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule session",
        variant: "destructive"
      })
    }
  }

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("therapist_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleDismissAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from("therapist_notifications")
        .update({ is_read: true })
        .eq("therapist_id", profile?.user_id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications([])
    } catch (error) {
      console.error("Error dismissing notifications:", error)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Therapist Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {profile?.full_name}</p>
          </div>
          <Button 
            className="bg-[#056DBA] hover:bg-[#045A99] text-white" 
            onClick={() => router.push("/dashboard/profile")}
          >
            Edit Profile
          </Button>
        </div>

        <div className="space-y-6">
          {/* Payment Notifications */}
          {paymentStatus && (
            <PaymentNotifications
              notifications={notifications}
              paymentStatus={paymentStatus}
              onMarkAsRead={handleMarkNotificationAsRead}
              onDismissAll={handleDismissAllNotifications}
            />
          )}

          {/* Metrics Dashboard */}
          {metrics && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Metrics</h2>
              <TherapistMetrics metrics={metrics} />
            </div>
          )}

          {/* Profile Summary */}
          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  My Profile
                  {paymentStatus?.hasPendingPayments && paymentStatus.daysOverdue > 0 && (
                    <div className="w-3 h-3 bg-red-500 rounded-full" title="Payment overdue"></div>
                  )}
                  {metrics?.hasGreenDot && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Recent payment bonus earned!"></div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{profile?.full_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium capitalize">{profile?.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ranking:</span>
                    <span className="font-medium">{profile?.ranking_points}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sessions:</span>
                    <span className="font-medium">{profile?.total_sessions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Requests Table */}
            <div className="lg:col-span-3">
              <ContactRequestsTable
                requests={requests}
                onAcceptRequest={handleAcceptRequest}
                onRejectRequest={handleRejectRequest}
                onScheduleSession={handleScheduleSession}
                onRescheduleSession={handleRescheduleSession}
              />
            </div>
          </div>
        </div>
    </div>
  )
}


