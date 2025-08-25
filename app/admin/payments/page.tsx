"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DollarSign, AlertCircle, CheckCircle, Clock, Calendar } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type TherapistPayment = {
  id: string
  therapist_id: string
  therapist_name?: string
  payment_period_start: string
  payment_period_end: string
  total_sessions: number
  commission_amount: number
  payment_due_date: string
  payment_completed_date?: string | null
  status: string
  admin_notes?: string | null
}

export default function AdminPaymentsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [payments, setPayments] = useState<TherapistPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [notesDialog, setNotesDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<TherapistPayment | null>(null)
  const [adminNotes, setAdminNotes] = useState("")

  const loadPayments = async () => {
    // Get current month payments
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from("therapist_payments")
      .select(`
        *,
        therapists!inner(full_name)
      `)
      .gte("payment_period_start", startOfMonth.toISOString())
      .order("payment_due_date", { ascending: true })

    const formattedData = data?.map((p: any) => ({
      ...p,
      therapist_name: p.therapists?.full_name
    })) || []

    setPayments(formattedData)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      await loadPayments()
      await checkAndCreatePaymentRecords()
      setLoading(false)
    }
    init()
  }, [])

  const checkAndCreatePaymentRecords = async () => {
    // Create payment records for the current period if they don't exist
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // First half of month (1st-15th)
    if (now.getDate() >= 1 && now.getDate() <= 15) {
      const periodStart = new Date(currentYear, currentMonth, 1)
      const periodEnd = new Date(currentYear, currentMonth, 15)
      const dueDate = new Date(currentYear, currentMonth, 4) // Due on 4th
      
      await createPaymentRecordsForPeriod(periodStart, periodEnd, dueDate)
    }
    
    // Second half of month (16th-end)
    if (now.getDate() >= 16) {
      const periodStart = new Date(currentYear, currentMonth, 16)
      const periodEnd = new Date(currentYear, currentMonth + 1, 0) // Last day of month
      const dueDate = new Date(currentYear, currentMonth, 19) // Due on 19th
      
      await createPaymentRecordsForPeriod(periodStart, periodEnd, dueDate)
    }
  }

  const createPaymentRecordsForPeriod = async (periodStart: Date, periodEnd: Date, dueDate: Date) => {
    // Get all active therapists
    const { data: therapists } = await supabase
      .from("therapists")
      .select("user_id")
      .eq("status", "active")

    if (!therapists) return

    for (const therapist of therapists) {
      // Check if payment record already exists
      const { data: existing } = await supabase
        .from("therapist_payments")
        .select("id")
        .eq("therapist_id", therapist.user_id)
        .eq("payment_period_start", periodStart.toISOString().split('T')[0])
        .maybeSingle()

      if (!existing) {
        // Calculate sessions and commission for the period
        // Use inclusive end by querying with endExclusive = periodEnd + 1 day
        const endExclusive = new Date(periodEnd)
        endExclusive.setDate(endExclusive.getDate() + 1)
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, price")
          .eq("therapist_id", therapist.user_id)
          .eq("status", "completed")
          .gte("session_date", periodStart.toISOString())
          .lt("session_date", endExclusive.toISOString())

        const totalSessions = sessions?.length || 0
        const commission = totalSessions * ADMIN_COMMISSION_PER_SESSION

        // Create payment record
        await supabase
          .from("therapist_payments")
          .insert({
            therapist_id: therapist.user_id,
            payment_period_start: periodStart.toISOString().split('T')[0],
            payment_period_end: periodEnd.toISOString().split('T')[0],
            total_sessions: totalSessions,
            commission_amount: commission,
            payment_due_date: dueDate.toISOString(),
            status: "pending"
          })
      }
    }
  }

  const markPaymentComplete = async (payment: TherapistPayment) => {
    setProcessingPayment(payment.id)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_complete', payment_id: payment.id, therapist_id: payment.therapist_id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to process payment')
      await loadPayments()
    } catch (error) {
      console.error("Error marking payment complete:", error)
      const msg = (error as any)?.message || (error as any)?.error_description || 'Unknown error'
      alert(`Failed to process payment: ${msg}`)
    } finally {
      setProcessingPayment(null)
    }
  }

  const markPaymentOverdue = async (payment: TherapistPayment) => {
    setProcessingPayment(payment.id)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_overdue', payment_id: payment.id, therapist_id: payment.therapist_id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update payment')
      await loadPayments()
    } catch (error) {
      console.error("Error marking payment overdue:", error)
      const msg = (error as any)?.message || (error as any)?.error_description || 'Unknown error'
      alert(`Failed to process payment status: ${msg}`)
    } finally {
      setProcessingPayment(null)
    }
  }

  const updateNotes = async () => {
    if (!selectedPayment) return
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_notes', payment_id: selectedPayment.id, notes: adminNotes })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update notes')
      await loadPayments()
      setNotesDialog(false)
      setAdminNotes("")
      setSelectedPayment(null)
    } catch (e: any) {
      alert(`Failed to save notes: ${e?.message || 'Unknown error'}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      case "suspended":
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Suspended
        </Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status === "pending" && new Date(dueDate) < new Date()
  }

  const triggerBackfill = async () => {
    try {
      const res = await fetch("/api/admin/backfill-commissions", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to backfill")
      await loadPayments()
      alert(`Backfill complete. Updated ${json.updated} records.`)
    } catch (e: any) {
      alert(`Backfill failed: ${e?.message || "Unknown error"}`)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Payment Management</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => loadPayments()} className="w-full sm:w-auto">Refresh</Button>
            <Button size="sm" className="bg-[#056DBA] hover:bg-[#045A99] w-full sm:w-auto" onClick={triggerBackfill}>Backfill Commissions</Button>
          </div>
        </div>
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Pending Payments</span>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.filter(p => p.status === "pending").length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Overdue</span>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {payments.filter(p => isOverdue(p.payment_due_date, p.status)).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Completed This Month</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {payments.filter(p => p.status === "completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Therapist Payments</div>
              <Button size="sm" variant="outline" onClick={() => loadPayments()} className="w-full sm:w-auto">Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[900px]">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Therapist</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Period</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Sessions</TableHead>
                    <TableHead className="whitespace-nowrap">Commission</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Due Date</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow 
                      key={payment.id}
                      className={isOverdue(payment.payment_due_date, payment.status) ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium whitespace-nowrap">{payment.therapist_name || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {payment.payment_period_start} - {payment.payment_period_end}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{payment.total_sessions}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {payment.commission_amount}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className={isOverdue(payment.payment_due_date, payment.status) ? "text-red-600 font-semibold" : ""}>
                          {new Date(payment.payment_due_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        {payment.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => markPaymentComplete(payment)}
                              disabled={processingPayment === payment.id}
                            >
                              {processingPayment === payment.id ? "Processing..." : "Mark Paid"}
                            </Button>
                            {isOverdue(payment.payment_due_date, payment.status) && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => markPaymentOverdue(payment)}
                                disabled={processingPayment === payment.id}
                              >
                                Apply Penalty
                              </Button>
                            )}
                          </>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setAdminNotes(payment.admin_notes || "")
                            setNotesDialog(true)
                          }}
                        >
                          Notes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Notes</DialogTitle>
            <DialogDescription>
              Add notes for payment record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter notes about this payment..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNotesDialog(false)
                  setAdminNotes("")
                  setSelectedPayment(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#056DBA] hover:bg-[#045A99]"
                onClick={updateNotes}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
