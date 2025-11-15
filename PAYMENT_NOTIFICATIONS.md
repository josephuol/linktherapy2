# Payment Notification System

This document describes the automated payment notification system using Qstash and Resend.

## Overview

The system automatically sends payment reminders to therapists at strategic intervals before and after payment deadlines. It also handles automatic account suspension for severely overdue payments.

## Notification Schedule

1. **3 Days Before Deadline**: Friendly reminder email
2. **At Deadline**: Urgent payment email with suspension warning
3. **3 Days After Deadline**: Critical warning with 3-day suspension notice + automatic overdue status
4. **6 Days After Deadline**: Account suspension + suspension email

## Setup Requirements

### 1. Install Dependencies

```bash
npm install @upstash/qstash
```

### 2. Set Up Qstash

1. Create an account at [Upstash Console](https://console.upstash.com/)
2. Create a new Qstash project
3. Get your credentials:
   - `QSTASH_TOKEN`: API token for scheduling messages
   - `QSTASH_CURRENT_SIGNING_KEY`: For webhook signature verification
   - `QSTASH_NEXT_SIGNING_KEY`: For webhook signature rotation

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Qstash Configuration
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key

# Ensure these are also set
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
RESEND_API_KEY=your_resend_api_key
```

### 4. Configure Webhook URLs in Production

When deploying to production, ensure Qstash can reach your webhook endpoints:
- `https://your-domain.com/api/webhooks/qstash/payment-notification`
- `https://your-domain.com/api/webhooks/qstash/payment-suspension`

## How It Works

### Payment Creation Flow

1. When a new therapist payment is created (via `/api/admin/payments/recalc`):
   - The payment record is inserted with `status: "pending"`
   - Four scheduled messages are created in Qstash
   - Each message is scheduled for its appropriate time

### Notification Delivery

1. At the scheduled time, Qstash calls the webhook endpoint
2. The webhook:
   - Verifies the Qstash signature
   - Checks if payment is still pending (skips if completed)
   - Fetches payment and therapist details
   - Sends the appropriate email via Resend
   - Updates payment status if needed (e.g., to "overdue")

### Suspension Flow

1. At 6 days after deadline, Qstash calls the suspension webhook
2. The webhook:
   - Verifies the Qstash signature
   - Checks if payment is still pending (skips if completed)
   - Updates therapist status to "suspended"
   - Sets therapist ranking to 0
   - Updates payment status to "suspended"
   - Logs the suspension in ranking history
   - Sends suspension email

### Cancellation Handling

Since Qstash doesn't support canceling scheduled messages, the system uses a different approach:
- All webhooks check payment status before taking action
- If payment is marked "completed", notifications are skipped
- This prevents duplicate/unnecessary emails

## Email Templates

All email templates are in `/lib/email-service.ts`:

1. **`sendPaymentReminderEmail`**: Friendly reminder with blue branding
2. **`sendPaymentDeadlineEmail`**: Urgent with red branding and warnings
3. **`sendPaymentWarningEmail`**: Critical warning with dark red branding
4. **`sendAccountSuspensionEmail`**: Suspension notice with account impact details

## Testing Locally

### Option 1: Manual Webhook Testing

You can test the webhooks manually without Qstash:

```bash
# Test payment reminder notification
curl -X POST http://localhost:3000/api/webhooks/qstash/payment-notification \
  -H "Content-Type: application/json" \
  -H "upstash-signature: test-signature-will-fail" \
  -d '{
    "paymentId": "uuid-of-payment",
    "therapistId": "uuid-of-therapist",
    "stage": "reminder_3_days_before"
  }'
```

**Note**: Signature verification will fail in development. To bypass for testing:
- Temporarily comment out signature verification in webhook
- Or use the actual Qstash signature from Upstash testing tools

### Option 2: Qstash Local Testing

Use Qstash's local testing feature:

```bash
# Install Qstash CLI
npm install -g @upstash/cli

# Start local tunnel
upstash qstash tunnel --port 3000
```

### Option 3: Test Email Templates

You can test email templates directly by importing and calling the functions:

```typescript
import { sendPaymentReminderEmail } from "@/lib/email-service"

const result = await sendPaymentReminderEmail(
  "test@example.com",
  "John Doe",
  new Date("2025-01-20"),
  120.00,
  "Jan 1, 2025 - Jan 15, 2025"
)
```

## Monitoring

### Logs

All operations are logged with `[Qstash Webhook]` or `[Email Service]` prefixes:
- Notification scheduling: `[Payment Recalc]`
- Webhook processing: `[Qstash Webhook]`
- Email sending: `[Email Service]`

### Qstash Dashboard

Monitor scheduled messages in the [Upstash Console](https://console.upstash.com/):
- View pending messages
- Check delivery status
- Review webhook responses
- Debug failed deliveries

## Database Impact

The system interacts with these tables:

### Modified Tables
- `therapist_payments`: Status updates (pending → overdue → suspended)
- `therapists`: Status and ranking updates on suspension
- `therapist_ranking_history`: Suspension logging

### No New Tables Required
The system doesn't require any database schema changes, making it safe for production deployment.

## Error Handling

### Failed Email Delivery
- Logged but doesn't fail the webhook
- Payment status is still updated
- Admin can manually resend via dashboard

### Failed Webhook Calls
- Qstash automatically retries failed webhooks
- Check Qstash dashboard for retry status

### Missing Environment Variables
- Qstash service throws error on initialization
- App won't start without required env vars
- Prevents silent failures

## Security

### Webhook Signature Verification
All webhooks verify Qstash signatures before processing:
- Prevents unauthorized webhook calls
- Uses rotating signing keys
- Returns 401 for invalid signatures

### Rate Limiting
Qstash has built-in rate limiting:
- Prevents abuse
- Throttles webhook calls
- Configurable in Upstash dashboard

## Troubleshooting

### Emails Not Sending
1. Check Resend API key is valid
2. Verify `FROM_EMAIL` is configured
3. Check Resend dashboard for delivery status
4. Review webhook logs for errors

### Webhooks Not Being Called
1. Verify `NEXT_PUBLIC_SITE_URL` is correct
2. Ensure webhooks are publicly accessible
3. Check Qstash dashboard for scheduled messages
4. Verify signature keys are correct

### Wrong Timing
1. Check server timezone settings
2. Verify `payment_due_date` is correct in database
3. Review Qstash scheduled message times
4. Confirm timezone handling in date calculations

### Suspension Not Working
1. Check therapist status in database
2. Verify RPC function exists: `process_payment_status`
3. Review webhook logs for errors
4. Ensure ranking history table exists

## Future Enhancements

Potential improvements:
- SMS notifications via Twilio
- In-app notification center
- Payment reminder customization per therapist
- Configurable notification schedules
- Webhook retry dashboard
- Payment plan options for overdue accounts
