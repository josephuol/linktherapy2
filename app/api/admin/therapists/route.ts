import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  // Fetch ALL profiles with role='therapist' to ensure we don't miss anyone
  const { data: profilesData, error: profilesError, count: profilesCount } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, created_at", { count: 'exact' })
    .eq("role", "therapist")
    .order("created_at", { ascending: false })
    .limit(10000)

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError)
    return NextResponse.json({ error: "Failed to fetch therapist profiles" }, { status: 500 })
  }

  if (!profilesData || profilesData.length === 0) {
    return NextResponse.json({ therapists: [], count: 0 })
  }

  console.log(`[Admin API] Found ${profilesData.length} profiles with role='therapist'`)

  const userIds = profilesData.map(p => p.user_id)

  // Fetch therapist details for those who have completed onboarding
  const { data: therapistsData } = await supabase
    .from("therapists")
    .select("user_id, full_name, title, status, ranking_points, total_sessions, churn_rate_monthly")
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
  const allTherapists = profilesData.map(profile => {
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
      has_completed_onboarding: !!therapist
    }
  })

  // Sort by ranking points (descending), then by created date
  allTherapists.sort((a, b) => {
    if (b.ranking_points !== a.ranking_points) {
      return b.ranking_points - a.ranking_points
    }
    return 0
  })

  console.log(`[Admin API] Returning ${allTherapists.length} total therapists (${allTherapists.filter(t => !t.has_completed_onboarding).length} pending onboarding)`)

  return NextResponse.json({
    therapists: allTherapists,
    count: profilesCount || 0
  })
}
