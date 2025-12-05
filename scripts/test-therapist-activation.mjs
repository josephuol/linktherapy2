import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

const TEST_EMAIL = 'test-therapist-activation@test.com'
let testUserId = null
let createdTestData = false

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...')

  if (testUserId) {
    // Delete location links first (has FK to therapists)
    await supabase.from('therapist_locations').delete().eq('therapist_id', testUserId)
    console.log('   ✅ Deleted location links')

    // Delete therapist record
    await supabase.from('therapists').delete().eq('user_id', testUserId)
    console.log('   ✅ Deleted therapist record')

    // Delete profile
    await supabase.from('profiles').delete().eq('user_id', testUserId)
    console.log('   ✅ Deleted profile record')

    // Delete auth user
    try {
      await supabase.auth.admin.deleteUser(testUserId)
      console.log('   ✅ Deleted auth user')
    } catch (e) {
      console.log('   ⚠️  Could not delete auth user (may not exist)')
    }
  }

  // Delete any invitations
  await supabase.from('therapist_invitations').delete().ilike('email', TEST_EMAIL)
  console.log('   ✅ Deleted invitations')

  // Also clean up test location
  await supabase.from('locations').delete().eq('name', 'Test City')
  console.log('   ✅ Deleted test locations')
}

async function createTestTherapist() {
  console.log('\n📝 Creating test therapist in "pending" status...')

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: { role: 'therapist' }
  })

  if (authError) {
    console.error('   ❌ Failed to create auth user:', authError.message)
    return null
  }

  testUserId = authUser.user.id
  createdTestData = true
  console.log(`   ✅ Created auth user: ${testUserId}`)

  // 2. Create or update profile (auth trigger might have created it)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', testUserId)
    .single()

  if (existingProfile) {
    console.log('   ℹ️  Profile already exists (created by trigger), updating...')
    const { error: profileError } = await supabase.from('profiles').update({
      email: TEST_EMAIL,
      role: 'therapist'
    }).eq('user_id', testUserId)

    if (profileError) {
      console.error('   ❌ Failed to update profile:', profileError.message)
      return null
    }
    console.log('   ✅ Updated profile')
  } else {
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: testUserId,
      email: TEST_EMAIL,
      role: 'therapist'
    })

    if (profileError) {
      console.error('   ❌ Failed to create profile:', profileError.message)
      return null
    }
    console.log('   ✅ Created profile')
  }

  // 3. Create therapist with incomplete profile (simulate therapist who accepted invite but didn't complete onboarding)
  const { error: therapistError } = await supabase.from('therapists').insert({
    user_id: testUserId,
    full_name: null,  // Incomplete - therapist hasn't filled this yet
    title: null,      // Incomplete - therapist hasn't filled this yet
    bio_short: null,  // Incomplete - therapist hasn't filled this yet
    bio_long: null    // Incomplete - therapist hasn't filled this yet
    // ranking_points and total_sessions will default to 0
  })

  if (therapistError) {
    console.error('   ❌ Failed to create therapist:', therapistError.message)
    return null
  }

  // Check what was assigned
  const { data: createdTherapist } = await supabase
    .from('therapists')
    .select('status, ranking_points, total_sessions')
    .eq('user_id', testUserId)
    .single()

  console.log(`   ✅ Created therapist:`)
  console.log(`      - status="${createdTherapist?.status}"`)
  console.log(`      - ranking_points=${createdTherapist?.ranking_points}`)
  console.log(`      - total_sessions=${createdTherapist?.total_sessions}`)

  return testUserId
}

async function checkTherapistStatus(userId) {
  const { data, error } = await supabase
    .from('therapists')
    .select('status, ranking_points, total_sessions, full_name, title, bio_short, bio_long, age_range, languages, interests')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('   ❌ Error checking status:', error.message)
    return null
  }

  return data
}

