-- Backend hardening v1
-- Applies strict RLS, booking/payment transactional logic, and stable cron completion.

BEGIN;

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------------
-- 1) Core constraints and indexes
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_time_range_check' AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_time_range_check CHECK (end_time > start_time);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_amount_non_negative' AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_amount_non_negative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_non_negative' AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_non_negative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parking_spaces_two_wheeler_capacity_non_negative' AND conrelid = 'public.parking_spaces'::regclass
  ) THEN
    ALTER TABLE public.parking_spaces
      ADD CONSTRAINT parking_spaces_two_wheeler_capacity_non_negative CHECK (two_wheeler_capacity >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parking_spaces_four_wheeler_capacity_non_negative' AND conrelid = 'public.parking_spaces'::regclass
  ) THEN
    ALTER TABLE public.parking_spaces
      ADD CONSTRAINT parking_spaces_four_wheeler_capacity_non_negative CHECK (four_wheeler_capacity >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parking_spaces_heavy_vehicle_capacity_non_negative' AND conrelid = 'public.parking_spaces'::regclass
  ) THEN
    ALTER TABLE public.parking_spaces
      ADD CONSTRAINT parking_spaces_heavy_vehicle_capacity_non_negative CHECK (heavy_vehicle_capacity >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_space_vehicle_time_active
  ON public.bookings (parking_space_id, vehicle_type, start_time, end_time)
  WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_bookings_slot_time_active
  ON public.bookings (parking_space_id, slot_number, start_time, end_time)
  WHERE status IN ('pending', 'active');

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_booking_completed_unique
  ON public.payments (booking_id)
  WHERE status = 'completed';

-- ---------------------------------------------------------------------------
-- 2) Remove fragile trigger path and rebuild deterministic completion flow
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_complete_booking ON public.bookings;
DROP FUNCTION IF EXISTS public.complete_booking_and_pay_owner() CASCADE;
DROP FUNCTION IF EXISTS public.check_trigger_status() CASCADE;

