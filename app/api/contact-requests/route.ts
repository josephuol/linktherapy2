import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sendContactRequestNotificationEmail } from "@/lib/email-service"

const payloadSchema = z.object({
  therapist_id: z.string().uuid(),
  client_name: z.string().min(1),
  client_email: z.string().email(),
  client_phone: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }
  const supabase = supabaseAdmin()
  const { data, error } = await supabase.from("contact_requests").insert({
    therapist_id: parsed.data.therapist_id,
    client_name: parsed.data.client_name,
    client_email: parsed.data.client_email,
    client_phone: parsed.data.client_phone ?? null,
    message: parsed.data.message ?? null,
    status: "new",
    session_id: parsed.data.session_id ?? null,
  }).select("*").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Send email notification to therapist
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", parsed.data.therapist_id)
      .single()

    if (profile?.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
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


