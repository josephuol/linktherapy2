import { Resend } from "resend"

// Resend API key - must be set in environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required")
}

const resend = new Resend(RESEND_API_KEY)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LinkTherapy <noreply@linktherapy.org>"

const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

/**
 * Send therapist invitation email
 */
export async function sendTherapistInviteEmail(email: string, inviteLink: string): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send therapist invite to: ${email}`)
    }
    
    const emailPayload = {
      from: FROM_EMAIL,
      to: [email],
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
              <a href="${inviteLink}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">${inviteLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `You've been invited to join LinkTherapy as a therapist.

Complete your profile and start connecting with clients by clicking the link below:

${inviteLink}

If the link doesn't work, copy and paste it into your browser.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    }
    
    const { data, error } = await resend.emails.send(emailPayload)

    if (error) {
      console.error("[Email Service] Failed to send therapist invite email:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    // Verify we got a proper response
    if (!data || !data.id) {
      console.error("[Email Service] Resend API returned success but no email ID")
      return { success: false, error: "Resend API returned unexpected response" }
    }
    
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Therapist invite email sent successfully. ID: ${data.id}`)
    }
    
    return { success: true, emailId: data.id }
  } catch (error: any) {
    console.error("[Email Service] Exception sending therapist invite email:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send password reset to: ${email}`)
    }
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "Reset your LinkTherapy password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Reset your password</h2>
            <p style="color: #4b5563; font-size: 16px;">We received a request to reset your password. Click the button below to create a new password.</p>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <p style="color: #dc2626; font-size: 14px; margin-top: 30px; font-weight: 600;">This link will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Reset your LinkTherapy password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour.

If the link doesn't work, copy and paste it into your browser.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send password reset email:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Password reset email sent successfully. ID: ${data.id}`)
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending password reset email:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send contact request notification email to therapist
 */
export async function sendContactRequestNotificationEmail(
  therapistEmail: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string | null,
  message: string | null,
  dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send contact request notification to therapist: ${therapistEmail}`)
    }
    
    // Escape HTML in message to prevent XSS
    const escapedMessage = message ? message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>') : ''
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: `New Contact Request from ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">New Contact Request</h2>
            <p style="color: #4b5563; font-size: 16px;">You have received a new contact request from a potential client.</p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Client Name:</strong> <span style="color: #4b5563;">${clientName}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Email:</strong> <a href="mailto:${clientEmail}" style="color: #056DBA; text-decoration: none;">${clientEmail}</a></p>
              ${clientPhone ? `<p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Phone:</strong> <a href="tel:${clientPhone}" style="color: #056DBA; text-decoration: none;">${clientPhone}</a></p>` : ''}
              ${message ? `<div style="margin-top: 15px;"><strong style="color: #111827; display: block; margin-bottom: 8px;">Message:</strong><p style="color: #4b5563; margin: 0; padding: 12px; background: white; border-left: 3px solid #056DBA; border-radius: 4px;">${escapedMessage}</p></div>` : ''}
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View in Dashboard</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Please log in to your dashboard to accept, reject, or schedule a session with this client.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `New Contact Request

You have received a new contact request from a potential client.

Client Name: ${clientName}
Email: ${clientEmail}
${clientPhone ? `Phone: ${clientPhone}\n` : ''}
${message ? `Message:\n${message}\n\n` : ''}
Please log in to your dashboard to accept, reject, or schedule a session with this client.

${dashboardUrl}

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send contact request notification:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Contact request notification sent successfully. ID: ${data.id}`)
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending contact request notification:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send payment reminder email (3 days before deadline)
 */
