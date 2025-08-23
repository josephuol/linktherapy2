-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  message text,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'accepted'::text, 'rejected'::text, 'scheduled'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  rejection_reason text,
  response_time_hours numeric,
  responded_at timestamp with time zone,
  assigned_therapist_id uuid,
  assigned_by uuid,
  assigned_at timestamp with time zone,
  admin_notes text,
  CONSTRAINT contact_requests_pkey PRIMARY KEY (id),
  CONSTRAINT contact_requests_assigned_therapist_id_fkey FOREIGN KEY (assigned_therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text DEFAULT 'city'::text CHECK (type = ANY (ARRAY['city'::text, 'region'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  timezone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'therapist'::app_role,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ranking_point_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  delta_points integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ranking_point_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_point_adjustments_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_email text NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  session_count_at_review integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_email text,
  client_name text,
  session_date timestamp with time zone NOT NULL DEFAULT now(),
  duration_minutes integer,
  price numeric,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::session_status,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  patient_id uuid,
  client_phone text,
  rescheduled_from uuid,
  flagged_close boolean NOT NULL DEFAULT false,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT sessions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id),
  CONSTRAINT sessions_rescheduled_from_fkey FOREIGN KEY (rescheduled_from) REFERENCES public.sessions(id)
);
CREATE TABLE public.site_content (
  key text NOT NULL,
  title text,
  content jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_content_pkey PRIMARY KEY (key)
);
CREATE TABLE public.specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT specialties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text,
  message text NOT NULL,
  context jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suggestions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.therapist_bimonthly_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  month_year date NOT NULL,
  first_half_paid_checked boolean NOT NULL DEFAULT false,
  second_half_paid_checked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT therapist_bimonthly_checks_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_bimonthly_checks_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.therapist_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid,
  location_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT therapist_locations_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.therapist_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  month_year date NOT NULL,
  total_new_requests integer NOT NULL DEFAULT 0,
  accepted_requests integer NOT NULL DEFAULT 0,
  rejected_requests integer NOT NULL DEFAULT 0,
  churn_rate_monthly numeric NOT NULL DEFAULT 0,
  average_response_time_hours numeric NOT NULL DEFAULT 0,
  total_sessions_month integer NOT NULL DEFAULT 0,
  commission_earned numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT therapist_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_metrics_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.therapist_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['payment_warning'::text, 'ranking_update'::text, 'suspension_warning'::text, 'success'::text, 'info'::text])),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT therapist_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_notifications_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.therapist_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  payment_period_start date NOT NULL,
  payment_period_end date NOT NULL,
  total_sessions integer NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  payment_due_date timestamp with time zone NOT NULL,
  payment_completed_date timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'overdue'::text, 'suspended'::text])),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT therapist_payments_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_payments_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.therapist_ranking_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  previous_ranking integer NOT NULL,
  new_ranking integer NOT NULL,
  change_reason text NOT NULL,
  change_type text NOT NULL CHECK (change_type = ANY (ARRAY['payment_bonus'::text, 'payment_penalty'::text, 'suspension'::text, 'manual'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT therapist_ranking_history_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_ranking_history_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(user_id)
);
CREATE TABLE public.therapist_specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid,
  specialty_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT therapist_specialties_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_specialties_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id)
);
CREATE TABLE public.therapists (
  user_id uuid NOT NULL,
  full_name text,
  title text,
  profile_image_url text,
  bio_short text,
  bio_long text,
  gender USER-DEFINED,
  religion text CHECK (religion IS NULL OR (religion = ANY (ARRAY['Christian'::text, 'Druze'::text, 'Sunni'::text, 'Shiite'::text]))),
  age_range text CHECK (age_range IS NULL OR (age_range = ANY (ARRAY['21-28'::text, '29-36'::text, '37-45'::text, '46-55'::text, '55+'::text]))),
  years_of_experience integer DEFAULT 0,
  lgbtq_friendly boolean DEFAULT false,
  session_price_60_min numeric,
  session_price_30_min numeric,
  status USER-DEFINED NOT NULL DEFAULT 'active'::therapist_status,
  ranking_points integer NOT NULL DEFAULT 0,
  churn_rate_monthly numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  total_sessions integer NOT NULL DEFAULT 0,
  languages ARRAY NOT NULL DEFAULT ARRAY['Arabic'::text],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  interests ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT therapists_pkey PRIMARY KEY (user_id),
  CONSTRAINT therapists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);