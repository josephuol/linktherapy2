-- Add 45-min price support and update public_therapists view
-- Run this SQL in Supabase SQL Editor

-- 1) Add the new 45-min price column
ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS session_price_45_min numeric;

-- 2) Optional: backfill from existing data (prefer 60-min, else 30-min)
UPDATE public.therapists
SET session_price_45_min = COALESCE(session_price_60_min, session_price_30_min)
WHERE session_price_45_min IS NULL;

-- 3) Update the public_therapists view to include session_price_45_min
-- Note: CREATE OR REPLACE VIEW cannot change the view column list. Drop first.
DROP VIEW IF EXISTS public_therapists;
CREATE VIEW public_therapists AS
SELECT 
  t.user_id AS id,
  t.full_name,
  t.title,
  t.profile_image_url,
  t.bio_short,
  t.years_of_experience,
  t.session_price_45_min,
  -- keep old fields available for now
  t.session_price_60_min,
  t.session_price_30_min,
  t.ranking_points,
  t.rating,
  t.total_sessions,
  t.status,
  t.gender,
  t.religion,
  t.age_range,
  t.lgbtq_friendly,
  COALESCE(
    (
      SELECT array_agg(l.name ORDER BY l.name)
      FROM public.therapist_locations tl
      JOIN public.locations l ON l.id = tl.location_id
      WHERE tl.therapist_id = t.user_id
    ),
    ARRAY[]::text[]
  ) AS locations,
  t.interests
FROM public.therapists t
WHERE t.status = 'active'
ORDER BY t.ranking_points DESC;


