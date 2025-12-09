"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { EventInput } from "@fullcalendar/core"
import { TherapistMetrics } from "@/components/dashboard/TherapistMetrics"
import PaymentNotifications from "@/components/dashboard/PaymentNotifications"
import ContactRequestsTable from "@/components/dashboard/ContactRequestsTable"

export default function AdminTherapistDetailPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const therapistId = params?.id
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [therapist, setTherapist] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [metrics, setMetrics] = useState<any | null>(null)
  const [events, setEvents] = useState<EventInput[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [liveCommission, setLiveCommission] = useState<number>(0)
  const [contactRequests, setContactRequests] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [paymentStatus, setPaymentStatus] = useState<any | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const calendarRef = useRef<FullCalendar>(null)
  const getCurrentPeriodBounds = () => {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth()
    const day = now.getUTCDate()
    const start = new Date(Date.UTC(year, month, day <= 15 ? 1 : 16, 0, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day <= 15 ? 15 : new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), 23, 59, 59, 999))
    const endExclusive = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1, 0, 0, 0, 0))
    return { start, end, endExclusive }
  }

  const computeLiveCommission = async () => {
    if (!therapistId) return
    const { start, endExclusive } = getCurrentPeriodBounds()
    const { count } = await (supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", therapistId)
      .in("status", ["scheduled", "completed"]) 
      .gte("session_date", start.toISOString())
      .lt("session_date", endExclusive.toISOString()) as any)
    const total = count || 0
    setLiveCommission(total * ADMIN_COMMISSION_PER_SESSION)
  }

  const currentPeriodForDisplay = () => {
    const { start, end } = getCurrentPeriodBounds()
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }


  const recalcPayment = async (sessionIso: string) => {
    try {
      if (!therapistId || !sessionIso) return
      await fetch('/api/admin/payments/recalc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapist_id: therapistId, session_date: sessionIso })
      })
    } catch {}
  }

  const refreshPaymentsAndCommission = async () => {
    if (!therapistId) return
    const { data: pays } = await supabase
      .from("therapist_payments")
      .select("payment_period_start, payment_period_end, total_sessions, commission_amount, payment_due_date, payment_completed_date, status")
      .eq("therapist_id", therapistId)
      .order("payment_period_start", { ascending: false })
    setPayments((pays as any) || [])
    // Update bimonthly commission metric immediately
    const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
    const bimonthlyCommission = ((pays as any) || [])
      .filter((p: any) => new Date(p.payment_period_start) >= twoMonthsAgo)
      .reduce((sum: number, p: any) => sum + (Number(p.commission_amount) || 0), 0)
    setMetrics((prev: any) => prev ? { ...prev, bimonthlyCommission } : prev)
  }

  useEffect(() => {
    let paymentsChannel: any
    let sessionsChannel: any
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }

      // Load therapist basics
      const [{ data: t }, { data: tp }] = await Promise.all([
        supabase.from("therapists").select("*").eq("user_id", therapistId).single(),
        supabase.from("profiles").select("*").eq("user_id", therapistId).single(),
      ])
      setTherapist(t || null)
      setProfile(tp || null)

      // Load metrics (current month) and compose dashboard metrics
      const currentMonth = new Date().toISOString().slice(0,7) + "-01"
      const { data: m } = await supabase.from("therapist_metrics").select("*").eq("therapist_id", therapistId).eq("month_year", currentMonth).single()
      const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      const { data: paymentsForCommission } = await supabase
        .from("therapist_payments")
        .select("commission_amount,payment_period_start")
        .eq("therapist_id", therapistId)
        .gte("payment_period_start", twoMonthsAgo.toISOString().slice(0,10))
      const bimonthlyCommission = (paymentsForCommission || []).reduce((sum: number, p: any) => sum + (Number(p.commission_amount) || 0), 0)
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: recentBonuses } = await supabase
        .from("therapist_ranking_history")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("change_type", "payment_bonus")
        .gte("created_at", thirtyDaysAgo.toISOString())
      setMetrics({
        averageResponseTime: m?.average_response_time_hours || 0,
        churnRate: m?.churn_rate_monthly || t?.churn_rate_monthly || 0,
        totalSessions: t?.total_sessions || 0,
        bimonthlyCommission,
        rankingPoints: t?.ranking_points || 0,
        hasGreenDot: (recentBonuses && recentBonuses.length > 0) || false,
      })

      // Load calendar events
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, client_name, session_date, duration_minutes")
        .eq("therapist_id", therapistId)
        .order("session_date", { ascending: true })
      const mapped = (sessions || []).map((s: any) => ({
        id: s.id,
        title: s.client_name || "Session",
        start: s.session_date,
        end: new Date(new Date(s.session_date).getTime() + (s.duration_minutes || 60) * 60000).toISOString(),
      }))
      setEvents(mapped)

      // Load payments
      const { data: pays } = await supabase
        .from("therapist_payments")
        .select("payment_period_start, payment_period_end, total_sessions, commission_amount, payment_due_date, payment_completed_date, status")
        .eq("therapist_id", therapistId)
        .order("payment_period_start", { ascending: false })
      setPayments(pays || [])

      // Load contact requests (full rows)
      const { data: cr } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })
      setContactRequests(cr || [])

      // Load notifications and payment status
      const { data: notificationData } = await supabase
        .from("therapist_notifications")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10)
      setNotifications(notificationData || [])

      const { data: pendingPayments } = await supabase
        .from("therapist_payments")
        .select("*")
        .eq("therapist_id", therapistId)
        .in("status", ["pending", "overdue"]) as any
      if (pendingPayments && pendingPayments.length > 0) {
        const nextPayment = [...pendingPayments].sort((a: any, b: any) => new Date(a.payment_due_date).getTime() - new Date(b.payment_due_date).getTime())[0]
        const dueDate = new Date(nextPayment.payment_due_date)
        const now = new Date()
        const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        setPaymentStatus({ hasPendingPayments: true, daysOverdue, nextPaymentDue: nextPayment.payment_due_date, suspensionRisk: daysOverdue > 3 })
      } else {
        setPaymentStatus({ hasPendingPayments: false, daysOverdue: 0, nextPaymentDue: "", suspensionRisk: false })
      }

      // Load upcoming sessions (scheduled, future)
      const nowIso = new Date().toISOString()
      const { data: futureSessions } = await supabase
        .from("sessions")
        .select("id, therapist_id, patient_id, client_name, client_email, session_date")
        .eq("therapist_id", therapistId)
        .eq("status", "scheduled")
        .gte("session_date", nowIso)
        .order("session_date", { ascending: true })

      const thresholdMs = 48 * 60 * 60 * 1000
      const pairToSessions = new Map<string, { id: string; date: number }[]>()
      ;(futureSessions || []).forEach((s: any) => {
        const therapistKey = String(therapistId)
        const pairKey = `${therapistKey}|${s.patient_id ? `p:${s.patient_id}` : `e:${s.client_email || ''}`}`
        const arr = pairToSessions.get(pairKey) || []
        arr.push({ id: s.id, date: new Date(s.session_date).getTime() })
        pairToSessions.set(pairKey, arr)
      })
      const tooCloseIds = new Set<string>()
      pairToSessions.forEach((arr) => {
        arr.sort((a, b) => a.date - b.date)
        for (let i = 1; i < arr.length; i++) {
          const diff = arr[i].date - arr[i - 1].date
          if (diff < thresholdMs) {
            tooCloseIds.add(arr[i - 1].id)
            tooCloseIds.add(arr[i].id)
          }
        }
      })
      const withFlag = (futureSessions || []).map((s: any) => ({ ...s, isTooClose: tooCloseIds.has(s.id) }))
      setUpcomingSessions(withFlag)
      await computeLiveCommission()
      setLoading(false)

      // Live updates: refresh payments/commission when therapist_payments changes
      paymentsChannel = supabase
        .channel('therapist_payments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'therapist_payments',
            filter: `therapist_id=eq.${therapistId}`
          },
          () => { refreshPaymentsAndCommission() }
        )
        .subscribe()

      // Also react to sessions changes immediately
      sessionsChannel = supabase
        .channel('therapist_sessions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `therapist_id=eq.${therapistId}`
          },
          () => { computeLiveCommission() }
        )
        .subscribe()
    }
    if (therapistId) init()
    return () => {
      if (paymentsChannel) supabase.removeChannel(paymentsChannel)
      if (sessionsChannel) supabase.removeChannel(sessionsChannel)
    }
  }, [therapistId])

  // Handlers for notifications
  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("id", notificationId)
      if (!error) setNotifications(prev => prev.filter((n: any) => n.id !== notificationId))
    } catch {}
  }
  const handleDismissAllNotifications = async () => {
    try {
      if (!therapistId) return
      const { error } = await supabase.from("therapist_notifications").update({ is_read: true }).eq("therapist_id", therapistId).eq("is_read", false)
      if (!error) setNotifications([])
    } catch {}
  }

  // Handlers for contact requests (admin-side)
  const handleAcceptRequest = async (requestId: string) => {
    await supabase.from("contact_requests").update({ status: "accepted" }).eq("id", requestId)
    setContactRequests((prev: any[]) => prev.map((r: any) => r.id === requestId ? { ...r, status: "accepted" } : r))
  }
  const handleRejectRequest = async (requestId: string, reason: string) => {
    await supabase.from("contact_requests").update({ status: "rejected", rejection_reason: reason }).eq("id", requestId)
    setContactRequests((prev: any[]) => prev.map((r: any) => r.id === requestId ? { ...r, status: "rejected", rejection_reason: reason } : r))
  }
  const handleScheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    const req = contactRequests.find((r: any) => r.id === requestId)
    if (!therapistId || !req) return
    await supabase.from("contact_requests").update({ status: "scheduled" }).eq("id", requestId)
    await supabase.from("sessions").insert({
      therapist_id: therapistId,
      client_email: req.client_email,
      client_name: req.client_name,
      session_date: sessionIsoDateTime,
      duration_minutes: 60,
      price: 100,
      status: "scheduled",
    })
    await recalcPayment(sessionIsoDateTime)
    await refreshPaymentsAndCommission()
    const nowIsoRef = new Date().toISOString()
    const { data: futureSessions } = await supabase
      .from("sessions")
      .select("id, client_name, session_date")
      .eq("therapist_id", therapistId)
      .eq("status", "scheduled")
      .gte("session_date", nowIsoRef)
      .order("session_date", { ascending: true })
    setUpcomingSessions(futureSessions || [])
    setContactRequests((prev: any[]) => prev.map((r: any) => r.id === requestId ? { ...r, status: "scheduled" } : r))
  }
  const handleRescheduleSession = async (requestId: string, sessionIsoDateTime: string) => {
    const req = contactRequests.find((r: any) => r.id === requestId)
    if (!therapistId || !req) return
    await supabase.from("sessions").insert({
      therapist_id: therapistId,
      client_email: req.client_email,
      client_name: req.client_name,
      session_date: sessionIsoDateTime,
      duration_minutes: 60,
      price: 100,
      status: "scheduled",
    })
    await recalcPayment(sessionIsoDateTime)
    await refreshPaymentsAndCommission()
    const nowIsoRef = new Date().toISOString()
    const { data: futureSessions } = await supabase
      .from("sessions")
      .select("id, client_name, session_date")
      .eq("therapist_id", therapistId)
      .eq("status", "scheduled")
      .gte("session_date", nowIsoRef)
      .order("session_date", { ascending: true })
    setUpcomingSessions(futureSessions || [])
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">{therapist?.full_name || "Therapist"}</h1>
            <p className="text-gray-500 mt-1">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/admin")}>Back to Dashboard</Button>
          </div>
        </div>

        {/* Status Management Card - Prominent for pending therapists */}
        {therapist && (
          <Card className={`border-2 ${
            therapist.status === 'pending' || therapist.status === 'not_onboarded'
              ? 'border-yellow-300 bg-yellow-50/50'
              : therapist.status === 'suspended'
                ? 'border-red-300 bg-red-50/50'
                : therapist.status === 'warning'
                  ? 'border-orange-300 bg-orange-50/50'
                  : 'border-green-300 bg-green-50/50'
          }`}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    therapist.status === 'active' ? 'bg-green-500' :
                    therapist.status === 'pending' || therapist.status === 'not_onboarded' ? 'bg-yellow-500' :
                    therapist.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Status: <span className="capitalize">{therapist.status || 'Unknown'}</span>
                    </div>
                    {(therapist.status === 'pending' || therapist.status === 'not_onboarded') && (
                      <p className="text-sm text-yellow-700">This therapist has not completed onboarding yet.</p>
                    )}
                    {therapist.status === 'suspended' && (
                      <p className="text-sm text-red-700">This therapist is currently suspended.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {therapist.status !== 'active' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={async () => {
                        await supabase.from("therapists").update({ status: 'active' }).eq("user_id", therapistId)
                        setTherapist((prev: any) => prev ? { ...prev, status: 'active' } : prev)
                      }}
                    >
                      Approve & Activate
                    </Button>
                  )}
                  {therapist.status !== 'warning' && therapist.status !== 'suspended' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={async () => {
                        await supabase.from("therapists").update({ status: 'warning' }).eq("user_id", therapistId)
                        setTherapist((prev: any) => prev ? { ...prev, status: 'warning' } : prev)
                      }}
                    >
                      Issue Warning
                    </Button>
                  )}
                  {therapist.status !== 'suspended' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await supabase.from("therapists").update({ status: 'suspended' }).eq("user_id", therapistId)
                        setTherapist((prev: any) => prev ? { ...prev, status: 'suspended' } : prev)
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><div className="text-lg font-semibold text-gray-900">Profile Details</div></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{therapist?.full_name || profile?.full_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{profile?.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Title</span>
                  <span className="font-medium text-gray-900">{therapist?.title || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Session Price</span>
                  <span className="font-medium text-gray-900">${therapist?.session_price_45_min || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Experience</span>
                  <span className="font-medium text-gray-900">{therapist?.years_of_experience || 0} years</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Ranking Points</span>
                  <span className="font-medium text-[#056DBA]">{therapist?.ranking_points ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Total Sessions</span>
                  <span className="font-medium text-gray-900">{therapist?.total_sessions ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><div className="text-lg font-semibold text-gray-900">Calendar</div></CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
                  events={events}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Notifications */}
        {paymentStatus && (
          <div className="grid gap-6">
            <PaymentNotifications
              notifications={notifications}
              paymentStatus={paymentStatus}
              onMarkAsRead={handleMarkNotificationAsRead}
              onDismissAll={handleDismissAllNotifications}
            />
          </div>
        )}

        {/* Metrics & Payments */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><div className="text-lg font-semibold text-gray-900">Payment Status</div></CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Next Due</span><span className="font-medium">{payments.find(p => p.status === 'pending' || p.status === 'overdue')?.payment_due_date ? new Date(payments.find(p => p.status === 'pending' || p.status === 'overdue')?.payment_due_date).toLocaleString() : '—'}</span></div>
                {(() => { const p = currentPeriodForDisplay(); return (
                  <div className="flex justify-between"><span className="text-gray-600">Current Period</span><span className="font-medium">{p.start} → {p.end}</span></div>
                )})()}
                <div className="flex justify-between"><span className="text-gray-600">Commission</span><span className="font-medium">${liveCommission}</span></div>
                {payments.length === 0 && (
                  <div className="text-xs text-gray-500">No payment records yet for this therapist.</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><div className="text-lg font-semibold text-gray-900">Performance Metrics</div></CardHeader>
            <CardContent>
              {metrics && (
                <TherapistMetrics metrics={metrics} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><div className="text-lg font-semibold text-gray-900">Recent Payments</div></CardHeader>
            <CardContent>
              <div className="text-sm divide-y">
                {payments.length === 0 ? (
                  <div className="text-gray-600">No payments</div>
                ) : (
                  payments.map((p, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.payment_period_start} → {p.payment_period_end}</div>
                        <div className="text-gray-600">Sessions: {p.total_sessions} · Commission: ${p.commission_amount}</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-md border">
                        {p.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader><div className="text-lg font-semibold text-gray-900">Upcoming Sessions</div></CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <div className="text-sm text-gray-600">No upcoming sessions</div>
              ) : (
                <div className="text-sm divide-y">
                  {upcomingSessions.map((s: any) => (
                    <div key={s.id} className={`py-2 flex items-center justify-between ${s.isTooClose ? 'bg-orange-50 rounded-md px-2' : ''}`}>
                      <div>
                        <div className="font-medium">{s.client_name || 'Session'}</div>
                        <div className="text-gray-600">{new Date(s.session_date).toLocaleString()}</div>
                      </div>
                      {s.isTooClose && (
                        <div className="text-xs font-medium text-orange-700 border border-orange-300 bg-orange-100 px-2 py-1 rounded">Too close (&lt; 48h)</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Requests Table */}
        <div className="grid gap-6">
          <ContactRequestsTable
            requests={contactRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onScheduleSession={handleScheduleSession}
            onRescheduleSession={handleRescheduleSession}
          />
        </div>
      </div>
    </div>
  )
}
