import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  // Use admin client to bypass RLS and get ALL therapists
  const { data: therapists, error: therapistsError, count } = await supabase
    .from("therapists")
    .select("user_id, full_name, title, status, ranking_points, total_sessions, churn_rate_monthly", { count: 'exact' })
    .order("ranking_points", { ascending: false })
    .limit(10000) // High limit to ensure we get all therapists

  if (therapistsError) {
    console.error("Error fetching therapists:", therapistsError)
    return NextResponse.json({ error: "Failed to fetch therapists" }, { status: 500 })
  }

  if (!therapists || therapists.length === 0) {
    return NextResponse.json({ therapists: [], count: 0 })
  }

  // Fetch profiles for all therapist user_ids to get emails
  const userIds = therapists.map(t => t.user_id)
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds)

  // Fetch last active time for each therapist (most recent session)
  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("therapist_id, session_date")
    .in("therapist_id", userIds)
    .order("session_date", { ascending: false })

  // Create map of therapist_id to most recent session date
  const lastActiveMap = new Map<string, string>()
  if (sessionsData) {
    for (const session of sessionsData) {
      if (!lastActiveMap.has(session.therapist_id)) {
        lastActiveMap.set(session.therapist_id, session.session_date)
      }
    }
  }

  // Create a map of user_id to email for quick lookup
  const emailMap = new Map(profilesData?.map(p => [p.user_id, p.email]) || [])

  // Merge therapists with their emails and last active
  const therapistsWithEmail = therapists.map(t => ({
    ...t,
    email: emailMap.get(t.user_id) || null,
    last_active: lastActiveMap.get(t.user_id) || null
  }))

  return NextResponse.json({
    therapists: therapistsWithEmail,
    count: count || 0
  })
}
