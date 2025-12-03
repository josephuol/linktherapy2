import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const schema = z.object({
  full_name: z.string().min(1),
  title: z.string().min(1),
  bio_short: z.string().min(1),
  bio_long: z.string().min(1),
  religion: z.enum(["Christian","Druze","Sunni","Shiite","Other"]),
  age_range: z.enum(["21-28","29-36","37-45","46-55","55+"]),
  years_of_experience: z.number().int().min(0),
  languages: z.array(z.string().min(1)).min(1),
  interests: z.array(z.string().min(1)).min(1),
  session_price_45_min: z.number().min(0),
  profile_image_url: z.string().url().optional(),
  // New fields
  gender: z.enum(["male","female","other"]),
  lgbtq_friendly: z.boolean().optional(),
  locations: z.array(z.string().min(1)).min(1).max(2),
  // Terms acceptance - REQUIRED
  accept_tos: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy"
  }),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error("[Onboarding] Validation failed:", parsed.error.errors)
    return NextResponse.json({
      error: "Invalid input: " + parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Extract and verify Supabase JWT from Authorization header
  const authz = req.headers.get("authorization") || req.headers.get("Authorization")
  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : null
  if (!token) {
    console.error("[Onboarding] Missing authorization token")
    return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.id) {
    console.error("[Onboarding] Invalid token:", userErr?.message)
    return NextResponse.json({ error: "Invalid token: " + (userErr?.message || "User not found") }, { status: 401 })
  }
  const userId = userData.user.id
  const userEmail = userData.user.email

  console.log(`[Onboarding] Processing onboarding for user ${userId} (${userEmail})`)

  const { full_name, title, bio_short, bio_long, religion, age_range, years_of_experience, languages, interests, session_price_45_min, profile_image_url, gender, lgbtq_friendly, locations } = parsed.data

  // Update profile with email and terms acceptance
  console.log(`[Onboarding] Upserting profile for user ${userId}`)
  const { error: profErr } = await supabase.from("profiles").upsert({
    user_id: userId,
    email: userEmail,
    full_name,
    terms_accepted_at: new Date().toISOString()
  }, { onConflict: "user_id" })
  if (profErr) {
    console.error("[Onboarding] Failed to upsert profile:", profErr.message, profErr)
    return NextResponse.json({ error: "Profile update failed: " + profErr.message }, { status: 400 })
  }
  console.log(`[Onboarding] Profile upserted successfully`)

  console.log(`[Onboarding] Upserting therapist record for user ${userId}`)
  const { error: thErr } = await supabase
    .from("therapists")
    .upsert({
      user_id: userId,
      full_name,
      title,
      bio_short,
      bio_long,
      religion,
      age_range,
      years_of_experience,
      languages,
      interests,
      session_price_45_min,
      profile_image_url,
      gender,
      lgbtq_friendly: typeof lgbtq_friendly === "boolean" ? lgbtq_friendly : undefined,
      status: 'active',
      ranking_points: 50, // Set default ranking points
      total_sessions: 0, // Initialize sessions count
    }, {
      onConflict: 'user_id'
    })
  if (thErr) {
    console.error("[Onboarding] Failed to upsert therapist:", thErr.message, thErr)
    return NextResponse.json({ error: "Therapist record failed: " + thErr.message }, { status: 400 })
  }
  console.log(`[Onboarding] Therapist record upserted successfully`)

  // Link therapist to locations (create locations if missing)
  console.log(`[Onboarding] Processing ${locations.length} locations for user ${userId}`)

  // 1) Clear existing links
  const { error: delErr } = await supabase
    .from("therapist_locations")
    .delete()
    .eq("therapist_id", userId)
  if (delErr) {
    console.error("[Onboarding] Failed to clear existing locations:", delErr.message, delErr)
    return NextResponse.json({ error: "Location cleanup failed: " + delErr.message }, { status: 400 })
  }

  // 2) Ensure each location exists and collect IDs
  const locationIds: string[] = []
  for (const locNameRaw of locations) {
    const name = locNameRaw.trim()
    if (!name) continue

    console.log(`[Onboarding] Processing location: ${name}`)

    // Try to find existing
    const { data: existing, error: findErr } = await supabase
      .from("locations")
      .select("id")
      .eq("name", name)
      .maybeSingle()
    if (findErr) {
      console.error(`[Onboarding] Failed to find location "${name}":`, findErr.message, findErr)
      return NextResponse.json({ error: `Location lookup failed for "${name}": ` + findErr.message }, { status: 400 })
    }

    if (existing?.id) {
      console.log(`[Onboarding] Found existing location "${name}" with id ${existing.id}`)
      locationIds.push(existing.id)
    } else {
      console.log(`[Onboarding] Creating new location "${name}"`)
      const { data: inserted, error: insErr } = await supabase
        .from("locations")
        .insert({ name })
        .select("id")
        .single()
      if (insErr) {
        console.error(`[Onboarding] Failed to insert location "${name}":`, insErr.message, insErr)
        return NextResponse.json({ error: `Location creation failed for "${name}": ` + insErr.message }, { status: 400 })
      }
      if (inserted?.id) {
        console.log(`[Onboarding] Created new location "${name}" with id ${inserted.id}`)
        locationIds.push(inserted.id)
      }
    }
  }

  if (locationIds.length > 0) {
    console.log(`[Onboarding] Linking ${locationIds.length} locations to therapist`)
    const rows = locationIds.map((location_id) => ({ therapist_id: userId, location_id }))
    const { error: linkErr } = await supabase.from("therapist_locations").insert(rows)
    if (linkErr) {
      console.error("[Onboarding] Failed to link locations:", linkErr.message, linkErr)
      return NextResponse.json({ error: "Location linking failed: " + linkErr.message }, { status: 400 })
    }
    console.log(`[Onboarding] Successfully linked ${locationIds.length} locations`)
  }

  await supabase.from("admin_audit_logs").insert({ action: "therapist.complete_onboarding", target_user_id: userId })

  console.log(`[Onboarding] ✅ Successfully completed onboarding for user ${userId} (${full_name})`)
  return NextResponse.json({ ok: true })
}


