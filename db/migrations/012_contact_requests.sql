-- Create contact_requests table if it doesn't exist
-- Run this SQL in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES public.therapists(user_id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'accepted', 'rejected', 'scheduled', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rejection_reason text,
  response_time_hours numeric,
  responded_at timestamptz,
  assigned_therapist_id uuid REFERENCES public.therapists(user_id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  admin_notes text,
  session_id text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_therapist_id ON public.contact_requests(therapist_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_assigned_therapist_id ON public.contact_requests(assigned_therapist_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_client_email ON public.contact_requests(client_email);

-- Enable RLS (if needed)
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_requests' 
    AND policyname = 'service_role_full_access_contact_requests'
  ) THEN
    CREATE POLICY service_role_full_access_contact_requests ON public.contact_requests
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure columns from migration 001 exist (idempotent)
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS assigned_therapist_id uuid REFERENCES public.therapists(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Ensure column from migration 007 exists (idempotent)
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS session_id text;



