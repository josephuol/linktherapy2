import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export async function GET(req: Request) {
  // Optional: simple bearer admin check via Supabase user role - skipped here; rely on client page auth
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined })
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  const supabase = supabaseAdmin()

  const from = parsed.data.from || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const to = parsed.data.to || new Date().toISOString()

  const { data: events, error } = await supabase
    .from("match_events")
    .select("id, created_at, problem, city, area, gender, lgbtq, religion, exp_band, price_min, price_max, session_id")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const counts = <T extends string | null | undefined>(arr: T[]) => {
    const map: Record<string, number> = {}
    for (const v of arr) {
      const k = (v || "—").toString()
      map[k] = (map[k] || 0) + 1
    }
    return map
  }

  const total = events?.length || 0
  const problems = counts((events || []).map(e => e.problem))
  const cities = counts((events || []).map(e => e.city))
  const areas = counts((events || []).map(e => e.area))
  const genders = counts((events || []).map(e => e.gender))
  const lgbtq = counts((events || []).map(e => e.lgbtq))
  const religions = counts((events || []).map(e => e.religion))
  const expBands = counts((events || []).map(e => e.exp_band))

  const prices = (events || []).map(e => [Number(e.price_min || 0), Number(e.price_max || 0)])

  // Basic conversion: sessions with a subsequent contact_request by same session_id
  const sessionIds = Array.from(new Set((events || []).map(e => e.session_id).filter(Boolean)))
  let conversions = 0
  if (sessionIds.length > 0) {
    const { data: cr } = await supabase.from("contact_requests").select("session_id").in("session_id", sessionIds)
    const crSet = new Set((cr || []).map(r => r.session_id))
    conversions = sessionIds.filter(id => crSet.has(id)).length
  }

  return NextResponse.json({
    from,
    to,
    total,
    problems,
    cities,
    areas,
    genders,
    lgbtq,
    religions,
    expBands,
    prices,
    conversions,
  })
}


