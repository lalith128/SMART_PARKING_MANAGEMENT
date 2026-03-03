-- Function auth hardening v2
-- Tightens RPC authorization checks, search_path safety, and execute grants.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Tighten function-level authorization checks
-- ---------------------------------------------------------------------------

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Authenticated user must match booking user';
  END IF;

  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID is required'; END IF;
  IF p_parking_space_id IS NULL THEN RAISE EXCEPTION 'Parking space ID is required'; END IF;
  IF p_vehicle_type NOT IN ('two-wheeler', 'four-wheeler', 'heavy-vehicle') THEN RAISE EXCEPTION 'Invalid vehicle type'; END IF;
  IF p_payment_method NOT IN ('online', 'cash', 'wallet', 'card') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN RAISE EXCEPTION 'Invalid time range'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

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
    (gen_random_uuid(), p_user_id, 'Booking Confirmed', format('Booking confirmed for slot %s.', coalesce(p_slot_number, '-')), 'booking_confirmed', v_booking_id, false, now()),
    (gen_random_uuid(), v_owner_id, 'New Booking Received', format('New booking for slot %s.', coalesce(p_slot_number, '-')), 'new_booking', v_booking_id, false, now());

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_cancelled_by_user_id THEN
    RAISE EXCEPTION 'Authenticated user must match cancel requester';
  END IF;

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
    (gen_random_uuid(), v_booking.user_id, 'Booking Cancelled', 'Your booking was cancelled successfully.', 'booking_cancelled', p_booking_id, false, now()),
    (gen_random_uuid(), v_booking.owner_id, 'Booking Cancelled', 'A booking for your parking space has been cancelled.', 'booking_cancelled', p_booking_id, false, now());

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enhanced_owner_dashboard(p_owner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result json;
    avg_occupancy NUMERIC;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT COALESCE(AVG(sa.occupancy_rate), 0) INTO avg_occupancy
    FROM space_analytics sa
    JOIN parking_spaces ps ON ps.id = sa.parking_space_id
    WHERE ps.owner_id = p_owner_id;

    WITH space_stats AS (
        SELECT
            COALESCE(COUNT(*), 0) as total_spaces,
            COALESCE(COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.parking_space_id = ps.id
                AND b.status = 'active'
            ) THEN 1 END), 0) as spaces_with_active_bookings
        FROM parking_spaces ps
        WHERE ps.owner_id = p_owner_id
    ),
    booking_stats AS (
        SELECT
            COALESCE(COUNT(CASE WHEN b.status = 'active' THEN 1 END), 0) as active_bookings,
            COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.amount ELSE 0 END), 0) as total_completed_revenue,
            COALESCE(SUM(CASE WHEN b.status = 'active' THEN b.amount ELSE 0 END), 0) as upcoming_revenue,
            COALESCE(SUM(b.amount), 0) as total_revenue
        FROM bookings b
        JOIN parking_spaces ps ON b.parking_space_id = ps.id
        WHERE ps.owner_id = p_owner_id
    ),
    vehicle_stats AS (
        SELECT
            COALESCE(COUNT(CASE WHEN b.vehicle_type = 'two-wheeler' THEN 1 END), 0) as two_wheeler_count,
            COALESCE(COUNT(CASE WHEN b.vehicle_type = 'four-wheeler' THEN 1 END), 0) as four_wheeler_count,
            COALESCE(COUNT(CASE WHEN b.vehicle_type = 'heavy-vehicle' THEN 1 END), 0) as heavy_vehicle_count
        FROM bookings b
        JOIN parking_spaces ps ON b.parking_space_id = ps.id
        WHERE ps.owner_id = p_owner_id
    ),
    wallet_stats AS (
        SELECT
            COALESCE(w.balance, 0) as wallet_balance,
            COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.amount ELSE 0 END), 0) as total_earnings,
            COALESCE(SUM(CASE WHEN b.status = 'active' THEN b.amount ELSE 0 END), 0) as pending_earnings,
            COALESCE(SUM(CASE WHEN wr.status = 'pending' THEN wr.amount ELSE 0 END), 0) as pending_withdrawals
        FROM wallets w
        LEFT JOIN bookings b ON b.parking_space_id IN (
            SELECT id FROM parking_spaces WHERE owner_id = p_owner_id
        )
        LEFT JOIN withdrawal_requests wr ON wr.user_id = p_owner_id
        WHERE w.user_id = p_owner_id
        GROUP BY w.balance
    ),
    recent_transactions AS (
        SELECT
            t.id,
            t.amount,
            t.type as type,
            t.status,
            t.booking_id,
            t.created_at,
            t.description
        FROM transactions t
        WHERE t.user_id = p_owner_id
        ORDER BY t.created_at DESC
        LIMIT 10
    ),
    space_revenue AS (
        SELECT
            ps.id as space_id,
            ps.address,
            COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.amount ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN b.status = 'active' THEN b.amount ELSE 0 END), 0) as upcoming_revenue,
            COUNT(b.id) as total_bookings,
            COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_bookings,
            COALESCE(AVG(sa.occupancy_rate), 0) as occupancy_rate
        FROM parking_spaces ps
        LEFT JOIN bookings b ON b.parking_space_id = ps.id
        LEFT JOIN space_analytics sa ON sa.parking_space_id = ps.id
        WHERE ps.owner_id = p_owner_id
        GROUP BY ps.id, ps.address
    ),
    monthly_revenue AS (
        SELECT
            TO_CHAR(DATE_TRUNC('month', b.created_at), 'Mon YYYY') as month,
            COALESCE(SUM(b.amount), 0) as revenue
        FROM bookings b
        JOIN parking_spaces ps ON b.parking_space_id = ps.id
        WHERE ps.owner_id = p_owner_id
        AND b.status IN ('completed', 'active')
        GROUP BY DATE_TRUNC('month', b.created_at)
        ORDER BY DATE_TRUNC('month', b.created_at) DESC
        LIMIT 6
    ),
    recent_bookings AS (
        SELECT
            b.id,
            COALESCE(p.full_name, '') as user_name,
            COALESCE(p.email, '') as user_email,
            COALESCE(b.vehicle_type, '') as vehicle_type,
            COALESCE(b.vehicle_number, '') as vehicle_number,
            COALESCE(b.slot_number::text, '') as slot_number,
            b.start_time,
            b.end_time,
            COALESCE(b.amount, 0) as amount,
            COALESCE(b.status, 'pending') as status,
            COALESCE(pay.status, 'pending') as payment_status,
            COALESCE(ps.address, '') as space_address
        FROM bookings b
        JOIN parking_spaces ps ON b.parking_space_id = ps.id
        JOIN profiles p ON b.user_id = p.id
        LEFT JOIN payments pay ON pay.booking_id = b.id
        WHERE ps.owner_id = p_owner_id
        ORDER BY b.created_at DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'totalSpaces', COALESCE((SELECT total_spaces FROM space_stats), 0),
        'activeBookings', COALESCE((SELECT active_bookings FROM booking_stats), 0),
        'totalCompletedRevenue', COALESCE((SELECT total_completed_revenue FROM booking_stats), 0),
        'upcomingRevenue', COALESCE((SELECT upcoming_revenue FROM booking_stats), 0),
        'totalRevenue', COALESCE((SELECT total_revenue FROM booking_stats), 0),
        'vehicleDistribution', json_build_object(
            'two-wheeler', COALESCE((SELECT two_wheeler_count FROM vehicle_stats), 0),
            'four-wheeler', COALESCE((SELECT four_wheeler_count FROM vehicle_stats), 0),
            'heavy-vehicle', COALESCE((SELECT heavy_vehicle_count FROM vehicle_stats), 0)
        ),
        'walletBalance', COALESCE((SELECT wallet_balance FROM wallet_stats), 0),
        'totalEarnings', COALESCE((SELECT total_earnings FROM wallet_stats), 0),
        'pendingEarnings', COALESCE((SELECT pending_earnings FROM wallet_stats), 0),
        'pendingWithdrawals', COALESCE((SELECT pending_withdrawals FROM wallet_stats), 0),
        'occupancyRate', CASE
            WHEN (SELECT total_spaces FROM space_stats) > 0
            THEN ROUND(((SELECT spaces_with_active_bookings FROM space_stats)::float / (SELECT total_spaces FROM space_stats)::float) * 100)
            ELSE 0
        END,
        'recentTransactions', COALESCE((SELECT json_agg(row_to_json(rt)) FROM recent_transactions rt), '[]'::json),
        'spaceRevenue', COALESCE((SELECT json_agg(row_to_json(sr)) FROM space_revenue sr), '[]'::json),
        'recentBookings', COALESCE((SELECT json_agg(row_to_json(rb)) FROM recent_bookings rb), '[]'::json),
        'monthlyRevenue', COALESCE((SELECT json_agg(row_to_json(mr)) FROM monthly_revenue mr), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    result JSON;
    current_timestamp_var TIMESTAMP WITH TIME ZONE;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    current_timestamp_var := CURRENT_TIMESTAMP;

    WITH
    booking_stats AS (
        SELECT
            COUNT(*) as total_bookings,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bookings,
            COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as upcoming_bookings,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
            COALESCE(SUM(CASE WHEN status IN ('completed', 'active') THEN amount ELSE 0 END), 0) as total_spent,
            (
                SELECT vehicle_type
                FROM (
                    SELECT vehicle_type, COUNT(*) as type_count, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rn
                    FROM bookings
                    WHERE user_id = p_user_id
                    GROUP BY vehicle_type
                ) ranked_types
                WHERE rn = 1
            ) as favorite_vehicle_type
        FROM bookings
        WHERE user_id = p_user_id
    ),
    vehicle_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN vehicle_type = 'two-wheeler' THEN 1 ELSE 0 END), 0) as two_wheeler_count,
            COALESCE(SUM(CASE WHEN vehicle_type = 'four-wheeler' THEN 1 ELSE 0 END), 0) as four_wheeler_count,
            COALESCE(SUM(CASE WHEN vehicle_type = 'heavy-vehicle' THEN 1 ELSE 0 END), 0) as heavy_vehicle_count
        FROM bookings
        WHERE user_id = p_user_id
    ),
    payment_stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'parking_payment' AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) as total_payments,
            COALESCE(SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_refunds,
            MAX(CASE WHEN type = 'parking_payment' AND status = 'completed' THEN created_at ELSE NULL END) as last_payment_date
        FROM transactions
        WHERE user_id = p_user_id
    ),
    monthly_spending AS (
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
            COALESCE(SUM(amount), 0) as spent
        FROM bookings
        WHERE user_id = p_user_id
        AND status IN ('completed', 'active')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 6
    ),
    active_bookings AS (
        SELECT COALESCE(jsonb_agg(booking_details ORDER BY start_time ASC), '[]'::jsonb) as bookings
        FROM (
            SELECT
                b.id,
                b.parking_space_id,
                COALESCE(ps.address, 'Unknown') as address,
                COALESCE(ps.district, 'Unknown') as district,
                COALESCE(ps.state, 'Unknown') as state,
                b.slot_number,
                b.vehicle_type,
                b.vehicle_number,
                b.start_time,
                b.end_time,
                b.amount,
                b.status,
                COALESCE(p.status, 'pending') as payment_status,
                COALESCE((SELECT full_name FROM profiles WHERE id = b.owner_id), 'Unknown') as owner_name,
                (b.start_time - INTERVAL '30 minutes' > current_timestamp_var) as can_cancel
            FROM bookings b
            JOIN parking_spaces ps ON b.parking_space_id = ps.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.user_id = p_user_id
            AND b.status = 'active'
            ORDER BY b.start_time ASC
            LIMIT 5
        ) AS booking_details
    ),
    recent_transactions AS (
        SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) AS transactions
        FROM (
            SELECT id, amount, type, status, booking_id, description, created_at
            FROM transactions
            WHERE user_id = p_user_id
            ORDER BY created_at DESC
            LIMIT 10
        ) t
    ),
    favorite_spaces AS (
        SELECT COALESCE(jsonb_agg(space_data), '[]'::jsonb) AS spaces
        FROM (
            SELECT
                ps.id as space_id,
                COALESCE(ps.address, 'Unknown') as address,
                ps.district,
                ps.state,
                ps.hourly_rate,
                COUNT(b.id) as booking_count,
                SUM(b.amount) as total_spent,
                MAX(b.created_at) as last_booked
            FROM parking_spaces ps
            JOIN bookings b ON b.parking_space_id = ps.id
            WHERE b.user_id = p_user_id
            GROUP BY ps.id, ps.address, ps.district, ps.state, ps.hourly_rate
            ORDER BY COUNT(b.id) DESC
            LIMIT 5
        ) as space_data
    )

    SELECT json_build_object(
        'totalBookings', COALESCE((SELECT total_bookings FROM booking_stats), 0),
        'activeBookingsCount', COALESCE((SELECT active_bookings FROM booking_stats), 0),
        'upcomingBookings', COALESCE((SELECT upcoming_bookings FROM booking_stats), 0),
        'completedBookings', COALESCE((SELECT completed_bookings FROM booking_stats), 0),
        'cancelledBookings', COALESCE((SELECT cancelled_bookings FROM booking_stats), 0),
        'totalSpent', COALESCE((SELECT total_spent FROM booking_stats), 0),
        'favoriteVehicleType', COALESCE((SELECT favorite_vehicle_type FROM booking_stats), ''),
        'vehicleDistribution', json_build_object(
            'two-wheeler', COALESCE((SELECT two_wheeler_count FROM vehicle_stats), 0),
            'four-wheeler', COALESCE((SELECT four_wheeler_count FROM vehicle_stats), 0),
            'heavy-vehicle', COALESCE((SELECT heavy_vehicle_count FROM vehicle_stats), 0)
        ),
        'paymentStats', json_build_object(
            'totalPayments', COALESCE((SELECT total_payments FROM payment_stats), 0),
            'totalRefunds', COALESCE((SELECT total_refunds FROM payment_stats), 0),
            'netSpent', COALESCE((SELECT total_payments - total_refunds FROM payment_stats), 0),
            'lastPaymentDate', (SELECT last_payment_date FROM payment_stats)
        ),
        'monthlySpending', COALESCE((SELECT json_agg(row_to_json(ms)) FROM monthly_spending ms), '[]'::json),
        'activeBookings', COALESCE((SELECT bookings FROM active_bookings), '[]'::jsonb),
        'recentTransactions', COALESCE((SELECT transactions FROM recent_transactions), '[]'::jsonb),
        'favoriteSpaces', COALESCE((SELECT spaces FROM favorite_spaces), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Restrict execute grants
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.process_completed_bookings_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_completed_bookings_job() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_parking_booking(uuid, uuid, text, text, text, timestamptz, timestamptz, numeric, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_enhanced_owner_dashboard(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_stats(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_parking_booking(uuid, uuid, text, text, text, timestamptz, timestamptz, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enhanced_owner_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(uuid) TO authenticated;

COMMIT;
