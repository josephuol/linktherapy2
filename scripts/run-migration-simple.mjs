import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' }
})

console.log('\n🚀 Running migration on production database...')
console.log(`📍 Database: ${SUPABASE_URL}`)
console.log('=' .repeat(80))

// Execute individual statements
async function main() {
  try {
    // 1. Check if column already exists
    console.log('\n1️⃣ Checking current schema...')
    const { data: columns } = await supabase
      .from('therapist_invitations')
      .select('*')
      .limit(1)

    console.log('✅ therapist_invitations table exists')

    // 2. Since we can't run ALTER TABLE via SDK, let's just verify the table is ready
    // The admin will need to run the SQL manually in Supabase dashboard

    console.log('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:')
    console.log('=' .repeat(80))

    const migration = readFileSync('db/migrations/015_enhance_invite_tokens.sql', 'utf8')
    console.log(migration)

    console.log('=' .repeat(80))
    console.log('\n⚠️  After running the SQL above, press any key to continue...\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
