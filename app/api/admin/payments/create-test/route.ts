import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { scheduleAllPaymentNotifications } from "@/lib/qstash"

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

    // Create a test payment for current bi-monthly period (matching real payment creation)
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth()
    const day = now.getUTCDate()

    // Compute bi-monthly period bounds (matches recalc/route.ts logic)
    const isFirstHalf = day <= 15
    const periodStart = new Date(Date.UTC(year, month, isFirstHalf ? 1 : 16, 0, 0, 0, 0))
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const periodEnd = new Date(Date.UTC(year, month, isFirstHalf ? 15 : lastDayOfMonth, 23, 59, 59, 999))

    // Payment due dates: 4th for first half, 19th for second half (matching real logic)
    const dueDate = new Date(Date.UTC(year, month, isFirstHalf ? 4 : 19, 0, 0, 0, 0))

    const testSessions = 5
    const testPayment = {
      therapist_id: therapists.user_id,
      payment_period_start: periodStart.toISOString().split('T')[0],
      payment_period_end: periodEnd.toISOString().split('T')[0],
      total_sessions: testSessions,
      commission_amount: testSessions * ADMIN_COMMISSION_PER_SESSION, // 5 sessions * $6 = $30
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

    // Schedule payment notifications (matching real payment creation)
    if (payment?.id) {
      try {
        const scheduleResult = await scheduleAllPaymentNotifications(
          payment.id,
          therapists.user_id,
          dueDate
        )
        if (!scheduleResult.success && scheduleResult.errors) {
          console.error("[Test Payment] Failed to schedule some notifications:", scheduleResult.errors)
          // Don't fail the request if scheduling fails, just log it
        }
      } catch (scheduleError: any) {
        console.error("[Test Payment] Exception scheduling notifications:", scheduleError?.message)
        // Don't fail the request if scheduling fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      payment: payment,
      message: `Test payment created for ${therapists.full_name} (${isFirstHalf ? 'first' : 'second'} half of month)`,
      instructions: "Test payment created with Qstash notifications scheduled!"
    })
  } catch (e: any) {
    console.error("Error in create-test:", e)
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}

