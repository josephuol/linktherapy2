import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

/**
 * POST /api/admin/payments/create-test
 * Creates a test payment record for testing purposes
 */
export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    // Get the first active therapist
    const { data: therapists, error: therapistError } = await supabase
      .from("therapists")
      .select("user_id, full_name")
      .eq("status", "active")
      .limit(1)
      .single()

    if (therapistError || !therapists) {
      return NextResponse.json({ 
        error: "No active therapists found. Create a therapist first." 
      }, { status: 400 })
    }

    // Create a test payment for current period
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 19)

    const testPayment = {
      therapist_id: therapists.user_id,
      payment_period_start: periodStart.toISOString().split('T')[0],
      payment_period_end: periodEnd.toISOString().split('T')[0],
      total_sessions: 5,
      commission_amount: 250, // 5 sessions * $50
      payment_due_date: dueDate.toISOString(),
      status: "pending",
      admin_notes: "TEST PAYMENT - Created for testing purposes"
    }

    const { data: payment, error: paymentError } = await supabase
      .from("therapist_payments")
      .insert(testPayment)
      .select()
      .single()

    if (paymentError) {
      console.error("Error creating test payment:", paymentError)
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      payment: payment,
      message: `Test payment created for ${therapists.full_name}`,
      instructions: "You can now test marking it as paid!"
    })
  } catch (e: any) {
    console.error("Error in create-test:", e)
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}

