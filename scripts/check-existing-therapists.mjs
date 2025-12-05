import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

console.log('\n🔍 Checking existing therapists in the database...\n')

// Get therapists with incomplete profiles
const { data: therapists, error } = await supabase
  .from('therapists')
  .select('user_id, full_name, title, bio_short, bio_long, status, ranking_points, total_sessions')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(`Found ${therapists.length} therapists\n`)
console.log('Status breakdown:')

const statusCounts = {}
const incompleteTherapists = []

therapists.forEach(t => {
  // Count statuses
  statusCounts[t.status] = (statusCounts[t.status] || 0) + 1

  // Check if incomplete
  const isIncomplete = !t.full_name || !t.title || !t.bio_short || !t.bio_long
  if (isIncomplete) {
    incompleteTherapists.push(t)
  }
})

Object.keys(statusCounts).forEach(status => {
  console.log(`  - ${status}: ${statusCounts[status]}`)
})

console.log(`\n📋 Incomplete profiles: ${incompleteTherapists.length}`)

if (incompleteTherapists.length > 0) {
  console.log('\nIncomplete therapists:')
  incompleteTherapists.forEach((t, i) => {
    console.log(`\n${i + 1}. User ID: ${t.user_id.substring(0, 8)}...`)
    console.log(`   Status: ${t.status}`)
    console.log(`   Ranking: ${t.ranking_points}`)
    console.log(`   Fields: name=${!!t.full_name}, title=${!!t.title}, bio_short=${!!t.bio_short}, bio_long=${!!t.bio_long}`)
  })

  console.log('\n✅ WILL THE FIX HELP THEM?')
  const willBenefit = incompleteTherapists.filter(t => t.ranking_points === 0)
  console.log(`   ${willBenefit.length} therapists have ranking_points=0 and incomplete profiles`)
  if (willBenefit.length > 0) {
    console.log(`   ✅ YES - When they save their completed profile, ranking will upgrade from 0 to 50`)
  } else {
    console.log(`   ⚠️  NO - All incomplete therapists already have ranking_points != 0`)
  }
}

console.log('\n')
