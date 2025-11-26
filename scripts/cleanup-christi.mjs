import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const EMAIL = 'Christi123mansour@hotmail.com'

async function cleanup() {
  console.log('\n🧹 Cleaning up Christi\'s existing account...\n')

  // 1. Find auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const user = authUsers.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())

  if (user) {
    console.log('Found existing auth user:')
    console.log(`  - User ID: ${user.id}`)
    console.log(`  - Email: ${user.email}`)
    console.log(`  - Created: ${user.created_at}`)

    // 2. Delete from profiles
    const { error: profErr } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id)

    if (profErr) {
      console.log(`  ⚠️  Profile delete: ${profErr.message}`)
    } else {
      console.log('  ✅ Deleted profile')
    }

    // 3. Delete from therapists
    const { error: therapistErr } = await supabase
      .from('therapists')
      .delete()
      .eq('user_id', user.id)

    if (therapistErr) {
      console.log(`  ⚠️  Therapist delete: ${therapistErr.message}`)
    } else {
      console.log('  ✅ Deleted therapist record')
    }

    // 4. Delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id)

    if (authErr) {
      console.log(`  ❌ Failed to delete auth user: ${authErr.message}`)
    } else {
      console.log('  ✅ Deleted auth user')
    }
  } else {
    console.log('  ℹ️  No existing auth user found')
  }

  // 5. Verify cleanup
  console.log('\n🔍 Verifying cleanup...\n')

  const { data: authCheck } = await supabase.auth.admin.listUsers()
  const userCheck = authCheck.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())

  const { data: profCheck } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', EMAIL)

  const { data: inviteCheck } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', EMAIL)
    .eq('status', 'pending')
    .single()

  console.log('Final State:')
  console.log(`  - Auth User: ${userCheck ? '❌ Still exists' : '✅ Deleted'}`)
  console.log(`  - Profile: ${profCheck && profCheck.length > 0 ? '❌ Still exists' : '✅ Deleted'}`)
  console.log(`  - Pending Invite: ${inviteCheck ? '✅ Ready' : '❌ Missing'}`)

  if (!userCheck && (!profCheck || profCheck.length === 0) && inviteCheck) {
    console.log('\n✅ Cleanup successful! Christi can now accept the invitation.')
    console.log('\n📋 Her magic link:')
    console.log(`https://linktherapy.org/invite/accept?token=${inviteCheck.token_hash}`)
    console.log('\nThis link can be clicked multiple times without expiring!\n')
  } else {
    console.log('\n⚠️  Some cleanup issues remain.\n')
  }
}

cleanup().catch(console.error)
