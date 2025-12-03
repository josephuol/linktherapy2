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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

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

interface SessionRow {
  id: string;
  therapist_id: string;
  client_name: string | null;
  client_email: string | null;
  session_date: string;
  duration_minutes: number | null;
  price: number | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | string;
  rescheduled_from: string | null;
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
  const [upcomingSessions, setUpcomingSessions] = useState<SessionRow[]>([])
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null)
  const [newSessionDate, setNewSessionDate] = useState("")
  const [newSessionTime, setNewSessionTime] = useState("")
  const timeOptions = Array.from({ length: (20 - 8) * 2 + 1 }, (_, i) => {
    const totalMinutes = (8 * 60) + i * 30
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mm = String(totalMinutes % 60).padStart(2, '0')
    return `${hh}:${mm}`
  })
  const [rescheduleReason, setRescheduleReason] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      await loadData(session.user.id)
      setLoading(false)
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
          () => { loadData(session.user.id) }
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
          () => { loadData(session.user.id) }
        )
        .subscribe()
      const therapistsChannel = supabase
        .channel('therapists_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'therapists',
            filter: `user_id=eq.${session.user.id}`
          },
          () => { loadData(session.user.id) }
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
          () => { loadData(session.user.id) }
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
          () => { loadData(session.user.id) }
        )
        .subscribe()
      const refreshInterval = setInterval(() => { loadData(session.user.id) }, 30000)
      return () => {
        supabase.removeChannel(contactRequestsChannel)
        supabase.removeChannel(sessionsChannel)
        supabase.removeChannel(therapistsChannel)
        supabase.removeChannel(metricsChannel)
        supabase.removeChannel(notificationsChannel)
        clearInterval(refreshInterval)
      }
    }
    const cleanup = init()
    return () => { cleanup.then(fn => { if (fn) fn() }) }
  }, [])

  const loadData = async (userId: string) => {
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", userId).single()
      const { data: therapistData } = await supabase.from("therapists").select("*").eq("user_id", userId).single()
      // Always set profile, even if therapistData doesn't exist yet
      setProfile({
        user_id: userId,
        full_name: therapistData?.full_name || prof?.full_name || "",
        role: prof?.role || "therapist",
        ranking_points: therapistData?.ranking_points || 50,
        total_sessions: therapistData?.total_sessions || 0,
        churn_rate_monthly: therapistData?.churn_rate_monthly || 0
      })
      const { data: cr } = await supabase.from("contact_requests").select("*").eq("therapist_id", userId).order("created_at", { ascending: false })
      setRequests(cr || [])
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01"
      const { data: metricsData } = await supabase.from("therapist_metrics").select("*").eq("therapist_id", userId).eq("month_year", currentMonth).single()
      const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      const { count: bimonthlySessionCount } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("therapist_id", userId).gte("created_at", twoMonthsAgo.toISOString())
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: recentBonuses } = await supabase.from("therapist_ranking_history").select("*").eq("therapist_id", userId).eq("change_type", "payment_bonus").gte("created_at", thirtyDaysAgo.toISOString())
      setMetrics({
        averageResponseTime: metricsData?.average_response_time_hours || 0,
        churnRate: metricsData?.churn_rate_monthly || therapistData?.churn_rate_monthly || 0,
        totalSessions: therapistData?.total_sessions || 0,
        bimonthlyCommission: (bimonthlySessionCount || 0) * 6,
        rankingPoints: therapistData?.ranking_points || 50,
        hasGreenDot: (recentBonuses && recentBonuses.length > 0) || false
      })
      const { data: notificationData } = await supabase.from("therapist_notifications").select("*").eq("therapist_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(10)
      setNotifications(notificationData || [])
      const { data: pendingPayments } = await supabase.from("therapist_payments").select("*").eq("therapist_id", userId).in("status", ["pending", "overdue"]).order("payment_due_date", { ascending: true })
      if (pendingPayments && pendingPayments.length > 0) {
        const nextPayment = pendingPayments[0]
        const dueDate = new Date(nextPayment.payment_due_date)
        const now = new Date()
        const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        setPaymentStatus({ hasPendingPayments: true, daysOverdue, nextPaymentDue: nextPayment.payment_due_date, suspensionRisk: daysOverdue > 3 })
      } else {
        setPaymentStatus({ hasPendingPayments: false, daysOverdue: 0, nextPaymentDue: "", suspensionRisk: false })
      }
      const nowIso = new Date().toISOString()
      const { data: futureSessions } = await supabase
        .from("sessions")
        .select("id, therapist_id, client_name, client_email, session_date, duration_minutes, price, status, rescheduled_from")
        .eq("therapist_id", userId)
        .eq("status", "scheduled")
        .gte("session_date", nowIso)
        .order("session_date", { ascending: true })
      setUpcomingSessions((futureSessions as any) || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" })
    }
  }

  const recalcPayment = async (sessionIso: string) => {
    try {
      if (!profile?.user_id || !sessionIso) return

      // Get auth session to pass token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No auth token available for recalc')
        return
      }

      const response = await fetch('/api/admin/payments/recalc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ therapist_id: profile.user_id, session_date: sessionIso })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error recalculating payment:', error)
      }
    } catch (error) {
      console.error('Error recalculating payment:', error)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from("contact_requests").update({ status: "accepted" }).eq("id", requestId)
      if (error) throw error
      const session = await supabase.auth.getSession()
      if (session.data.session) { await loadData(session.data.session.user.id) }
      toast({ title: "Success", description: "Client request accepted successfully", variant: "default" })
    } catch (error) {
      console.error("Error accepting request:", error)
      toast({ title: "Error", description: "Failed to accept request", variant: "destructive" })
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase.from("contact_requests").update({ status: "rejected", rejection_reason: reason }).eq("id", requestId)
      if (error) throw error
      const session = await supabase.auth.getSession()
      if (session.data.session) { await loadData(session.data.session.user.id) }
      toast({ title: "Request Rejected", description: "Client request has been rejected", variant: "default" })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" })
    }
  }

  const handleScheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) { throw new Error("Request not found") }
      
      // Get user_id from profile or session as fallback
      let therapistId = profile?.user_id
      if (!therapistId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
          throw new Error("User not authenticated")
        }
        therapistId = session.user.id
        // Reload profile data
        await loadData(therapistId)
      }
      
      const { error: updateError } = await supabase.from("contact_requests").update({ status: "scheduled" }).eq("id", requestId)
      if (updateError) { throw new Error(`Failed to update request: ${updateError.message}`) }
      const { error: sessionError } = await supabase.from("sessions").insert({
        therapist_id: therapistId,
        client_email: request.client_email,
        client_name: request.client_name,
        session_date: sessionIsoDateTime,
        duration_minutes: 60,
        price: 100,
        status: "scheduled"
      })
      if (sessionError) { throw new Error(`Failed to create session: ${sessionError.message}`) }
      await recalcPayment(sessionIsoDateTime)
      await loadData(therapistId)
      toast({ title: "Session Scheduled", description: "Session has been created for this client. Your metrics will update shortly.", variant: "default" })
    } catch (error: any) {
      console.error("Error scheduling session:", error)
      toast({ title: "Error", description: error.message || "Failed to schedule session", variant: "destructive" })
    }
  }

  const handleRescheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) { throw new Error("Request not found") }
      
      // Get user_id from profile or session as fallback
      let therapistId = profile?.user_id
      if (!therapistId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
          throw new Error("User not authenticated")
        }
        therapistId = session.user.id
        // Reload profile data
        await loadData(therapistId)
      }
      
      const { error: sessionError } = await supabase.from("sessions").insert({
        therapist_id: therapistId,
        client_email: request.client_email,
        client_name: request.client_name,
        session_date: sessionIsoDateTime,
        duration_minutes: 60,
        price: 100,
        status: "scheduled"
      })
      if (sessionError) { throw new Error(`Failed to create new session: ${sessionError.message}`) }
      await recalcPayment(sessionIsoDateTime)
      await loadData(therapistId)
      toast({ title: "Session Rescheduled", description: "A new session has been scheduled for this client.", variant: "default" })
    } catch (error: any) {
      console.error("Error rescheduling session:", error)
      toast({ title: "Error", description: error.message || "Failed to reschedule session", variant: "destructive" })
    }
  }

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("id", notificationId)
      if (error) throw error
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleDismissAllNotifications = async () => {
    try {
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("therapist_id", profile?.user_id).eq("is_read", false)
      if (error) throw error
      setNotifications([])
    } catch (error) {
      console.error("Error dismissing notifications:", error)
    }
  }

  const openRescheduleForSession = (s: SessionRow) => {
    setSelectedSession(s)
    setNewSessionDate("")
    setNewSessionTime("")
    setRescheduleReason("")
    setRescheduleDialogOpen(true)
  }

  const handleConfirmRescheduleExisting = async () => {
    if (!selectedSession) return
    
    // Get user_id from profile or session as fallback
    let therapistId = profile?.user_id
    if (!therapistId) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" })
        return
      }
      therapistId = session.user.id
      // Reload profile data
      await loadData(therapistId)
    }
    
    try {
      const originalDate = new Date(selectedSession.session_date)
      if (selectedSession.status !== 'scheduled' || originalDate.getTime() <= Date.now()) { throw new Error("Only upcoming scheduled sessions can be rescheduled") }
      const newIso = new Date(`${newSessionDate}T${newSessionTime}:00`).toISOString()
      const { data: original, error: fetchErr } = await supabase.from("sessions").select("*").eq("id", selectedSession.id).single()
      if (fetchErr || !original) throw new Error(fetchErr?.message || "Original session not found")
      const { error: updateErr } = await supabase.from("sessions").update({ status: 'rescheduled' }).eq("id", selectedSession.id)
      if (updateErr) throw new Error(updateErr.message)
      const { error: insertErr } = await supabase.from("sessions").insert({
        therapist_id: therapistId,
        client_email: original.client_email,
        client_name: original.client_name,
        session_date: newIso,
        duration_minutes: original.duration_minutes || 60,
        price: original.price || 100,
        status: 'scheduled',
        rescheduled_from: selectedSession.id,
        reschedule_reason: rescheduleReason || null,
        rescheduled_by: therapistId,
      })
      if (insertErr) throw new Error(insertErr.message)
      await recalcPayment(newIso)
      await loadData(therapistId)
      setRescheduleDialogOpen(false)
      setSelectedSession(null)
      setNewSessionDate("")
      setNewSessionTime("")
      setRescheduleReason("")
      toast({ title: "Session rescheduled", description: "New session created and original marked as rescheduled" })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reschedule", variant: "destructive" })
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

            {/* Upcoming Sessions */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="text-lg font-semibold text-gray-900">Upcoming Sessions</div>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <div className="text-sm text-gray-600">No upcoming sessions</div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{s.client_name || 'Session'}</div>
                          <div className="text-gray-600">{new Date(s.session_date).toLocaleString()}</div>
                        </div>
                        <Button variant="outline" onClick={() => openRescheduleForSession(s)}>Reschedule</Button>
                      </div>
                    ))}
                  </div>
                )}
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
        <RescheduleDialogWrapper
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          newSessionDate={newSessionDate}
          setNewSessionDate={setNewSessionDate}
          newSessionTime={newSessionTime}
          setNewSessionTime={setNewSessionTime}
          rescheduleReason={rescheduleReason}
          setRescheduleReason={setRescheduleReason}
          onConfirm={handleConfirmRescheduleExisting}
        />
    </div>
  )
}

