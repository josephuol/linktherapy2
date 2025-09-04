-- Match analytics schema: events captured from the homepage match modal

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  problem text,
  city text,
  area text,
  gender text,
  lgbtq text,
  religion text,
  exp_band text,
  price_min numeric,
  price_max numeric,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_match_events_created_at on public.match_events (created_at desc);
create index if not exists idx_match_events_session on public.match_events (session_id);
create index if not exists idx_match_events_user on public.match_events (user_id);

-- Correlate match events to contact requests by anonymous session
alter table if exists public.contact_requests
  add column if not exists session_id text;


