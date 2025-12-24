import { supabaseAdmin } from "@/lib/supabase-server"
import { TherapistDirectory } from "@/components/therapist-directory"
import { HeroSection, type HeroContent } from "@/components/hero-section"
import { MatchModal, type MatchConfig } from "@/components/match-modal"

export default async function TherapistDirectoryLoader({ showFilters = true, limit, showHero = true }: { showFilters?: boolean, limit?: number, showHero?: boolean } = {}) {
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from("public_therapists")
    .select(
      "id, full_name, title, profile_image_url, bio_short, years_of_experience, session_price_45_min, session_price_60_min, session_price_30_min, ranking_points, rating, total_sessions, status, interests, gender, religion, age_range, lgbtq_friendly, locations, remote_available"
    )
  const { data: labelsRow } = await supabase
    .from("site_content")
    .select("content")
    .eq("key", "directory.labels")
    .single()

  const { data: heroRow } = await supabase
    .from("site_content")
    .select("content")
    .eq("key", "home.hero")
    .maybeSingle()

  const { data: matchRow } = await supabase
    .from("site_content")
    .select("content")
    .eq("key", "match.quiz")
    .maybeSingle()

  const interestsLabel = (labelsRow as any)?.content?.interestsLabel || "Interests"

  const hero: HeroContent | undefined = (heroRow as any)?.content || undefined
  const matchConfig: MatchConfig | undefined = (matchRow as any)?.content || undefined

  const priceValues = Array.isArray(data) ? (data as any[])
    .map((t) => (t as any).session_price_45_min)
    .filter((v) => typeof v === "number" && isFinite(v)) as number[] : []
  const minPrice = priceValues.length ? Math.min(...priceValues) : 50
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 250

  return (
    <>
      {showHero ? <HeroSection content={hero} variant="twoColumnCompact" /> : null}
      <MatchModal config={matchConfig} minPrice={minPrice} maxPrice={maxPrice} />
      <TherapistDirectory initialTherapists={((data as any[]) || []).map(t => ({
        ...t,
      }))} interestsLabel={interestsLabel} showFilters={showFilters} limit={limit} />
    </>
  )
}



