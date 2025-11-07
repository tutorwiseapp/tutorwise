-- File: apps/api/migrations/041_create_connection_limit_trigger.sql
-- Purpose: Connection limits (1,000 per user) and analytics triggers (SDD v4.5)
-- Date: 2025-11-07

-- 1. Function to check connection limits (1,000 per user)
CREATE OR REPLACE FUNCTION public.check_connection_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_connections INT;
    receiver_connections INT;
BEGIN
    -- Only check when accepting a connection
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

        -- Check requester's limit
        SELECT COUNT(*)
        INTO requester_connections
        FROM public.connections
        WHERE (requester_id = NEW.requester_id OR receiver_id = NEW.requester_id)
        AND status = 'accepted';

        IF requester_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.requester_id
                USING HINT = 'Please remove some connections before accepting new ones';
        END IF;

        -- Check receiver's limit
        SELECT COUNT(*)
        INTO receiver_connections
        FROM public.connections
        WHERE (requester_id = NEW.receiver_id OR receiver_id = NEW.receiver_id)
        AND status = 'accepted';

        IF receiver_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.receiver_id
                USING HINT = 'This user has reached their connection limit';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_connection_accepted_check_limit ON public.connections;
CREATE TRIGGER on_connection_accepted_check_limit
    BEFORE INSERT OR UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.check_connection_limit();

-- 3. Function to log connection events to analytics
CREATE OR REPLACE FUNCTION public.log_connection_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log connection requested (on INSERT with status = 'pending')
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        INSERT INTO public.network_analytics (profile_id, event_type, event_data)
        VALUES (
            NEW.requester_id,
            'connection_requested',
            jsonb_build_object(
                'connection_id', NEW.id,
                'receiver_id', NEW.receiver_id
            )
        );
    END IF;

    -- Log connection accepted
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.network_analytics (profile_id, event_type, event_data)
        VALUES (
            NEW.requester_id,
            'connection_accepted',
            jsonb_build_object(
                'connection_id', NEW.id,
                'receiver_id', NEW.receiver_id
            )
        );
    END IF;

    -- Log connection rejected
    IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        INSERT INTO public.network_analytics (profile_id, event_type, event_data)
        VALUES (
            NEW.receiver_id,
            'connection_rejected',
            jsonb_build_object(
                'connection_id', NEW.id,
                'requester_id', NEW.requester_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Trigger for connection analytics
DROP TRIGGER IF EXISTS on_connection_status_change ON public.connections;
CREATE TRIGGER on_connection_status_change
    AFTER INSERT OR UPDATE OF status ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.log_connection_event();

COMMENT ON TRIGGER on_connection_accepted_check_limit ON public.connections IS
    'Enforces 1,000 connection limit per user (v4.5)';
COMMENT ON TRIGGER on_connection_status_change ON public.connections IS
    'Logs connection events to network_analytics (v4.5)';
