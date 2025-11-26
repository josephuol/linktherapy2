-- Enhance therapist_invitations table for magic link system
-- This migration improves the existing table for custom invite tokens

-- 1) Rename token_hash to invite_token for clarity (it stores the actual token, not a hash)
-- Note: In production, we should hash tokens for security, but for now keeping it simple
ALTER TABLE public.therapist_invitations
  RENAME COLUMN token_hash TO invite_token;

-- 2) Add unique index on invite_token for fast lookups and prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS therapist_invitations_invite_token_idx
  ON public.therapist_invitations (invite_token)
  WHERE invite_token IS NOT NULL;

-- 3) Make sure expires_at has a default (7 days from creation)
ALTER TABLE public.therapist_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- 4) Add a helper function to check if an invite is still valid
CREATE OR REPLACE FUNCTION public.is_invite_valid(invite_token_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM public.therapist_invitations
  WHERE invite_token = invite_token_input
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Add RLS policy to allow public access to validate tokens (read-only)
-- This allows the frontend to check if a token is valid before accepting
CREATE POLICY IF NOT EXISTS "Allow public to validate invite tokens"
  ON public.therapist_invitations
  FOR SELECT
  USING (status = 'pending' AND (expires_at IS NULL OR expires_at > now()));

COMMENT ON TABLE public.therapist_invitations IS 'Tracks therapist invitation lifecycle with custom magic link tokens immune to email scanning';
COMMENT ON COLUMN public.therapist_invitations.invite_token IS 'Cryptographically random token (64 chars) used in magic link. Can be clicked multiple times before acceptance.';
COMMENT ON COLUMN public.therapist_invitations.expires_at IS 'Invitation expiration timestamp. Defaults to 7 days from creation.';
