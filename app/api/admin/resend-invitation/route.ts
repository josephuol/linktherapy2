import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { sendTherapistInviteEmail } from "@/lib/email-service"

const schema = z.object({ email: z.string().email() })

/**
 * Resend invitation email to a therapist
 *
 * Handles the following scenarios:
 * 1. User exists but hasn't confirmed email - generates new invite link
 * 2. User exists and already confirmed - returns error (should use password reset)
 * 3. User doesn't exist - returns error (should use invite-therapist endpoint)
 */
export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const email = parsed.data.email.toLowerCase().trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const redirectTo = `${siteUrl}/auth/callback?next=/onboarding/therapist`

  try {
    // Check if user exists and their confirmation status
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("[Resend Invitation] Error listing users:", listError)
      return NextResponse.json({ error: "Failed to check user status" }, { status: 500 })
    }

    const existingUser = userData.users.find(
      (u) => u.email?.toLowerCase() === email
    )

    if (!existingUser) {
      return NextResponse.json(
        {
          error: "User not found",
          message: "No invitation exists for this email. Use the invite-therapist endpoint to send a new invitation."
        },
        { status: 404 }
      )
    }

    // Check if user has already confirmed their email
    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        {
          error: "User already confirmed",
          message: "This user has already confirmed their email. Use password reset if they need to regain access.",
          confirmed_at: existingUser.email_confirmed_at
        },
        { status: 400 }
      )
    }

    // User exists but hasn't confirmed - generate new invite link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo,
      },
    })

    if (linkError) {
      console.error("[Resend Invitation] Error generating link:", linkError)
      return NextResponse.json(
        { error: linkError.message || "Failed to generate invitation link" },
        { status: 400 }
      )
    }

    if (!linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: "Failed to generate invitation link - no action link returned" },
        { status: 500 }
      )
    }

    // Send email via Resend
    const emailResult = await sendTherapistInviteEmail(email, linkData.properties.action_link)

    if (!emailResult.success) {
      console.error("[Resend Invitation] Email send failed:", emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Failed to send invitation email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Invitation email resent successfully",
      user_id: existingUser.id,
      email_id: emailResult.emailId
    })

  } catch (error: any) {
    console.error("[Resend Invitation] Unexpected error:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
