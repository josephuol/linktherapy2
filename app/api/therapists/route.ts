import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  // Rate limiting - 100 requests per minute per IP
  const ip = getClientIP(req)
  const rateCheck = checkRateLimit(ip, "publicApi")

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  const supabase = supabaseAdmin()

  // Use public view to avoid leaking sensitive fields and to enforce status='active'
  const { data, error } = await supabase.from("public_therapists").select("*")
  if (error) {
    console.error("[Therapists API] Database error:", error)
    return NextResponse.json({ error: "Failed to fetch therapists" }, { status: 500 })
  }
  return NextResponse.json({ therapists: data ?? [] })
}



