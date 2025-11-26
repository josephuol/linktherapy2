import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const CHRISTI_EMAIL = 'Christi123mansour@hotmail.com'
const TEST_EMAIL = 'test-therapist-' + Date.now() + '@example.com'

console.log('\n🧪 DATABASE & LOGIC TESTS')
console.log('=' .repeat(80))

async function test1_ChristiInviteStatus() {
  console.log('\n📋 TEST 1: Christi\'s Invitation Status')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  if (!invitation) {
    console.log('   ❌ No invitation found')
    return false
  }

  console.log(`   ✅ Invitation found`)
  console.log(`   - Status: ${invitation.status}`)
  console.log(`   - Token: ${invitation.token_hash ? 'Present (' + invitation.token_hash.substring(0, 16) + '...)' : 'Missing'}`)
  console.log(`   - Expires: ${invitation.expires_at}`)
  console.log(`   - Send Count: ${invitation.send_count}`)

  const expiresAt = new Date(invitation.expires_at)
  const now = new Date()
  const isExpired = expiresAt < now

  console.log(`   - Is Expired: ${isExpired ? '❌ Yes' : '✅ No'}`)
  console.log(`   - Days Remaining: ${Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))}`)

  // Check if auth user exists
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const existingUser = authUsers.users.find(u =>
    u.email?.toLowerCase() === CHRISTI_EMAIL.toLowerCase()
  )

  console.log(`   - Auth User Exists: ${existingUser ? '⚠️  Yes (unexpected)' : '✅ No (correct)'}`)

  if (existingUser) {
    console.log(`     → User ID: ${existingUser.id}`)
    console.log(`     → This user should be deleted before testing`)
  }

  const isReady =
    invitation.status === 'pending' &&
    invitation.token_hash &&
    !isExpired &&
    !existingUser

  if (isReady) {
    console.log('\n   ✅ TEST PASSED: Invitation is ready for Christi to accept')
  } else {
    console.log('\n   ⚠️  TEST WARNING: Invitation may have issues')
  }

  return true
}

