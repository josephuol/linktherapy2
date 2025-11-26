import { Client, Receiver } from "@upstash/qstash"

const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY
const QSTASH_URL = process.env.QSTASH_URL || "https://qstash.upstash.io"

if (!QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN environment variable is required")
}

if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
  throw new Error("QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY environment variables are required")
}

// Initialize QStash client (publishing)
export const qstashClient = new Client({
  token: QSTASH_TOKEN,
})

// Initialize QStash receiver (signature verification)
export const qstashReceiver = new Receiver({
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

/**
 * Schedule a payment reminder notification
 */
export async function schedulePaymentReminder(
  paymentId: string,
  therapistId: string,
  scheduledTime: Date
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${SITE_URL}/api/payment-notifications/reminder`
    
    const messageId = await qstashClient.publishJSON({
      url,
      body: { payment_id: paymentId, therapist_id: therapistId },
      schedule: scheduledTime.toISOString(),
    })

    return { success: true, messageId }
  } catch (error: any) {
    console.error("[QStash] Failed to schedule payment reminder:", error?.message || "Unknown error")
    return { success: false, error: error?.message || "Failed to schedule reminder" }
  }
}

/**
 * Schedule a grace period notification
 */
export async function schedulePaymentGracePeriod(
  paymentId: string,
  therapistId: string,
  scheduledTime: Date
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${SITE_URL}/api/payment-notifications/grace-period`
    
    const messageId = await qstashClient.publishJSON({
      url,
      body: { payment_id: paymentId, therapist_id: therapistId },
      schedule: scheduledTime.toISOString(),
    })

    return { success: true, messageId }
  } catch (error: any) {
    console.error("[QStash] Failed to schedule grace period notification:", error?.message || "Unknown error")
    return { success: false, error: error?.message || "Failed to schedule grace period notification" }
  }
}

/**
 * Schedule a suspension warning notification
 */
export async function schedulePaymentSuspensionWarning(
  paymentId: string,
  therapistId: string,
  scheduledTime: Date
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${SITE_URL}/api/payment-notifications/suspension-warning`
    
    const messageId = await qstashClient.publishJSON({
      url,
      body: { payment_id: paymentId, therapist_id: therapistId },
      schedule: scheduledTime.toISOString(),
    })

    return { success: true, messageId }
  } catch (error: any) {
    console.error("[QStash] Failed to schedule suspension warning:", error?.message || "Unknown error")
    return { success: false, error: error?.message || "Failed to schedule suspension warning" }
  }
}

/**
 * Schedule all payment notifications for a payment record
 */
export async function scheduleAllPaymentNotifications(
  paymentId: string,
  therapistId: string,
  paymentDueDate: Date
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = []

  // 3 days before deadline
  const reminderDate = new Date(paymentDueDate)
  reminderDate.setDate(reminderDate.getDate() - 3)
  
  // At deadline (grace period notification)
  const gracePeriodDate = new Date(paymentDueDate)
  
  // 3 days after deadline (suspension warning)
  const suspensionWarningDate = new Date(paymentDueDate)
  suspensionWarningDate.setDate(suspensionWarningDate.getDate() + 3)

  // Only schedule if dates are in the future
  const now = new Date()

  if (reminderDate > now) {
    const result = await schedulePaymentReminder(paymentId, therapistId, reminderDate)
    if (!result.success) {
      errors.push(`Reminder: ${result.error}`)
    }
  }

  if (gracePeriodDate > now) {
    const result = await schedulePaymentGracePeriod(paymentId, therapistId, gracePeriodDate)
    if (!result.success) {
      errors.push(`Grace period: ${result.error}`)
    }
  }

  if (suspensionWarningDate > now) {
    const result = await schedulePaymentSuspensionWarning(paymentId, therapistId, suspensionWarningDate)
    if (!result.success) {
      errors.push(`Suspension warning: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

