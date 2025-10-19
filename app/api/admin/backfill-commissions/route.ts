import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    // Fetch all payment records with status and last payout
    const { data: payments, error: paymentsErr } = await supabase
      .from("therapist_payments")
      .select("id, therapist_id, payment_period_start, payment_period_end, status, last_paid_action_at")
    if (paymentsErr) return NextResponse.json({ error: paymentsErr.message }, { status: 400 })

    let updated = 0

    for (const p of payments || []) {
      // Skip completed rows per admin instruction
      if ((p as any).status === 'completed') {
        continue
      }
      const periodStartIso = new Date(p.payment_period_start).toISOString()
      const periodEndDate = new Date(p.payment_period_end)
      const endExclusiveIso = new Date(periodEndDate.getTime() + 24 * 60 * 60 * 1000).toISOString()

      // Count all sessions for the period
      const { count: allCount, error: countAllErr } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("therapist_id", p.therapist_id)
        .in("status", ["scheduled", "completed"]) 
        .gte("session_date", periodStartIso)
        .lt("session_date", endExclusiveIso)
      if (countAllErr) return NextResponse.json({ error: countAllErr.message }, { status: 400 })

      // Compute outstanding since last paid action
      const lastPaid = (p as any).last_paid_action_at ? new Date((p as any).last_paid_action_at) : null
      const calcStartIso = lastPaid && lastPaid > new Date(periodStartIso) ? lastPaid.toISOString() : periodStartIso
      const { count: outCount, error: countOutErr } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("therapist_id", p.therapist_id)
        .in("status", ["scheduled", "completed"]) 
        .gte("session_date", calcStartIso)
        .lt("session_date", endExclusiveIso)
      if (countOutErr) return NextResponse.json({ error: countOutErr.message }, { status: 400 })

      const totalSessions = allCount || 0
      const commission = (outCount || 0) * ADMIN_COMMISSION_PER_SESSION

      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({ total_sessions: totalSessions, commission_amount: commission })
        .eq("id", p.id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
      updated += 1
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}


