-- Fix process_payment_status to support therapist_id and improve permissions and errors

CREATE OR REPLACE FUNCTION public.process_payment_status(
  p_payment_id uuid,
  p_status text,
  p_therapist_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_therapist_id uuid;
  v_current_points integer;
  v_adjustment integer;
  v_notification_message text;
BEGIN
  -- Determine therapist by payment id or direct id
  IF p_payment_id IS NOT NULL THEN
    SELECT therapist_id INTO v_therapist_id
    FROM public.therapist_payments
    WHERE id = p_payment_id;
  ELSIF p_therapist_id IS NOT NULL THEN
    v_therapist_id := p_therapist_id;
  ELSE
    RAISE EXCEPTION 'Must provide p_payment_id or p_therapist_id';
  END IF;

  IF v_therapist_id IS NULL THEN
    RAISE EXCEPTION 'Therapist not found for provided identifier';
  END IF;

  SELECT ranking_points INTO v_current_points
  FROM public.therapists
  WHERE user_id = v_therapist_id
  FOR UPDATE;

  IF v_current_points IS NULL THEN
    RAISE EXCEPTION 'Therapist record not found';
  END IF;

  IF p_status = 'completed' THEN
    v_adjustment := FLOOR(v_current_points * 0.05);
    v_notification_message := 'You received a 5% points bonus for on-time payment!';

    UPDATE public.therapists
    SET ranking_points = LEAST(ranking_points + v_adjustment, 10000)
    WHERE user_id = v_therapist_id;

    INSERT INTO public.therapist_ranking_history (
      therapist_id, previous_ranking, new_ranking, change_reason, change_type
    ) VALUES (
      v_therapist_id,
      v_current_points,
      LEAST(v_current_points + v_adjustment, 10000),
      'On-time payment bonus',
      'payment_bonus'
    );

  ELSIF p_status = 'overdue' THEN
    v_adjustment := FLOOR(v_current_points * 0.10);
    v_notification_message := 'You received a 10% points penalty for missed payment.';

    UPDATE public.therapists
    SET ranking_points = GREATEST(ranking_points - v_adjustment, 0)
    WHERE user_id = v_therapist_id;

    INSERT INTO public.therapist_ranking_history (
      therapist_id, previous_ranking, new_ranking, change_reason, change_type
    ) VALUES (
      v_therapist_id,
      v_current_points,
      GREATEST(v_current_points - v_adjustment, 0),
      'Missed payment penalty',
      'payment_penalty'
    );

  ELSIF p_status = 'suspended' THEN
    v_adjustment := FLOOR(v_current_points * 0.35);
    v_notification_message := 'You received a 35% points penalty due to suspension.';

    UPDATE public.therapists
    SET ranking_points = GREATEST(ranking_points - v_adjustment, 0),
        status = 'suspended'
    WHERE user_id = v_therapist_id;

    INSERT INTO public.therapist_ranking_history (
      therapist_id, previous_ranking, new_ranking, change_reason, change_type
    ) VALUES (
      v_therapist_id,
      v_current_points,
      GREATEST(v_current_points - v_adjustment, 0),
      'Suspension penalty',
      'suspension'
    );
  ELSE
    RAISE EXCEPTION 'Unsupported status: %', p_status;
  END IF;

  -- Send notification
  IF v_notification_message IS NOT NULL THEN
    INSERT INTO public.therapist_notifications (
      therapist_id, title, message, type
    ) VALUES (
      v_therapist_id,
      CASE WHEN p_status = 'completed' THEN 'Payment Bonus!' ELSE 'Payment Warning' END,
      v_notification_message,
      CASE WHEN p_status = 'completed' THEN 'success' ELSE 'payment_warning' END
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payment_status(uuid, text, uuid) TO authenticated;

