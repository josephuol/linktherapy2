import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase-server"

const payloadSchema = z.object({
  session_id: z.string().min(1),
  user_id: z.string().uuid().optional().nullable(),
  problem: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  lgbtq: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  exp_band: z.string().optional().nullable(),
  price_min: z.number().optional().nullable(),
  price_max: z.number().optional().nullable(),
  source_page: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }
  const supabase = supabaseAdmin()
  const { data, error } = await supabase.from("match_events").insert({
    session_id: parsed.data.session_id,
    user_id: parsed.data.user_id ?? null,
    problem: parsed.data.problem ?? null,
    city: parsed.data.city ?? null,
    area: parsed.data.area ?? null,
    gender: parsed.data.gender ?? null,
    lgbtq: parsed.data.lgbtq ?? null,
    religion: parsed.data.religion ?? null,
    exp_band: parsed.data.exp_band ?? null,
    price_min: parsed.data.price_min ?? null,
    price_max: parsed.data.price_max ?? null,
    source_page: parsed.data.source_page ?? null,
    user_agent: parsed.data.user_agent ?? null,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data?.id })
}


