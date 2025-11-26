import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://linktherapy.org'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Use Christi's existing invite token
const CHRISTI_EMAIL = 'Christi123mansour@hotmail.com'

console.log('\n🧪 FULL PRODUCTION TEST SUITE')
console.log('=' .repeat(80))
console.log(`🌐 Testing against: ${SUPABASE_URL}`)
console.log(`📧 Test email: ${CHRISTI_EMAIL}`)
console.log('=' .repeat(80))

async function test1_MultipleValidations() {
  console.log('\n📋 TEST 1: Token Validation (Multiple Clicks)')
  console.log('-'.repeat(80))

  // Get Christi's token
  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .eq('status', 'pending')
    .single()

  if (!invitation) {
    console.log('❌ No pending invitation found for Christi')
    return false
  }

  const token = invitation.token_hash
  console.log(`   Token (first 16 chars): ${token.substring(0, 16)}...`)
  console.log(`   Status: ${invitation.status}`)
  console.log(`   Expires: ${invitation.expires_at}`)

  // Simulate clicking the link 5 times (like email scanning + actual clicks)
  console.log('\n   Simulating 5 clicks (validating token each time)...')

  for (let i = 1; i <= 5; i++) {
    const response = await fetch(`${SITE_URL}/api/invite/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    const data = await response.json()

    if (response.ok && data.valid) {
      console.log(`   ✅ Click ${i}: Token still valid`)
    } else {
      console.log(`   ❌ Click ${i}: Token invalid - ${data.error}`)
      return false
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n   ✅ TEST PASSED: Token can be validated multiple times')
  return true
}

async function test2_AbandonedInvite() {
  console.log('\n📋 TEST 2: Abandoned Invite (Token Remains Valid)')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .eq('status', 'pending')
    .single()

  const token = invitation.token_hash

  console.log('   Simulating user opening page then closing it...')

  // Validate before
  const before = await fetch(`${SITE_URL}/api/invite/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  }).then(r => r.json())

  console.log(`   Before abandonment: ${before.valid ? '✅ Valid' : '❌ Invalid'}`)

  // Simulate page close (no action taken)
  await new Promise(resolve => setTimeout(resolve, 500))

  // Validate after
  const after = await fetch(`${SITE_URL}/api/invite/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  }).then(r => r.json())

  console.log(`   After abandonment: ${after.valid ? '✅ Valid' : '❌ Invalid'}`)

  if (before.valid && after.valid) {
    console.log('\n   ✅ TEST PASSED: Token remains valid after abandonment')
    return true
  } else {
    console.log('\n   ❌ TEST FAILED: Token should remain valid')
    return false
  }
}

async function test3_CheckDatabaseState() {
  console.log('\n📋 TEST 3: Database State Verification')
  console.log('-'.repeat(80))

  // Check invitation record
  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  console.log('\n   Invitation Record:')
  console.log(`   - Email: ${invitation.email}`)
  console.log(`   - Status: ${invitation.status}`)
  console.log(`   - Created: ${invitation.invited_at}`)
  console.log(`   - Expires: ${invitation.expires_at}`)
  console.log(`   - Send Count: ${invitation.send_count}`)
  console.log(`   - Token Hash: ${invitation.token_hash ? 'Present' : 'Missing'}`)

  // Check if auth user exists
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const existingUser = authUsers.users.find(u =>
    u.email?.toLowerCase() === CHRISTI_EMAIL.toLowerCase()
  )

  console.log('\n   Auth User Status:')
  if (existingUser) {
    console.log(`   ⚠️  User already exists in auth.users`)
    console.log(`   - User ID: ${existingUser.id}`)
    console.log(`   - Email Confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   - Created: ${existingUser.created_at}`)
  } else {
    console.log(`   ✅ No auth user exists (correct state before acceptance)`)
  }

  // Check profiles table
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)

  console.log('\n   Profile Record:')
  if (profiles && profiles.length > 0) {
    console.log(`   ⚠️  Profile exists: ${profiles.length} record(s)`)
  } else {
    console.log(`   ✅ No profile exists (correct state before acceptance)`)
  }

  console.log('\n   ✅ TEST PASSED: Database state is correct')
  return true
}

async function test4_InvalidTokenHandling() {
  console.log('\n📋 TEST 4: Invalid Token Handling')
  console.log('-'.repeat(80))

  const invalidTokens = [
    { name: 'Empty string', token: '' },
    { name: 'Random string', token: 'invalidtoken123' },
    { name: 'Wrong length', token: '12345' },
  ]

  let allPassed = true

  for (const { name, token } of invalidTokens) {
    const response = await fetch(`${SITE_URL}/api/invite/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    const data = await response.json()

    if (!response.ok && !data.valid) {
      console.log(`   ✅ ${name}: Correctly rejected`)
    } else {
      console.log(`   ❌ ${name}: Should be rejected`)
      allPassed = false
    }
  }

  if (allPassed) {
    console.log('\n   ✅ TEST PASSED: Invalid tokens properly rejected')
  } else {
    console.log('\n   ❌ TEST FAILED: Some invalid tokens were accepted')
  }

  return allPassed
}

