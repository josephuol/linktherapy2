/**
 * Qstash Notification Scheduling Test
 *
 * This script tests the Qstash notification scheduling functionality.
 * It creates test payment notifications and verifies they're scheduled correctly.
 *
 * Run with: node test-qstash-scheduling.js
 */

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
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  } catch (error) {
    console.log('Warning: Could not load .env.local file')
  }
}

loadEnv()

// Import after env is loaded
const { Client } = require('@upstash/qstash')

const QSTASH_TOKEN = process.env.QSTASH_TOKEN
let BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

if (!QSTASH_TOKEN) {
  console.error("❌ Error: QSTASH_TOKEN not found in .env.local")
  process.exit(1)
}

// Qstash cannot call localhost - use a test URL for demonstration
if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
  console.log("⚠️  Note: Qstash cannot call localhost URLs.")
  console.log("   Using a placeholder URL for testing the scheduling API.")
  console.log("   For real testing, deploy to production or use ngrok/cloudflare tunnel.")
  console.log()
  BASE_URL = "https://example.com"  // Placeholder for testing
}

const qstash = new Client({ token: QSTASH_TOKEN })

console.log("=== Qstash Notification Scheduling Test ===")
console.log(`Base URL: ${BASE_URL}`)
console.log()

async function scheduleTestNotifications() {
  const testPaymentId = "test-payment-" + Date.now()
  const testTherapistId = "test-therapist-" + Date.now()

  // Calculate notification times
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)

  console.log("Payment Due Date: " + threeDaysFromNow.toISOString())
  console.log()

  const messageIds = []
  let successCount = 0
  let failCount = 0

  // Test 1: Schedule reminder (3 days before deadline)
  console.log("1. Scheduling Payment Reminder (immediate for testing)...")
  try {
    // Schedule for 10 seconds from now for testing
    const reminderTime = new Date(now.getTime() + 10 * 1000)
    const msg1 = await qstash.publishJSON({
      url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
      body: {
        paymentId: testPaymentId,
        therapistId: testTherapistId,
        stage: "reminder_3_days_before"
      },
      notBefore: Math.floor(reminderTime.getTime() / 1000)
    })
    messageIds.push(msg1.messageId)
    console.log(`  ✅ Scheduled! Message ID: ${msg1.messageId}`)
    console.log(`  Delivery time: ${reminderTime.toISOString()}`)
    successCount++
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    failCount++
  }
  console.log()

  // Test 2: Schedule deadline notification
  console.log("2. Scheduling Deadline Notification (20 seconds from now)...")
  try {
    const deadlineTime = new Date(now.getTime() + 20 * 1000)
    const msg2 = await qstash.publishJSON({
      url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
      body: {
        paymentId: testPaymentId,
        therapistId: testTherapistId,
        stage: "deadline_notification"
      },
      notBefore: Math.floor(deadlineTime.getTime() / 1000)
    })
    messageIds.push(msg2.messageId)
    console.log(`  ✅ Scheduled! Message ID: ${msg2.messageId}`)
    console.log(`  Delivery time: ${deadlineTime.toISOString()}`)
    successCount++
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    failCount++
  }
  console.log()

  // Test 3: Schedule warning notification
  console.log("3. Scheduling Warning Notification (30 seconds from now)...")
  try {
    const warningTime = new Date(now.getTime() + 30 * 1000)
    const msg3 = await qstash.publishJSON({
      url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
      body: {
        paymentId: testPaymentId,
        therapistId: testTherapistId,
        stage: "warning_3_days_after"
      },
      notBefore: Math.floor(warningTime.getTime() / 1000)
    })
    messageIds.push(msg3.messageId)
    console.log(`  ✅ Scheduled! Message ID: ${msg3.messageId}`)
    console.log(`  Delivery time: ${warningTime.toISOString()}`)
    successCount++
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    failCount++
  }
  console.log()

  // Test 4: Schedule suspension
  console.log("4. Scheduling Suspension (40 seconds from now)...")
  try {
    const suspensionTime = new Date(now.getTime() + 40 * 1000)
    const msg4 = await qstash.publishJSON({
      url: `${BASE_URL}/api/webhooks/qstash/payment-suspension`,
      body: {
        paymentId: testPaymentId,
        therapistId: testTherapistId
      },
      notBefore: Math.floor(suspensionTime.getTime() / 1000)
    })
    messageIds.push(msg4.messageId)
    console.log(`  ✅ Scheduled! Message ID: ${msg4.messageId}`)
    console.log(`  Delivery time: ${suspensionTime.toISOString()}`)
    successCount++
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    failCount++
  }
  console.log()

  // Summary
  console.log("=== Test Summary ===")
  console.log(`✅ Successfully Scheduled: ${successCount}/4`)
  console.log(`❌ Failed: ${failCount}/4`)
  console.log()

  if (successCount > 0) {
    console.log("📋 Message IDs:")
    messageIds.forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`)
    })
    console.log()
    console.log("✨ Next Steps:")
    console.log("   1. Go to https://console.upstash.com/")
    console.log("   2. Navigate to your Qstash project")
    console.log("   3. Check the 'Messages' tab")
    console.log("   4. You should see the scheduled messages")
    console.log()
    console.log("⚠️  Note: These webhooks will attempt to call your local server")
    console.log("   at " + BASE_URL)
    console.log("   Make sure your dev server is running and accessible!")
  }

  if (failCount > 0) {
    console.log()
    console.log("⚠️  Some notifications failed to schedule. Check:")
    console.log("   - QSTASH_TOKEN is valid")
    console.log("   - Qstash dashboard for error details")
    console.log("   - Network connectivity")
  }
}

scheduleTestNotifications().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
