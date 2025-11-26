import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function checkTable(name) {
  try {
    const { error } = await supabase.from(name).select('*', { head: true, count: 'exact' }).limit(1)
    if (error) {
      console.error(`[FAIL] ${name}: ${error.message}`)
      return { name, ok: false, error: error.message }
    }
    console.log(`[OK]   ${name}`)
    return { name, ok: true }
  } catch (e) {
    console.error(`[FAIL] ${name}: ${e?.message || 'Unknown error'}`)
    return { name, ok: false, error: e?.message || 'Unknown error' }
  }
}

async function main() {
  const targets = [
    'profiles',
    'therapists',
    'patients',
    'sessions',
    'contact_requests',
    'locations',
    'therapist_locations',
    'therapist_payments',
    'therapist_notifications',
    'therapist_metrics',
    'therapist_payment_actions',
  ]

  const results = []
  for (const t of targets) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await checkTable(t))
  }

  // Check view
  try {
    const { error } = await supabase.from('public_therapists').select('*', { head: true, count: 'exact' }).limit(1)
    if (error) {
      console.error(`[FAIL] public_therapists view: ${error.message}`)
      results.push({ name: 'public_therapists', ok: false, error: error.message })
    } else {
      console.log('[OK]   public_therapists (view)')
      results.push({ name: 'public_therapists', ok: true })
    }
  } catch (e) {
    console.error(`[FAIL] public_therapists view: ${e?.message || 'Unknown error'}`)
    results.push({ name: 'public_therapists', ok: false, error: e?.message || 'Unknown error' })
  }

  const failed = results.filter(r => !r.ok)
  if (failed.length > 0) {
    console.error(`\n${failed.length} checks failed.`)
    process.exit(2)
  }
  console.log('\nAll checks passed.')
}

main()