-- ---------------------------------------------------------------------------
-- 3) Utility function for updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_set_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_set_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_withdrawal_requests_set_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_set_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Booking and cancellation logic (transactional and race-safe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_time_slot_availability(
  p_parking_space_id uuid,
  p_vehicle_type text,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_capacity integer;
  v_booked_count integer;
BEGIN
  IF p_parking_space_id IS NULL THEN
    RAISE EXCEPTION 'Parking space ID cannot be null';
  END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Invalid time range';
  END IF;
  IF p_vehicle_type NOT IN ('two-wheeler', 'four-wheeler', 'heavy-vehicle') THEN
    RAISE EXCEPTION 'Invalid vehicle type';
  END IF;

  SELECT CASE p_vehicle_type
    WHEN 'two-wheeler' THEN two_wheeler_capacity
    WHEN 'four-wheeler' THEN four_wheeler_capacity
    WHEN 'heavy-vehicle' THEN heavy_vehicle_capacity
  END
  INTO v_capacity
  FROM public.parking_spaces
  WHERE id = p_parking_space_id;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Parking space not found';
  END IF;

  SELECT COUNT(*)
  INTO v_booked_count
  FROM public.bookings b
  WHERE b.parking_space_id = p_parking_space_id
    AND b.vehicle_type = p_vehicle_type
    AND b.status IN ('pending', 'active')
    AND b.start_time < p_end_time
    AND b.end_time > p_start_time;

  RETURN v_booked_count < v_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_parking_booking(
  p_user_id uuid,
  p_parking_space_id uuid,
  p_slot_number text,
  p_vehicle_type text,
  p_vehicle_number text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_amount numeric,
  p_user_name text,
  p_user_email text,
  p_payment_method text DEFAULT 'online'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_booking_id uuid;
  v_payment_id uuid;
  v_owner_id uuid;
  v_capacity integer;
  v_overlap_count integer;
  v_existing_slot_count integer;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID is required'; END IF;
  IF p_parking_space_id IS NULL THEN RAISE EXCEPTION 'Parking space ID is required'; END IF;
  IF p_vehicle_type NOT IN ('two-wheeler', 'four-wheeler', 'heavy-vehicle') THEN RAISE EXCEPTION 'Invalid vehicle type'; END IF;
  IF p_payment_method NOT IN ('online', 'cash', 'wallet', 'card') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN RAISE EXCEPTION 'Invalid time range'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  -- Lock the parking space row to make capacity checks race-safe.
  SELECT owner_id,
         CASE p_vehicle_type
           WHEN 'two-wheeler' THEN two_wheeler_capacity
           WHEN 'four-wheeler' THEN four_wheeler_capacity
           WHEN 'heavy-vehicle' THEN heavy_vehicle_capacity
         END
  INTO v_owner_id, v_capacity
  FROM public.parking_spaces
  WHERE id = p_parking_space_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parking space not found or inactive';
  END IF;

  IF v_owner_id = p_user_id THEN
    RAISE EXCEPTION 'Owner cannot book own parking space';
  END IF;

  SELECT COUNT(*)
  INTO v_overlap_count
  FROM public.bookings b
  WHERE b.parking_space_id = p_parking_space_id
    AND b.vehicle_type = p_vehicle_type
    AND b.status IN ('pending', 'active')
    AND b.start_time < p_end_time
    AND b.end_time > p_start_time;

  IF v_overlap_count >= v_capacity THEN
    RAISE EXCEPTION 'No available capacity for selected vehicle and time slot';
  END IF;

  -- Optional slot-level conflict protection if slot_number is used.
  IF p_slot_number IS NOT NULL AND length(trim(p_slot_number)) > 0 THEN
    SELECT COUNT(*)
    INTO v_existing_slot_count
    FROM public.bookings b
    WHERE b.parking_space_id = p_parking_space_id
      AND b.slot_number = p_slot_number
      AND b.status IN ('pending', 'active')
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time;

    IF v_existing_slot_count > 0 THEN
      RAISE EXCEPTION 'Selected slot is already booked for this time range';
    END IF;
  END IF;

  v_booking_id := gen_random_uuid();
  v_payment_id := gen_random_uuid();

  INSERT INTO public.bookings (
    id, user_id, owner_id, parking_space_id, slot_number,
    vehicle_type, vehicle_number, start_time, end_time,
    amount, status, user_name, user_email, created_at
  ) VALUES (
    v_booking_id, p_user_id, v_owner_id, p_parking_space_id, p_slot_number,
    p_vehicle_type, p_vehicle_number, p_start_time, p_end_time,
    p_amount, 'active', p_user_name, p_user_email, now()
  );

  INSERT INTO public.payments (
    id, booking_id, amount, payment_method, status, created_at
  ) VALUES (
    v_payment_id, v_booking_id, p_amount, p_payment_method, 'completed', now()
  );

  INSERT INTO public.notifications (id, user_id, title, message, type, booking_id, is_read, created_at)
  VALUES
    (
      gen_random_uuid(),
      p_user_id,
      'Booking Confirmed',
      format('Booking confirmed for slot %s.', coalesce(p_slot_number, '-')),
      'booking_confirmed',
      v_booking_id,
      false,
      now()
    ),
    (
      gen_random_uuid(),
      v_owner_id,
      'New Booking Received',
      format('New booking for slot %s.', coalesce(p_slot_number, '-')),
      'new_booking',
      v_booking_id,
      false,
      now()
    );

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_cancelled_by_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_has_completed_payment boolean;
  v_wallet_exists boolean;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF p_cancelled_by_user_id IS NULL OR (p_cancelled_by_user_id <> v_booking.user_id AND p_cancelled_by_user_id <> v_booking.owner_id) THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  IF v_booking.status IN ('cancelled', 'completed') THEN
    RETURN false;
  END IF;

  IF v_booking.start_time <= now() + interval '30 minutes' THEN
    RAISE EXCEPTION 'Cancellation allowed only at least 30 minutes before start';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.booking_id = p_booking_id
      AND p.status = 'completed'
  ) INTO v_has_completed_payment;

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;

  IF v_has_completed_payment THEN
    UPDATE public.payments
    SET status = 'refunded'
    WHERE booking_id = p_booking_id
      AND status = 'completed';

    SELECT EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.user_id = v_booking.user_id
    ) INTO v_wallet_exists;

    IF NOT v_wallet_exists THEN
      INSERT INTO public.wallets (id, user_id, balance, last_updated, created_at)
      VALUES (gen_random_uuid(), v_booking.user_id, 0, now(), now());
    END IF;

    UPDATE public.wallets
    SET balance = balance + v_booking.amount,
        last_updated = now()
    WHERE user_id = v_booking.user_id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.booking_id = p_booking_id
        AND t.user_id = v_booking.user_id
        AND t.type = 'refund'
        AND t.status = 'completed'
    ) THEN
      INSERT INTO public.transactions (
        id, user_id, amount, type, status, booking_id, description, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_booking.user_id, v_booking.amount,
        'refund', 'completed', p_booking_id,
        'Refund for cancelled booking', now(), now()
      );
    END IF;
  END IF;

  INSERT INTO public.notifications (id, user_id, title, message, type, booking_id, is_read, created_at)
  VALUES
    (
      gen_random_uuid(),
      v_booking.user_id,
      'Booking Cancelled',
      'Your booking was cancelled successfully.',
      'booking_cancelled',
      p_booking_id,
      false,
      now()
    ),
    (
      gen_random_uuid(),
      v_booking.owner_id,
      'Booking Cancelled',
      'A booking for your parking space has been cancelled.',
      'booking_cancelled',
      p_booking_id,
      false,
      now()
    );

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Completion function for cron (single source of truth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_completed_bookings_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    WITH completed AS (
      UPDATE public.bookings b
      SET status = 'completed'
      WHERE b.status = 'active'
        AND b.end_time <= now()
        AND EXISTS (
          SELECT 1
          FROM public.payments p
          WHERE p.booking_id = b.id
            AND p.status = 'completed'
        )
      RETURNING b.id, b.owner_id, b.user_id, b.amount, b.slot_number
    )
    SELECT * FROM completed
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.booking_id = r.id
        AND t.user_id = r.owner_id
        AND t.type = 'parking_earning'
        AND t.status = 'completed'
    ) THEN
      INSERT INTO public.wallets (id, user_id, balance, last_updated, created_at)
      VALUES (gen_random_uuid(), r.owner_id, 0, now(), now())
      ON CONFLICT (user_id) DO NOTHING;

      UPDATE public.wallets
      SET balance = balance + r.amount,
          last_updated = now()
      WHERE user_id = r.owner_id;

      INSERT INTO public.transactions (
        id, user_id, amount, type, status, booking_id, description, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), r.owner_id, r.amount,
        'parking_earning', 'completed', r.id,
        'Earning from completed booking', now(), now()
      );
    END IF;

    INSERT INTO public.notifications (id, user_id, title, message, type, booking_id, is_read, created_at)
    VALUES
      (
        gen_random_uuid(),
        r.owner_id,
        'Booking Completed',
        format('Booking for slot %s is completed. Earnings credited.', coalesce(r.slot_number, '-')),
        'payment_received',
        r.id,
        false,
        now()
      ),
      (
        gen_random_uuid(),
        r.user_id,
        'Booking Completed',
        'Your booking has been marked as completed.',
        'booking_completed',
        r.id,
        false,
        now()
      );
  END LOOP;
