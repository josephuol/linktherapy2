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
    // Accept month parameter from query string (format: YYYY-MM)
    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month')

    // Default to current month if no parameter
    const targetDate = monthParam ? new Date(monthParam + '-01') : new Date()
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()

    // Get first and last day of the selected month
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0) // Last day of month

    const { data, error } = await supabase
      .from("therapist_payments")
      .select(`
        *,
        therapists!inner(full_name)
      `)
      .gte("payment_period_start", monthStart.toISOString().split('T')[0])
      .lte("payment_period_start", monthEnd.toISOString().split('T')[0])
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

