import { Client } from "@upstash/qstash"

// Qstash credentials
const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY

if (!QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN environment variable is required")
}

// Initialize Qstash client
const qstashClient = new Client({ token: QSTASH_TOKEN })

// Base URL for webhooks (production or local)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

/**
 * Notification stages for payment reminders
 */
export type PaymentNotificationStage =
  | "reminder_3_days_before"
  | "deadline_notification"
  | "warning_3_days_after"
  | "suspension_6_days_after"

/**
 * Schedule all payment reminder notifications for a payment
 * @param paymentId - Payment ID
 * @param therapistId - Therapist ID
 * @param paymentDueDate - Payment due date
 * @returns Array of scheduled message IDs
 */
export async function schedulePaymentNotifications(
  paymentId: string,
  therapistId: string,
  paymentDueDate: Date
): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
  try {
    const messageIds: string[] = []

    // Calculate notification times
    const threeDaysBefore = new Date(paymentDueDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    const deadlineTime = new Date(paymentDueDate)
    const threeDaysAfter = new Date(paymentDueDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sixDaysAfter = new Date(paymentDueDate.getTime() + 6 * 24 * 60 * 60 * 1000)

    const now = new Date()

    // Schedule 1: Reminder 3 days before deadline
    if (threeDaysBefore > now) {
      const msg1 = await qstashClient.publishJSON({
        url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
        body: {
          paymentId,
          therapistId,
          stage: "reminder_3_days_before" as PaymentNotificationStage,
        },
        notBefore: Math.floor(threeDaysBefore.getTime() / 1000),
      })
      messageIds.push(msg1.messageId)
      console.log(`[Qstash] Scheduled reminder_3_days_before for payment ${paymentId} at ${threeDaysBefore.toISOString()}`)
    }

    // Schedule 2: Deadline notification
    if (deadlineTime > now) {
      const msg2 = await qstashClient.publishJSON({
        url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
        body: {
          paymentId,
          therapistId,
          stage: "deadline_notification" as PaymentNotificationStage,
        },
        notBefore: Math.floor(deadlineTime.getTime() / 1000),
      })
      messageIds.push(msg2.messageId)
      console.log(`[Qstash] Scheduled deadline_notification for payment ${paymentId} at ${deadlineTime.toISOString()}`)
    }

    // Schedule 3: Warning 3 days after deadline
    if (threeDaysAfter > now) {
      const msg3 = await qstashClient.publishJSON({
        url: `${BASE_URL}/api/webhooks/qstash/payment-notification`,
        body: {
          paymentId,
          therapistId,
          stage: "warning_3_days_after" as PaymentNotificationStage,
        },
        notBefore: Math.floor(threeDaysAfter.getTime() / 1000),
      })
      messageIds.push(msg3.messageId)
      console.log(`[Qstash] Scheduled warning_3_days_after for payment ${paymentId} at ${threeDaysAfter.toISOString()}`)
    }

    // Schedule 4: Suspension 6 days after deadline
    if (sixDaysAfter > now) {
      const msg4 = await qstashClient.publishJSON({
        url: `${BASE_URL}/api/webhooks/qstash/payment-suspension`,
        body: {
          paymentId,
          therapistId,
        },
        notBefore: Math.floor(sixDaysAfter.getTime() / 1000),
      })
      messageIds.push(msg4.messageId)
      console.log(`[Qstash] Scheduled suspension for payment ${paymentId} at ${sixDaysAfter.toISOString()}`)
    }

    return { success: true, messageIds }
  } catch (error: any) {
    console.error("[Qstash] Error scheduling payment notifications:", error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel all scheduled notifications for a payment (when payment is completed)
 * This would require storing message IDs, but since we can't modify DB structure,
 * we'll rely on the webhook checking payment status before sending emails
 */
export async function cancelPaymentNotifications(messageIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Note: Qstash doesn't have a direct cancel API for scheduled messages
    // The webhook will check payment status before sending, so this is optional
    console.log(`[Qstash] Note: Cannot cancel messages directly. Webhook will verify payment status.`)
    return { success: true }
  } catch (error: any) {
    console.error("[Qstash] Error cancelling notifications:", error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Verify Qstash webhook signature
 */
export async function verifyQstashSignature(
  signature: string,
  body: string
): Promise<boolean> {
  try {
    if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
      console.error("[Qstash] Missing signing keys")
      return false
    }

    const { Receiver } = await import("@upstash/qstash")
    const receiver = new Receiver({
      currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
    })

    await receiver.verify({
      signature,
      body,
    })

    return true
  } catch (error: any) {
    console.error("[Qstash] Signature verification failed:", error.message)
    return false
  }
}