END;
$$;

-- Ensure cron job exists and points to hardened completion function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid = 14) THEN
    PERFORM cron.unschedule(14);
  END IF;

  PERFORM cron.schedule(
    'process_completed_bookings_job',
    '*/5 * * * *',
    'SELECT public.process_completed_bookings_job()'
  );
EXCEPTION WHEN OTHERS THEN
  -- If pg_cron schedule already exists with same name, re-use existing job.
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Strong RLS: remove permissive policies and recreate least-privilege rules
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'parking_spaces', 'bookings', 'payments', 'notifications',
        'wallets', 'transactions', 'withdrawal_requests', 'failed_login_attempts',
        'account_lockouts', 'reviews', 'space_analytics'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_analytics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.space_analytics FORCE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- parking_spaces
CREATE POLICY parking_spaces_select_active
  ON public.parking_spaces FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY parking_spaces_owner_insert
  ON public.parking_spaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY parking_spaces_owner_update
  ON public.parking_spaces FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY parking_spaces_owner_delete
  ON public.parking_spaces FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- bookings
CREATE POLICY bookings_select_user_or_owner
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY bookings_insert_user_only
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookings_update_user_or_owner
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR owner_id = auth.uid());

-- payments
CREATE POLICY payments_select_related_booking
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND (b.user_id = auth.uid() OR b.owner_id = auth.uid())
    )
  );

-- notifications
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- wallets
CREATE POLICY wallets_select_own
  ON public.wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- transactions
CREATE POLICY transactions_select_own
  ON public.transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- withdrawal_requests
CREATE POLICY withdrawal_requests_select_own
  ON public.withdrawal_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY withdrawal_requests_insert_own
  ON public.withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- reviews
CREATE POLICY reviews_select_all
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY reviews_insert_completed_booking_user
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.user_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- space analytics (owner only)
CREATE POLICY space_analytics_select_owner
  ON public.space_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parking_spaces ps
      WHERE ps.id = space_analytics.parking_space_id
        AND ps.owner_id = auth.uid()
    )
  );

COMMIT;
