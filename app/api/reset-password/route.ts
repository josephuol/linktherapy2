import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sendPasswordResetEmail } from "@/lib/email-service"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  // Rate limiting - 10 attempts per 15 minutes per IP
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip, "authAction")

  if (!rateCheck.allowed) {
    // Don't reveal rate limit to prevent email enumeration
    // Always return success message
    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent."
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Get site URL - use production domain as fallback
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://linktherapy.org"

  // Generate password reset link using Supabase admin
  const redirectTo = `${siteUrl}/reset-password/confirm`
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: {
      redirectTo,
    },
  })

  // Always return success to prevent email enumeration
  // Even if user doesn't exist, we return the same response
  if (linkError) {
    // Log error for debugging but don't expose to user
    console.error("Error generating reset link:", linkError)
    return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." })
  }

  // Send password reset email via Resend
  const emailResult = await sendPasswordResetEmail(parsed.data.email, linkData.properties.action_link)
  if (!emailResult.success) {
    console.error("Error sending reset email:", emailResult.error)
    // Still return success to prevent email enumeration
    return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." })
  }

  return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." })
}

