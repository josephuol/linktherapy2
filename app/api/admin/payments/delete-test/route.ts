import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

/**
 * POST /api/admin/payments/delete-test
 * Deletes all test payments (where admin_notes contains "TEST PAYMENT")
 */
export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    // Delete all test payments
    const { data, error } = await supabase
      .from("therapist_payments")
      .delete()
      .like("admin_notes", "%TEST PAYMENT%")
      .select()

    if (error) {
      console.error("Error deleting test payments:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted: data?.length || 0,
      message: `Deleted ${data?.length || 0} test payment(s)`
    })
  } catch (e: any) {
    console.error("Error in delete-test:", e)
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}

