/**
 * Test script for payment notification system
 *
 * This script helps test the Qstash notification scheduling without
 * actually creating payments in the database.
 *
 * Usage:
 * 1. Add Qstash credentials to .env.local
 * 2. Run: npx tsx test-payment-notifications.ts
 */

import { schedulePaymentNotifications } from "./lib/qstash-service"

async function testNotificationScheduling() {
  console.log("=== Testing Payment Notification Scheduling ===\n")

  // Test payment data
  const testPaymentId = "00000000-0000-0000-0000-000000000001"
  const testTherapistId = "00000000-0000-0000-0000-000000000002"

  // Test different due dates
  const testCases = [
    {
      name: "Future payment (7 days from now)",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      name: "Near future payment (2 days from now)",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      name: "Payment due today",
      dueDate: new Date()
    },
    {
      name: "Overdue payment (5 days ago)",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ]

  for (const testCase of testCases) {
    console.log(`\nTest Case: ${testCase.name}`)
    console.log(`Due Date: ${testCase.dueDate.toISOString()}`)
    console.log("---")

    try {
      const result = await schedulePaymentNotifications(
        testPaymentId,
        testTherapistId,
        testCase.dueDate
      )

      if (result.success) {
        console.log("✅ Scheduling successful!")
        console.log(`Scheduled ${result.messageIds?.length || 0} notifications`)
        if (result.messageIds) {
          console.log("Message IDs:", result.messageIds)
        }
      } else {
        console.log("❌ Scheduling failed!")
        console.log("Error:", result.error)
      }
    } catch (error: any) {
      console.log("❌ Exception occurred!")
      console.log("Error:", error.message)
    }
  }

  console.log("\n=== Test Complete ===")
  console.log("\nNext Steps:")
  console.log("1. Check Qstash dashboard to see scheduled messages")
  console.log("2. Verify webhook URLs are correct")
  console.log("3. Test webhook signature verification")
}

// Run tests
testNotificationScheduling().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