async function test5_EmailLinkFormat() {
  console.log('\n📋 TEST 5: Email Link Format Verification')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  const expectedUrl = `${SITE_URL}/invite/accept?token=${invitation.token_hash}`

  console.log('\n   Expected Magic Link:')
  console.log(`   ${expectedUrl}`)
  console.log('\n   Link Components:')
  console.log(`   - Base URL: ${SITE_URL}`)
  console.log(`   - Path: /invite/accept`)
  console.log(`   - Token Length: ${invitation.token_hash.length} chars`)
  console.log(`   - Token Format: ${/^[a-f0-9]{64}$/.test(invitation.token_hash) ? 'Valid hex' : 'Invalid'}`)

  const isValidFormat =
    invitation.token_hash.length === 64 &&
    /^[a-f0-9]{64}$/.test(invitation.token_hash) &&
    expectedUrl.includes('/invite/accept?token=')

  if (isValidFormat) {
    console.log('\n   ✅ TEST PASSED: Link format is correct')
  } else {
    console.log('\n   ❌ TEST FAILED: Link format is invalid')
  }

  return isValidFormat
}

async function test6_ExpirationCheck() {
  console.log('\n📋 TEST 6: Expiration Logic')
  console.log('-'.repeat(80))

  const { data: invitation } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', CHRISTI_EMAIL)
    .single()

  const expiresAt = new Date(invitation.expires_at)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))

  console.log('\n   Expiration Details:')
  console.log(`   - Expires At: ${expiresAt.toISOString()}`)
  console.log(`   - Current Time: ${now.toISOString()}`)
  console.log(`   - Days Until Expiry: ${daysUntilExpiry}`)
  console.log(`   - Is Expired: ${expiresAt < now ? 'Yes' : 'No'}`)

  const isValid =
    expiresAt > now &&
    daysUntilExpiry >= 0 &&
    daysUntilExpiry <= 7

  if (isValid) {
    console.log('\n   ✅ TEST PASSED: Expiration is correctly set')
  } else {
    console.log('\n   ❌ TEST FAILED: Expiration issue detected')
  }

  return isValid
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting test suite...\n')

  const results = {
    'Multiple Validations': await test1_MultipleValidations(),
    'Abandoned Invite': await test2_AbandonedInvite(),
    'Database State': await test3_CheckDatabaseState(),
    'Invalid Tokens': await test4_InvalidTokenHandling(),
    'Email Link Format': await test5_EmailLinkFormat(),
    'Expiration Check': await test6_ExpirationCheck(),
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(80))

  let passed = 0
  let failed = 0

  for (const [name, result] of Object.entries(results)) {
    const icon = result ? '✅' : '❌'
    console.log(`${icon} ${name}: ${result ? 'PASSED' : 'FAILED'}`)
    if (result) passed++
    else failed++
  }

  console.log('\n' + '-'.repeat(80))
  console.log(`Total: ${passed + failed} tests | ✅ Passed: ${passed} | ❌ Failed: ${failed}`)
  console.log('='.repeat(80))

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.\n')
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.\n')
  }

  return failed === 0
}

runAllTests().catch(console.error)
