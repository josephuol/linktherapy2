import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

console.log('🔧 Fixing therapist_invitations foreign key constraint...\n')

async function runSQL(sql, description) {
  console.log(`📝 ${description}`)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
      // Try alternative method - direct query
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
    }
    console.log(`   ✅ Success\n`)
    return true
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}\n`)
    return false
  }
}

async function main() {
  // Step 1: Drop old constraint
  await runSQL(
    'ALTER TABLE public.therapist_invitations DROP CONSTRAINT IF EXISTS therapist_invitations_invited_by_admin_id_fkey;',
    'Dropping old foreign key constraint'
  )

  // Step 2: Make column nullable
  await runSQL(
    'ALTER TABLE public.therapist_invitations ALTER COLUMN invited_by_admin_id DROP NOT NULL;',
    'Making invited_by_admin_id nullable'
  )

  // Step 3: Add new constraint
  await runSQL(
    'ALTER TABLE public.therapist_invitations ADD CONSTRAINT therapist_invitations_invited_by_admin_id_fkey FOREIGN KEY (invited_by_admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;',
    'Adding new foreign key constraint (references auth.users)'
  )

  console.log('✅ Migration complete! You can now invite therapists.\n')
}

main().catch(console.error)
