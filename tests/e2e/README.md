# E2E Tests Setup

This directory contains end-to-end tests for the LinkTherapy admin panel using Playwright.

## Prerequisites

1. **Test Admin Account**: You MUST have a valid admin account in your Supabase database for testing.

2. **Set Environment Variables**: You have two options:

   **Option A: Using .env.local (Recommended)**
   ```bash
   # Add to .env.local
   TEST_ADMIN_EMAIL=admin@linktherapy.com
   TEST_ADMIN_PASSWORD=your_actual_admin_password
   ```

   **Option B: Inline with test command**
   ```bash
   TEST_ADMIN_EMAIL=your@email.com TEST_ADMIN_PASSWORD=yourpass npx playwright test
   ```

   **Default credentials** (if not set - these must exist in your database):
   - Email: `admin@linktherapy.com`
   - Password: `admin123`

## Quick Start

### Step 1: Create Test Admin Account (if not exists)

Go to your Supabase dashboard and ensure you have an admin user:
```sql
-- Check if admin exists
SELECT * FROM profiles WHERE email = 'admin@linktherapy.com';

-- If not, create one (adjust password as needed)
-- First create the user in Supabase Auth dashboard or via SQL
-- Then set the role to 'admin' in profiles table
UPDATE profiles SET role = 'admin' WHERE email = 'admin@linktherapy.com';
```

### Step 2: Set credentials

Add to your `.env.local`:
```bash
TEST_ADMIN_EMAIL=admin@linktherapy.com
TEST_ADMIN_PASSWORD=YourActualPassword123
```

### Step 3: Run tests

```bash
npm run test
```

## Running Tests

### Run all tests
```bash
npm run test
# or
npx playwright test
```

### Run specific test file
```bash
npx playwright test tests/e2e/admin-patients-pending.spec.ts
```

### Run specific test
```bash
npx playwright test --grep "should display Pending Requests tab"
```

### Run tests with UI
```bash
npx playwright test --ui
```

### Debug tests
```bash
npx playwright test --debug
```

## How Authentication Works

1. **Global Setup** (`global-setup.ts`):
   - Runs once before all tests
   - Logs in as admin
   - Saves authentication state to `tests/e2e/.auth/admin.json`

2. **Test Execution**:
   - All tests reuse the stored authentication state
   - No need to log in for each test
   - Tests run faster and more reliably

3. **Auth State**:
   - Stored in `tests/e2e/.auth/admin.json`
   - Gitignored (contains session cookies)
   - Regenerated on each test run

## Troubleshooting

### Tests failing with "Admin Login" page
- The authentication failed
- Check your admin credentials in environment variables
- Ensure the admin account exists in Supabase
- Check the console output from global setup

### Auth state file not found
- Run tests at least once to generate the auth state
- The file is created automatically by global setup

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify database connection

## Test Structure

```
tests/e2e/
├── .auth/               # Authentication state (gitignored)
│   └── admin.json      # Stored admin session
├── global-setup.ts     # Authentication setup
├── admin-patients-pending.spec.ts  # Patients page tests
└── README.md           # This file
```

## Important Notes

- **Never commit** the `.auth/admin.json` file (it's gitignored)
- Update `TEST_ADMIN_PASSWORD` regularly for security
- Tests require the dev server to be running (handled automatically)
- First test run may be slower due to global setup
