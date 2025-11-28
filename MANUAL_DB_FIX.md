# Manual Database Fix Required

## Issue
The `therapist_invitations` table has a foreign key pointing to the wrong table.

## How to Fix (2 minutes)

### Method 1: Supabase Dashboard SQL Editor (Easiest)

1. **Go to**: https://vwsgdwhjjgnsqyiuhtwe.supabase.co/project/vwsgdwhjjgnsqyiuhtwe/sql/new

2. **Paste this SQL**:
```sql
-- Drop old constraint
ALTER TABLE public.therapist_invitations
DROP CONSTRAINT IF EXISTS therapist_invitations_invited_by_admin_id_fkey;

-- Make column nullable
ALTER TABLE public.therapist_invitations
ALTER COLUMN invited_by_admin_id DROP NOT NULL;

-- Add new constraint pointing to auth.users
ALTER TABLE public.therapist_invitations
ADD CONSTRAINT therapist_invitations_invited_by_admin_id_fkey
FOREIGN KEY (invited_by_admin_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;
```

3. **Click Run** (or press Ctrl+Enter)

4. **Done!** You should see "Success. No rows returned"

### Method 2: Database Connection String

If you have a direct PostgreSQL connection string:

```bash
# Get connection string from: Dashboard > Project Settings > Database
# Then run:
psql "your-connection-string" -f fix-invite-fkey.sql
```

---

## What This Does

- **Removes** the broken foreign key constraint
- **Makes** `invited_by_admin_id` nullable (allows NULL values)
- **Adds** new constraint pointing to `auth.users` table

## After Running

Try inviting a therapist again - it should work without errors!

---

## Quick Test

After running the SQL, test by inviting: `saabghadi0@gmail.com`

You should no longer see the foreign key constraint error.
