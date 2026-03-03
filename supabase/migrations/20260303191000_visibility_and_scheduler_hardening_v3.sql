-- Visibility and scheduler hardening v3
-- Locks down helper RPC visibility and re-checks scheduler security posture.

BEGIN;

CREATE OR REPLACE FUNCTION public.show_vehicle_count(
  p_parking_space_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS TABLE(
  vehicle_type text,
  total_capacity integer,
  active_count bigint,
  completed_count bigint,
  cancelled_count bigint,
  available_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_parking_space_id IS NULL THEN
    RAISE EXCEPTION 'Parking space ID cannot be null';
  END IF;

  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Invalid time range';
  END IF;

  SELECT owner_id, status
  INTO v_owner_id, v_status
  FROM public.parking_spaces
  WHERE id = p_parking_space_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parking space not found';
  END IF;

  -- Only allow visibility for active spaces, unless caller is the owner.
  IF v_status <> 'active' AND v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to inspect this parking space';
  END IF;

  RETURN QUERY
  WITH vehicle_types AS (
    SELECT 'two-wheeler'::text AS vehicle_type
    UNION ALL SELECT 'four-wheeler'::text
    UNION ALL SELECT 'heavy-vehicle'::text
  ),
  active_counts AS (
    SELECT b.vehicle_type, COUNT(*)::bigint AS count
    FROM public.bookings b
    WHERE b.parking_space_id = p_parking_space_id
      AND b.status = 'active'
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time
    GROUP BY b.vehicle_type
  ),
  pending_active_counts AS (
    SELECT b.vehicle_type, COUNT(*)::bigint AS count
    FROM public.bookings b
    WHERE b.parking_space_id = p_parking_space_id
      AND b.status IN ('pending', 'active')
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time
    GROUP BY b.vehicle_type
  ),
  completed_counts AS (
    SELECT b.vehicle_type, COUNT(*)::bigint AS count
    FROM public.bookings b
    WHERE b.parking_space_id = p_parking_space_id
      AND b.status = 'completed'
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time
    GROUP BY b.vehicle_type
  ),
  cancelled_counts AS (
    SELECT b.vehicle_type, COUNT(*)::bigint AS count
    FROM public.bookings b
    WHERE b.parking_space_id = p_parking_space_id
      AND b.status = 'cancelled'
      AND b.start_time < p_end_time
      AND b.end_time > p_start_time
    GROUP BY b.vehicle_type
  )
  SELECT
    vt.vehicle_type,
    CASE
      WHEN vt.vehicle_type = 'two-wheeler' THEN ps.two_wheeler_capacity
      WHEN vt.vehicle_type = 'four-wheeler' THEN ps.four_wheeler_capacity
      ELSE ps.heavy_vehicle_capacity
    END AS total_capacity,
    COALESCE(ac.count, 0) AS active_count,
    COALESCE(cc.count, 0) AS completed_count,
    COALESCE(canc.count, 0) AS cancelled_count,
    GREATEST(
      CASE
        WHEN vt.vehicle_type = 'two-wheeler' THEN ps.two_wheeler_capacity
        WHEN vt.vehicle_type = 'four-wheeler' THEN ps.four_wheeler_capacity
        ELSE ps.heavy_vehicle_capacity
      END - COALESCE(pac.count, 0)::integer,
      0
    ) AS available_count
  FROM vehicle_types vt
  CROSS JOIN public.parking_spaces ps
  LEFT JOIN active_counts ac ON ac.vehicle_type = vt.vehicle_type
  LEFT JOIN pending_active_counts pac ON pac.vehicle_type = vt.vehicle_type
  LEFT JOIN completed_counts cc ON cc.vehicle_type = vt.vehicle_type
  LEFT JOIN cancelled_counts canc ON canc.vehicle_type = vt.vehicle_type
  WHERE ps.id = p_parking_space_id
  ORDER BY vt.vehicle_type;
END;
$$;

-- Helper function should be restricted to authenticated callers.
REVOKE EXECUTE ON FUNCTION public.show_vehicle_count(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.show_vehicle_count(uuid, timestamptz, timestamptz) TO authenticated;

-- Keep availability helper non-public as well.
REVOKE EXECUTE ON FUNCTION public.check_time_slot_availability(uuid, text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_time_slot_availability(uuid, text, timestamptz, timestamptz) TO authenticated;

COMMIT;
