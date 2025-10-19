import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"

const schema = z.object({ emails: z.array(z.string().email()).max(30) })

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const supabase = supabaseAdmin()
  const results: { email: string; status: "ok" | "error"; message?: string }[] = []

  for (const email of parsed.data.emails) {
    // If any profile exists with this email, do not invite again
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, role, email")
      .eq("email", email)
      .maybeSingle()
    if (profErr) {
      results.push({ email, status: "error", message: profErr.message })
      continue
    }
    if (prof) {
      // If a profile exists, attempt to resend invite email
      try {
        const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/onboarding/therapist`
        await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
        await supabase.from("admin_audit_logs").insert({ 
          actor_admin_id: authCheck.user?.id || null,
          action: "invite.resend", 
          target_email: email, 
          details: { method: "bulk" } 
        })
        results.push({ email, status: "ok", message: "Resent invite" })
      } catch (e: any) {
        results.push({ email, status: "error", message: e?.message || "Failed to resend invite" })
      }
      continue
    }

    // Create auth user (unconfirmed)
    const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role: "therapist" },
      app_metadata: { provider: "email" },
    })
    if (createErr) {
      results.push({ email, status: "error", message: createErr.message })
      continue
    }
    const user = userRes?.user
    if (!user) {
      results.push({ email, status: "error", message: "Failed to create user" })
      continue
    }

    // Upsert profiles + therapists (pending)
    const { error: profUpErr } = await supabase.from("profiles").upsert({ user_id: user.id, email, role: "therapist" }, { onConflict: "user_id" })
    if (profUpErr) {
      results.push({ email, status: "error", message: profUpErr.message })
      continue
    }
    const { error: thUpErr } = await supabase.from("therapists").upsert({ user_id: user.id }, { onConflict: "user_id" })
    if (thUpErr) {
      results.push({ email, status: "error", message: thUpErr.message })
      continue
    }

    // Send invite email via Supabase built-in with redirect to onboarding
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/onboarding/therapist`
    await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })

    // Audit log
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: authCheck.user?.id || null,
      action: "invite.create",
      target_email: email,
      target_user_id: user.id,
      details: { method: "bulk" },
    })

    results.push({ email, status: "ok" })
  }

  return NextResponse.json({ results })
}


