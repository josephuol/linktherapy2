-- Ranking System Implementation
-- Run this SQL in Supabase SQL Editor

-- 1. Drop existing view if it exists
DROP VIEW IF EXISTS public_therapists CASCADE;

-- 2. Create a view to track sessions per client
CREATE OR REPLACE VIEW client_session_counts AS
SELECT 
    therapist_id,
    client_email,
    COUNT(*) as session_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
FROM public.sessions
WHERE client_email IS NOT NULL
GROUP BY therapist_id, client_email;

-- 3. Create function to calculate points for new sessions
CREATE OR REPLACE FUNCTION calculate_session_points()
RETURNS TRIGGER AS $$
DECLARE
    v_session_count integer;
    v_points_to_add integer := 0;
    v_is_sixth_session boolean := false;
BEGIN
    -- Only process completed sessions
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get session count for this client-therapist pair
        SELECT completed_sessions INTO v_session_count
        FROM client_session_counts
        WHERE therapist_id = NEW.therapist_id 
        AND client_email = NEW.client_email;

        -- Award points only for 2nd+ sessions (not first)
        IF v_session_count > 1 THEN
            v_points_to_add := 50;
        END IF;

        -- Check if this is a 6th, 12th, 18th... session
        IF v_session_count > 0 AND v_session_count % 6 = 0 THEN
            v_is_sixth_session := true;
        END IF;

        -- Update therapist points
        IF v_points_to_add > 0 THEN
            -- Apply base points
            UPDATE public.therapists 
            SET ranking_points = LEAST(ranking_points + v_points_to_add, 10000)
            WHERE user_id = NEW.therapist_id;

            -- Apply 10% bonus for 6th session
            IF v_is_sixth_session THEN
                UPDATE public.therapists 
                SET ranking_points = LEAST(FLOOR(ranking_points * 1.1), 10000)
                WHERE user_id = NEW.therapist_id;

                -- Create notification for bonus
                INSERT INTO public.therapist_notifications (
                    therapist_id, 
                    title, 
                    message, 
                    type
                ) VALUES (
                    NEW.therapist_id,
                    'Bonus Points Earned!',
                    'You received a 10% points bonus for completing your ' || v_session_count || 'th session with this client!',
                    'success'
                );
            END IF;
        END IF;

        -- Update total sessions count
        UPDATE public.therapists 
        SET total_sessions = total_sessions + 1
        WHERE user_id = NEW.therapist_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for session points
DROP TRIGGER IF EXISTS calculate_session_points_trigger ON public.sessions;
CREATE TRIGGER calculate_session_points_trigger
AFTER UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_session_points();

-- 5. Function for manual point adjustments by admin
CREATE OR REPLACE FUNCTION adjust_therapist_points(
    p_therapist_id uuid,
    p_points integer,
    p_reason text
)
RETURNS void AS $$
BEGIN
    -- Record the adjustment
    INSERT INTO public.ranking_point_adjustments (
        therapist_id,
        delta_points,
        reason,
        created_by
    ) VALUES (
        p_therapist_id,
        p_points,
        p_reason,
        auth.uid()
    );

    -- Update therapist points (max 10,000)
    UPDATE public.therapists 
    SET ranking_points = LEAST(GREATEST(ranking_points + p_points, 0), 10000)
    WHERE user_id = p_therapist_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to handle payment bonuses/penalties
CREATE OR REPLACE FUNCTION process_payment_status(
    p_payment_id uuid,
    p_status text
)
RETURNS void AS $$
DECLARE
    v_therapist_id uuid;
    v_current_points integer;
    v_adjustment integer;
    v_notification_message text;
