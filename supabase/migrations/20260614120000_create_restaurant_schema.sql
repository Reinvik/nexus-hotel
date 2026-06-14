-- ============================================================
-- NEXUS HOTEL: MIGRACIÓN DE RESTAURANTE (ESQUEMA 'restaurant')
-- ============================================================

-- 1. CREAR ESQUEMA
CREATE SCHEMA IF NOT EXISTS restaurant;

-- 2. TABLA DE CATEGORÍAS DEL MENÚ
CREATE TABLE IF NOT EXISTS restaurant.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. TABLA DE PLATILLOS / ITEMS DEL MENÚ
CREATE TABLE IF NOT EXISTS restaurant.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES restaurant.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. TABLA DE PEDIDOS (ORDERS)
CREATE TABLE IF NOT EXISTS restaurant.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('room_service', 'table', 'walk_in')),
    table_number TEXT,
    room_id UUID REFERENCES hotel.rooms(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES hotel.bookings(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid_direct', 'charged_to_room')),
    total_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. TABLA DE DETALLE DE PEDIDOS (ORDER ITEMS)
CREATE TABLE IF NOT EXISTS restaurant.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES restaurant.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES restaurant.menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_categories_company_id ON restaurant.menu_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_company_id ON restaurant.menu_items(company_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON restaurant.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_company_id ON restaurant.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_booking_id ON restaurant.orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_order_id ON restaurant.order_items(order_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS DE VALIDACIÓN
-- ============================================================
CREATE OR REPLACE FUNCTION restaurant.validate_room_charge()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el pedido se cobra a la habitación
    IF NEW.payment_status = 'charged_to_room' THEN
        -- Validar requerimientos
        IF NEW.booking_id IS NULL OR NEW.room_id IS NULL THEN
            RAISE EXCEPTION 'Para cargar a la habitación se requiere una reserva y habitación válidas.';
        END IF;

        -- Validar que la reserva esté activa en check-in
        IF NOT EXISTS (
            SELECT 1 FROM hotel.bookings 
            WHERE id = NEW.booking_id 
              AND room_id = NEW.room_id 
              AND status = 'checked_in'
        ) THEN
            RAISE EXCEPTION 'La reserva no se encuentra activa en esta habitación actualmente.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_room_charge ON restaurant.orders;
CREATE TRIGGER trg_validate_room_charge
    BEFORE INSERT OR UPDATE ON restaurant.orders
    FOR EACH ROW EXECUTE PROCEDURE restaurant.validate_room_charge();

-- ============================================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE restaurant.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para menu_categories
CREATE POLICY "Lectura libre de categorias" ON restaurant.menu_categories
    FOR SELECT USING (true);

CREATE POLICY "Admin gestiona categorias" ON restaurant.menu_categories
    FOR ALL TO authenticated USING (
        company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
    );

-- 2. Políticas para menu_items
CREATE POLICY "Lectura libre de items" ON restaurant.menu_items
    FOR SELECT USING (true);

CREATE POLICY "Admin gestiona items" ON restaurant.menu_items
    FOR ALL TO authenticated USING (
        company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
    );

-- 3. Políticas para orders
CREATE POLICY "Personal gestiona orders de su hotel" ON restaurant.orders
    FOR ALL TO authenticated USING (
        company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
    );

CREATE POLICY "Lectura e insercion de pedidos anonimos" ON restaurant.orders
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Políticas para order_items
CREATE POLICY "Personal gestiona order_items de su hotel" ON restaurant.order_items
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM restaurant.orders o
            WHERE o.id = order_id AND (o.company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin())
        )
    );

CREATE POLICY "Lectura e insercion de items anonimos" ON restaurant.order_items
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Privilegios para que la API REST acceda
GRANT USAGE ON SCHEMA restaurant TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA restaurant TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA restaurant TO anon, authenticated;
