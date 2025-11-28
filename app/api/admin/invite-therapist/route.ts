import { NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { sendTherapistInviteEmail } from "@/lib/email-service"

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

  const supabase = supabaseAdmin()

  // Get site URL - use production domain as fallback
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://linktherapy.org"
  const email = parsed.data.email.toLowerCase().trim()

  // Check if there's already a pending invitation
  const { data: existingInvite } = await supabase
    .from("therapist_invitations")
    .select("*")
    .eq("email", email)
    .eq("status", "pending")
    .single()

  let inviteToken: string

  if (existingInvite) {
    // Resend existing invitation
    inviteToken = existingInvite.token_hash

    // Update last_sent_at and send_count
    await supabase
      .from("therapist_invitations")
      .update({
        last_sent_at: new Date().toISOString(),
        send_count: existingInvite.send_count + 1
      })
      .eq("id", existingInvite.id)
  } else {
    // Generate new cryptographically secure invite token (64 characters)
    inviteToken = randomBytes(32).toString("hex")

    // Get admin user ID for audit trail
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    // Create new invitation record
    // Note: invited_by_admin_id set to null to avoid FK constraint until DB is fixed
    const { error: inviteErr } = await supabase
      .from("therapist_invitations")
      .insert({
        email,
        token_hash: inviteToken,
        status: "pending",
        invited_by_admin_id: null,
        invited_at: new Date().toISOString(),
        last_sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        send_count: 1
      })

    if (inviteErr) {
      console.error("[Invite] Failed to create invitation:", inviteErr.message)
      return NextResponse.json({ error: inviteErr.message }, { status: 400 })
    }

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: adminUser?.id,
      action: "therapist_invited",
      target_email: email,
      details: { invite_token: inviteToken.slice(0, 8) + "..." } // Only log first 8 chars
    })
  }

  // Generate magic link URL
  const inviteUrl = `${siteUrl}/invite/accept?token=${inviteToken}`

  // Send email via Resend
  const emailResult = await sendTherapistInviteEmail(email, inviteUrl)
  if (!emailResult.success) {
    // Mark invitation as failed
    await supabase
      .from("therapist_invitations")
      .update({
        status: "undeliverable",
        failure_reason: emailResult.error
      })
      .eq("token_hash", inviteToken)

    return NextResponse.json({ error: emailResult.error || "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    resent: !!existingInvite,
    email_id: emailResult.emailId
  })
}


