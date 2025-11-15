import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { verifyQstashSignature, PaymentNotificationStage } from "@/lib/qstash-service"
import {
  sendPaymentReminderEmail,
  sendPaymentDeadlineEmail,
  sendPaymentWarningEmail,
} from "@/lib/email-service"

/**
 * Qstash webhook for sending payment notification emails
 * This endpoint is called by Qstash at scheduled times
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
      stage: PaymentNotificationStage
    }

    const { paymentId, therapistId, stage } = payload

    if (!paymentId || !therapistId || !stage) {
      console.error("[Qstash Webhook] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[Qstash Webhook] Processing ${stage} for payment ${paymentId}`)

    const supabase = supabaseAdmin()

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from("therapist_payments")
      .select("id, therapist_id, commission_amount, payment_period_start, payment_period_end, payment_due_date, status")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment) {
      console.error("[Qstash Webhook] Payment not found:", paymentError?.message)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Check if payment is already completed - if so, don't send notification
    if (payment.status === "completed") {
      console.log(`[Qstash Webhook] Payment ${paymentId} already completed, skipping notification`)
      return NextResponse.json({ ok: true, skipped: true, reason: "payment_completed" })
    }

    // Fetch therapist details
    const { data: therapist, error: therapistError } = await supabase
      .from("therapists")
      .select("user_id, full_name, email")
      .eq("user_id", therapistId)
      .single()

    if (therapistError || !therapist) {
      console.error("[Qstash Webhook] Therapist not found:", therapistError?.message)
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Format payment period for email
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

    // Send appropriate email based on stage
    let emailResult: { success: boolean; error?: string }

    switch (stage) {
      case "reminder_3_days_before":
        emailResult = await sendPaymentReminderEmail(
          therapist.email,
          therapist.full_name,
          new Date(payment.payment_due_date),
          commissionAmount,
          paymentPeriod
        )
        break

      case "deadline_notification":
        emailResult = await sendPaymentDeadlineEmail(
          therapist.email,
          therapist.full_name,
          commissionAmount,
          paymentPeriod
        )
        break

      case "warning_3_days_after":
        // Update payment status to overdue if not already
        if (payment.status === "pending") {
          await supabase
            .from("therapist_payments")
            .update({ status: "overdue" })
            .eq("id", paymentId)

          // Apply ranking penalty
          await supabase.rpc('process_payment_status', {
            p_payment_id: paymentId,
            p_status: 'overdue',
            p_therapist_id: therapistId
          })

          console.log(`[Qstash Webhook] Payment ${paymentId} marked as overdue`)
        }

        emailResult = await sendPaymentWarningEmail(
          therapist.email,
          therapist.full_name,
          commissionAmount,
          paymentPeriod
        )
        break

      default:
        console.error(`[Qstash Webhook] Unknown stage: ${stage}`)
        return NextResponse.json({ error: "Unknown stage" }, { status: 400 })
    }

    if (!emailResult.success) {
      console.error(`[Qstash Webhook] Failed to send email for stage ${stage}:`, emailResult.error)
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }

    console.log(`[Qstash Webhook] Successfully sent ${stage} email for payment ${paymentId}`)
    return NextResponse.json({ ok: true, stage, paymentId })
  } catch (error: any) {
    console.error("[Qstash Webhook] Error processing payment notification:", error.message)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
