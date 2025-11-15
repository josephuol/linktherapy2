/**
 * Direct Email Testing Script
 *
 * This script directly tests the email functionality without requiring
 * the full application to be running. It sends test emails for all 4
 * notification stages.
 *
 * Run with: node test-emails-direct.js <your-email>
 */

const { Resend } = require('resend')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local')
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  } catch (error) {
    console.log('Warning: Could not load .env.local file')
  }
}

loadEnv()

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LinkTherapy <noreply@linktherapy.org>"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

if (!RESEND_API_KEY) {
  console.error("❌ Error: RESEND_API_KEY not found in .env.local")
  process.exit(1)
}

const resend = new Resend(RESEND_API_KEY)

// Get test email from command line
const testEmail = process.argv[2]
if (!testEmail) {
  console.error("Usage: node test-emails-direct.js <your-email>")
  process.exit(1)
}

console.log("=== Email Template Testing ===")
console.log(`Test email: ${testEmail}`)
console.log(`From: ${FROM_EMAIL}`)
console.log()

// Test data
const therapistName = "Dr. Jane Smith"
const paymentPeriod = "Jan 1, 2025 - Jan 15, 2025"
const commissionAmount = 120.00
const formattedAmount = `$${commissionAmount.toFixed(2)}`
const paymentDueDate = new Date("2025-01-20T00:00:00Z")
const formattedDate = paymentDueDate.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

async function sendTestEmail(subject, html, text) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [testEmail],
      subject,
      html,
      text
    })

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`)
      return false
    }

    console.log(`  ✅ Sent! Email ID: ${data.id}`)
    return true
  } catch (error) {
    console.error(`  ❌ Exception: ${error.message}`)
    return false
  }
}

async function runTests() {
  let successCount = 0
  let failCount = 0

  // Test 1: Payment Reminder (3 days before)
  console.log("1. Testing Payment Reminder Email...")
  const reminderSuccess = await sendTestEmail(
    `[TEST] Payment Reminder: ${formattedAmount} due ${formattedDate}`,
    `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">LinkTherapy</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827;">Payment Reminder</h2>
          <p>Hello ${therapistName},</p>
          <p>This is a friendly reminder that your payment for the period <strong>${paymentPeriod}</strong> is due in 3 days.</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #056DBA;">
            <p><strong>Amount Due:</strong> <span style="color: #056DBA; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
            <p><strong>Payment Period:</strong> ${paymentPeriod}</p>
          </div>
          <p><strong>[THIS IS A TEST EMAIL]</strong></p>
        </div>
      </body>
      </html>
    `,
    `[TEST] Payment Reminder\n\nHello ${therapistName},\n\nThis is a test of the payment reminder email.\nAmount: ${formattedAmount}\nDue: ${formattedDate}\nPeriod: ${paymentPeriod}`
  )
  if (reminderSuccess) successCount++; else failCount++
  console.log()

  // Wait 2 seconds between emails to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 2: Payment Deadline
  console.log("2. Testing Payment Deadline Email...")
  const deadlineSuccess = await sendTestEmail(
    `[TEST] URGENT: Payment Due Today - ${formattedAmount}`,
    `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">LinkTherapy</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
          <h2 style="color: #dc2626;">⚠️ Payment Due Today</h2>
          <p>Hello ${therapistName},</p>
          <p>Your payment for the period <strong>${paymentPeriod}</strong> is <strong style="color: #dc2626;">due today</strong>.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p><strong>Amount Due:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
            <p><strong>Payment Period:</strong> ${paymentPeriod}</p>
            <p style="color: #dc2626; font-weight: 600;">⏰ Due: Today</p>
          </div>
          <p><strong>[THIS IS A TEST EMAIL]</strong></p>
        </div>
      </body>
      </html>
    `,
    `[TEST] URGENT: Payment Due Today\n\nHello ${therapistName},\n\nThis is a test of the deadline notification email.\nAmount: ${formattedAmount}\nPeriod: ${paymentPeriod}`
  )
  if (deadlineSuccess) successCount++; else failCount++
  console.log()

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 3: Payment Warning (3 days after)
  console.log("3. Testing Payment Warning Email...")
  const warningSuccess = await sendTestEmail(
    `[TEST] URGENT: Overdue Payment - Account Suspension in 3 Days`,
    `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">LinkTherapy</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
          <h2 style="color: #dc2626;">🚨 Overdue Payment - Action Required</h2>
          <p>Hello ${therapistName},</p>
          <p>Your payment for the period <strong>${paymentPeriod}</strong> is now <strong style="color: #dc2626;">3 days overdue</strong>.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p><strong>Overdue Amount:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
            <p><strong>Payment Period:</strong> ${paymentPeriod}</p>
            <p style="color: #dc2626; font-weight: 600;">🚨 Status: 3 Days Overdue</p>
          </div>
          <div style="background: #7f1d1d; color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">⚠️ URGENT ACTION REQUIRED</p>
            <p style="margin: 0;">Your account will be <strong>suspended in 3 days</strong> if payment is not received.</p>
          </div>
          <p><strong>[THIS IS A TEST EMAIL]</strong></p>
        </div>
      </body>
      </html>
    `,
    `[TEST] URGENT: Overdue Payment\n\nHello ${therapistName},\n\nThis is a test of the warning email.\nAmount: ${formattedAmount}\nStatus: 3 Days Overdue`
  )
  if (warningSuccess) successCount++; else failCount++
  console.log()

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 4: Account Suspension
  console.log("4. Testing Account Suspension Email...")
  const suspensionSuccess = await sendTestEmail(
    `[TEST] Account Suspended - Immediate Action Required`,
    `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">LinkTherapy</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
          <h2 style="color: #7f1d1d;">🛑 Account Suspended</h2>
          <p>Hello ${therapistName},</p>
          <p>Your LinkTherapy account has been <strong style="color: #dc2626;">suspended</strong> due to non-payment for the period <strong>${paymentPeriod}</strong>.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7f1d1d;">
            <p><strong>Outstanding Amount:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
            <p><strong>Payment Period:</strong> ${paymentPeriod}</p>
            <p style="color: #7f1d1d; font-weight: 600;">🛑 Status: Account Suspended</p>
          </div>
          <div style="background: #450a0a; color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">What This Means:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Your profile is no longer visible to potential clients</li>
              <li style="margin-bottom: 8px;">You cannot receive new contact requests</li>
              <li style="margin-bottom: 8px;">Your therapist ranking has been set to 0</li>
            </ul>
          </div>
          <p><strong>[THIS IS A TEST EMAIL]</strong></p>
        </div>
      </body>
      </html>
    `,
    `[TEST] Account Suspended\n\nHello ${therapistName},\n\nThis is a test of the suspension email.\nAmount: ${formattedAmount}\nStatus: Account Suspended`
  )
  if (suspensionSuccess) successCount++; else failCount++
  console.log()

  // Summary
  console.log("=== Test Summary ===")
  console.log(`✅ Successful: ${successCount}/4`)
  console.log(`❌ Failed: ${failCount}/4`)
  console.log()
  console.log("Check your email inbox for the test emails!")
  console.log()

  if (failCount > 0) {
    console.log("⚠️  Some emails failed to send. Check:")
    console.log("   - RESEND_API_KEY is valid")
    console.log("   - FROM_EMAIL domain is verified in Resend")
    console.log("   - Resend dashboard for error details")
  } else {
    console.log("🎉 All test emails sent successfully!")
  }
}

runTests().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