BEGIN
    -- Get therapist info
    SELECT therapist_id INTO v_therapist_id
    FROM public.therapist_payments
    WHERE id = p_payment_id;

    SELECT ranking_points INTO v_current_points
    FROM public.therapists
    WHERE user_id = v_therapist_id;

    IF p_status = 'completed' THEN
        -- On-time payment: +5% bonus
        v_adjustment := FLOOR(v_current_points * 0.05);
        v_notification_message := 'You received a 5% points bonus for on-time payment!';
        
        UPDATE public.therapists 
        SET ranking_points = LEAST(ranking_points + v_adjustment, 10000)
        WHERE user_id = v_therapist_id;

        -- Record in history
        INSERT INTO public.therapist_ranking_history (
            therapist_id,
            previous_ranking,
            new_ranking,
            change_reason,
            change_type
        ) VALUES (
            v_therapist_id,
            v_current_points,
            LEAST(v_current_points + v_adjustment, 10000),
            'On-time payment bonus',
            'payment_bonus'
        );

    ELSIF p_status = 'overdue' THEN
        -- First missed payment: -10% penalty
        v_adjustment := FLOOR(v_current_points * 0.10);
        v_notification_message := 'You received a 10% points penalty for missed payment.';
        
        UPDATE public.therapists 
        SET ranking_points = GREATEST(ranking_points - v_adjustment, 0)
        WHERE user_id = v_therapist_id;

        -- Record in history
        INSERT INTO public.therapist_ranking_history (
            therapist_id,
            previous_ranking,
            new_ranking,
            change_reason,
            change_type
        ) VALUES (
            v_therapist_id,
            v_current_points,
            GREATEST(v_current_points - v_adjustment, 0),
            'Missed payment penalty',
            'payment_penalty'
        );

    ELSIF p_status = 'suspended' THEN
        -- Suspension: -35% penalty
        v_adjustment := FLOOR(v_current_points * 0.35);
        v_notification_message := 'You received a 35% points penalty due to suspension.';
        
        UPDATE public.therapists 
        SET ranking_points = GREATEST(ranking_points - v_adjustment, 0),
            status = 'suspended'
        WHERE user_id = v_therapist_id;

        -- Record in history
        INSERT INTO public.therapist_ranking_history (
            therapist_id,
            previous_ranking,
            new_ranking,
            change_reason,
            change_type
        ) VALUES (
            v_therapist_id,
            v_current_points,
            GREATEST(v_current_points - v_adjustment, 0),
            'Suspension penalty',
            'suspension'
        );
    END IF;

    -- Send notification
    IF v_notification_message IS NOT NULL THEN
        INSERT INTO public.therapist_notifications (
            therapist_id,
            title,
            message,
            type
        ) VALUES (
            v_therapist_id,
            CASE 
                WHEN p_status = 'completed' THEN 'Payment Bonus!'
                ELSE 'Payment Warning'
            END,
            v_notification_message,
            CASE 
                WHEN p_status = 'completed' THEN 'success'
                ELSE 'payment_warning'
            END
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create new public_therapists view ordered by ranking
CREATE VIEW public_therapists AS
SELECT 
    t.user_id as id,
    t.full_name,
    t.title,
    t.profile_image_url,
    t.bio_short,
    t.years_of_experience,
    t.session_price_60_min,
    t.session_price_30_min,
    t.ranking_points,
    t.rating,
    t.total_sessions,
    t.status
FROM public.therapists t
WHERE t.status = 'active'
ORDER BY t.ranking_points DESC;

-- 8. Add constraint for review timing (8+ sessions)
CREATE OR REPLACE FUNCTION check_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_session_count integer;
BEGIN
    -- Get completed session count for this client-therapist pair
    SELECT completed_sessions INTO v_session_count
    FROM client_session_counts
    WHERE therapist_id = NEW.therapist_id 
    AND client_email = NEW.client_email;

    IF v_session_count < 8 THEN
        RAISE EXCEPTION 'Reviews can only be submitted after 8 completed sessions with this therapist';
    END IF;

    -- Store session count at review time
    NEW.session_count_at_review := v_session_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review validation
DROP TRIGGER IF EXISTS check_review_eligibility_trigger ON public.reviews;
CREATE TRIGGER check_review_eligibility_trigger
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION check_review_eligibility();

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION adjust_therapist_points TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_status TO authenticated;
GRANT SELECT ON client_session_counts TO authenticated;

-- 10. Initialize ranking points for existing therapists based on their total sessions
-- This is a one-time update to set initial points
UPDATE public.therapists
SET ranking_points = LEAST(total_sessions * 50, 10000)
WHERE ranking_points = 0 OR ranking_points IS NULL;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_client_email ON public.sessions(client_email);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_status ON public.sessions(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_therapist_payments_status ON public.therapist_payments(status);
CREATE INDEX IF NOT EXISTS idx_therapist_payments_due_date ON public.therapist_payments(payment_due_date);
