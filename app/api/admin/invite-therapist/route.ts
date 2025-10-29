import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth-helpers"
import { sendTherapistInviteEmail } from "@/lib/email-service"

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  // Verify admin authentication
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

  const supabase = supabaseAdmin()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  // Create auth user invite
  const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: false,
    user_metadata: { role: "therapist" },
    app_metadata: { provider: "email" },
  })
  if (createErr) {
    // If already exists, try resending invite
    const redirectTo = `${siteUrl}/auth/callback?next=/onboarding/therapist`
    try {
      // Generate invite link without sending email
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "invite",
        email: parsed.data.email,
        options: {
          redirectTo,
        },
      })
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 })
      }
      
      // Send email via Resend
      const emailResult = await sendTherapistInviteEmail(parsed.data.email, linkData.properties.action_link)
      if (!emailResult.success) {
        return NextResponse.json({ error: emailResult.error || "Failed to send email" }, { status: 500 })
      }
      
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

  // Generate invite link and send via Resend
  const redirectTo = `${siteUrl}/auth/callback?next=/onboarding/therapist`
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: {
      redirectTo,
    },
  })
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  // Send invite email via Resend
  const emailResult = await sendTherapistInviteEmail(parsed.data.email, linkData.properties.action_link)
  if (!emailResult.success) {
    return NextResponse.json({ error: emailResult.error || "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id: newUser.id })
}


