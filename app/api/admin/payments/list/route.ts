import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

/**
 * GET /api/admin/payments/list
 * Fetch all payments for the current month
 */
export async function GET(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    // Get payments from last 6 months to current month
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from("therapist_payments")
      .select(`
        *,
        therapists!inner(full_name)
      `)
      .gte("payment_period_start", sixMonthsAgo.toISOString().split('T')[0])
      .order("payment_due_date", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const formattedData = data?.map((p: any) => ({
      ...p,
      therapist_name: p.therapists?.full_name
    })) || []

    // Fetch monthly commission from therapist_metrics for current month
    const metricsMonth = new Date().toISOString().slice(0, 7) + "-01"
    const therapistIds = Array.from(new Set(formattedData.map((p: any) => p.therapist_id))).filter(Boolean)
    let monthlyMap = new Map<string, number>()
    
    if (therapistIds.length > 0) {
      const { data: metrics } = await supabase
        .from("therapist_metrics")
        .select("therapist_id, commission_earned, month_year")
        .eq("month_year", metricsMonth)
        .in("therapist_id", therapistIds)
      
      for (const m of metrics || []) {
        monthlyMap.set(m.therapist_id, Number(m.commission_earned) || 0)
      }
    }

    const withMonthly = formattedData.map((p: any) => ({
      ...p,
      monthly_commission: monthlyMap.get(p.therapist_id) ?? 0
    }))

    return NextResponse.json({ payments: withMonthly })
  } catch (e: any) {
    console.error("Error in payments list:", e)
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}

