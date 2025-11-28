-- Fix therapist_invitations foreign key constraint
-- The invited_by_admin_id should reference profiles(user_id) or auth.users(id)
-- not admin_users(id) since we're using Supabase Auth

-- Step 1: Drop the old foreign key constraint
ALTER TABLE public.therapist_invitations
DROP CONSTRAINT IF EXISTS therapist_invitations_invited_by_admin_id_fkey;

-- Step 2: Make the column nullable (optional - allows NULL if admin not found)
ALTER TABLE public.therapist_invitations
ALTER COLUMN invited_by_admin_id DROP NOT NULL;

-- Step 3: Add new foreign key that references auth.users
-- This allows any authenticated user (admin or not) to invite
ALTER TABLE public.therapist_invitations
ADD CONSTRAINT therapist_invitations_invited_by_admin_id_fkey
FOREIGN KEY (invited_by_admin_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Alternative: If you only want admins to be tracked, reference profiles with role check
-- ALTER TABLE public.therapist_invitations
-- ADD CONSTRAINT therapist_invitations_invited_by_admin_id_fkey
-- FOREIGN KEY (invited_by_admin_id)
-- REFERENCES public.profiles(user_id)
-- ON DELETE SET NULL;

-- Note: Run this via Supabase SQL Editor or psql
