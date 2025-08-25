-- Extend public_therapists view to include filterable fields and locations
-- Run this in Supabase SQL editor

CREATE OR REPLACE VIEW public_therapists AS
SELECT 
  t.user_id AS id,
  t.full_name,
  t.title,
  t.profile_image_url,
  t.bio_short,
  t.years_of_experience,
  t.session_price_60_min,
  t.session_price_30_min,
  t.ranking_points,
  t.rating,
  t.total_sessions,
  t.status,
  -- Newly exposed fields for filtering
  t.gender,
  t.religion,
  t.age_range,
  t.lgbtq_friendly,
  -- Aggregate locations as an array of city names
  COALESCE(
    (
      SELECT array_agg(l.name ORDER BY l.name)
      FROM public.therapist_locations tl
      JOIN public.locations l ON l.id = tl.location_id
      WHERE tl.therapist_id = t.user_id
    ),
    ARRAY[]::text[]
  ) AS locations,
  -- Keep interests for UI chips
  t.interests
FROM public.therapists t
WHERE t.status = 'active'
ORDER BY t.ranking_points DESC;


