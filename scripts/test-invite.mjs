import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://linktherapy.org'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const EMAIL = 'Christi123mansour@hotmail.com'

console.log('\n🚀 Testing Magic Link Invite System')
console.log('=' .repeat(80))
console.log(`\n📧 Sending invite to: ${EMAIL}`)
console.log(`🌐 Site URL: ${SITE_URL}\n`)

async function main() {
  // 1. Check for existing pending invitation
  console.log('1️⃣ Checking for existing invitations...')
  const { data: existing } = await supabase
    .from('therapist_invitations')
    .select('*')
    .ilike('email', EMAIL)

  if (existing && existing.length > 0) {
    console.log(`   Found ${existing.length} existing invitation(s):`)
    existing.forEach(inv => {
      console.log(`   - Status: ${inv.status}, Created: ${inv.invited_at}`)
    })
  } else {
    console.log('   No existing invitations found')
  }

  // 2. Generate new invite token
  console.log('\n2️⃣ Generating invite token...')
  const inviteToken = randomBytes(32).toString('hex')
  console.log(`   Token (first 16 chars): ${inviteToken.substring(0, 16)}...`)

  // 3. Create invitation record
  console.log('\n3️⃣ Creating invitation record...')
  const { error: inviteErr } = await supabase
    .from('therapist_invitations')
    .insert({
      email: EMAIL.toLowerCase(),
      token_hash: inviteToken,
      status: 'pending',
      invited_at: new Date().toISOString(),
      last_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      send_count: 1
    })

  if (inviteErr) {
    console.error('   ❌ Error:', inviteErr.message)
    if (inviteErr.message.includes('unique') || inviteErr.message.includes('duplicate')) {
      console.log('   ℹ️  Invitation already exists. Delete it first or use resend.')
    }
    process.exit(1)
  }

  console.log('   ✅ Invitation record created')

  // 4. Generate magic link
  const inviteUrl = `${SITE_URL}/invite/accept?token=${inviteToken}`
  console.log('\n4️⃣ Magic Link Generated:')
  console.log(`   ${inviteUrl}`)

  // 5. Send email via Resend
  console.log('\n5️⃣ Sending email via Resend...')

  const resendModule = await import('resend')
  const Resend = resendModule.Resend || resendModule.default
  const resend = new Resend(RESEND_API_KEY)

  const { data: emailData, error: emailErr } = await resend.emails.send({
    from: 'LinkTherapy <noreply@linktherapy.org>',
    to: [EMAIL],
    subject: "You've been invited to join LinkTherapy",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to LinkTherapy</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827; margin-top: 0; font-size: 24px;">You've been invited!</h2>
          <p style="color: #4b5563; font-size: 16px;">You've been invited to join LinkTherapy as a therapist. Complete your profile and start connecting with clients.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  })

  if (emailErr) {
    console.error('   ❌ Email error:', emailErr.message)
    process.exit(1)
  }

  console.log('   ✅ Email sent successfully!')
  console.log(`   Email ID: ${emailData?.id}`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ Invite sent successfully!')
  console.log('\n📋 Next steps:')
  console.log('   1. Check the therapist\'s email inbox (may take a few minutes)')
  console.log('   2. Have them click the "Accept Invitation" button')
  console.log('   3. They should be able to set their password and complete onboarding')
  console.log('   4. The link can be clicked multiple times (immune to email scanning!)')
  console.log('\n')
}

main().catch(console.error)
