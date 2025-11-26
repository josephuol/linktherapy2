-- Ensure therapist_payments table exists
-- Run this SQL in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.therapist_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(user_id) ON DELETE CASCADE,
  payment_period_start date NOT NULL,
  payment_period_end date NOT NULL,
  total_sessions integer NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  payment_due_date timestamptz NOT NULL,
  payment_completed_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue','suspended')),
  admin_notes text,
  last_paid_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_payments_therapist_id ON public.therapist_payments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_payments_status ON public.therapist_payments(status);
CREATE INDEX IF NOT EXISTS idx_therapist_payments_due_date ON public.therapist_payments(payment_due_date);

ALTER TABLE public.therapist_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'therapist_payments'
      AND policyname = 'service_role_full_access_therapist_payments'
  ) THEN
    CREATE POLICY service_role_full_access_therapist_payments ON public.therapist_payments
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
