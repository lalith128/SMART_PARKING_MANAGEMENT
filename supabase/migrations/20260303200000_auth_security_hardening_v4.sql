-- Auth security hardening v4
-- Adds login lockout RPCs and cleanup scheduler.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_account_lockouts_until
  ON public.account_lockouts (lockout_until);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email_attempt_time
  ON public.failed_login_attempts (email, attempt_time DESC);

CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lockout_until timestamptz;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT lockout_until
  INTO v_lockout_until
  FROM public.account_lockouts
  WHERE lower(email) = lower(trim(p_email));

  IF v_lockout_until IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_lockout_until <= now() THEN
    DELETE FROM public.account_lockouts
    WHERE lower(email) = lower(trim(p_email));
    RETURN NULL;
  END IF;

  RETURN v_lockout_until;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(
  p_email text,
  p_ip text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_recent_count integer;
  v_lockout_until timestamptz;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  v_email := lower(trim(p_email));

  -- Keep table size bounded.
  DELETE FROM public.failed_login_attempts
  WHERE attempt_time < now() - interval '1 day';

  INSERT INTO public.failed_login_attempts (id, email, ip_address, attempt_time)
  VALUES (gen_random_uuid(), v_email, p_ip, now());

  SELECT COUNT(*)
  INTO v_recent_count
  FROM public.failed_login_attempts
  WHERE email = v_email
    AND attempt_time >= now() - interval '5 minutes';

  IF v_recent_count >= 5 THEN
    v_lockout_until := now() + interval '5 minutes';

    INSERT INTO public.account_lockouts (email, lockout_until)
    VALUES (v_email, v_lockout_until)
    ON CONFLICT (email)
    DO UPDATE SET lockout_until = EXCLUDED.lockout_until;

    RETURN v_lockout_until;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN;
  END IF;

  v_email := lower(trim(p_email));

  DELETE FROM public.failed_login_attempts WHERE email = v_email;
  DELETE FROM public.account_lockouts WHERE email = v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_login_security_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE attempt_time < now() - interval '1 day';

  DELETE FROM public.account_lockouts
  WHERE lockout_until <= now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_account_locked(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_failed_login_attempt(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_login_security_tables() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_login_security_tables() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE command = 'SELECT public.cleanup_login_security_tables()'
      AND active = true
  ) THEN
    PERFORM cron.schedule(
      'cleanup_login_security_tables',
      '0 * * * *',
      'SELECT public.cleanup_login_security_tables()'
    );
  END IF;
END $$;

COMMIT;
