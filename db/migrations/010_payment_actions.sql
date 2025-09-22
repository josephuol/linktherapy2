-- Therapist payment actions for repeated "Mark Paid" operations

create table if not exists public.therapist_payment_actions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.therapist_payments(id) on delete cascade,
  therapist_id uuid not null references public.therapists(user_id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null default 'paid_again' check (action in ('paid', 'paid_again')),
  amount numeric,
  payment_method text,
  transaction_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists therapist_payment_actions_payment_idx on public.therapist_payment_actions(payment_id);
create index if not exists therapist_payment_actions_therapist_idx on public.therapist_payment_actions(therapist_id);

-- Track the most recent time any paid action occurred without overwriting the first completion date
alter table if exists public.therapist_payments
  add column if not exists last_paid_action_at timestamptz;

-- RLS can remain disabled for service role use; enable if needed later

