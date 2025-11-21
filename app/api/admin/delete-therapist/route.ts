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
    // Delete related records first (order matters due to foreign keys)

    // Delete therapist_locations
    await supabase.from("therapist_locations").delete().eq("therapist_id", user_id)

    // Delete therapist_notifications
    await supabase.from("therapist_notifications").delete().eq("therapist_id", user_id)

    // Delete therapist_ranking_history
    await supabase.from("therapist_ranking_history").delete().eq("therapist_id", user_id)

    // Delete therapist_metrics
    await supabase.from("therapist_metrics").delete().eq("therapist_id", user_id)

    // Delete therapist_payments
    await supabase.from("therapist_payments").delete().eq("therapist_id", user_id)

    // Delete therapist_payment_actions (need to get payment IDs first)
    const { data: payments } = await supabase
      .from("therapist_payments")
      .select("id")
      .eq("therapist_id", user_id)
    if (payments && payments.length > 0) {
      const paymentIds = payments.map(p => p.id)
      await supabase.from("therapist_payment_actions").delete().in("payment_id", paymentIds)
    }

    // Delete sessions
    await supabase.from("sessions").delete().eq("therapist_id", user_id)

    // Delete contact_requests
    await supabase.from("contact_requests").delete().eq("therapist_id", user_id)

    // Delete therapists record
    await supabase.from("therapists").delete().eq("user_id", user_id)

    // Delete profiles record
    await supabase.from("profiles").delete().eq("user_id", user_id)

    // Finally, delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
    if (authError) {
      console.error("Error deleting auth user:", authError)
      // Don't throw - the database records are already deleted
      // The auth user might have been deleted already or not exist
    }

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
