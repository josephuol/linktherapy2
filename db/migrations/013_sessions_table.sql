-- Create sessions table if it doesn't exist
-- Run this SQL in Supabase SQL editor

-- First, ensure patients table exists (required for foreign key)
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  timezone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for patients table
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);

-- Enable RLS for patients (if needed)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to patients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' 
    AND policyname = 'service_role_full_access_patients'
  ) THEN
    CREATE POLICY service_role_full_access_patients ON public.patients
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create the session_status enum type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
  END IF;
END $$;

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(user_id) ON DELETE CASCADE,
  client_email text,
  client_name text,
  session_date timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  price numeric,
  status session_status NOT NULL DEFAULT 'scheduled',
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  client_phone text,
  rescheduled_from uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  flagged_close boolean NOT NULL DEFAULT false,
  reschedule_reason text,
  rescheduled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  counts_for_scoring boolean NOT NULL DEFAULT true,
  scheduled_points_awarded boolean NOT NULL DEFAULT false,
  was_rescheduled boolean NOT NULL DEFAULT false,
  rescheduled_from_date timestamptz,
  rescheduled_to_date timestamptz,
  color_tag text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id ON public.sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON public.sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_date ON public.sessions(therapist_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON public.sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_rescheduled_from ON public.sessions(rescheduled_from);

-- Enable RLS (if needed)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sessions' 
    AND policyname = 'service_role_full_access_sessions'
  ) THEN
    CREATE POLICY service_role_full_access_sessions ON public.sessions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure columns from migration 001 exist (idempotent)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone text;

-- Ensure column from migration 006 exists (idempotent)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS color_tag text;

-- Ensure columns from migration 009 exist (idempotent)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_points_awarded boolean NOT NULL DEFAULT false;

