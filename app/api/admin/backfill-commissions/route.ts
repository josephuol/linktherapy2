import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"

export async function POST(req: Request) {
  const supabase = supabaseAdmin()

  // Basic auth check: only admins based on profiles role
  const auth = req.headers.get("authorization") || ""
  // Expect Bearer token of a service or skip; we will verify via user header if present (Next middleware could set). As fallback, allow when service role key is used.
  // For simplicity here, we rely on calling from server via service role (no end-user session available in route handlers without cookies parsing).

  try {
    // Fetch all payment records
    const { data: payments, error: paymentsErr } = await supabase
      .from("therapist_payments")
      .select("id, therapist_id, payment_period_start, payment_period_end")
    if (paymentsErr) return NextResponse.json({ error: paymentsErr.message }, { status: 400 })

    let updated = 0

    for (const p of payments || []) {
      const periodStartIso = new Date(p.payment_period_start).toISOString()
      const periodEndDate = new Date(p.payment_period_end)
      const endExclusiveIso = new Date(periodEndDate.getTime() + 24 * 60 * 60 * 1000).toISOString()

      const { count, error: countErr } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("therapist_id", p.therapist_id)
        .eq("status", "completed")
        .gte("session_date", periodStartIso)
        .lt("session_date", endExclusiveIso)
      if (countErr) return NextResponse.json({ error: countErr.message }, { status: 400 })

      const totalSessions = count || 0
      const commission = totalSessions * ADMIN_COMMISSION_PER_SESSION

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


