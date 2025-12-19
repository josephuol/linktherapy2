import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"

const toggleOnlineSchema = z.object({
  therapist_id: z.string().uuid(),
  remote_available: z.boolean()
})

export async function POST(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  const supabase = supabaseAdmin()

  try {
    const body = await req.json()
    const parsed = toggleOnlineSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid payload",
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const { therapist_id, remote_available } = parsed.data

    // Check if therapist exists
    const { data: therapist, error: fetchError } = await supabase
      .from("therapists")
      .select("user_id, full_name")
      .eq("user_id", therapist_id)
      .single()

    if (fetchError || !therapist) {
      return NextResponse.json({
        error: "Therapist not found"
      }, { status: 404 })
    }

    // Update the remote_available status
    const { error: updateError } = await supabase
      .from("therapists")
      .update({ remote_available })
      .eq("user_id", therapist_id)

    if (updateError) {
      console.error("Error updating therapist online status:", updateError)
      return NextResponse.json({
        error: "Failed to update online status"
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      therapist_id,
      remote_available
    })
  } catch (error) {
    console.error("Error in toggle-online API:", error)
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 })
  }
}
