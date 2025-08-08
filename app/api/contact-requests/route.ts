import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const payloadSchema = z.object({
  therapist_id: z.string().uuid(),
  client_name: z.string().min(1),
  client_email: z.string().email(),
  client_phone: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }
  const supabase = supabaseAdmin()
  const { data, error } = await supabase.from("contact_requests").insert({
    therapist_id: parsed.data.therapist_id,
    client_name: parsed.data.client_name,
    client_email: parsed.data.client_email,
    client_phone: parsed.data.client_phone ?? null,
    message: parsed.data.message ?? null,
    status: "new",
  }).select("*").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ request: data })
}


