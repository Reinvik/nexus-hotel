-- ============================================================
-- NEXUS HOTEL: FUNCIÓN DE VALIDACIÓN SEGURA DE ACCESO DESDE LA HABITACIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION public.hotel_validate_room_access(
  p_company_id UUID,
  p_room_number TEXT,
  p_guest_rut TEXT
)
RETURNS TABLE (
  booking_id UUID,
  room_id UUID,
  guest_name TEXT,
  room_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hotel, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    r.id as room_id,
    b.guest_name,
    r.room_number
  FROM hotel.bookings b
  JOIN hotel.rooms r ON r.id = b.room_id
  WHERE b.company_id = p_company_id
    AND LOWER(TRIM(r.room_number)) = LOWER(TRIM(p_room_number))
    -- Comparación insensible a mayúsculas/minúsculas y caracteres especiales en el RUT
    AND LOWER(REGEXP_REPLACE(TRIM(b.guest_rut), '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE(TRIM(p_guest_rut), '[^a-zA-Z0-9]', '', 'g'))
    AND b.status = 'checked_in';
END;
$$;

-- Conceder permisos de ejecución
GRANT EXECUTE ON FUNCTION public.hotel_validate_room_access(UUID, TEXT, TEXT) TO anon, authenticated;
