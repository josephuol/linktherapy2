import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sendContactRequestNotificationEmail } from "@/lib/email-service"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"

const payloadSchema = z.object({
  therapist_id: z.string().uuid(),
  client_name: z.string().min(1).max(100),
  client_email: z.string().email(),
  client_phone: z.string().max(20).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
  session_id: z.string().optional().nullable(),
  // Honeypot field - should be empty
  website: z.string().max(0).optional(),
})

export async function POST(req: Request) {
  // Rate limiting - 5 requests per hour per IP
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip, "contactRequest")

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        resetAt: rateCheck.resetAt?.toISOString()
      },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  // Honeypot check - if filled, it's likely a bot
  if (parsed.data.website) {
    console.warn(`[Contact Request] Honeypot triggered from IP ${ip}`)
    // Return success to avoid bot detection, but don't process
    return NextResponse.json({ request: { id: "blocked" } })
  }
  const supabase = supabaseAdmin()

  // Validate therapist exists and is active
  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("user_id, status")
    .eq("user_id", parsed.data.therapist_id)
    .eq("status", "active")
    .single()

  if (therapistError || !therapist) {
    return NextResponse.json(
      { error: "Therapist not found or not accepting new clients" },
      { status: 404 }
    )
  }

  const { data, error } = await supabase.from("contact_requests").insert({
    therapist_id: parsed.data.therapist_id,
    client_name: parsed.data.client_name,
    client_email: parsed.data.client_email,
    client_phone: parsed.data.client_phone ?? null,
    message: parsed.data.message ?? null,
    status: "new",
    session_id: parsed.data.session_id ?? null,
  }).select("*").single()

  if (error) {
    console.error("[Contact Request] Database error:", error)
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }

  // Send email notification to therapist
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", parsed.data.therapist_id)
      .single()

    if (profile?.email) {
      // Get site URL - prioritize NEXT_PUBLIC_SITE_URL, fallback to VERCEL_URL
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (!siteUrl && process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`
      }
      if (!siteUrl) {
        console.error("[Contact Request] No site URL available, cannot send notification email")
        // Don't fail the request, just skip email notification
        return NextResponse.json({ request: data })
      }
      const dashboardUrl = `${siteUrl}/dashboard`
      
      await sendContactRequestNotificationEmail(
        profile.email,
        parsed.data.client_name,
        parsed.data.client_email,
        parsed.data.client_phone ?? null,
        parsed.data.message ?? null,
        dashboardUrl
      )
    }
  } catch (emailError: any) {
    // Log email error but don't fail the request
    console.error("[Contact Request API] Failed to send notification email:", emailError?.message || "Unknown error")
  }

  return NextResponse.json({ request: data })
}


