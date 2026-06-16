-- ============================================================
-- NEXUS HOTEL: MIGRACIÓN DE RESTAURANTE - KPIS Y RENDIMIENTO
-- ============================================================

-- 1. Agregar columnas de seguimiento de tiempo
ALTER TABLE restaurant.orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE restaurant.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 2. Actualizar función restaurant_update_order_status
CREATE OR REPLACE FUNCTION public.restaurant_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS restaurant.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
DECLARE
  v_row restaurant.orders;
BEGIN
  UPDATE restaurant.orders
  SET status = p_status,
      preparing_at = CASE 
        WHEN p_status = 'preparing' AND preparing_at IS NULL THEN NOW() 
        ELSE preparing_at 
      END,
      delivered_at = CASE 
        WHEN p_status = 'delivered' AND delivered_at IS NULL THEN NOW() 
        ELSE delivered_at 
      END
  WHERE id = p_order_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- 3. Actualizar función restaurant_get_orders para incluir las marcas de tiempo
DROP FUNCTION IF EXISTS public.restaurant_get_orders(UUID);
CREATE OR REPLACE FUNCTION public.restaurant_get_orders(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    source TEXT,
    table_number TEXT,
    room_id UUID,
    room_number TEXT,
    booking_id UUID,
    guest_name TEXT,
    status TEXT,
    payment_status TEXT,
    total_price NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    preparing_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    items JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = restaurant, hotel, public
AS $$
  SELECT 
    o.id,
    o.company_id,
    o.source,
    o.table_number,
    o.room_id,
    r.room_number,
    o.booking_id,
    b.guest_name,
    o.status,
    o.payment_status,
    o.total_price,
    o.notes,
    o.created_at,
    o.preparing_at,
    o.delivered_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'name', mi.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'notes', oi.notes
          )
        )
        FROM restaurant.order_items oi
        JOIN restaurant.menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as items
  FROM restaurant.orders o
  LEFT JOIN hotel.rooms r ON r.id = o.room_id
  LEFT JOIN hotel.bookings b ON b.id = o.booking_id
  WHERE o.company_id = p_company_id
  ORDER BY o.created_at DESC;
$$;

-- Conceder permisos de ejecución
GRANT EXECUTE ON FUNCTION public.restaurant_get_orders(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_update_order_status(UUID,TEXT) TO anon, authenticated;
