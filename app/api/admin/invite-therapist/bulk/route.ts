import { NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { sendTherapistInviteEmail } from "@/lib/email-service"

const schema = z.object({ emails: z.array(z.string().email()).max(30) })

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const supabase = supabaseAdmin()

  // Get site URL - use production domain as fallback
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://linktherapy.org"
  const results: { email: string; status: "ok" | "error"; message?: string }[] = []

  for (const emailRaw of parsed.data.emails) {
    const email = emailRaw.toLowerCase().trim()

    try {
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

        // Generate magic link URL
        const inviteUrl = `${siteUrl}/invite/accept?token=${inviteToken}`

        // Send email via Resend
        const emailResult = await sendTherapistInviteEmail(email, inviteUrl)
        if (!emailResult.success) {
          results.push({ email, status: "error", message: emailResult.error || "Failed to send email" })
          continue
        }

        await supabase.from("admin_audit_logs").insert({
          actor_admin_id: authCheck.user?.id || null,
          action: "therapist_invitation_resent",
          target_email: email,
          details: { method: "bulk", send_count: existingInvite.send_count + 1 }
        })

        results.push({ email, status: "ok", message: "Resent invitation" })
        continue
      }

      // Generate new cryptographically secure invite token (64 characters)
      inviteToken = randomBytes(32).toString("hex")

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
        console.error("[Bulk Invite] Failed to create invitation:", inviteErr.message)
        results.push({ email, status: "error", message: inviteErr.message })
        continue
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

        results.push({ email, status: "error", message: emailResult.error || "Failed to send email" })
        continue
      }

      // Log admin action
      await supabase.from("admin_audit_logs").insert({
        actor_admin_id: authCheck.user?.id || null,
        action: "therapist_invited",
        target_email: email,
        details: {
          method: "bulk",
          invite_token: inviteToken.slice(0, 8) + "..."
        }
      })

      results.push({ email, status: "ok" })

    } catch (error: any) {
      console.error(`[Bulk Invite] Error processing ${email}:`, error)
      results.push({ email, status: "error", message: error?.message || "Unexpected error" })
    }
  }

  return NextResponse.json({ results })
}


