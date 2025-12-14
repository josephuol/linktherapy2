import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()
  const url = new URL(req.url)

  // Parse query parameters
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)))
  const search = url.searchParams.get("search")?.trim().toLowerCase() || ""
  const status = url.searchParams.get("status") || "all"
  const sort = url.searchParams.get("sort") || "ranking" // ranking, sessions, name, date

  // First, get total count for pagination metadata
  let countQuery = supabase
    .from("profiles")
    .select("user_id", { count: 'exact', head: true })
    .eq("role", "therapist")

  const { count: totalCount } = await countQuery

  // Fetch profiles with role='therapist'
  let profilesQuery = supabase
    .from("profiles")
    .select("user_id, email, full_name, created_at")
    .eq("role", "therapist")
    .order("created_at", { ascending: false })

  const { data: profilesData, error: profilesError } = await profilesQuery

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError)
    return NextResponse.json({ error: "Failed to fetch therapist profiles" }, { status: 500 })
  }

  if (!profilesData || profilesData.length === 0) {
    return NextResponse.json({
      therapists: [],
      meta: { total: 0, page, limit, totalPages: 0 }
    })
  }

  const userIds = profilesData.map(p => p.user_id)

  // Fetch therapist details for those who have completed onboarding
  const { data: therapistsData } = await supabase
    .from("therapists")
    .select("user_id, full_name, title, status, ranking_points, total_sessions, churn_rate_monthly, session_price_45_min, custom_commission_rate")
    .in("user_id", userIds)

  // Fetch last active time for each therapist (most recent session)
  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("therapist_id, session_date")
    .in("therapist_id", userIds)
    .order("session_date", { ascending: false })

  // Create maps for quick lookup
  const therapistMap = new Map(therapistsData?.map(t => [t.user_id, t]) || [])
  const lastActiveMap = new Map<string, string>()

  if (sessionsData) {
    for (const session of sessionsData) {
      if (!lastActiveMap.has(session.therapist_id)) {
        lastActiveMap.set(session.therapist_id, session.session_date)
      }
    }
  }

  // Merge profiles with therapist data
  let allTherapists = profilesData.map(profile => {
    const therapist = therapistMap.get(profile.user_id)

    return {
      user_id: profile.user_id,
      email: profile.email,
      full_name: therapist?.full_name || profile.full_name || "(Pending Onboarding)",
      title: therapist?.title || null,
      status: therapist?.status || "not_onboarded",
      ranking_points: therapist?.ranking_points || 0,
      total_sessions: therapist?.total_sessions || 0,
      churn_rate_monthly: therapist?.churn_rate_monthly || 0,
      last_active: lastActiveMap.get(profile.user_id) || null,
      has_completed_onboarding: !!therapist,
      created_at: profile.created_at,
      session_price_45_min: therapist?.session_price_45_min || null,
      custom_commission_rate: therapist?.custom_commission_rate || null
    }
  })

  // Apply status filter
  if (status !== "all") {
    allTherapists = allTherapists.filter(t => t.status === status)
  }

  // Apply search filter
  if (search) {
    allTherapists = allTherapists.filter(t =>
      t.full_name?.toLowerCase().includes(search) ||
      t.email?.toLowerCase().includes(search) ||
      t.title?.toLowerCase().includes(search)
    )
  }

  // Sort based on parameter
  switch (sort) {
    case "sessions":
      allTherapists.sort((a, b) => b.total_sessions - a.total_sessions)
      break
    case "name":
      allTherapists.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
      break
    case "date":
      allTherapists.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      break
    case "ranking":
    default:
      allTherapists.sort((a, b) => b.ranking_points - a.ranking_points)
      break
  }

  // Calculate pagination
  const filteredTotal = allTherapists.length
  const totalPages = Math.ceil(filteredTotal / limit)
  const offset = (page - 1) * limit
  const paginatedTherapists = allTherapists.slice(offset, offset + limit)

  console.log(`[Admin API] Returning ${paginatedTherapists.length} therapists (page ${page}/${totalPages}, filtered: ${filteredTotal}/${totalCount})`)

  return NextResponse.json({
    therapists: paginatedTherapists,
    meta: {
      total: totalCount || 0,
      filtered: filteredTotal,
      page,
      limit,
      totalPages
    }
  })
}
