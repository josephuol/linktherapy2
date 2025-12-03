#!/usr/bin/env node
/**
 * Diagnostic script to identify why commissions are showing as $0
 * Run with: node scripts/diagnose-commissions.mjs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_COMMISSION_PER_SESSION = 6

async function diagnose() {
  console.log('🔍 Starting commission diagnostics...\n')

  // 1. Check all payment records with $0 commission
  console.log('1️⃣  Checking payment records with $0 commission...')
  const { data: zeroCommissionPayments, error: paymentsError } = await supabase
    .from('therapist_payments')
    .select(`
      id,
      therapist_id,
      payment_period_start,
      payment_period_end,
      total_sessions,
      commission_amount,
      status,
      therapists!inner(full_name, user_id)
    `)
    .eq('commission_amount', 0)

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError)
    return
  }

  console.log(`   Found ${zeroCommissionPayments?.length || 0} payments with $0 commission\n`)

  if (!zeroCommissionPayments || zeroCommissionPayments.length === 0) {
    console.log('✅ No payments with $0 commission found. Issue may be elsewhere.')
    return
  }

  // 2. For each payment with $0, check actual sessions
  for (const payment of zeroCommissionPayments) {
    console.log(`\n📋 Payment ID: ${payment.id}`)
    console.log(`   Therapist: ${payment.therapists.full_name} (${payment.therapist_id})`)
    console.log(`   Period: ${payment.payment_period_start} to ${payment.payment_period_end}`)
    console.log(`   Recorded sessions: ${payment.total_sessions}`)
    console.log(`   Recorded commission: $${payment.commission_amount}`)

    // Calculate period bounds
    const periodStart = new Date(payment.payment_period_start)
    const periodEnd = new Date(payment.payment_period_end)
    const endExclusive = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)

    // Count sessions in database
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, status, session_date, client_name')
      .eq('therapist_id', payment.therapist_id)
      .gte('session_date', periodStart.toISOString())
      .lt('session_date', endExclusive.toISOString())

    if (sessionsError) {
      console.error('   ❌ Error fetching sessions:', sessionsError)
      continue
    }

    console.log(`\n   📊 Sessions found in database: ${sessions?.length || 0}`)

    if (sessions && sessions.length > 0) {
      const scheduledOrCompleted = sessions.filter(s =>
        s.status === 'scheduled' || s.status === 'completed'
      )
      const otherStatuses = sessions.filter(s =>
        s.status !== 'scheduled' && s.status !== 'completed'
      )

      console.log(`      ✅ Scheduled/Completed: ${scheduledOrCompleted.length}`)
      console.log(`      ⚠️  Other statuses: ${otherStatuses.length}`)

      if (otherStatuses.length > 0) {
        console.log('\n      Sessions with other statuses:')
        otherStatuses.forEach(s => {
          console.log(`         - ${s.id}: ${s.status} (${s.session_date})`)
        })
      }

      const expectedCommission = scheduledOrCompleted.length * ADMIN_COMMISSION_PER_SESSION
      console.log(`\n   💰 Expected commission: $${expectedCommission} (${scheduledOrCompleted.length} × $${ADMIN_COMMISSION_PER_SESSION})`)
      console.log(`   📉 Actual commission: $${payment.commission_amount}`)
      console.log(`   ⚠️  DISCREPANCY: $${expectedCommission - payment.commission_amount}`)

      // Show sample sessions
      if (scheduledOrCompleted.length > 0) {
        console.log('\n   Sample sessions:')
        scheduledOrCompleted.slice(0, 3).forEach(s => {
          console.log(`      - ${s.client_name || 'No name'} | ${s.status} | ${new Date(s.session_date).toLocaleDateString()}`)
        })
      }
    } else {
      console.log('   ⚠️  No sessions found for this period!')
      console.log('   This payment record may have been created before sessions were added.')
    }
  }

  // 3. Check for sessions without payment records
  console.log('\n\n2️⃣  Checking for sessions without payment records...')
  const { data: allSessions, error: allSessionsError } = await supabase
    .from('sessions')
    .select('therapist_id, session_date, status')
    .in('status', ['scheduled', 'completed'])
    .order('session_date', { ascending: false })
    .limit(100)

  if (allSessionsError) {
    console.error('❌ Error fetching all sessions:', allSessionsError)
    return
  }

  console.log(`   Found ${allSessions?.length || 0} recent scheduled/completed sessions`)

  // 4. Summary and recommendations
  console.log('\n\n📌 SUMMARY AND RECOMMENDATIONS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (zeroCommissionPayments.length > 0) {
    console.log('\n❌ ISSUE CONFIRMED: Payment records exist with $0 commission')
    console.log('\n🔧 FIXES APPLIED:')
    console.log('   1. Updated /api/admin/payments/list to calculate commissions dynamically')
    console.log('   2. The next time admin views payments page, commissions will be recalculated')
    console.log('\n💡 RECOMMENDATION:')
    console.log('   - Refresh the /admin/payments page to trigger recalculation')
    console.log('   - Or run: POST /api/admin/backfill-commissions to update all at once')
  } else {
    console.log('\n✅ All payment records have non-zero commissions')
  }

  console.log('\n✅ Diagnostic complete!')
}

diagnose().catch(console.error)