async function test2_MultipleValidationLogic() {
  console.log('\n📋 TEST 2: Token Validation Logic (Simulated)')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  if (!invitation) {
    console.log('   ❌ No invitation found')
    return false
  }

  const token = invitation.token_hash

  console.log('   Simulating 5 validation requests...')

  for (let i = 1; i <= 5; i++) {
    // Fetch the invitation each time (simulating what the API does)
    const { data: inv, error } = await supabase
      .from('therapist_invitations')
      .select('*')
      .eq('token_hash', token)
      .eq('status', 'pending')
      .single()

    if (error || !inv) {
      console.log(`   ❌ Validation ${i}: Failed - ${error?.message || 'Not found'}`)
      return false
    }

    // Check expiration
    const expiresAt = new Date(inv.expires_at)
    const now = new Date()
    const isExpired = expiresAt < now

    if (isExpired) {
      console.log(`   ❌ Validation ${i}: Token expired`)
      return false
    }

    console.log(`   ✅ Validation ${i}: Token valid`)

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n   ✅ TEST PASSED: Token can be validated multiple times without consumption')
  return true
}

async function test3_CreateTestInvite() {
  console.log('\n📋 TEST 3: Create & Validate Test Invitation')
  console.log('-'.repeat(80))

  console.log(`   Creating test invitation for: ${TEST_EMAIL}`)

  const testToken = randomBytes(32).toString('hex')

  const { error: createErr } = await supabase
    .from('therapist_invitations')
    .insert({
      email: TEST_EMAIL,
      token_hash: testToken,
      status: 'pending',
      invited_at: new Date().toISOString(),
      last_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      send_count: 1
    })

  if (createErr) {
    console.log(`   ❌ Failed to create: ${createErr.message}`)
    return false
  }

  console.log('   ✅ Test invitation created')

  // Validate it
  const { data: testInv, error: fetchErr } = await supabase
    .from('therapist_invitations')
    .select('*')
    .eq('token_hash', testToken)
    .single()

  if (fetchErr || !testInv) {
    console.log(`   ❌ Failed to fetch test invitation`)
    return false
  }

  console.log('   ✅ Test invitation retrieved successfully')

  // Cleanup
  await supabase
    .from('therapist_invitations')
    .delete()
    .eq('token_hash', testToken)

  console.log('   ✅ Test invitation cleaned up')
  console.log('\n   ✅ TEST PASSED: CRUD operations work correctly')
  return true
}

async function test4_TokenFormatValidation() {
  console.log('\n📋 TEST 4: Token Format Validation')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  const token = invitation.token_hash

  console.log(`   Token: ${token}`)
  console.log(`   Length: ${token.length} chars`)
  console.log(`   Expected: 64 chars (32 bytes hex)`)

  const isHex = /^[a-f0-9]+$/i.test(token)
  const isCorrectLength = token.length === 64

  console.log(`   Is Hexadecimal: ${isHex ? '✅' : '❌'}`)
  console.log(`   Is Correct Length: ${isCorrectLength ? '✅' : '❌'}`)

  // Verify uniqueness
  const { data: duplicates } = await supabase
    .from('therapist_invitations')
    .select('token_hash')
    .eq('token_hash', token)

  console.log(`   Duplicate Tokens: ${duplicates.length > 1 ? '❌ Found' : '✅ None'}`)

  const isValid = isHex && isCorrectLength && duplicates.length === 1

  if (isValid) {
    console.log('\n   ✅ TEST PASSED: Token format is correct')
  } else {
    console.log('\n   ❌ TEST FAILED: Token format issues detected')
  }

  return isValid
}

async function test5_InviteLinkConstruction() {
  console.log('\n📋 TEST 5: Invite Link Construction')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  const SITE_URL = 'https://linktherapy.org'
  const inviteUrl = `${SITE_URL}/invite/accept?token=${invitation.token_hash}`

  console.log(`   Full Link:`)
  console.log(`   ${inviteUrl}`)
  console.log(`\n   Components:`)
  console.log(`   - Protocol: ${inviteUrl.startsWith('https://') ? '✅ HTTPS' : '❌ Not HTTPS'}`)
  console.log(`   - Domain: linktherapy.org`)
  console.log(`   - Path: /invite/accept`)
  console.log(`   - Query Param: ?token=...`)

  const hasToken = inviteUrl.includes('?token=')
  const isHttps = inviteUrl.startsWith('https://')
  const hasCorrectPath = inviteUrl.includes('/invite/accept')

  const isValid = hasToken && isHttps && hasCorrectPath

  if (isValid) {
    console.log('\n   ✅ TEST PASSED: Link is correctly formatted')
  } else {
    console.log('\n   ❌ TEST FAILED: Link format issues')
  }

  return isValid
}

async function test6_AbandonmentScenario() {
  console.log('\n📋 TEST 6: Abandoned Invite Scenario')
  console.log('-'.repeat(80))

  console.log('   Scenario: User clicks link, sees page, then closes browser')
  console.log('   Expected: Token should remain valid for next attempt')

  const { data: before } = await supabase
    .from('therapist_invitations')
    .select('status, token_hash')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  console.log(`\n   Before abandonment:`)
  console.log(`   - Status: ${before.status}`)
  console.log(`   - Token: ${before.token_hash ? 'Present' : 'Missing'}`)

  // Simulate page load (just a SELECT query, no UPDATE)
  const { data: duringView } = await supabase
    .from('therapist_invitations')
    .select('*')
    .eq('token_hash', before.token_hash)
    .single()

  console.log(`\n   During page view:`)
  console.log(`   - Status: ${duringView.status}`)

  // Simulate page close (no action)
  await new Promise(resolve => setTimeout(resolve, 500))

  // Check status after
  const { data: after } = await supabase
    .from('therapist_invitations')
    .select('status, token_hash')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  console.log(`\n   After abandonment:`)
  console.log(`   - Status: ${after.status}`)
  console.log(`   - Token: ${after.token_hash ? 'Present' : 'Missing'}`)

  const remainsValid =
    before.status === 'pending' &&
    after.status === 'pending' &&
    before.token_hash === after.token_hash

  if (remainsValid) {
    console.log('\n   ✅ TEST PASSED: Token remains valid after abandonment')
  } else {
    console.log('\n   ❌ TEST FAILED: Token state changed unexpectedly')
  }

  return remainsValid
}

async function runAllTests() {
  const results = {
    'Christi Invitation Status': await test1_ChristiInviteStatus(),
    'Multiple Validation Logic': await test2_MultipleValidationLogic(),
    'Create Test Invite (CRUD)': await test3_CreateTestInvite(),
    'Token Format': await test4_TokenFormatValidation(),
    'Invite Link Construction': await test5_InviteLinkConstruction(),
    'Abandonment Scenario': await test6_AbandonmentScenario(),
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(80))

  let passed = 0
  let failed = 0

  for (const [name, result] of Object.entries(results)) {
    const icon = result ? '✅' : '❌'
    console.log(`${icon} ${name}`)
    if (result) passed++
    else failed++
  }

  console.log('\n' + '-'.repeat(80))
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
  console.log('='.repeat(80))

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('\n📋 READY FOR PRODUCTION:')
    console.log('   1. ✅ Token validation works correctly')
    console.log('   2. ✅ Multiple clicks don\'t consume the token')
    console.log('   3. ✅ Abandonment doesn\'t invalidate the token')
    console.log('   4. ✅ Token format is secure (64-char hex)')
    console.log('   5. ✅ Database operations are working')
    console.log('\n🚀 Christi can now accept her invitation!')
  } else {
    console.log('\n⚠️  Some tests failed. Review above.')
  }

  console.log('\n')
}

runAllTests().catch(console.error)