export async function sendPaymentReminderEmail(
  therapistEmail: string,
  therapistName: string,
  paymentDueDate: Date,
  commissionAmount: number,
  paymentPeriod: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send payment reminder to: ${therapistEmail}`)
    }

    const formattedAmount = `$${commissionAmount.toFixed(2)}`
    const formattedDate = paymentDueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: `Payment Reminder: ${formattedAmount} due ${formattedDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Reminder</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Payment Reminder</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">This is a friendly reminder that your payment for the period <strong>${paymentPeriod}</strong> is due in 3 days.</p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #056DBA;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Amount Due:</strong> <span style="color: #056DBA; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Due Date:</strong> <span style="color: #4b5563;">${formattedDate}</span></p>
              <p style="margin: 0;"><strong style="color: #111827;">Payment Period:</strong> <span style="color: #4b5563;">${paymentPeriod}</span></p>
            </div>

            <p style="color: #4b5563; font-size: 16px;">Please ensure your payment is submitted by the due date to maintain your account in good standing and avoid any ranking penalties.</p>

            <div style="margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Dashboard</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions or need assistance, please contact our support team.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Payment Reminder

Hello ${therapistName},

This is a friendly reminder that your payment for the period ${paymentPeriod} is due in 3 days.

Amount Due: ${formattedAmount}
Due Date: ${formattedDate}
Payment Period: ${paymentPeriod}

Please ensure your payment is submitted by the due date to maintain your account in good standing and avoid any ranking penalties.

View your dashboard: ${SITE_URL}/dashboard

If you have any questions or need assistance, please contact our support team.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send payment reminder:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Payment reminder sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending payment reminder:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send payment deadline email (at deadline)
 */
export async function sendPaymentDeadlineEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  paymentPeriod: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send payment deadline email to: ${therapistEmail}`)
    }

    const formattedAmount = `$${commissionAmount.toFixed(2)}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: `URGENT: Payment Due Today - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Due Today</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">⚠️ Payment Due Today</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">Your payment for the period <strong>${paymentPeriod}</strong> is <strong style="color: #dc2626;">due today</strong>.</p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Amount Due:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Payment Period:</strong> <span style="color: #4b5563;">${paymentPeriod}</span></p>
              <p style="margin: 0; color: #dc2626; font-weight: 600;">⏰ Due: Today</p>
            </div>

            <div style="background: #fff7ed; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f97316;">
              <p style="color: #9a3412; font-size: 14px; margin: 0;"><strong>⚠️ Important:</strong> Late payments may result in account suspension and a ranking penalty of -10 points.</p>
            </div>

            <p style="color: #4b5563; font-size: 16px;">Please submit your payment as soon as possible to avoid any account issues.</p>

            <div style="margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Submit Payment Now</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have already submitted payment, please disregard this notice. If you need assistance, contact our support team immediately.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `⚠️ URGENT: Payment Due Today

Hello ${therapistName},

Your payment for the period ${paymentPeriod} is DUE TODAY.

Amount Due: ${formattedAmount}
Payment Period: ${paymentPeriod}
Due: Today

⚠️ IMPORTANT: Late payments may result in account suspension and a ranking penalty of -10 points.

Please submit your payment as soon as possible to avoid any account issues.

View your dashboard: ${SITE_URL}/dashboard

If you have already submitted payment, please disregard this notice. If you need assistance, contact our support team immediately.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send payment deadline email:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Payment deadline email sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending payment deadline email:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send payment warning email (3 days after deadline)
 */
export async function sendPaymentWarningEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  paymentPeriod: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send payment warning email to: ${therapistEmail}`)
    }

    const formattedAmount = `$${commissionAmount.toFixed(2)}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: `URGENT: Overdue Payment - Account Suspension in 3 Days`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Overdue Payment Warning</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">🚨 Overdue Payment - Action Required</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">Your payment for the period <strong>${paymentPeriod}</strong> is now <strong style="color: #dc2626;">3 days overdue</strong>.</p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Overdue Amount:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Payment Period:</strong> <span style="color: #4b5563;">${paymentPeriod}</span></p>
              <p style="margin: 0; color: #dc2626; font-weight: 600;">🚨 Status: 3 Days Overdue</p>
            </div>

            <div style="background: #7f1d1d; color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">⚠️ URGENT ACTION REQUIRED</p>
              <p style="margin: 0; font-size: 14px;">Your account will be <strong>suspended in 3 days</strong> if payment is not received. Please contact us immediately to arrange payment.</p>
            </div>

            <p style="color: #4b5563; font-size: 16px;">Please contact our support team immediately to provide payment and avoid account suspension. We understand that circumstances can arise, and we're here to help find a solution.</p>

            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Contact Support:</p>
              <p style="margin: 0; color: #4b5563; font-size: 14px;">Email: support@linktherapy.org</p>
            </div>

            <div style="margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Contact Support Now</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have already submitted payment or contacted us, please disregard this notice.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `🚨 URGENT: Overdue Payment - Account Suspension in 3 Days

Hello ${therapistName},

Your payment for the period ${paymentPeriod} is now 3 DAYS OVERDUE.

Overdue Amount: ${formattedAmount}
Payment Period: ${paymentPeriod}
Status: 3 Days Overdue

⚠️ URGENT ACTION REQUIRED
Your account will be SUSPENDED IN 3 DAYS if payment is not received.

Please contact our support team immediately to provide payment and avoid account suspension. We understand that circumstances can arise, and we're here to help find a solution.

Contact Support:
Email: support@linktherapy.org

View your dashboard: ${SITE_URL}/dashboard

If you have already submitted payment or contacted us, please disregard this notice.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send payment warning email:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Payment warning email sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending payment warning email:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send account suspension email (6 days after deadline)
 */
export async function sendAccountSuspensionEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  paymentPeriod: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send account suspension email to: ${therapistEmail}`)
    }

    const formattedAmount = `$${commissionAmount.toFixed(2)}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: `Account Suspended - Immediate Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #7f1d1d; margin-top: 0; font-size: 24px;">🛑 Account Suspended</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">Your LinkTherapy account has been <strong style="color: #dc2626;">suspended</strong> due to non-payment for the period <strong>${paymentPeriod}</strong>.</p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7f1d1d;">
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Outstanding Amount:</strong> <span style="color: #dc2626; font-size: 24px; font-weight: bold;">${formattedAmount}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #111827;">Payment Period:</strong> <span style="color: #4b5563;">${paymentPeriod}</span></p>
              <p style="margin: 0; color: #7f1d1d; font-weight: 600;">🛑 Status: Account Suspended</p>
            </div>

            <div style="background: #450a0a; color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">What This Means:</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                <li style="margin-bottom: 8px;">Your profile is no longer visible to potential clients</li>
                <li style="margin-bottom: 8px;">You cannot receive new contact requests</li>
                <li style="margin-bottom: 8px;">Your therapist ranking has been set to 0</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; font-weight: 600;">To reactivate your account, please contact our support team immediately to arrange payment.</p>

            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Contact Support:</p>
              <p style="margin: 0; color: #4b5563; font-size: 14px;">Email: support@linktherapy.org</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">We value your partnership and hope to resolve this matter quickly. Our support team is ready to assist you.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `🛑 Account Suspended - Immediate Action Required

Hello ${therapistName},

Your LinkTherapy account has been SUSPENDED due to non-payment for the period ${paymentPeriod}.

Outstanding Amount: ${formattedAmount}
Payment Period: ${paymentPeriod}
Status: Account Suspended

What This Means:
- Your profile is no longer visible to potential clients
- You cannot receive new contact requests
- Your therapist ranking has been set to 0

To reactivate your account, please contact our support team immediately to arrange payment.

Contact Support:
Email: support@linktherapy.org

We value your partnership and hope to resolve this matter quickly. Our support team is ready to assist you.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send account suspension email:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Account suspension email sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending account suspension email:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}
