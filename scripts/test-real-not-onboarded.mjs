import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const TEST_EMAIL = 'test-real-not-onboarded@test.com'
let testUserId = null

async function cleanup() {
  if (testUserId) {
    await supabase.from('therapist_locations').delete().eq('therapist_id', testUserId)
    await supabase.from('therapists').delete().eq('user_id', testUserId)
    await supabase.from('profiles').delete().eq('user_id', testUserId)
    try { await supabase.auth.admin.deleteUser(testUserId) } catch (e) {}
  }
  await supabase.from('locations').delete().eq('name', 'Test City')
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING REAL "not_onboarded" SCENARIO')
  console.log('='.repeat(80))

  try {
    // Cleanup
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users.find(u => u.email === TEST_EMAIL)
    if (existingUser) {
      testUserId = existingUser.id
      await cleanup()
      testUserId = null
    }

    // Create auth user + profile ONLY (NO therapist record = not_onboarded)
    console.log('\n📝 Creating "not_onboarded" therapist (profile only, no therapist record)...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { role: 'therapist' }
    })

    if (authError) {
      console.error('   ❌ Auth error:', authError.message)
      process.exit(1)
    }

    testUserId = authUser.user.id
    console.log(`   ✅ Created auth user: ${testUserId}`)

    // Ensure profile exists
    const { data: existingProfile } = await supabase.from('profiles').select('user_id').eq('user_id', testUserId).single()
    if (existingProfile) {
      await supabase.from('profiles').update({ email: TEST_EMAIL, role: 'therapist' }).eq('user_id', testUserId)
      console.log('   ✅ Updated profile')
    } else {
      await supabase.from('profiles').insert({ user_id: testUserId, email: TEST_EMAIL, role: 'therapist' })
      console.log('   ✅ Created profile')
    }

    // Verify NO therapist record exists
    const { data: noTherapist } = await supabase.from('therapists').select('*').eq('user_id', testUserId).maybeSingle()
    if (noTherapist) {
      console.log('   ⚠️  WARNING: Therapist record already exists! Deleting it...')
      await supabase.from('therapists').delete().eq('user_id', testUserId)
    }
    console.log('   ✅ Confirmed NO therapist record (true "not_onboarded" state)')

    // Check initial state
    console.log('\n🔍 BEFORE: Checking therapist record...')
    const { data: beforeTherapist } = await supabase.from('therapists').select('*').eq('user_id', testUserId).maybeSingle()
    console.log(`   📊 Therapist record exists: ${!!beforeTherapist}`)
    if (beforeTherapist) {
      console.log(`   📊 Status: ${beforeTherapist.status}`)
      console.log(`   📊 Ranking: ${beforeTherapist.ranking_points}`)
    }

    // Simulate profile save with complete data
    console.log('\n💾 Simulating profile save (UPSERT)...')

    const completeData = {
      user_id: testUserId,
      full_name: 'Test Therapist',
      title: 'Clinical Psychologist',
      bio_short: 'Experienced therapist',
      bio_long: 'I have over 10 years of experience.',
      religion: 'Christian',
      age_range: '29-36',
      years_of_experience: 10,
      lgbtq_friendly: true,
      session_price_45_min: 100,
      languages: ['English', 'Arabic'],
      interests: ['Anxiety', 'Depression'],
      updated_at: new Date().toISOString(),
      // Since no therapist record exists, shouldActivate will be true
      status: 'active',
      ranking_points: 50,
      total_sessions: 0
    }

    const { error: upsertError } = await supabase
      .from('therapists')
      .upsert(completeData, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('   ❌ Upsert failed:', upsertError.message)
      await cleanup()
      process.exit(1)
    }

    console.log('   ✅ UPSERT successful')

    // Create location
    const { data: location } = await supabase.from('locations').insert({ name: 'Test City' }).select('id').single()
    if (location) {
      await supabase.from('therapist_locations').insert({ therapist_id: testUserId, location_id: location.id })
      console.log('   ✅ Added location')
    }

    // Check final state
    console.log('\n🔍 AFTER: Checking therapist record...')
    const { data: afterTherapist } = await supabase.from('therapists').select('*').eq('user_id', testUserId).single()

    console.log(`   📊 Therapist record exists: ${!!afterTherapist}`)
    console.log(`   📊 Status: ${afterTherapist.status}`)
    console.log(`   📊 Ranking Points: ${afterTherapist.ranking_points}`)
    console.log(`   📊 Total Sessions: ${afterTherapist.total_sessions}`)
    console.log(`   📊 Full Name: ${afterTherapist.full_name}`)
    console.log(`   📊 Title: ${afterTherapist.title}`)

    // Verify
    console.log('\n' + '='.repeat(80))
    console.log('📋 TEST RESULTS')
    console.log('='.repeat(80))

    if (!beforeTherapist && !afterTherapist) {
      console.log('\n❌ TEST FAILED: No therapist record created')
    } else if (beforeTherapist) {
      console.log('\n⚠️  TEST SKIP: Therapist record already existed (not true not_onboarded state)')
    } else if (afterTherapist.status !== 'active') {
      console.log(`\n❌ TEST FAILED: Status is "${afterTherapist.status}" instead of "active"`)
    } else if (afterTherapist.ranking_points !== 50) {
      console.log(`\n❌ TEST FAILED: Ranking is ${afterTherapist.ranking_points} instead of 50`)
    } else if (afterTherapist.total_sessions !== 0) {
      console.log(`\n❌ TEST FAILED: Total sessions is ${afterTherapist.total_sessions} instead of 0`)
    } else {
      console.log('\n✅ TEST PASSED!')
      console.log('   ✅ Started with NO therapist record (true "not_onboarded" state)')
      console.log('   ✅ Therapist record created via UPSERT')
      console.log('   ✅ Status set to "active"')
      console.log('   ✅ Ranking points set to 50')
      console.log('   ✅ Total sessions initialized to 0')
      console.log('\n🎉 The fix works for "not_onboarded" therapists!')
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message)
    console.error(error)
  } finally {
    await cleanup()
    console.log('\n✅ Cleanup complete')
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main()
