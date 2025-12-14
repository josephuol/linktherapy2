import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { scheduleAllPaymentNotifications } from "@/lib/qstash"

function getPeriodBounds(dateIso: string) {
  const date = new Date(dateIso)
  if (isNaN(date.getTime())) {
    throw new Error("Invalid session_date")
  }
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  // Compute start and end (inclusive) for bi-monthly periods in UTC
  const start = new Date(Date.UTC(year, month, day <= 15 ? 0 + month : month, day <= 15 ? 1 : 16, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, day <= 15 ? 15 : new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), 23, 59, 59, 999))

  // End exclusive for querying
  const endExclusive = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1, 0, 0, 0, 0))

  // Payment due dates: 4th for first half, 19th for second half (of same month)
  const dueDate = new Date(Date.UTC(year, month, day <= 15 ? 4 : 19, 0, 0, 0, 0))

  return { start, end, endExclusive, dueDate }
}

export async function POST(req: Request) {
  // Note: This endpoint is called by therapists when they schedule sessions
  // We need to verify they're authenticated but don't require admin role
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = supabaseAdmin()

  // Verify the user is authenticated
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => null) as { therapist_id?: string; session_date?: string }
    if (!body?.therapist_id || !body?.session_date) {
      return NextResponse.json({ error: "Missing therapist_id or session_date" }, { status: 400 })
    }

    const { start, end, endExclusive, dueDate } = getPeriodBounds(body.session_date)

    const periodStartStr = start.toISOString().split('T')[0]
    const periodEndStr = end.toISOString().split('T')[0]

    // Fetch therapist's custom commission rate
    const { data: therapistData, error: therapistErr } = await supabase
      .from("therapists")
      .select("custom_commission_rate")
      .eq("user_id", body.therapist_id)
      .single()

    if (therapistErr && therapistErr.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is okay for new therapists
      console.error("[Payment Recalc] Error fetching therapist:", therapistErr)
    }

    // Use custom commission rate if set, otherwise use default
    const effectiveCommissionRate = therapistData?.custom_commission_rate ?? ADMIN_COMMISSION_PER_SESSION

    // Locate current period payment and consider last payout time for outstanding
    const { data: existing, error: existingErr } = await supabase
      .from("therapist_payments")
      .select("id,last_paid_action_at")
      .eq("therapist_id", body.therapist_id)
      .eq("payment_period_start", periodStartStr)
      .maybeSingle()

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 400 })
    }

    // Count all sessions for the period (for total_sessions)
    const { count: allCount, error: allErr } = await (supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", body.therapist_id)
      .in("status", ["scheduled", "completed"]) 
      .gte("session_date", start.toISOString())
      .lt("session_date", endExclusive.toISOString())) as any
    if (allErr) {
      return NextResponse.json({ error: allErr.message }, { status: 400 })
    }

    // Compute outstanding since last_paid_action_at (or period start)
    const calcStartIso = existing?.last_paid_action_at && new Date(existing.last_paid_action_at) > start
      ? new Date(existing.last_paid_action_at).toISOString()
      : start.toISOString()

    const { count: outCount, error: outErr } = await (supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", body.therapist_id)
      .in("status", ["scheduled", "completed"]) 
      .gte("session_date", calcStartIso)
      .lt("session_date", endExclusive.toISOString())) as any
    if (outErr) {
      return NextResponse.json({ error: outErr.message }, { status: 400 })
    }

    const totalSessions = allCount || 0
    const commission = (allCount || 0) * effectiveCommissionRate

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({
          total_sessions: totalSessions,
          commission_amount: commission,
          payment_period_end: periodEndStr,
        })
        .eq("id", existing.id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
    } else {
      const { data: newPayment, error: insErr } = await supabase
        .from("therapist_payments")
        .insert({
          therapist_id: body.therapist_id,
          payment_period_start: periodStartStr,
          payment_period_end: periodEndStr,
          total_sessions: totalSessions,
          commission_amount: commission,
          payment_due_date: dueDate.toISOString(),
          status: "pending",
        })
        .select("id")
        .single()
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

      // Schedule payment notifications for the new payment
      if (newPayment?.id) {
        try {
          const scheduleResult = await scheduleAllPaymentNotifications(
            newPayment.id,
            body.therapist_id,
            dueDate
          )
          if (!scheduleResult.success && scheduleResult.errors) {
            console.error("[Payment Recalc] Failed to schedule some notifications:", scheduleResult.errors)
            // Don't fail the request if scheduling fails, just log it
          }
        } catch (scheduleError: any) {
          console.error("[Payment Recalc] Exception scheduling notifications:", scheduleError?.message)
          // Don't fail the request if scheduling fails, just log it
        }
      }
    }

    return NextResponse.json({ ok: true, total_sessions: totalSessions, commission_amount: commission, period_start: periodStartStr, period_end: periodEndStr })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}