// Reschedule existing session dialog
function RescheduleDialogWrapper({
  open,
  onOpenChange,
  newSessionDate,
  setNewSessionDate,
  newSessionTime,
  setNewSessionTime,
  rescheduleReason,
  setRescheduleReason,
  onConfirm
}: any) {
  const timeOptions = Array.from({ length: (20 - 8) * 2 + 1 }, (_, i) => {
    const totalMinutes = (8 * 60) + i * 30
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mm = String(totalMinutes % 60).padStart(2, '0')
    return `${hh}:${mm}`
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Session</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label>New Date</Label>
            <div className="mt-2">
              <Calendar
                mode="single"
                selected={newSessionDate ? new Date(newSessionDate) : undefined}
                onSelect={(d: any) => {
                  if (!d) { setNewSessionDate(""); return }
                  const date = new Date(d)
                  const y = date.getFullYear()
                  const m = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  setNewSessionDate(`${y}-${m}-${day}`)
                }}
                disabled={{ before: new Date() }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="new-time">New Time</Label>
            <Select value={newSessionTime} onValueChange={setNewSessionTime}>
              <SelectTrigger id="new-time" className="mt-2">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((t: string) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" value={rescheduleReason} onChange={(e: any) => setRescheduleReason(e.target.value)} className="mt-2" placeholder="Provide a reason" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!newSessionDate || !newSessionTime} onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


