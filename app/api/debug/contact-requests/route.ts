import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

export async function GET() {
  // Verify admin access
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    // Test 1: Count total contact requests
    const { count: totalCount, error: countError } = await supabase
      .from("contact_requests")
      .select("*", { count: "exact", head: true })

    if (countError) {
      return NextResponse.json({
        error: "Error counting contact requests",
        details: countError
      }, { status: 500 })
    }

    // Test 2: Fetch all contact requests without join
    const { data: simpleRequests, error: simpleError } = await supabase
      .from("contact_requests")
      .select("id, client_name, client_email, status, therapist_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    if (simpleError) {
      return NextResponse.json({
        error: "Error fetching simple requests",
        details: simpleError
      }, { status: 500 })
    }

    // Test 3: Fetch with therapist join (using explicit therapist_id column)
    const { data: requestsWithJoin, error: joinError } = await supabase
      .from("contact_requests")
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        message,
        status,
        rejection_reason,
        response_time_hours,
        responded_at,
        session_id,
        created_at,
        therapist:therapists!therapist_id(user_id, full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    // Test 4: Check therapists table
    const { count: therapistCount, error: therapistError } = await supabase
      .from("therapists")
      .select("*", { count: "exact", head: true })

    if (therapistError) {
      return NextResponse.json({
        error: "Error counting therapists",
        details: therapistError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      totalContactRequests: totalCount,
      totalTherapists: therapistCount,
      simpleRequests: simpleRequests || [],
      requestsWithJoin: requestsWithJoin || [],
      joinError: joinError ? { message: joinError.message, code: joinError.code, details: joinError.details } : null,
      statusBreakdown: {
        new: simpleRequests?.filter(r => r.status === 'new').length || 0,
        contacted: simpleRequests?.filter(r => r.status === 'contacted').length || 0,
        accepted: simpleRequests?.filter(r => r.status === 'accepted').length || 0,
        rejected: simpleRequests?.filter(r => r.status === 'rejected').length || 0,
        scheduled: simpleRequests?.filter(r => r.status === 'scheduled').length || 0,
        closed: simpleRequests?.filter(r => r.status === 'closed').length || 0,
      }
    })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
