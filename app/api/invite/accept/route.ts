import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, "Password must be at least 12 characters"),
})

/**
 * Accept a therapist invitation and create their account
 * This endpoint:
 * 1. Validates the invite token
 * 2. Creates a Supabase auth user with the provided password
 * 3. Creates profile and therapist records
 * 4. Marks the invitation as accepted
 * 5. Returns session tokens for auto-login
 */
export async function POST(req: Request) {
  // Rate limiting - 10 attempts per 15 minutes per IP
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip, "authAction")

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many attempts. Please try again later.",
        resetAt: rateCheck.resetAt?.toISOString()
      },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.errors[0]?.message || "Invalid request"
    }, { status: 400 })
  }

  const { token, password } = parsed.data
  const supabase = supabaseAdmin()

  // 1. Validate invite token
  const { data: invitation, error: inviteError } = await supabase
    .from("therapist_invitations")
    .select("*")
    .eq("token_hash", token)
    .eq("status", "pending")
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json({
      error: "Invalid or expired invitation"
    }, { status: 404 })
  }

  // Check expiration
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("therapist_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)

    return NextResponse.json({
      error: "Invitation has expired"
    }, { status: 400 })
  }

  const email = invitation.email

  // 2. Create Supabase auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email (bypass verification)
    user_metadata: {
      role: "therapist",
      invited_at: invitation.invited_at
    },
    app_metadata: {
      provider: "email"
    }
  })

  if (authError) {
    console.error("[Invite Accept] Failed to create auth user:", authError.message)

    // If user already exists, check if it's the same invitation
    if (authError.message.includes("already") || authError.message.includes("exists")) {
      return NextResponse.json({
        error: "An account with this email already exists. Please try logging in instead."
      }, { status: 409 })
    }

    return NextResponse.json({
      error: authError.message
    }, { status: 400 })
  }

  if (!authUser.user) {
    return NextResponse.json({
      error: "Failed to create user account"
    }, { status: 500 })
  }

  const userId = authUser.user.id

  // 3. Create profile record
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      email,
      role: "therapist"
    })

  if (profileError) {
    console.error("[Invite Accept] Failed to create profile:", profileError.message)
    // Don't fail - the user was created, we can fix the profile later
  }

  // 4. Create therapist record
  const { error: therapistError } = await supabase
    .from("therapists")
    .insert({
      user_id: userId,
      status: "pending" // Will be "active" after completing onboarding
    })

  if (therapistError) {
    console.error("[Invite Accept] Failed to create therapist:", therapistError.message)
    // Don't fail - the user was created, we can fix this later
  }

  // 5. Mark invitation as accepted
  await supabase
    .from("therapist_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_user_id: userId
    })
    .eq("id", invitation.id)

  // 6. User was created successfully - they can now log in with their password
  // We don't auto-login anymore since they just set their password
  return NextResponse.json({
    success: true,
    user_id: userId,
    message: "Account created successfully!",
    redirect: "/onboarding/therapist"
  })
}
