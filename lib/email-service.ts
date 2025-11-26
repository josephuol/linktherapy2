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
 * Send payment reminder email to therapist (3 days before deadline)
 */
export async function sendPaymentReminderEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  paymentDueDate: Date,
  dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send payment reminder to therapist: ${therapistEmail}`)
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(commissionAmount)

    const formattedDueDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(paymentDueDate)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: "Payment Reminder: Your commission payment is due soon",
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
            <p style="color: #4b5563; font-size: 16px;">Hi ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">This is a friendly reminder that your commission payment of <strong style="color: #111827;">${formattedAmount}</strong> is due in 3 days on <strong style="color: #111827;">${formattedDueDate}</strong>.</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">Please ensure your payment is processed before the deadline to avoid any delays.</p>
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Payment Details</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you have any questions or need assistance, please contact our support team.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Payment Reminder

Hi ${therapistName},

This is a friendly reminder that your commission payment of ${formattedAmount} is due in 3 days on ${formattedDueDate}.

Please ensure your payment is processed before the deadline to avoid any delays.

View your payment details: ${dashboardUrl}

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
 * Send grace period notification email to therapist (at deadline)
 */
export async function sendPaymentGracePeriodEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send grace period notification to therapist: ${therapistEmail}`)
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(commissionAmount)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: "Payment Due: 3-Day Grace Period Started",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Due - Grace Period</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #056DBA 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Payment Due</h2>
            <p style="color: #4b5563; font-size: 16px;">Hi ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">Your commission payment of <strong style="color: #111827;">${formattedAmount}</strong> was due today. You now have <strong style="color: #dc2626;">3 additional days</strong> to process your payment.</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">Please process your payment within the next 3 days to avoid account suspension.</p>
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #056DBA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Process Payment</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you have any questions or need assistance, please contact our support team immediately.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Payment Due - Grace Period

Hi ${therapistName},

Your commission payment of ${formattedAmount} was due today. You now have 3 additional days to process your payment.

Please process your payment within the next 3 days to avoid account suspension.

Process your payment: ${dashboardUrl}

If you have any questions or need assistance, please contact our support team immediately.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send grace period notification:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Grace period notification sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending grace period notification:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/**
 * Send suspension warning email to therapist (3 days after deadline)
 */
export async function sendPaymentSuspensionWarningEmail(
  therapistEmail: string,
  therapistName: string,
  commissionAmount: number,
  dashboardUrl: string,
  supportContact: string = "support@linktherapy.org"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (IS_DEVELOPMENT) {
      console.log(`[Email Service] Attempting to send suspension warning to therapist: ${therapistEmail}`)
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(commissionAmount)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [therapistEmail],
      subject: "URGENT: Account Suspension Warning - Payment Required",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspension Warning</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LinkTherapy</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">⚠️ Account Suspension Warning</h2>
            <p style="color: #4b5563; font-size: 16px;">Hi ${therapistName},</p>
            <p style="color: #4b5563; font-size: 16px;">Your commission payment of <strong style="color: #111827;">${formattedAmount}</strong> is now <strong style="color: #dc2626;">overdue</strong>. Your account will be <strong style="color: #dc2626;">suspended in 3 days</strong> if payment is not processed.</p>
            
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #991b1b; margin: 0; font-size: 14px; font-weight: 600;">⚠️ IMPORTANT: Please contact us immediately to resolve this payment issue and prevent account suspension.</p>
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Contact Support</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you have already made a payment, please contact us at <a href="mailto:${supportContact}" style="color: #056DBA;">${supportContact}</a> to update your account status.</p>
            <p style="color: #dc2626; font-size: 14px; margin-top: 20px; font-weight: 600;">This is your final warning before account suspension.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LinkTherapy. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `URGENT: Account Suspension Warning - Payment Required

Hi ${therapistName},

Your commission payment of ${formattedAmount} is now overdue. Your account will be suspended in 3 days if payment is not processed.

⚠️ IMPORTANT: Please contact us immediately to resolve this payment issue and prevent account suspension.

Contact Support: ${dashboardUrl}

If you have already made a payment, please contact us at ${supportContact} to update your account status.

This is your final warning before account suspension.

© ${new Date().getFullYear()} LinkTherapy. All rights reserved.`,
    })

    if (error) {
      console.error("[Email Service] Failed to send suspension warning:", error.message || "Unknown error")
      if (IS_DEVELOPMENT) {
        console.error("[Email Service] Full error details:", JSON.stringify(error, null, 2))
      }
      return { success: false, error: error.message || "Failed to send email" }
    }

    if (IS_DEVELOPMENT && data?.id) {
      console.log(`[Email Service] Suspension warning sent successfully. ID: ${data.id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Email Service] Exception sending suspension warning:", error?.message || "Unknown error")
    if (IS_DEVELOPMENT && error?.stack) {
      console.error("[Email Service] Error stack:", error.stack)
    }
    return { success: false, error: error?.message || "Failed to send email" }
  }
}
