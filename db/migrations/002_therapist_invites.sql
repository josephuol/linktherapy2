-- Therapist invitations, audit logs, and required fields
-- Run in Supabase SQL editor

-- 1) Therapist invitations table
create table if not exists public.therapist_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text, -- optional when using Supabase built-in invites
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked','bounced','undeliverable')),
  invited_by_admin_id uuid references public.admin_users(id),
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz,
  send_count int not null default 1,
  expires_at timestamptz, -- optional
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id),
  failure_reason text
);

create unique index if not exists therapist_invitations_unique_pending_email
  on public.therapist_invitations (lower(email)) where status in ('pending');

create index if not exists therapist_invitations_status_idx on public.therapist_invitations (status);
create index if not exists therapist_invitations_expires_at_idx on public.therapist_invitations (expires_at);
create index if not exists therapist_invitations_email_idx on public.therapist_invitations (lower(email));

-- 2) Admin audit logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references public.admin_users(id),
  action text not null,
  target_email text,
  target_user_id uuid references auth.users(id),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_admin_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at);

-- 3) Required therapist fields for signup
alter table if exists public.therapists
  add column if not exists phone text,
  add column if not exists license_number text,
  add column if not exists license_state text,
  add column if not exists npi text,
  add column if not exists timezone text;

-- 4) Store email on profiles and ToS acceptance
alter table if exists public.profiles
  add column if not exists email text unique,
  add column if not exists terms_accepted_at timestamptz;

-- 5) RLS hardening: enable and restrict
alter table public.therapist_invitations enable row level security;
alter table public.admin_audit_logs enable row level security;

-- No explicit policies: only Service Role can access these tables by default.


