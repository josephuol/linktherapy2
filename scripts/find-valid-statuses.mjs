import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

console.log('\n🔍 Finding valid therapist status values...\n')

// The error message should tell us what's valid
const { error } = await supabase.from('therapists').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  status: 'INVALID_TEST_STATUS_123'
})

if (error && error.message) {
  console.log('Error message:', error.message)

  // Try to extract enum values from error
  const match = error.message.match(/invalid input value for enum therapist_status: ".*".*Detail: Valid values are: (.*)/)
  if (match) {
    console.log('\n✅ Valid status values:', match[1])
  } else {
    console.log('\nCould not extract valid values from error')
  }
}

console.log('\n')
