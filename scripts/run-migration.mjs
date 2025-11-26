import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function runMigration(filePath) {
  console.log(`\n📋 Running migration: ${filePath}`)
  console.log('=' .repeat(80))

  const sql = readFileSync(filePath, 'utf8')

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let successCount = 0
  let errorCount = 0

  for (const statement of statements) {
    if (!statement) continue

    try {
      const { error } = await supabase.rpc('exec', { sql: statement })

      if (error) {
        // Try direct execution for some statements
        const { error: error2 } = await supabase.from('_').select(statement).limit(0)

        if (error2) {
          console.error(`\n❌ Failed to execute:`)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
          console.error(`Error: ${error.message || error2.message}`)
          errorCount++
        } else {
          successCount++
        }
      } else {
        successCount++
      }
    } catch (e) {
      console.error(`\n❌ Exception:`, e.message)
      console.error(`Statement: ${statement.substring(0, 100)}...`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`✅ Successful statements: ${successCount}`)
  console.log(`❌ Failed statements: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!\n')
  } else {
    console.log('\n⚠️  Migration completed with errors. Manual SQL execution may be required.\n')
  }
}

// Run the migration
runMigration('db/migrations/015_enhance_invite_tokens.sql').catch(console.error)
