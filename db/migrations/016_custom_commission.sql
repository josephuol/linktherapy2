-- Add custom_commission_rate column to therapists table
-- This allows admins to set a custom per-session commission for therapists
-- whose session price exceeds $60

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS custom_commission_rate numeric;

-- Add a comment for documentation
COMMENT ON COLUMN public.therapists.custom_commission_rate IS
  'Custom per-session commission rate (nullable). When set, overrides ADMIN_COMMISSION_PER_SESSION for this therapist.';