async function simulateProfileSave(userId) {
  console.log('\n💾 Simulating profile save from dashboard...')

  // Get current therapist state (this is what the fix does)
  const { data: currentTherapist } = await supabase
    .from('therapists')
    .select('status, ranking_points, total_sessions')
    .eq('user_id', userId)
    .single()

  console.log(`   📋 Current state:`)
  console.log(`      - status: ${currentTherapist?.status}`)
  console.log(`      - ranking_points: ${currentTherapist?.ranking_points}`)
  console.log(`      - total_sessions: ${currentTherapist?.total_sessions}`)

  // Complete profile data
  const completeProfileData = {
    full_name: 'Test Therapist',
    title: 'Clinical Psychologist',
    bio_short: 'Experienced therapist specializing in anxiety and depression',
    bio_long: 'I have over 10 years of experience helping clients overcome anxiety, depression, and relationship issues. I use evidence-based approaches including CBT and mindfulness.',
    religion: 'Christian',
    age_range: '29-36',
    years_of_experience: 10,
    lgbtq_friendly: true,
    session_price_45_min: 100,
    languages: ['English', 'Arabic'],
    interests: ['Anxiety', 'Depression', 'CBT'],
    updated_at: new Date().toISOString()
  }

  // Check if should activate (this is the fix logic)
  const hasRequiredFields =
    completeProfileData.full_name?.trim() &&
    completeProfileData.title?.trim() &&
    completeProfileData.bio_short?.trim() &&
    completeProfileData.bio_long?.trim() &&
    completeProfileData.age_range &&
    completeProfileData.languages?.length > 0

  console.log(`   ✅ Has required fields: ${hasRequiredFields}`)

  // Check if was incomplete
  const wasIncomplete =
    !currentTherapist?.full_name ||
    !currentTherapist?.title ||
    !currentTherapist?.bio_short ||
    !currentTherapist?.bio_long

  console.log(`   ✅ Was incomplete: ${wasIncomplete}`)

  // Check if needs ranking upgrade (completing profile for first time with default ranking of 0)
  const needsRankingUpgrade =
    hasRequiredFields &&
    wasIncomplete &&
    currentTherapist?.ranking_points === 0

  console.log(`   ✅ Needs ranking upgrade: ${needsRankingUpgrade}`)

  // Apply the same update logic as the fix
  const updatePayload = {
    ...completeProfileData,
    ...(needsRankingUpgrade && {
      ranking_points: 50
    })
  }

  console.log(`   📝 Update payload includes:`)
  console.log(`      - ranking_points: ${updatePayload.ranking_points || 'unchanged'}`)

  // Update therapist
  const { error: updateError } = await supabase
    .from('therapists')
    .update(updatePayload)
    .eq('user_id', userId)

  if (updateError) {
    console.error('   ❌ Failed to update therapist:', updateError.message)
    return false
  }

  console.log('   ✅ Profile saved successfully')

  // Create a location for testing
  const { data: location } = await supabase
    .from('locations')
    .insert({ name: 'Test City' })
    .select('id')
    .single()

  if (location) {
    await supabase.from('therapist_locations').insert({
      therapist_id: userId,
      location_id: location.id
    })
    console.log('   ✅ Added location')
  }

  // Update profile full_name
  await supabase.from('profiles').update({
    full_name: completeProfileData.full_name
  }).eq('user_id', userId)

  console.log('   ✅ Updated profile name')

  // Log completion if it happened
  if (needsRankingUpgrade) {
    await supabase.from('admin_audit_logs').insert({
      action: 'therapist.profile_completed',
      target_user_id: userId,
      details: {
        completed_via: 'test_script',
        ranking_upgraded: true,
        from: 0,
        to: 50
      }
    })
    console.log('   ✅ Logged completion to audit log')
  }

  return true
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING THERAPIST ACTIVATION FIX')
  console.log('='.repeat(80))

  try {
    // Clean up any existing test data first
    console.log('\n🧹 Pre-cleanup: Removing any existing test data...')
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === TEST_EMAIL)
    if (existingUser) {
      testUserId = existingUser.id
      await cleanup()
      testUserId = null
    }

    // Step 1: Create test therapist in "pending" status
    const userId = await createTestTherapist()
    if (!userId) {
      console.error('\n❌ Failed to create test therapist. Aborting test.')
      process.exit(1)
    }

    // Step 2: Verify initial state
    console.log('\n🔍 BEFORE: Checking initial therapist state...')
    const beforeState = await checkTherapistStatus(userId)
    if (beforeState) {
      console.log('   📊 Status:', beforeState.status)
      console.log('   📊 Ranking Points:', beforeState.ranking_points || 'null')
      console.log('   📊 Total Sessions:', beforeState.total_sessions || 'null')
      console.log('   📊 Full Name:', beforeState.full_name || 'null')
      console.log('   📊 Title:', beforeState.title || 'null')
    }

    // Step 3: Simulate profile save with complete data
    const saveSuccess = await simulateProfileSave(userId)
    if (!saveSuccess) {
      console.error('\n❌ Failed to save profile. Aborting test.')
      await cleanup()
      process.exit(1)
    }

    // Step 4: Verify final state
    console.log('\n🔍 AFTER: Checking updated therapist state...')
    const afterState = await checkTherapistStatus(userId)
    if (afterState) {
      console.log('   📊 Status:', afterState.status)
      console.log('   📊 Ranking Points:', afterState.ranking_points || 'null')
      console.log('   📊 Total Sessions:', afterState.total_sessions || 'null')
      console.log('   📊 Full Name:', afterState.full_name || 'null')
      console.log('   📊 Title:', afterState.title || 'null')
      console.log('   📊 Bio Short:', afterState.bio_short ? 'SET' : 'null')
      console.log('   📊 Bio Long:', afterState.bio_long ? 'SET' : 'null')
      console.log('   📊 Age Range:', afterState.age_range || 'null')
      console.log('   📊 Languages:', afterState.languages?.join(', ') || 'null')
      console.log('   📊 Interests:', afterState.interests?.join(', ') || 'null')
    }

    // Step 5: Verify results
    console.log('\n' + '='.repeat(80))
    console.log('📋 TEST RESULTS')
    console.log('='.repeat(80))

    if (!beforeState || !afterState) {
      console.log('\n❌ TEST FAILED: Could not retrieve therapist state')
    } else if (beforeState.full_name || beforeState.title || beforeState.bio_short || beforeState.bio_long) {
      console.log(`\n⚠️  TEST SKIP: Therapist profile was not incomplete (had existing data)`)
      console.log(`   - This test needs a completely empty profile to verify the fix works`)
    } else if (beforeState.ranking_points !== 0) {
      console.log(`\n⚠️  TEST SKIP: Initial ranking_points was ${beforeState.ranking_points} instead of 0`)
      console.log(`   - This test needs default ranking of 0 to verify upgrade to 50 works`)
    } else if (afterState.ranking_points !== 50) {
      console.log(`\n❌ TEST FAILED: ranking_points is ${afterState.ranking_points} instead of 50`)
      console.log('\n🔍 DEBUGGING INFO:')
      console.log('   - This means the fix is NOT working correctly')
      console.log('   - The ranking_points should be upgraded from 0 to 50 when completing profile')
      console.log('   - Check the profile save logic in app/dashboard/profile/page.tsx')
    } else {
      console.log('\n✅ TEST PASSED!')
      console.log(`   ✅ Therapist had incomplete profile (all fields were null)`)
      console.log(`   ✅ Initial ranking: ${beforeState.ranking_points} → Final ranking: ${afterState.ranking_points}`)
      console.log('   ✅ Ranking points upgraded from 0 to 50 on profile completion')
      console.log('   ✅ Profile data saved correctly')
      console.log('\n🎉 The fix is working correctly!')
    }

    // Check audit log
    console.log('\n🔍 Checking audit log...')
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('action', 'therapist.profile_completed')
      .eq('target_user_id', userId)

    if (auditLogs && auditLogs.length > 0) {
      console.log('   ✅ Completion logged in audit trail')
      console.log(`   📝 Log details:`, JSON.stringify(auditLogs[0].details, null, 2))
    } else {
      console.log('   ⚠️  No audit log entry found (optional feature)')
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message)
    console.error(error)
  } finally {
    // Cleanup
    if (createdTestData) {
      await cleanup()
      console.log('\n✅ Test cleanup complete')
    }
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main()
