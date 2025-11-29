import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"

const payloadSchema = z.object({
  user_id: z.string().uuid(),
})

export async function POST(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck.error) return adminCheck.error

  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const { user_id } = parsed.data
  const supabase = supabaseAdmin()

  try {
    // First, try to delete the auth user - this is the most critical step
    // If this fails, we shouldn't delete anything else
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
    if (authError) {
      console.error("Error deleting auth user:", authError)
      return NextResponse.json({
        error: `Failed to delete auth user: ${authError.message}. The account may not exist or there may be a permissions issue.`
      }, { status: 500 })
    }

    // Delete related records (order matters due to foreign keys)
    // Note: therapist_payment_actions has ON DELETE CASCADE, so it will be auto-deleted

    // Delete therapist_locations
    await supabase.from("therapist_locations").delete().eq("therapist_id", user_id)

    // Delete therapist_specialties
    await supabase.from("therapist_specialties").delete().eq("therapist_id", user_id)

    // Delete therapist_notifications
    await supabase.from("therapist_notifications").delete().eq("therapist_id", user_id)

    // Delete therapist_ranking_history
    await supabase.from("therapist_ranking_history").delete().eq("therapist_id", user_id)

    // Delete ranking_point_adjustments
    await supabase.from("ranking_point_adjustments").delete().eq("therapist_id", user_id)

    // Delete therapist_metrics
    await supabase.from("therapist_metrics").delete().eq("therapist_id", user_id)

    // Delete therapist_bimonthly_checks
    await supabase.from("therapist_bimonthly_checks").delete().eq("therapist_id", user_id)

    // Delete reviews
    await supabase.from("reviews").delete().eq("therapist_id", user_id)

    // Delete therapist_payments (this will cascade delete therapist_payment_actions)
    await supabase.from("therapist_payments").delete().eq("therapist_id", user_id)

    // Delete sessions
    await supabase.from("sessions").delete().eq("therapist_id", user_id)

    // Delete contact_requests (both as therapist and assigned therapist)
    await supabase.from("contact_requests").delete().eq("therapist_id", user_id)
    await supabase.from("contact_requests").delete().eq("assigned_therapist_id", user_id)

    // Delete therapist_invitations that were accepted by this user
    // Changed from update to delete to allow re-invitation
    await supabase
      .from("therapist_invitations")
      .delete()
      .eq("accepted_user_id", user_id)

    // Delete therapists record
    await supabase.from("therapists").delete().eq("user_id", user_id)

    // Delete profiles record
    await supabase.from("profiles").delete().eq("user_id", user_id)

    return NextResponse.json({
      ok: true,
      message: "Therapist account fully deleted. You can now invite this email again."
    })
  } catch (error: any) {
    console.error("Error deleting therapist:", error)
    return NextResponse.json({
      error: error?.message || "Failed to delete therapist account"
    }, { status: 500 })
  }
}
