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
