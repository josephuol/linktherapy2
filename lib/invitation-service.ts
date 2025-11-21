import { supabaseAdmin } from "@/lib/supabase-server"
import { sendTherapistInviteEmail } from "@/lib/email-service"

export type ResendInvitationResult =
  | { success: true; userId: string; emailId?: string }
  | { success: false; error: string; code: "USER_NOT_FOUND" | "ALREADY_CONFIRMED" | "LINK_GENERATION_FAILED" | "EMAIL_SEND_FAILED" | "UNKNOWN_ERROR"; confirmedAt?: string }

/**
 * Resend invitation email to a therapist who was previously invited but hasn't confirmed
 *
 * @param email - The email address of the therapist
 * @param options - Optional configuration
 * @returns Result object indicating success or failure with relevant details
 *
 * @example
 * ```typescript
 * import { resendTherapistInvitation } from "@/lib/invitation-service"
 *
 * const result = await resendTherapistInvitation("therapist@example.com")
 *
 * if (result.success) {
 *   console.log("Invitation resent to user:", result.userId)
 * } else {
 *   switch (result.code) {
 *     case "USER_NOT_FOUND":
 *       // Handle: user needs to be invited first
 *       break
 *     case "ALREADY_CONFIRMED":
 *       // Handle: user already has an account, suggest password reset
 *       break
 *     case "LINK_GENERATION_FAILED":
 *     case "EMAIL_SEND_FAILED":
 *       // Handle: technical error, retry or contact support
 *       break
 *   }
 * }
 * ```
 */
export async function resendTherapistInvitation(
  email: string,
  options?: {
    redirectPath?: string // Default: "/onboarding/therapist"
  }
): Promise<ResendInvitationResult> {
  const supabase = supabaseAdmin()
  const normalizedEmail = email.toLowerCase().trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const redirectPath = options?.redirectPath || "/onboarding/therapist"
  const redirectTo = `${siteUrl}/auth/callback?next=${redirectPath}`

  try {
    // Find the user by email
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("[Invitation Service] Error listing users:", listError)
      return {
        success: false,
        error: "Failed to check user status",
        code: "UNKNOWN_ERROR"
      }
    }

    const existingUser = userData.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    // User doesn't exist - need to invite first
    if (!existingUser) {
      return {
        success: false,
        error: "No invitation exists for this email. Send a new invitation first.",
        code: "USER_NOT_FOUND"
      }
    }

    // User already confirmed their email
    if (existingUser.email_confirmed_at) {
      return {
        success: false,
        error: "User has already confirmed their email. Use password reset instead.",
        code: "ALREADY_CONFIRMED",
        confirmedAt: existingUser.email_confirmed_at
      }
    }

    // Generate new invite link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[Invitation Service] Error generating link:", linkError)
      return {
        success: false,
        error: linkError?.message || "Failed to generate invitation link",
        code: "LINK_GENERATION_FAILED"
      }
    }

    // Send email
    const emailResult = await sendTherapistInviteEmail(normalizedEmail, linkData.properties.action_link)

    if (!emailResult.success) {
      console.error("[Invitation Service] Email send failed:", emailResult.error)
      return {
        success: false,
        error: emailResult.error || "Failed to send invitation email",
        code: "EMAIL_SEND_FAILED"
      }
    }

    return {
      success: true,
      userId: existingUser.id,
      emailId: emailResult.emailId
    }

  } catch (error: any) {
    console.error("[Invitation Service] Unexpected error:", error)
    return {
      success: false,
      error: error?.message || "An unexpected error occurred",
      code: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Check invitation status for an email
 *
 * @param email - The email address to check
 * @returns Status information about the invitation
 */
export async function checkInvitationStatus(email: string): Promise<{
  exists: boolean
  confirmed: boolean
  userId?: string
  confirmedAt?: string
  createdAt?: string
  lastSignInAt?: string
}> {
  const supabase = supabaseAdmin()
  const normalizedEmail = email.toLowerCase().trim()

  try {
    const { data: userData, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("[Invitation Service] Error checking status:", error)
      return { exists: false, confirmed: false }
    }

    const user = userData.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (!user) {
      return { exists: false, confirmed: false }
    }

    return {
      exists: true,
      confirmed: !!user.email_confirmed_at,
      userId: user.id,
      confirmedAt: user.email_confirmed_at || undefined,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || undefined
    }
  } catch (error) {
    console.error("[Invitation Service] Error checking status:", error)
    return { exists: false, confirmed: false }
  }
}
