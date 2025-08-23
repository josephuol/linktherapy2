-- Admin, Patients, Sessions, Content schema upgrades
-- Run this SQL in Supabase (SQL editor) before using the new admin features.

-- Patients table
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  timezone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessions extensions
alter table if exists public.sessions
  add column if not exists patient_id uuid references public.patients(id) on delete set null;

alter table if exists public.sessions
  add column if not exists client_phone text;

-- Contact requests admin workflow fields
alter table if exists public.contact_requests
  add column if not exists assigned_therapist_id uuid references public.therapists(user_id) on delete set null,
  add column if not exists assigned_by uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists admin_notes text;

-- Optional simple content store
create table if not exists public.site_content (
  key text primary key,
  title text,
  content jsonb,
  updated_at timestamptz not null default now()
);

-- Basic indexes
create index if not exists idx_patients_email on public.patients (email);
create index if not exists idx_patients_phone on public.patients (phone);
create index if not exists idx_sessions_patient_id on public.sessions (patient_id);
create index if not exists idx_sessions_therapist_date on public.sessions (therapist_id, session_date);

-- RLS guards (adjust as needed)
alter table public.patients enable row level security;
alter table public.site_content enable row level security;

-- Allow admins full access; therapists no direct patients access by default
do $$ begin
  perform 1 from pg_policies where tablename = 'patients' and policyname = 'admin_full_access_patients';
  if not found then
    create policy "admin_full_access_patients" on public.patients for all
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

do $$ begin
  perform 1 from pg_policies where tablename = 'site_content' and policyname = 'admin_full_access_site_content';
  if not found then
    create policy "admin_full_access_site_content" on public.site_content for all
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
  end if;
end $$;


