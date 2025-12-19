-- Add remote_available column to therapists table
-- This allows therapists to indicate if they offer online/remote sessions

-- Add the column with default value false
ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS remote_available BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.therapists.remote_available IS 'Indicates whether the therapist offers online/remote therapy sessions. Defaults to false.';
