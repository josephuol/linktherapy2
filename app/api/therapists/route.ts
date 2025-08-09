import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET() {
  const supabase = supabaseAdmin()

  // Use public view to avoid leaking sensitive fields and to enforce status='active'
  const { data, error } = await supabase.from("public_therapists").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ therapists: data ?? [] })
}



