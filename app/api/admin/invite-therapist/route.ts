import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

  const supabase = supabaseAdmin()

  // Create auth user invite
  const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: false,
    user_metadata: { role: "therapist" },
    app_metadata: { provider: "email" },
  })
  if (createErr) {
    // If already exists, try resending invite
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/onboarding/therapist`
    try {
      await supabase.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo })
      return NextResponse.json({ ok: true, resent: true })
    } catch (e: any) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }
  }
  const newUser = userRes?.user
  if (!newUser) return NextResponse.json({ error: "Failed to create user" }, { status: 400 })

  // Upsert profiles and therapists rows
  const { error: profErr } = await supabase.from("profiles").upsert({ user_id: newUser.id, email: parsed.data.email, role: "therapist" }, { onConflict: "user_id" })
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })

  const { error: thErr } = await supabase.from("therapists").upsert({ user_id: newUser.id }, { onConflict: "user_id" })
  if (thErr) return NextResponse.json({ error: thErr.message }, { status: 400 })

  // Send invite email with redirect to onboarding
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/onboarding/therapist`
  await supabase.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo })

  return NextResponse.json({ ok: true, user_id: newUser.id })
}


