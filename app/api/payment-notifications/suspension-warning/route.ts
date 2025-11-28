import { NextResponse } from "next/server"
import { qstashReceiver } from "@/lib/qstash"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sendPaymentSuspensionWarningEmail } from "@/lib/email-service"

// Get site URL - use production domain as fallback
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://linktherapy.org"

export async function POST(req: Request) {

  try {
    // Verify QStash signature
    const signature = req.headers.get("upstash-signature") || req.headers.get("Upstash-Signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    const body = await req.text()
    try {
      await qstashReceiver.verify({ signature, body })
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the body
    const data = JSON.parse(body) as { payment_id: string; therapist_id: string }

    if (!data.payment_id || !data.therapist_id) {
      return NextResponse.json({ error: "Missing payment_id or therapist_id" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from("therapist_payments")
      .select("*")
      .eq("id", data.payment_id)
      .single()

    if (paymentError || !payment) {
      console.error("[Payment Notification] Payment not found:", paymentError?.message)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Check if payment is still pending/overdue (don't send if already completed)
    if (payment.status === "completed") {
      console.log("[Payment Notification] Payment already completed, skipping suspension warning")
      return NextResponse.json({ ok: true, skipped: true, reason: "Payment already completed" })
    }

    // Fetch therapist info
    const { data: therapist, error: therapistError } = await supabase
      .from("therapists")
      .select("user_id, full_name")
      .eq("user_id", data.therapist_id)
      .single()

    if (therapistError || !therapist) {
      console.error("[Payment Notification] Therapist not found:", therapistError?.message)
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Fetch therapist email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", data.therapist_id)
      .single()

    if (profileError || !profile?.email) {
      console.error("[Payment Notification] Therapist email not found:", profileError?.message)
      return NextResponse.json({ error: "Therapist email not found" }, { status: 404 })
    }

    // Send email
    const dashboardUrl = `${SITE_URL}/dashboard`
    const commissionAmount = Number(payment.commission_amount) || 0

    const emailResult = await sendPaymentSuspensionWarningEmail(
      profile.email,
      therapist.full_name || "Therapist",
      commissionAmount,
      dashboardUrl
    )

    if (!emailResult.success) {
      console.error("[Payment Notification] Failed to send email:", emailResult.error)
      return NextResponse.json({ error: emailResult.error || "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Suspension warning sent successfully" })
  } catch (error: any) {
    console.error("[Payment Notification] Exception:", error?.message || "Unknown error")
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}


