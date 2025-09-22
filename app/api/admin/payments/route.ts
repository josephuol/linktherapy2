import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const supabase = supabaseAdmin()
  const body = await req.json().catch(() => null)
  if (!body || !body.action) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  try {
    if (body.action === "mark_complete") {
      const { payment_id, therapist_id } = body
      if (!payment_id || !therapist_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({ status: "completed", payment_completed_date: new Date().toISOString() })
        .eq("id", payment_id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

      const { error: rpcErr } = await supabase.rpc('process_payment_status', {
        p_payment_id: payment_id,
        p_status: 'completed',
        p_therapist_id: therapist_id
      })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "mark_paid_again") {
      const { payment_id, therapist_id, amount, payment_method, transaction_id, notes } = body
      if (!payment_id || !therapist_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

      // Do not overwrite payment_completed_date; just touch last_paid_action_at
      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({ last_paid_action_at: new Date().toISOString() })
        .eq("id", payment_id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

      // Insert payment action record
      const { error: actErr } = await supabase.from("therapist_payment_actions").insert({
        payment_id,
        therapist_id,
        actor_user_id: null,
        action: "paid_again",
        amount: amount ?? null,
        payment_method: payment_method || null,
        transaction_id: transaction_id || null,
        notes: notes || null,
      })
      if (actErr) return NextResponse.json({ error: actErr.message }, { status: 400 })

      // Apply ranking bonus again for repeat paid action
      const { error: rpcErr } = await supabase.rpc('process_payment_status', {
        p_payment_id: payment_id,
        p_status: 'completed',
        p_therapist_id: therapist_id
      })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 })

      // Audit log
      await supabase.from("admin_audit_logs").insert({
        actor_admin_id: null,
        action: "payments.mark_paid_again",
        target_user_id: therapist_id,
        details: { payment_id, amount, payment_method, transaction_id, notes }
      })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "mark_overdue") {
      const { payment_id, therapist_id } = body
      if (!payment_id || !therapist_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({ status: "overdue" })
        .eq("id", payment_id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

      const { error: rpcErr } = await supabase.rpc('process_payment_status', {
        p_payment_id: payment_id,
        p_status: 'overdue',
        p_therapist_id: therapist_id
      })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 })

      return NextResponse.json({ ok: true })
    }

    if (body.action === "update_notes") {
      const { payment_id, notes } = body
      if (!payment_id) return NextResponse.json({ error: "Missing payment_id" }, { status: 400 })
      const { error: upErr } = await supabase
        .from("therapist_payments")
        .update({ admin_notes: notes || null })
        .eq("id", payment_id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}


