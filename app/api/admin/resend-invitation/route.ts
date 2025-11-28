import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { sendTherapistInviteEmail } from "@/lib/email-service"

const schema = z.object({ email: z.string().email() })

/**
 * Resend invitation email to a therapist using the magic link system
 *
 * This endpoint looks up the existing pending invitation and resends the magic link.
 * If no pending invitation exists, it returns an error.
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

  // Get site URL - prioritize NEXT_PUBLIC_SITE_URL, fallback to VERCEL_URL
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl && process.env.VERCEL_URL) {
    siteUrl = `https://${process.env.VERCEL_URL}`
  }
  if (!siteUrl) {
    console.error("[Resend Invitation] No site URL available (NEXT_PUBLIC_SITE_URL or VERCEL_URL)")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    // Check if there's a pending invitation
    const { data: existingInvite, error: inviteError } = await supabase
      .from("therapist_invitations")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .single()

    if (inviteError || !existingInvite) {
      return NextResponse.json(
        {
          error: "No pending invitation found",
          message: "No pending invitation exists for this email. Use the invite-therapist endpoint to send a new invitation."
        },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (existingInvite.expires_at && new Date(existingInvite.expires_at) < new Date()) {
      await supabase
        .from("therapist_invitations")
        .update({ status: "expired" })
        .eq("id", existingInvite.id)

      return NextResponse.json(
        {
          error: "Invitation expired",
          message: "This invitation has expired. Use the invite-therapist endpoint to send a new invitation."
        },
        { status: 400 }
      )
    }

    const inviteToken = existingInvite.token_hash

    // Update last_sent_at and send_count
    await supabase
      .from("therapist_invitations")
      .update({
        last_sent_at: new Date().toISOString(),
        send_count: existingInvite.send_count + 1
      })
      .eq("id", existingInvite.id)

    // Generate magic link URL
    const inviteUrl = `${siteUrl}/invite/accept?token=${inviteToken}`

    // Send email via Resend
    const emailResult = await sendTherapistInviteEmail(email, inviteUrl)

    if (!emailResult.success) {
      console.error("[Resend Invitation] Email send failed:", emailResult.error)

      // Mark invitation as failed
      await supabase
        .from("therapist_invitations")
        .update({
          status: "undeliverable",
          failure_reason: emailResult.error
        })
        .eq("id", existingInvite.id)

      return NextResponse.json(
        { error: emailResult.error || "Failed to send invitation email" },
        { status: 500 }
      )
    }

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: authCheck.user?.id || null,
      action: "therapist_invitation_resent",
      target_email: email,
      details: {
        invite_token: inviteToken.slice(0, 8) + "...",
        send_count: existingInvite.send_count + 1
      }
    })

    return NextResponse.json({
      ok: true,
      message: "Invitation email resent successfully",
      email_id: emailResult.emailId,
      send_count: existingInvite.send_count + 1
    })

  } catch (error: any) {
    console.error("[Resend Invitation] Unexpected error:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
