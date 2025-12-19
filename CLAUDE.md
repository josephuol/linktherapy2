# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Run ESLint
```

### Database
```bash
# Supabase migrations are in /db/migrations/
# Apply migrations through Supabase dashboard or CLI
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.2.4 (App Router)
- **React**: 19
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Auth**: Supabase Auth with custom role verification
- **Email**: Resend for transactional emails
- **Validation**: Zod (API routes only, not forms)
- **UI**: Radix UI components + Tailwind CSS
- **Calendar**: FullCalendar
- **State**: React hooks + Context API (no Redux/Zustand)

### Project Structure
```
/app                    # Next.js App Router pages and API routes
  /admin                # Admin-only pages (payments, analytics, therapist management)
  /dashboard            # Therapist dashboard (contact requests, calendar, profile)
  /auth/callback        # Supabase auth callback handler
  /api                  # API routes (admin, contact requests, match events)
/components             # React components
  /dashboard            # Dashboard-specific components
  /admin                # Admin-specific components
  /ui                   # Shadcn-style UI components
/lib                    # Core utilities
  supabase-browser.ts   # Client-side Supabase clients
  supabase-server.ts    # Server-side admin client
  auth-helpers.ts       # Admin role verification
  email-service.ts      # Resend email integration
/hooks                  # Custom React hooks
/public                 # Static assets
/db/migrations          # Database migrations
```

## Authentication System

### Three Supabase Client Types
1. **`supabaseBrowser()`** - Standard client auth for components
2. **`supabaseImplicitBrowser()`** - For email magic links (implicit flow)
3. **`supabaseAdmin()`** - Service role for API routes (bypasses RLS)

### Role System
- User roles stored in `profiles.role` (therapist/admin)
- Admin verification: `verifyAdminRole(userId)` or `requireAdmin()` wrapper
- Middleware protects `/admin/*` routes (except `/admin/login`)
- Admin API routes self-protect with `requireAdmin()` in handlers

### Auth Helpers
- `lib/auth-helpers.ts`: `verifyAdminRole()`, `requireAdmin()`, `checkAdminInMiddleware()`
- Use `requireAdmin()` wrapper for admin API routes
- Returns 401 JSON response on unauthorized access

## Database Patterns

### Key Tables
- **profiles**: User metadata (role, email, full_name)
- **therapists**: Extended therapist info (bio, pricing, ranking, status)
- **patients**: Client records
- **sessions**: Therapy sessions (scheduled/completed/rescheduled)
  - Tracks reschedule history via `rescheduled_from` FK
  - Color tagging for calendar (`color_tag` field)
  - `counts_for_scoring` flag for metrics
- **contact_requests**: Client inquiries (lifecycle: new → contacted → accepted/rejected → scheduled → closed)
  - Response time tracked in `response_time_hours`
  - Links to `match_events` via `session_id` for attribution
- **therapist_payments**: Biweekly payment records
- **therapist_payment_actions**: Audit log (paid, paid_again)
- **therapist_metrics**: Monthly performance data
- **therapist_ranking_history**: Ranking change audit trail

### Data Access Pattern
- **Server Components**: Use `supabaseAdmin()` directly
- **Client Components**: Use `supabaseBrowser()` with real-time subscriptions
- **API Routes**: Use `supabaseAdmin()` for RLS bypass
- All mutations via Supabase client methods (`.insert()`, `.update()`, `.from()`)

### Real-time Subscriptions
```typescript
// Pattern used throughout dashboard
const channel = supabase
  .channel('table_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'contact_requests',
    filter: `therapist_id=eq.${userId}`
  }, () => { loadData(userId) })
  .subscribe()

// Always cleanup on unmount
return () => { supabase.removeChannel(channel) }
```

## Key Features

### Payment System
- **Commission**: $6 per session (`ADMIN_COMMISSION_PER_SESSION` constant)
- **Biweekly periods**: Auto-calculated payment records
- **Status flow**: pending → completed/overdue → suspended
- **Payment actions**: mark_complete, mark_overdue, mark_paid_again
- **Ranking integration**:
  - On-time payment: +5 points (`payment_bonus`)
  - Late payment: -10 points (`payment_penalty`)
  - Green dot indicator for recent bonuses (30-day window)
- **APIs**: `/api/admin/payments/*` (list, actions, recalc)
- **Recalculation**: `/api/admin/payments/recalc` backfills payment periods for therapist

### Payment Notification System (Qstash + Resend)
- **Automated reminders**: 4-stage notification system for payment deadlines
- **Schedule**:
  - 3 days before: Friendly reminder email
  - At deadline: Urgent payment email with suspension warning
  - 3 days after: Critical warning + automatic "overdue" status + ranking penalty
  - 6 days after: Automatic account suspension + suspension email
- **Implementation**:
  - `lib/qstash-service.ts`: Qstash integration and notification scheduling
  - `lib/email-service.ts`: 4 email templates (reminder, deadline, warning, suspension)
  - `/api/webhooks/qstash/payment-notification`: Webhook for sending scheduled emails
  - `/api/webhooks/qstash/payment-suspension`: Webhook for account suspension
- **Scheduling**: Happens automatically when payment is created via `/api/admin/payments/recalc`
- **Cancellation**: Webhooks check payment status before sending (skip if completed)
- **Security**: All webhooks verify Qstash signatures
- **Documentation**: See `PAYMENT_NOTIFICATIONS.md` for full details

