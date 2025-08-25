import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const schema = z.object({
  full_name: z.string().min(1),
  title: z.string().min(1),
  bio_short: z.string().min(1),
  bio_long: z.string().min(1),
  religion: z.enum(["Christian","Druze","Sunni","Shiite"]),
  age_range: z.enum(["21-28","29-36","37-45","46-55","55+"]),
  years_of_experience: z.number().int().min(0),
  languages: z.array(z.string().min(1)).min(1),
  interests: z.array(z.string().min(1)).min(1),
  session_price_60_min: z.number().min(0),
  session_price_30_min: z.number().min(0),
  profile_image_url: z.string().url().optional(),
  // New fields
  gender: z.enum(["male","female","other"]),
  lgbtq_friendly: z.boolean().optional(),
  locations: z.array(z.string().min(1)).min(1),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const supabase = supabaseAdmin()

  // Extract and verify Supabase JWT from Authorization header
  const authz = req.headers.get("authorization") || req.headers.get("Authorization")
  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : null
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.id) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  const userId = userData.user.id

  const { full_name, title, bio_short, bio_long, religion, age_range, years_of_experience, languages, interests, session_price_60_min, session_price_30_min, profile_image_url, gender, lgbtq_friendly, locations } = parsed.data

  const { error: profErr } = await supabase.from("profiles").upsert({ user_id: userId, full_name, terms_accepted_at: new Date().toISOString() }, { onConflict: "user_id" })
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })

  const { error: thErr } = await supabase
    .from("therapists")
    .update({
      full_name,
      title,
      bio_short,
      bio_long,
      religion,
      age_range,
      years_of_experience,
      languages,
      interests,
      session_price_60_min,
      session_price_30_min,
      profile_image_url,
      gender,
      lgbtq_friendly: typeof lgbtq_friendly === "boolean" ? lgbtq_friendly : undefined,
      status: 'active',
    })
    .eq("user_id", userId)
  if (thErr) return NextResponse.json({ error: thErr.message }, { status: 400 })

  // Link therapist to locations (create locations if missing)
  // 1) Clear existing links
  const { error: delErr } = await supabase
    .from("therapist_locations")
    .delete()
    .eq("therapist_id", userId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

  // 2) Ensure each location exists and collect IDs
  const locationIds: string[] = []
  for (const locNameRaw of locations) {
    const name = locNameRaw.trim()
    if (!name) continue
    // Try to find existing
    const { data: existing, error: findErr } = await supabase
      .from("locations")
      .select("id")
      .eq("name", name)
      .maybeSingle()
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 400 })
    if (existing?.id) {
      locationIds.push(existing.id)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("locations")
        .insert({ name })
        .select("id")
        .single()
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      if (inserted?.id) locationIds.push(inserted.id)
    }
  }

  if (locationIds.length > 0) {
    const rows = locationIds.map((location_id) => ({ therapist_id: userId, location_id }))
    const { error: linkErr } = await supabase.from("therapist_locations").insert(rows)
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  await supabase.from("admin_audit_logs").insert({ action: "therapist.complete_onboarding", target_user_id: userId })

  return NextResponse.json({ ok: true })
}


