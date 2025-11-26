import { createClient } from '@supabase/supabase-js'
import { Client as QStashClient } from '@upstash/qstash'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY
const TEST_TARGET_EMAIL = process.env.TEST_TARGET_EMAIL || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}
if (!SITE_URL) {
  console.error('NEXT_PUBLIC_SITE_URL is required')
  process.exit(1)
}
if (!QSTASH_TOKEN || !QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
  console.error('QStash env vars missing (QSTASH_TOKEN / QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY)')
  process.exit(1)
}

// Delays: use env QSTASH_TEST_DELAYS like "5,7,9" or argv e.g., node test-qstash.mjs 5 7 9
const parseDelays = () => {
  if (process.env.QSTASH_TEST_DELAYS) {
    return process.env.QSTASH_TEST_DELAYS.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n > 0)
  }
  const argv = process.argv.slice(2).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n > 0)
  if (argv.length) return argv
  return [5, 7, 9]
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const qstash = new QStashClient({
  token: QSTASH_TOKEN,
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
})

async function getAnyActiveTherapistId() {
  const { data, error } = await supabase
    .from('therapists')
    .select('user_id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch therapist: ${error.message}`)
  }
  return data?.user_id || null
}

async function getOrCreateTherapistForEmail() {
  if (!TEST_TARGET_EMAIL) return null
  // Find profile with this email
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', TEST_TARGET_EMAIL)
    .maybeSingle()
  if (profErr) throw new Error(`Failed to query profile by email: ${profErr.message}`)

  if (prof?.user_id) {
    // Ensure therapist row exists
    const userId = prof.user_id
    const { data: th, error: thErr } = await supabase
      .from('therapists')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (thErr) throw new Error(`Failed to read therapist row: ${thErr.message}`)
    if (!th?.user_id) {
      const { error: insThErr } = await supabase
        .from('therapists')
        .insert({ user_id: userId, status: 'active', full_name: 'Test Therapist' })
      if (insThErr) throw new Error(`Failed to create therapist row: ${insThErr.message}`)
    }
    console.log(`Using existing profile/therapist for ${TEST_TARGET_EMAIL}`)
    return prof.user_id
  }

  // Create a new user_id and rows in profiles and therapists
  const userId = crypto.randomUUID()
  const { error: insProfErr } = await supabase
    .from('profiles')
    .insert({ user_id: userId, email: TEST_TARGET_EMAIL, role: 'therapist', full_name: 'Test Therapist' })
  if (insProfErr) throw new Error(`Failed to create profile: ${insProfErr.message}`)

  const { error: insThErr } = await supabase
    .from('therapists')
    .insert({ user_id: userId, status: 'active', full_name: 'Test Therapist' })
  if (insThErr) throw new Error(`Failed to create therapist: ${insThErr.message}`)

  console.log(`Created test therapist for ${TEST_TARGET_EMAIL}`)
  return userId
}

async function insertTestPayment(therapistId) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('therapist_payments')
    .insert({
      therapist_id: therapistId,
      payment_period_start: periodStart,
      payment_period_end: periodEnd,
      total_sessions: 5,
      commission_amount: 300,
      payment_due_date: dueDate.toISOString(),
      status: 'pending',
      admin_notes: 'QSTASH E2E TEST',
    })
    .select('id, payment_due_date')
    .single()

  if (error) {
    throw new Error(`Failed to create test payment: ${error.message}`)
  }
  return { paymentId: data.id, dueDate: new Date(data.payment_due_date) }
}

async function scheduleNotifications(paymentId, therapistId) {
  const delays = parseDelays()
  const targets = [
    { path: '/api/payment-notifications/reminder', delay: delays[0] || 5 },
    { path: '/api/payment-notifications/grace-period', delay: delays[1] || 7 },
    { path: '/api/payment-notifications/suspension-warning', delay: delays[2] || 9 },
  ]

  const makeSchedule = (minutesFromNow) => new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString()

  for (const target of targets) {
    const scheduleTime = makeSchedule(target.delay)
    const url = `${SITE_URL}${target.path}`
    console.log(`Scheduling ${target.path} in ${target.delay}m at ${scheduleTime}`)

    await qstash.publishJSON({
      url,
      body: { payment_id: paymentId, therapist_id: therapistId },
      schedule: scheduleTime,
    })
  }
}

async function main() {
  try {
    let therapistId
    if (TEST_TARGET_EMAIL) {
      therapistId = await getOrCreateTherapistForEmail()
    }
    if (!therapistId) {
      console.log('Fetching any active therapist...')
      therapistId = await getAnyActiveTherapistId()
      if (!therapistId) throw new Error('No active therapist found')
    }
    console.log(`Using therapist ${therapistId}`)

    console.log('Creating test payment...')
    const { paymentId } = await insertTestPayment(therapistId)
    console.log(`Payment created: ${paymentId}`)

    console.log('Scheduling notifications via QStash...')
    await scheduleNotifications(paymentId, therapistId)

    console.log('\nDone! Webhooks scheduled.')
    console.log(`Tunnel: ${SITE_URL}`)
    if (TEST_TARGET_EMAIL) {
      console.log(`Test emails will be sent to: ${TEST_TARGET_EMAIL}`)
    }
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

main()
