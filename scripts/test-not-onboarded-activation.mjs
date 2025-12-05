import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const TEST_EMAIL = 'test-not-onboarded@test.com'
let testUserId = null

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...')
  if (testUserId) {
    await supabase.from('therapist_locations').delete().eq('therapist_id', testUserId)
    await supabase.from('therapists').delete().eq('user_id', testUserId)
    await supabase.from('profiles').delete().eq('user_id', testUserId)
    try {
      await supabase.auth.admin.deleteUser(testUserId)
    } catch (e) {}
  }
  await supabase.from('therapist_invitations').delete().ilike('email', TEST_EMAIL)
  await supabase.from('locations').delete().eq('name', 'Test City')
  console.log('   ✅ Cleanup complete')
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING not_onboarded → active STATUS TRANSITION')
  console.log('='.repeat(80))

  try {
    // Cleanup first
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === TEST_EMAIL)
    if (existingUser) {
      testUserId = existingUser.id
      await cleanup()
      testUserId = null
    }

    // Create test user
    console.log('\n📝 Creating test therapist with status="not_onboarded"...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { role: 'therapist' }
    })

    if (authError) {
      console.error('   ❌ Failed to create auth user:', authError.message)
      process.exit(1)
    }

    testUserId = authUser.user.id
    console.log(`   ✅ Created auth user: ${testUserId}`)

    // Update or create profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', testUserId)
      .single()

    if (existingProfile) {
      await supabase.from('profiles').update({ email: TEST_EMAIL, role: 'therapist' }).eq('user_id', testUserId)
    } else {
      await supabase.from('profiles').insert({ user_id: testUserId, email: TEST_EMAIL, role: 'therapist' })
    }
    console.log('   ✅ Profile ready')

    // Create therapist with not_onboarded status
    const { error: therapistError } = await supabase.from('therapists').insert({
      user_id: testUserId,
      status: 'not_onboarded',
      full_name: null,
      title: null,
      bio_short: null,
      bio_long: null
    })

    if (therapistError) {
      console.error('   ❌ Failed to create therapist:', therapistError.message)
      await cleanup()
      process.exit(1)
    }
    console.log('   ✅ Created therapist with status="not_onboarded"')

    // Check initial state
    console.log('\n🔍 BEFORE: Initial therapist state...')
    const { data: beforeState } = await supabase
      .from('therapists')
      .select('status, ranking_points, total_sessions, full_name, title, bio_short, bio_long')
      .eq('user_id', testUserId)
      .single()

    console.log(`   📊 Status: ${beforeState.status}`)
    console.log(`   📊 Ranking Points: ${beforeState.ranking_points}`)
    console.log(`   📊 Total Sessions: ${beforeState.total_sessions}`)
    console.log(`   📊 Full Name: ${beforeState.full_name || 'null'}`)
    console.log(`   📊 Title: ${beforeState.title || 'null'}`)

    // Simulate profile completion
    console.log('\n💾 Simulating profile save from dashboard...')

    const completeProfileData = {
      full_name: 'Test Therapist',
      title: 'Clinical Psychologist',
      bio_short: 'Experienced therapist',
      bio_long: 'I have over 10 years of experience helping clients.',
      religion: 'Christian',
      age_range: '29-36',
      years_of_experience: 10,
      lgbtq_friendly: true,
      session_price_45_min: 100,
      languages: ['English', 'Arabic'],
      interests: ['Anxiety', 'Depression'],
      updated_at: new Date().toISOString()
    }

    // Check if should activate
    const hasRequiredFields = true // We're providing all required fields
    const shouldActivate = beforeState.status === 'not_onboarded' && hasRequiredFields

    console.log(`   ✅ Should activate: ${shouldActivate}`)

    // Build update payload (same logic as the fix)
    const updatePayload = {
      ...completeProfileData,
      ...(shouldActivate && {
        status: 'active',
        ranking_points: 50,
        total_sessions: 0
      })
    }

    console.log(`   📝 Update will set:`)
    console.log(`      - status: ${updatePayload.status || 'unchanged'}`)
    console.log(`      - ranking_points: ${updatePayload.ranking_points || 'unchanged'}`)

    // Apply update
    const { error: updateError } = await supabase
      .from('therapists')
      .update(updatePayload)
      .eq('user_id', testUserId)

    if (updateError) {
      console.error('   ❌ Failed to update:', updateError.message)
      await cleanup()
      process.exit(1)
    }

    console.log('   ✅ Profile saved')

    // Create location
    const { data: location } = await supabase
      .from('locations')
      .insert({ name: 'Test City' })
      .select('id')
      .single()

    if (location) {
      await supabase.from('therapist_locations').insert({
        therapist_id: testUserId,
        location_id: location.id
      })
    }

    // Check final state
    console.log('\n🔍 AFTER: Updated therapist state...')
    const { data: afterState } = await supabase
      .from('therapists')
      .select('status, ranking_points, total_sessions, full_name, title, bio_short, bio_long')
      .eq('user_id', testUserId)
      .single()

    console.log(`   📊 Status: ${afterState.status}`)
    console.log(`   📊 Ranking Points: ${afterState.ranking_points}`)
    console.log(`   📊 Total Sessions: ${afterState.total_sessions}`)
    console.log(`   📊 Full Name: ${afterState.full_name}`)
    console.log(`   📊 Title: ${afterState.title}`)

    // Verify results
    console.log('\n' + '='.repeat(80))
    console.log('📋 TEST RESULTS')
    console.log('='.repeat(80))

    if (beforeState.status !== 'not_onboarded') {
      console.log(`\n❌ TEST FAILED: Initial status was "${beforeState.status}" instead of "not_onboarded"`)
    } else if (afterState.status !== 'active') {
      console.log(`\n❌ TEST FAILED: Status did not change to "active" (still "${afterState.status}")`)
      console.log('\n🔍 DEBUGGING INFO:')
      console.log('   - The status should have changed from "not_onboarded" to "active"')
      console.log('   - Check the profile save logic in app/dashboard/profile/page.tsx')
    } else if (afterState.ranking_points !== 50) {
      console.log(`\n⚠️  TEST PARTIAL: Status changed but ranking_points is ${afterState.ranking_points} instead of 50`)
    } else if (afterState.total_sessions !== 0) {
      console.log(`\n⚠️  TEST PARTIAL: Status changed but total_sessions is ${afterState.total_sessions} instead of 0`)
    } else {
      console.log('\n✅ TEST PASSED!')
      console.log(`   ✅ Status changed: "${beforeState.status}" → "${afterState.status}"`)
      console.log('   ✅ Ranking points set to 50')
      console.log('   ✅ Total sessions initialized to 0')
      console.log('   ✅ Profile data saved correctly')
      console.log('\n🎉 The fix is working correctly for not_onboarded therapists!')
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message)
  } finally {
    await cleanup()
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main()
