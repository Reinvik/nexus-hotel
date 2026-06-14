-- ============================================================
-- NEXUS HOTEL: FUNCIONES PROXY PARA EL RESTAURANTE (ESQUEMA 'public')
-- Exponen las tablas de 'restaurant' mediante RPCs seguras
-- ============================================================

-- 1. Obtener categorías del menú
CREATE OR REPLACE FUNCTION public.restaurant_get_categories(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    name TEXT,
    sort_order INT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
  SELECT id, company_id, name, sort_order, created_at 
  FROM restaurant.menu_categories 
  WHERE company_id = p_company_id 
  ORDER BY sort_order, name;
$$;

-- 2. Obtener platillos del menú
CREATE OR REPLACE FUNCTION public.restaurant_get_menu_items(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    category_id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    image_url TEXT,
    is_available BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
  SELECT id, company_id, category_id, name, description, price, image_url, is_available, created_at 
  FROM restaurant.menu_items 
  WHERE company_id = p_company_id 
  ORDER BY name;
$$;

-- 3. Upsert de categoría
CREATE OR REPLACE FUNCTION public.restaurant_upsert_category(
  p_id UUID,
  p_company_id UUID,
  p_name TEXT,
  p_sort_order INT
)
RETURNS restaurant.menu_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
DECLARE
  v_row restaurant.menu_categories;
BEGIN
  INSERT INTO restaurant.menu_categories (id, company_id, name, sort_order)
  VALUES (COALESCE(p_id, gen_random_uuid()), p_company_id, p_name, p_sort_order)
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- 4. Upsert de platillo
CREATE OR REPLACE FUNCTION public.restaurant_upsert_menu_item(
  p_id UUID,
  p_company_id UUID,
  p_category_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_image_url TEXT,
  p_is_available BOOLEAN
)
RETURNS restaurant.menu_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
DECLARE
  v_row restaurant.menu_items;
BEGIN
  INSERT INTO restaurant.menu_items (id, company_id, category_id, name, description, price, image_url, is_available)
  VALUES (COALESCE(p_id, gen_random_uuid()), p_company_id, p_category_id, p_name, p_description, p_price, p_image_url, p_is_available)
  ON CONFLICT (id) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      image_url = EXCLUDED.image_url,
      is_available = EXCLUDED.is_available
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- 5. Eliminar categoría
CREATE OR REPLACE FUNCTION public.restaurant_delete_category(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
BEGIN
  DELETE FROM restaurant.menu_categories WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- 6. Eliminar platillo
CREATE OR REPLACE FUNCTION public.restaurant_delete_menu_item(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
BEGIN
  DELETE FROM restaurant.menu_items WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- 7. Crear pedido completo (Transaccional con JSON de ítems)
CREATE OR REPLACE FUNCTION public.restaurant_create_order(
  p_company_id UUID,
  p_source TEXT,
  p_table_number TEXT,
  p_room_id UUID,
  p_booking_id UUID,
  p_payment_status TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = restaurant, hotel, public
AS $$
DECLARE
  v_order_id UUID;
  v_item RECORD;
  v_total NUMERIC := 0;
BEGIN
  -- Insertar pedido
  INSERT INTO restaurant.orders (
    company_id, source, table_number, room_id, booking_id, status, payment_status, total_price, notes
  ) VALUES (
    p_company_id, p_source, p_table_number, p_room_id, p_booking_id, 'pending', p_payment_status, 0, p_notes
  ) RETURNING id INTO v_order_id;

  -- Insertar items y calcular total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT, unit_price NUMERIC, notes TEXT) LOOP
    INSERT INTO restaurant.order_items (
      order_id, menu_item_id, quantity, unit_price, notes
    ) VALUES (
      v_order_id, v_item.menu_item_id, v_item.quantity, v_item.unit_price, v_item.notes
    );
    v_total := v_total + (v_item.unit_price * v_item.quantity);
  END LOOP;

  -- Actualizar total real
  UPDATE restaurant.orders SET total_price = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

-- 8. Obtener listado de pedidos agregados con detalles
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

-- 9. Actualizar estado de preparación del pedido
CREATE OR REPLACE FUNCTION public.restaurant_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS restaurant.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
  UPDATE restaurant.orders SET status = p_status WHERE id = p_order_id RETURNING *;
$$;

-- 10. Actualizar estado de cobro/pago del pedido
CREATE OR REPLACE FUNCTION public.restaurant_update_order_payment(p_order_id UUID, p_payment_status TEXT)
RETURNS restaurant.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = restaurant, public
AS $$
  UPDATE restaurant.orders SET payment_status = p_payment_status WHERE id = p_order_id RETURNING *;
$$;

-- Conceder permisos de ejecución a todos los roles
GRANT EXECUTE ON FUNCTION public.restaurant_get_categories(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_get_menu_items(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_upsert_category(UUID,UUID,TEXT,INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_upsert_menu_item(UUID,UUID,UUID,TEXT,TEXT,NUMERIC,TEXT,BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_delete_category(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_delete_menu_item(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_create_order(UUID,TEXT,TEXT,UUID,UUID,TEXT,TEXT,JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_get_orders(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_update_order_status(UUID,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_update_order_payment(UUID,TEXT) TO anon, authenticated;
