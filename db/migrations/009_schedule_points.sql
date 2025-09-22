-- Schedule-time ranking points and resilience updates
-- Run this SQL in Supabase SQL Editor

-- 1) Add a flag to track if schedule-time points were awarded for a session
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_points_awarded boolean NOT NULL DEFAULT false;

-- 2) Improve client session counting to use patient_id first, else client_email
--    This view is used by multiple functions (eligibility and bonuses)
DROP VIEW IF EXISTS client_session_counts;
CREATE VIEW client_session_counts AS
SELECT 
  s.therapist_id,
  COALESCE(s.patient_id::text, s.client_email) AS client_key,
  COUNT(*) AS session_count,
  COUNT(CASE WHEN s.status = 'completed' THEN 1 END) AS completed_sessions
FROM public.sessions s
WHERE s.counts_for_scoring = true
  AND COALESCE(s.patient_id::text, s.client_email) IS NOT NULL
GROUP BY s.therapist_id, COALESCE(s.patient_id::text, s.client_email);

-- 3) Award points at scheduling time for repeat sessions (2nd+ with same client)
CREATE OR REPLACE FUNCTION public.handle_scheduling_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_key text;
  v_existing_count integer := 0;
BEGIN
  -- Only consider sessions that count toward scoring
  IF NEW.counts_for_scoring IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  v_client_key := COALESCE(NEW.patient_id::text, NEW.client_email);
  IF v_client_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reversal: transitioning away from scheduled to cancelled/rescheduled
  IF TG_OP = 'UPDATE' AND (NEW.status IN ('cancelled','rescheduled')) AND (OLD.status = 'scheduled') AND COALESCE(OLD.scheduled_points_awarded, false) THEN
    UPDATE public.therapists
      SET ranking_points = GREATEST(ranking_points - 50, 0)
      WHERE user_id = NEW.therapist_id;

    NEW.scheduled_points_awarded := false;
    RETURN NEW;
  END IF;

  -- Awarding: first time becoming scheduled
  IF (TG_OP = 'INSERT' AND NEW.status = 'scheduled')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'scheduled' AND (OLD.status IS DISTINCT FROM 'scheduled')) THEN
    -- Avoid double-award if already set
    IF COALESCE(NEW.scheduled_points_awarded, false) = false THEN
      SELECT COUNT(*) INTO v_existing_count
      FROM public.sessions s
      WHERE s.therapist_id = NEW.therapist_id
        AND s.counts_for_scoring = true
        AND s.status IN ('scheduled', 'completed')
        AND COALESCE(s.patient_id::text, s.client_email) = v_client_key
        AND s.id IS DISTINCT FROM NEW.id; -- exclude self if update

      -- 2nd+ session with this client earns +50 points at scheduling time
      IF v_existing_count >= 1 THEN
        UPDATE public.therapists
          SET ranking_points = LEAST(ranking_points + 50, 10000)
          WHERE user_id = NEW.therapist_id;

        NEW.scheduled_points_awarded := true;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_scheduling_points_ins ON public.sessions;
DROP TRIGGER IF EXISTS trg_handle_scheduling_points_upd ON public.sessions;
CREATE TRIGGER trg_handle_scheduling_points_ins
  BEFORE INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_scheduling_points();

CREATE TRIGGER trg_handle_scheduling_points_upd
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_scheduling_points();

-- 4) Revert schedule-time points on delete of an uncompleted, scheduled session
CREATE OR REPLACE FUNCTION public.revert_scheduling_points_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.counts_for_scoring = true
     AND OLD.status = 'scheduled'
     AND COALESCE(OLD.scheduled_points_awarded, false) = true THEN
    UPDATE public.therapists
      SET ranking_points = GREATEST(ranking_points - 50, 0)
      WHERE user_id = OLD.therapist_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_revert_scheduling_points_del ON public.sessions;
CREATE TRIGGER trg_revert_scheduling_points_del
  BEFORE DELETE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_scheduling_points_on_delete();

-- 5) Update completion-time trigger to only handle milestone bonus and totals
CREATE OR REPLACE FUNCTION public.calculate_session_points()
RETURNS TRIGGER AS $$
DECLARE
  v_client_key text;
  v_completed_count integer := 0;
  v_is_sixth_session boolean := false;
BEGIN
  -- Only process when a session becomes completed
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    v_client_key := COALESCE(NEW.patient_id::text, NEW.client_email);

    IF v_client_key IS NOT NULL THEN
      -- Completed sessions to date for this client-therapist pair
      SELECT completed_sessions INTO v_completed_count
      FROM client_session_counts
      WHERE therapist_id = NEW.therapist_id
        AND client_key = v_client_key;

      IF v_completed_count > 0 AND (v_completed_count % 6) = 0 THEN
        v_is_sixth_session := true;
      END IF;

      IF v_is_sixth_session THEN
        UPDATE public.therapists 
          SET ranking_points = LEAST(FLOOR(ranking_points * 1.10), 10000)
          WHERE user_id = NEW.therapist_id;

        INSERT INTO public.therapist_notifications (
          therapist_id, title, message, type
        ) VALUES (
          NEW.therapist_id,
          'Bonus Points Earned!',
          'You received a 10% points bonus for completing your ' || v_completed_count || 'th session with this client!',
          'success'
        );
      END IF;
    END IF;

    -- Maintain total completed sessions counter
    UPDATE public.therapists 
      SET total_sessions = total_sessions + 1
      WHERE user_id = NEW.therapist_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_session_points_trigger ON public.sessions;
CREATE TRIGGER calculate_session_points_trigger
AFTER UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_session_points();

-- 6) Update review eligibility to use client_key (patient_id/email)
CREATE OR REPLACE FUNCTION public.check_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_completed_count integer;
BEGIN
  SELECT completed_sessions INTO v_completed_count
  FROM client_session_counts
  WHERE therapist_id = NEW.therapist_id
    AND client_key = COALESCE(NULLIF(NEW.client_email, ''), NULL);

  IF COALESCE(v_completed_count, 0) < 8 THEN
    RAISE EXCEPTION 'Reviews can only be submitted after 8 completed sessions with this therapist';
  END IF;

  NEW.session_count_at_review := v_completed_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_review_eligibility_trigger ON public.reviews;
CREATE TRIGGER check_review_eligibility_trigger
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_review_eligibility();

-- 7) Permissions (idempotent)
GRANT SELECT ON client_session_counts TO authenticated;

-- 8) Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_sessions_counts_key ON public.sessions ((COALESCE(patient_id::text, client_email)));
CREATE INDEX IF NOT EXISTS idx_sessions_status_therapist ON public.sessions(therapist_id, status);


