import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"

const updateCommissionSchema = z.object({
  therapist_id: z.string().uuid(),
  commission_per_session: z.number().nullable()
})

export async function POST(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  try {
    const body = await req.json()
    const parsed = updateCommissionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid payload",
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const { therapist_id, commission_per_session } = parsed.data
    const supabase = supabaseAdmin()

    // Verify therapist exists
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

    // Update commission rate
    const { error: updateError } = await supabase
      .from("therapists")
      .update({ commission_per_session })
      .eq("user_id", therapist_id)

    if (updateError) {
      console.error("Error updating commission:", updateError)
      return NextResponse.json({
        error: "Failed to update commission rate"
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Commission rate updated for ${therapist.full_name}`,
      therapist_id,
      commission_per_session
    })

  } catch (error) {
    console.error("Error in commission update:", error)
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 })
  }
}
