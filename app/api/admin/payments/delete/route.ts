import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

/**
 * DELETE /api/admin/payments/delete
 * Deletes a payment record and its associated payment actions
 */
export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.payment_id) {
      return NextResponse.json({ error: "Missing payment_id" }, { status: 400 })
    }

    const { payment_id } = body

    // First delete associated payment actions
    const { error: actionsError } = await supabase
      .from("therapist_payment_actions")
      .delete()
      .eq("payment_id", payment_id)

    if (actionsError) {
      console.error("Error deleting payment actions:", actionsError)
      // Continue anyway - payment might not have actions
    }

    // Delete the payment record
    const { error: paymentError } = await supabase
      .from("therapist_payments")
      .delete()
      .eq("id", payment_id)

    if (paymentError) {
      console.error("Error deleting payment:", paymentError)
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    // Audit log
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: authCheck.user?.id || null,
      action: "payments.delete",
      target_user_id: null,
      details: { payment_id }
    })

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully"
    })
  } catch (e: any) {
    console.error("Error in delete payment:", e)
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
