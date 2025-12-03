"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { TherapistMetrics } from "@/components/dashboard/TherapistMetrics"
import ContactRequestsTable from "@/components/dashboard/ContactRequestsTable"
import PaymentNotifications from "@/components/dashboard/PaymentNotifications"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Calendar as CalendarIcon, Clock, User, TrendingUp, DollarSign, AlertCircle, CheckCircle2, XCircle, Loader2, Users, Bell, Settings, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

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
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TherapistProfile | null>(null)
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [metrics, setMetrics] = useState<TherapistMetricsData | null>(null)
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<SessionRow[]>([])
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null)
  const [newSessionDate, setNewSessionDate] = useState<Date | undefined>()
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
        .limit(5)
      setUpcomingSessions((futureSessions as any) || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" })
    }
  }

  const recalcPayment = async (sessionIso: string) => {
    try {
      if (!profile?.user_id || !sessionIso) return
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
      toast({ title: "Success", description: "Client request accepted successfully" })
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
      toast({ title: "Request Rejected", description: "Client request has been rejected" })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" })
    }
  }

  const handleScheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) { throw new Error("Request not found") }
      let therapistId = profile?.user_id
      if (!therapistId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
          throw new Error("User not authenticated")
        }
        therapistId = session.user.id
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
      toast({ title: "Session Scheduled", description: "Session has been created successfully" })
    } catch (error: any) {
      console.error("Error scheduling session:", error)
      toast({ title: "Error", description: error.message || "Failed to schedule session", variant: "destructive" })
    }
  }

  const handleRescheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) { throw new Error("Request not found") }
      let therapistId = profile?.user_id
      if (!therapistId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
          throw new Error("User not authenticated")
        }
        therapistId = session.user.id
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
      if (sessionError) { throw new Error(`Failed to create session: ${sessionError.message}`) }
      await recalcPayment(sessionIsoDateTime)
      await loadData(therapistId)
      toast({ title: "Session Rescheduled", description: "Session has been rescheduled successfully" })
    } catch (error: any) {
      console.error("Error rescheduling session:", error)
      toast({ title: "Error", description: error.message || "Failed to reschedule session", variant: "destructive" })
    }
  }

  const openRescheduleForSession = (session: SessionRow) => {
    setSelectedSession(session)
    setNewSessionDate(undefined)
    setNewSessionTime("")
    setRescheduleReason("")
    setRescheduleDialogOpen(true)
  }

  const handleConfirmRescheduleExisting = async () => {
    if (!selectedSession || !newSessionDate || !newSessionTime) {
      toast({ title: "Error", description: "Please select a date and time", variant: "destructive" })
      return
    }
    try {
      const dateStr = format(newSessionDate, 'yyyy-MM-dd')
      const newIso = `${dateStr}T${newSessionTime}:00.000Z`
      const { error: upErr } = await supabase.from("sessions").update({ status: "rescheduled" }).eq("id", selectedSession.id)
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from("sessions").insert({
        therapist_id: selectedSession.therapist_id,
        client_email: selectedSession.client_email,
        client_name: selectedSession.client_name,
        session_date: newIso,
        duration_minutes: selectedSession.duration_minutes || 60,
        price: selectedSession.price || 100,
        status: "scheduled",
        rescheduled_from: selectedSession.id
      })
      if (insErr) throw insErr
      await recalcPayment(newIso)
      const session = await supabase.auth.getSession()
      if (session.data.session) { await loadData(session.data.session.user.id) }
      setRescheduleDialogOpen(false)
      setSelectedSession(null)
      toast({ title: "Success", description: "Session rescheduled successfully" })
    } catch (err: any) {
      console.error("Reschedule error:", err)
      toast({ title: "Error", description: err.message || "Failed to reschedule", variant: "destructive" })
    }
  }

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("id", notificationId)
      if (error) throw error
      const session = await supabase.auth.getSession()
      if (session.data.session) { await loadData(session.data.session.user.id) }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleDismissAllNotifications = async () => {
    try {
      if (!profile?.user_id) return
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("therapist_id", profile.user_id).eq("is_read", false)
      if (error) throw error
      const session = await supabase.auth.getSession()
      if (session.data.session) { await loadData(session.data.session.user.id) }
      toast({ title: "Success", description: "All notifications dismissed" })
    } catch (error) {
      console.error("Error dismissing notifications:", error)
      toast({ title: "Error", description: "Failed to dismiss notifications", variant: "destructive" })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const newRequestsCount = requests.filter(r => r.status === 'new').length
  const todaysSessions = upcomingSessions.filter(s => {
    const sessionDate = new Date(s.session_date)
    const today = new Date()
    return sessionDate.toDateString() === today.toDateString()
  }).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#056DBA]" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#056DBA] to-[#0891E3] p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    Welcome back, {profile?.full_name?.split(' ')[0]}!
                  </h1>
                  {metrics?.hasGreenDot && (
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Recent bonus earned!" />
                  )}
                </div>
                <p className="text-blue-100 text-lg">Here's what's happening with your practice today</p>
              </div>
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-200" />
                  <p className="text-sm text-blue-100">New Requests</p>
                </div>
                <p className="text-3xl font-bold">{newRequestsCount}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-blue-200" />
                  <p className="text-sm text-blue-100">Today's Sessions</p>
                </div>
                <p className="text-3xl font-bold">{todaysSessions}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-200" />
                  <p className="text-sm text-blue-100">Ranking</p>
                </div>
                <p className="text-3xl font-bold">{Math.round((profile?.ranking_points || 50) / 100)}%</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-200" />
                  <p className="text-sm text-blue-100">Commission</p>
                </div>
                <p className="text-3xl font-bold">${metrics?.bimonthlyCommission || 0}</p>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        </div>

        {/* Payment Notifications */}
        {paymentStatus && (paymentStatus.hasPendingPayments || notifications.length > 0) && (
          <PaymentNotifications
            notifications={notifications}
            paymentStatus={paymentStatus}
            onMarkAsRead={handleMarkNotificationAsRead}
            onDismissAll={handleDismissAllNotifications}
          />
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="h-auto flex-col items-start p-6 bg-white hover:bg-gray-50 text-left border-2 border-[#056DBA]/10 hover:border-[#056DBA]/30 transition-all"
            variant="outline"
            onClick={() => router.push("/dashboard/profile")}
          >
            <User className="h-6 w-6 text-[#056DBA] mb-2" />
            <div>
              <p className="font-semibold text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-500">Update your information</p>
            </div>
          </Button>

          <Button
            className="h-auto flex-col items-start p-6 bg-white hover:bg-gray-50 text-left border-2 border-[#36A72B]/10 hover:border-[#36A72B]/30 transition-all"
            variant="outline"
            onClick={() => window.scrollTo({ top: document.getElementById('upcoming-sessions')?.offsetTop || 0, behavior: 'smooth' })}
          >
            <CalendarIcon className="h-6 w-6 text-[#36A72B] mb-2" />
            <div>
              <p className="font-semibold text-gray-900">View Schedule</p>
              <p className="text-sm text-gray-500">{upcomingSessions.length} upcoming sessions</p>
            </div>
          </Button>

          <Button
            className="h-auto flex-col items-start p-6 bg-white hover:bg-gray-50 text-left border-2 border-purple-500/10 hover:border-purple-500/30 transition-all"
            variant="outline"
            onClick={() => window.scrollTo({ top: document.getElementById('contact-requests')?.offsetTop || 0, behavior: 'smooth' })}
          >
            <Bell className="h-6 w-6 text-purple-600 mb-2" />
            <div>
              <p className="font-semibold text-gray-900">Contact Requests</p>
              <p className="text-sm text-gray-500">{newRequestsCount} new requests</p>
            </div>
          </Button>
        </div>

        {/* Metrics Dashboard */}
        {metrics && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Updated in real-time
              </Badge>
            </div>
            <TherapistMetrics metrics={metrics} />
          </div>
        )}

        {/* Upcoming Sessions */}
        <Card id="upcoming-sessions" className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6 text-[#056DBA]" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription className="mt-1">Your scheduled appointments</CardDescription>
              </div>
              {upcomingSessions.length > 0 && (
                <Badge className="bg-[#056DBA] text-white">
                  {upcomingSessions.length} session{upcomingSessions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming sessions</h3>
                <p className="text-gray-500 mb-6">You don't have any scheduled sessions at the moment</p>
                <Button onClick={() => window.scrollTo({ top: document.getElementById('contact-requests')?.offsetTop || 0, behavior: 'smooth' })}>
                  Check Contact Requests
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(s => {
                  const sessionDate = new Date(s.session_date)
                  const isToday = sessionDate.toDateString() === new Date().toDateString()
                  const isTomorrow = sessionDate.toDateString() === new Date(Date.now() + 86400000).toDateString()

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-[#056DBA]/30 transition-all bg-white"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 bg-[#056DBA]/10 rounded-lg flex items-center justify-center">
                          <CalendarIcon className="h-8 w-8 text-[#056DBA]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-lg">{s.client_name || 'Session'}</p>
                            {isToday && (
                              <Badge className="bg-green-500 text-white">Today</Badge>
                            )}
                            {isTomorrow && (
                              <Badge className="bg-blue-500 text-white">Tomorrow</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {format(sessionDate, 'EEEE, MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(sessionDate, 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRescheduleForSession(s)}
                        className="ml-4"
                      >
                        Reschedule
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Requests */}
        <div id="contact-requests">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-6 w-6 text-[#056DBA]" />
            <h2 className="text-2xl font-bold text-gray-900">Contact Requests</h2>
            {newRequestsCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {newRequestsCount} new
              </Badge>
            )}
          </div>
          <ContactRequestsTable
            requests={requests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onScheduleSession={handleScheduleSession}
            onRescheduleSession={handleRescheduleSession}
          />
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSession && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Rescheduling session with:</p>
                <p className="font-semibold">{selectedSession.client_name}</p>
                <p className="text-sm text-gray-500">
                  Originally: {format(new Date(selectedSession.session_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}

            <div>
              <Label>New Date</Label>
              <Calendar
                mode="single"
                selected={newSessionDate}
                onSelect={setNewSessionDate}
                className="rounded-md border mt-2"
                disabled={(date) => date < new Date()}
              />
            </div>

            <div>
              <Label htmlFor="time">New Time</Label>
              <Select value={newSessionTime} onValueChange={setNewSessionTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="E.g., schedule conflict"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRescheduleExisting} disabled={!newSessionDate || !newSessionTime}>
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
