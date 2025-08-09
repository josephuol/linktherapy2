import { supabaseAdmin } from "@/lib/supabase-server"
import { TherapistDirectory } from "@/components/therapist-directory"

export default async function TherapistDirectoryLoader() {
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from("therapists")
    .select(
      "id:user_id, full_name, title, profile_image_url, bio_short, years_of_experience, session_price_60_min, session_price_30_min, ranking_points, rating, status"
    )
    .eq("status", "active")
  return <TherapistDirectory initialTherapists={((data as any[]) || []).map(t => ({
    ...t,
  }))} />
}