### Email Notifications (Resend)
- **Service**: `lib/email-service.ts`
- **Types**: Therapist invites, password resets, contact request notifications
- **Pattern**: HTML + plain text versions
- **Environment**: Uses `FROM_EMAIL` and `IS_DEVELOPMENT` env vars
- **Integration points**:
  - `/api/admin/invite-therapist` → sends invite
  - `/api/reset-password` → sends reset link
  - `/api/contact-requests` → notifies therapist (async, non-blocking)

### Contact Request Flow
1. Client submits via `/api/contact-requests` POST
2. Email sent to therapist via Resend (non-blocking)
3. Request appears in dashboard `ContactRequestsTable`
4. Therapist accepts/rejects/schedules
5. Status progression tracked in `status` field
6. Response time calculated on first action

### Session Scheduling
- **Booking**: Contact request → Accept → Schedule → Creates `sessions` record
- **Rescheduling**:
  - Original session marked `status='rescheduled'`
  - New session created with `rescheduled_from` FK
  - Tracks reschedule reason and actor
  - Triggers payment recalculation via `/api/admin/payments/recalc`
- **Calendar**: FullCalendar integration with color-coded events

## Form Handling

### NO react-hook-form
- Manual state management with `useState`
- Controlled inputs
- Native HTML validation (`required`, `type="email"`)
- Custom validation in `onSubmit` handlers

### API Validation (Zod)
```typescript
const payloadSchema = z.object({
  therapist_id: z.string().uuid(),
  client_name: z.string().min(1),
  client_email: z.string().email(),
})
const parsed = payloadSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({
    error: "Invalid payload",
    details: parsed.error.flatten()
  }, { status: 400 })
}
```

## State Management

### No Global State Library
- **Server state**: Direct Supabase queries + real-time subscriptions
- **Local state**: `useState` for UI (modals, forms, filters)
- **Context**: `SidebarProvider` for sidebar expand/collapse
- **URL state**: Search params for filters (therapist directory)
- **Local storage**: Anonymous session ID (`lt_anon_session_id`)

### Data Flow
```
User Action → State Update → Supabase Mutation → Real-time Event → UI Re-render
```

## Middleware Behavior

### URL Normalization (`middleware.ts`)
- Redirects auth codes to `/auth/callback` with `next` param
- `/?code=...` → `/auth/callback?code=...&next=/reset-password/confirm`
- `/reset-password/confirm?code=...` → `/auth/callback?code=...&next=/reset-password/confirm`

### Route Protection
- Admin pages (`/admin/*` except `/admin/login`) protected by middleware
- Redirects to `/admin/login?redirect=...` if unauthorized
- Uses `checkAdminInMiddleware()` for verification

## Build Configuration

### Next.js Config (`next.config.mjs`)
- **Images**: Unoptimized (`unoptimized: true`)
- **SVG**: SVGR webpack loader for importing SVGs as React components
- **Security Headers**: CSP, X-Frame-Options, X-XSS-Protection configured for API routes

### TypeScript
- Path alias: `@/*` maps to root directory
- Strict mode enabled
- Target: ES6

## Important Constants

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only)
- `RESEND_API_KEY`: Resend email API key
- `RESEND_FROM_EMAIL`: Sender email address
- `NODE_ENV`: Environment mode (development/production)
- `NEXT_PUBLIC_SITE_URL`: Base URL for webhooks and redirects
- `QSTASH_TOKEN`: Qstash API token for scheduling
- `QSTASH_CURRENT_SIGNING_KEY`: Qstash webhook signature verification
- `QSTASH_NEXT_SIGNING_KEY`: Qstash signature rotation key

### Payment Constants
- `ADMIN_COMMISSION_PER_SESSION`: 6 (dollars per session)
- `payment_bonus`: 5 (ranking points for on-time payment)
- `payment_penalty`: -10 (ranking points for late payment)

## Development Notes

### Database Views
- `public_therapists`: View for client-facing therapist directory
  - Filters by `status='active'`
  - Joins therapist data with specialties and locations
  - Used by `/api/therapists` and therapist directory component

### Testing Utilities
- `/api/admin/payments/create-test`: Create test payment data
- `/api/admin/payments/delete-test`: Clean up test data
- Both admin-protected

### Real-time Dashboard
- Dashboard subscribes to 5 tables: `contact_requests`, `sessions`, `therapist_payments`, `therapist_metrics`, `therapist_notifications`
- Auto-refresh every 30 seconds
- Channel cleanup on unmount prevents memory leaks

### Calendar Notes
- Fallback handling for missing `color_tag` column (added in migration)
- Date validation: end time must be after start time
- Direct Supabase updates from client (no API route)

## Common Patterns

### Admin API Route Template
```typescript
import { requireAdmin } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return authCheck.error

  // Your logic here with supabaseAdmin()
  // Access user via authCheck.user
}
```

### Client Component Data Fetching
```typescript
useEffect(() => {
  const loadData = async () => {
    const supabase = supabaseBrowser()
    const { data, error } = await supabase.from('table').select('*')
    if (error) console.error(error)
    else setData(data)
  }
  loadData()
}, [])
```

### Error Handling
- Try-catch with `console.error` for logging
- Toast notifications via `sonner` library
- API routes return JSON errors with status codes
- Non-blocking email sends (errors logged but don't fail request)
