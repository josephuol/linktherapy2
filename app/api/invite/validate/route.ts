import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const schema = z.object({ token: z.string().min(1) })

/**
 * Validate an invite token without consuming it
 * This endpoint is called by the frontend to check if an invite link is valid
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const token = parsed.data.token

  // Look up the invitation
  const { data: invitation, error } = await supabase
    .from("therapist_invitations")
    .select("*")
    .eq("token_hash", token)
    .single()

  if (error || !invitation) {
    return NextResponse.json({
      valid: false,
      error: "Invalid invite token"
    }, { status: 404 })
  }

  // Check if invitation is pending
  if (invitation.status !== "pending") {
    return NextResponse.json({
      valid: false,
      error: `Invitation already ${invitation.status}`,
      status: invitation.status
    }, { status: 400 })
  }

  // Check if invitation has expired
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from("therapist_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)

    return NextResponse.json({
      valid: false,
      error: "Invitation has expired"
    }, { status: 400 })
  }

  // Token is valid!
  return NextResponse.json({
    valid: true,
    email: invitation.email,
    invited_at: invitation.invited_at,
    expires_at: invitation.expires_at
  })
}
