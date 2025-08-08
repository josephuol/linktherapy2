import { supabaseAdmin } from "@/lib/supabase-server"
import { TherapistDirectory } from "@/components/therapist-directory"

export default async function TherapistDirectoryLoader() {
  const supabase = supabaseAdmin()
  const { data } = await supabase.from("public_therapists").select("*")
  return <TherapistDirectory initialTherapists={(data as any[]) || []} />
}


