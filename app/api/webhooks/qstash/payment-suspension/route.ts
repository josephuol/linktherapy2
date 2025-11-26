import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { verifyQstashSignature } from "@/lib/qstash-service"
// TODO: Implement sendAccountSuspensionEmail in email-service.ts
// import { sendAccountSuspensionEmail } from "@/lib/email-service"

/**
 * Qstash webhook for suspending therapist accounts due to non-payment
 * This endpoint is called by Qstash 6 days after payment deadline
 */
export async function POST(req: Request) {
  try {
    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get("upstash-signature")

    if (!signature) {
      console.error("[Qstash Webhook] Missing signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    // Verify Qstash signature
    const isValid = await verifyQstashSignature(signature, body)
    if (!isValid) {
      console.error("[Qstash Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse body
    const payload = JSON.parse(body) as {
      paymentId: string
      therapistId: string
    }

    const { paymentId, therapistId } = payload

    if (!paymentId || !therapistId) {
      console.error("[Qstash Webhook] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[Qstash Webhook] Processing suspension for payment ${paymentId}`)

    const supabase = supabaseAdmin()

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from("therapist_payments")
      .select("id, therapist_id, commission_amount, payment_period_start, payment_period_end, status")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment) {
      console.error("[Qstash Webhook] Payment not found:", paymentError?.message)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Check if payment is already completed - if so, don't suspend
    if (payment.status === "completed") {
      console.log(`[Qstash Webhook] Payment ${paymentId} already completed, skipping suspension`)
      return NextResponse.json({ ok: true, skipped: true, reason: "payment_completed" })
    }

    // Fetch therapist details
    const { data: therapist, error: therapistError } = await supabase
      .from("therapists")
      .select("user_id, full_name, email, status, ranking")
      .eq("user_id", therapistId)
      .single()

    if (therapistError || !therapist) {
      console.error("[Qstash Webhook] Therapist not found:", therapistError?.message)
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Check if already suspended
    if (therapist.status === "suspended") {
      console.log(`[Qstash Webhook] Therapist ${therapistId} already suspended, skipping`)
      return NextResponse.json({ ok: true, skipped: true, reason: "already_suspended" })
    }

    // Suspend therapist account
    const { error: updateError } = await supabase
      .from("therapists")
      .update({
        status: "suspended",
        ranking: 0,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", therapistId)

    if (updateError) {
      console.error("[Qstash Webhook] Failed to suspend therapist:", updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update payment status to suspended
    await supabase
      .from("therapist_payments")
      .update({ status: "suspended" })
      .eq("id", paymentId)

    // Log suspension in ranking history
    await supabase
      .from("therapist_ranking_history")
      .insert({
        therapist_id: therapistId,
        previous_ranking: therapist.ranking,
        new_ranking: 0,
        change_reason: `Account suspended due to non-payment for payment period ${paymentId}`,
        changed_by_admin_id: null,
      })

    console.log(`[Qstash Webhook] Therapist ${therapistId} suspended successfully`)

    // Send suspension email
    const periodStart = new Date(payment.payment_period_start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    const periodEnd = new Date(payment.payment_period_end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    const paymentPeriod = `${periodStart} - ${periodEnd}`
    const commissionAmount = Number(payment.commission_amount) || 0

    // TODO: Implement sendAccountSuspensionEmail function
    const emailResult: { success: boolean; error?: string } = { success: true }
    // const emailResult = await sendAccountSuspensionEmail(
    //   therapist.email,
    //   therapist.full_name,
    //   commissionAmount,
    //   `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    // )

    if (!emailResult.success) {
      console.error("[Qstash Webhook] Failed to send suspension email:", emailResult.error)
      // Don't fail the request if email fails - suspension already happened
    }

    console.log(`[Qstash Webhook] Successfully suspended therapist ${therapistId} for payment ${paymentId}`)
    return NextResponse.json({ ok: true, suspended: true, paymentId, therapistId })
  } catch (error: any) {
    console.error("[Qstash Webhook] Error processing suspension:", error.message)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
