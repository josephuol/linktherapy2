-- Create therapist_locations and locations tables if they don't exist
-- Run this SQL in Supabase SQL editor

-- Create locations table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text DEFAULT 'city' CHECK (type IN ('city', 'region')),
  created_at timestamptz DEFAULT now()
);

-- Create therapist_locations junction table
CREATE TABLE IF NOT EXISTS public.therapist_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES public.therapists(user_id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_therapist_locations_therapist_id ON public.therapist_locations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_locations_location_id ON public.therapist_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations(name);

-- RLS policies (if RLS is enabled)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_locations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' 
    AND policyname = 'service_role_full_access_locations'
  ) THEN
    CREATE POLICY service_role_full_access_locations ON public.locations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'therapist_locations' 
    AND policyname = 'service_role_full_access_therapist_locations'
  ) THEN
    CREATE POLICY service_role_full_access_therapist_locations ON public.therapist_locations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Recreate the public_therapists view to ensure it works with the new tables
-- This is safe to run multiple times (idempotent)
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

