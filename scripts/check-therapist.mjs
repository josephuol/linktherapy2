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

const EMAIL = 'Christi123mansour@hotmail.com'

async function main() {
  console.log(`\n🔍 Checking account state for: ${EMAIL}\n`)
  console.log('=' .repeat(80))

  // 1. Check auth.users (via admin API)
  console.log('\n📋 STEP 1: Checking Supabase Auth Users...')
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
    } else {
      const user = authUsers.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
      if (user) {
        console.log('✅ FOUND in auth.users:')
        console.log(`   - User ID: ${user.id}`)
        console.log(`   - Email: ${user.email}`)
        console.log(`   - Email Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
        console.log(`   - Created: ${user.created_at}`)
        console.log(`   - Last Sign In: ${user.last_sign_in_at || 'Never'}`)
        console.log(`   - User Metadata:`, JSON.stringify(user.user_metadata, null, 2))
        console.log(`   - App Metadata:`, JSON.stringify(user.app_metadata, null, 2))
      } else {
        console.log('❌ NOT FOUND in auth.users')
      }
    }
  } catch (error) {
    console.error('❌ Exception checking auth:', error.message)
  }

  // 2. Check profiles table
  console.log('\n📋 STEP 2: Checking profiles table...')
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', EMAIL)

    if (profileError) {
      console.error('❌ Error:', profileError.message)
    } else if (profiles && profiles.length > 0) {
      console.log(`✅ FOUND ${profiles.length} record(s):`)
      profiles.forEach((profile, idx) => {
        console.log(`\n   Record ${idx + 1}:`)
        console.log(`   - User ID: ${profile.user_id}`)
        console.log(`   - Email: ${profile.email}`)
        console.log(`   - Full Name: ${profile.full_name || 'NOT SET'}`)
        console.log(`   - Role: ${profile.role}`)
        console.log(`   - Created: ${profile.created_at}`)
      })
    } else {
      console.log('❌ NOT FOUND in profiles')
    }
  } catch (error) {
    console.error('❌ Exception:', error.message)
  }

  // 3. Check therapists table
  console.log('\n📋 STEP 3: Checking therapists table...')
  try {
    // First get profile to find user_id
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', EMAIL)

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.user_id)

      const { data: therapists, error: therapistError } = await supabase
        .from('therapists')
        .select('*')
        .in('user_id', userIds)

      if (therapistError) {
        console.error('❌ Error:', therapistError.message)
      } else if (therapists && therapists.length > 0) {
        console.log(`✅ FOUND ${therapists.length} record(s):`)
        therapists.forEach((therapist, idx) => {
          console.log(`\n   Record ${idx + 1}:`)
          console.log(`   - User ID: ${therapist.user_id}`)
          console.log(`   - Full Name: ${therapist.full_name || 'NOT SET'}`)
          console.log(`   - Status: ${therapist.status}`)
          console.log(`   - Bio: ${therapist.bio ? 'SET' : 'NOT SET'}`)
          console.log(`   - Profile Pic: ${therapist.profile_pic_url ? 'SET' : 'NOT SET'}`)
          console.log(`   - Created: ${therapist.created_at}`)
        })
      } else {
        console.log('❌ NOT FOUND in therapists')
      }
    } else {
      console.log('⚠️  Cannot check - no profile found')
    }
  } catch (error) {
    console.error('❌ Exception:', error.message)
  }

  // 4. Check therapist_invitations table
  console.log('\n📋 STEP 4: Checking therapist_invitations table...')
  try {
    const { data: invitations, error: inviteError } = await supabase
      .from('therapist_invitations')
      .select('*')
      .ilike('email', EMAIL)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('❌ Error:', inviteError.message)
    } else if (invitations && invitations.length > 0) {
      console.log(`✅ FOUND ${invitations.length} invitation(s):`)
      invitations.forEach((invite, idx) => {
        console.log(`\n   Invitation ${idx + 1}:`)
        console.log(`   - Email: ${invite.email}`)
        console.log(`   - Status: ${invite.status}`)
        console.log(`   - Invited By: ${invite.invited_by}`)
        console.log(`   - Created: ${invite.created_at}`)
        console.log(`   - Accepted: ${invite.accepted_at || 'NOT ACCEPTED'}`)
      })
    } else {
      console.log('❌ NOT FOUND in therapist_invitations')
    }
  } catch (error) {
    console.error('❌ Exception:', error.message)
  }

  // 5. Check admin_audit_logs
  console.log('\n📋 STEP 5: Checking admin_audit_logs...')
  try {
    const { data: logs, error: logError } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .ilike('target_email', EMAIL)
      .order('created_at', { ascending: false })
      .limit(10)

    if (logError) {
      console.error('❌ Error:', logError.message)
    } else if (logs && logs.length > 0) {
      console.log(`✅ FOUND ${logs.length} log entries (showing last 10):`)
      logs.forEach((log, idx) => {
        console.log(`\n   Log ${idx + 1}:`)
        console.log(`   - Action: ${log.action}`)
        console.log(`   - Admin: ${log.admin_email}`)
        console.log(`   - Target: ${log.target_email}`)
        console.log(`   - Details: ${log.details || 'N/A'}`)
        console.log(`   - Timestamp: ${log.created_at}`)
      })
    } else {
      console.log('❌ NOT FOUND in admin_audit_logs')
    }
  } catch (error) {
    console.error('❌ Exception:', error.message)
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 DIAGNOSIS:\n')

  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const user = authUsers?.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
    const { data: profiles } = await supabase.from('profiles').select('*').ilike('email', EMAIL)
    const { data: therapists } = await supabase.from('therapists').select('*').in('user_id', profiles?.map(p => p.user_id) || [])

    if (user && (!profiles || profiles.length === 0)) {
      console.log('⚠️  ORPHANED AUTH USER: User exists in auth.users but NOT in profiles table')
      console.log('   → This causes invite links to authenticate but fail to load profile')
      console.log('   → FIX: Delete user from Supabase Auth Dashboard and re-invite')
    } else if (user && profiles && profiles.length > 0 && (!therapists || therapists.length === 0)) {
      console.log('⚠️  INCOMPLETE PROFILE: User exists in auth + profiles but NOT in therapists table')
      console.log('   → This causes onboarding to fail')
      console.log('   → FIX: Delete user from Supabase Auth Dashboard and re-invite')
    } else if (user && profiles && profiles.length > 0 && therapists && therapists.length > 0) {
      const therapist = therapists[0]
      if (!therapist.full_name || !therapist.bio) {
        console.log('⚠️  INCOMPLETE ONBOARDING: User exists but never completed profile setup')
        console.log('   → Invite links authenticate but onboarding is stuck')
        console.log('   → FIX: Delete user from Supabase Auth Dashboard and re-invite')
      } else {
        console.log('✅ ACCOUNT LOOKS COMPLETE: User has auth + profile + therapist data')
        console.log('   → Check if therapist can log in at /login instead')
      }
    } else if (!user && (profiles && profiles.length > 0)) {
      console.log('⚠️  ORPHANED DATABASE RECORDS: Data exists in profiles/therapists but NO auth user')
      console.log('   → This blocks new invites due to UNIQUE email constraint')
      console.log('   → FIX: Manually delete records from profiles table, then re-invite')
    } else {
      console.log('✅ CLEAN STATE: No records found anywhere')
      console.log('   → Safe to send fresh invite')
    }
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message)
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main()
