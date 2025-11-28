#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('🔧 Attempting to fix database constraint...\n')

// The workaround: Create a temporary function to execute the SQL
async function fixConstraint() {
  console.log('📝 Step 1: Creating temporary SQL execution function...')

  // First, let's try to create a helper function
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.fix_invite_constraint()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Drop old constraint
      ALTER TABLE public.therapist_invitations
      DROP CONSTRAINT IF EXISTS therapist_invitations_invited_by_admin_id_fkey;

      -- Make column nullable
      ALTER TABLE public.therapist_invitations
      ALTER COLUMN invited_by_admin_id DROP NOT NULL;

      -- Add new constraint
      ALTER TABLE public.therapist_invitations
      ADD CONSTRAINT therapist_invitations_invited_by_admin_id_fkey
      FOREIGN KEY (invited_by_admin_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;

      RAISE NOTICE 'Constraint fixed successfully!';
    END;
    $$;
  `

  try {
    const { data, error } = await supabase.rpc('exec', { sql: createFunctionSQL })
    if (error) {
      console.log('⚠️  Cannot create function via RPC (expected)')
      console.log('\n📋 Alternative solution:\n')
      console.log('Since I cannot execute SQL directly, you need to:')
      console.log('1. Get your database password from Supabase dashboard')
      console.log('2. Use this command:\n')
      console.log('psql "postgresql://postgres.vwsgdwhjjgnsqyiuhtwe:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" -f fix-invite-fkey.sql\n')
      return false
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
  }

  return false
}

fixConstraint().then(success => {
  if (!success) {
    process.exit(1)
  }
})
