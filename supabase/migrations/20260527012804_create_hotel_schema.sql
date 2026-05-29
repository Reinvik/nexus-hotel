-- ============================================================
-- NEXUS HOTEL: MIGRACIÓN DE BASE DE DATOS (ESQUEMA 'hotel')
-- ============================================================

-- 1. CREAR ESQUEMA
CREATE SCHEMA IF NOT EXISTS hotel;

-- 2. TABLA DE EMPRESAS (HOTELES / TENANTS)
CREATE TABLE IF NOT EXISTS hotel.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    flow_settings JSONB DEFAULT '{"apiKey": "", "secret": "", "isSandbox": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS hotel.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin', 'receptionist', 'cleaner')),
    company_id UUID REFERENCES hotel.companies(id) ON DELETE SET NULL,
    is_authorized BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. TABLA DE HABITACIONES (ROOMS)
CREATE TABLE IF NOT EXISTS hotel.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Single', 'Double', 'Suite', 'Deluxe')),
    price_per_day NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Cleaning', 'Maintenance')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, room_number)
);

-- 5. TABLA DE RESERVAS (BOOKINGS)
CREATE TABLE IF NOT EXISTS hotel.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES hotel.rooms(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    guest_email TEXT,
    guest_rut TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    flow_token TEXT,
    flow_payment_url TEXT,
    flow_order_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. TABLA DE TAREAS DE LIMPIEZA
CREATE TABLE IF NOT EXISTS hotel.cleaning_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES hotel.companies(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES hotel.rooms(id) ON DELETE CASCADE,
    cleaner_id UUID REFERENCES hotel.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    booking_id UUID REFERENCES hotel.bookings(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. TABLA DE CONFIGURACIONES GENERALES DEL HOTEL
CREATE TABLE IF NOT EXISTS hotel.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES hotel.companies(id) ON DELETE CASCADE,
    check_in_time TEXT DEFAULT '14:00',
    check_out_time TEXT DEFAULT '11:00',
    logo_url TEXT,
    theme_primary TEXT DEFAULT '#3b82f6',
    theme_secondary TEXT DEFAULT '#1e293b',
    theme_accent TEXT DEFAULT '#10b981',
    theme_is_dark BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rooms_company_id ON hotel.rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_id ON hotel.bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON hotel.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON hotel.bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_company_id ON hotel.cleaning_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON hotel.cleaning_tasks(status);

-- ============================================================
-- FUNCIONES DE SEGURIDAD DEFINER (Para evadir recursión RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION hotel.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM hotel.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION hotel.is_hotel_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM hotel.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- TRÍGGERS DE AUTOCREACIÓN DE PERFILES EN EL ESQUEMA HOTEL
-- ============================================================
CREATE OR REPLACE FUNCTION hotel.handle_new_user_hotel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hotel.profiles (id, email, name, role, is_authorized)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    CASE WHEN new.email = 'ariel.mellag@gmail.com' THEN 'admin'::text ELSE 'receptionist'::text END,
    CASE WHEN new.email = 'ariel.mellag@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_hotel ON auth.users;
CREATE TRIGGER on_auth_user_created_hotel
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE hotel.handle_new_user_hotel();

-- ============================================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE hotel.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel.cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel.settings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: hotel.companies
CREATE POLICY "Empresas visibles para usuarios autenticados"
  ON hotel.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins pueden gestionar todas las empresas"
  ON hotel.companies FOR ALL TO authenticated USING (hotel.is_hotel_admin());

-- POLÍTICAS: hotel.profiles
CREATE POLICY "Ver perfiles del mismo hotel"
  ON hotel.profiles FOR SELECT TO authenticated USING (
    id = auth.uid() OR company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON hotel.profiles FOR UPDATE TO authenticated USING (
    id = auth.uid() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Insertar perfil personal"
  ON hotel.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- POLÍTICAS: hotel.rooms
CREATE POLICY "Gestión de habitaciones según company_id"
  ON hotel.rooms FOR ALL TO authenticated USING (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  ) WITH CHECK (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Permitir lectura anónima para portal de reservas"
  ON hotel.rooms FOR SELECT TO anon USING (true);

-- POLÍTICAS: hotel.bookings
CREATE POLICY "Gestión de reservas según company_id"
  ON hotel.bookings FOR ALL TO authenticated USING (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  ) WITH CHECK (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Permitir inserción y lectura anónima para portal"
  ON hotel.bookings FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir inserción anónima para portal"
  ON hotel.bookings FOR INSERT TO anon WITH CHECK (true);

-- POLÍTICAS: hotel.cleaning_tasks
CREATE POLICY "Gestión de tareas de limpieza según company_id"
  ON hotel.cleaning_tasks FOR ALL TO authenticated USING (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  ) WITH CHECK (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

-- POLÍTICAS: hotel.settings
CREATE POLICY "Ver configuraciones según company_id"
  ON hotel.settings FOR SELECT TO authenticated USING (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Actualizar configuraciones según company_id"
  ON hotel.settings FOR UPDATE TO authenticated USING (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  ) WITH CHECK (
    company_id = hotel.get_user_company_id() OR hotel.is_hotel_admin()
  );

CREATE POLICY "Permitir lectura anónima de configuración del hotel"
  ON hotel.settings FOR SELECT TO anon USING (true);

-- ============================================================
-- GRANTED PRIVILEGES (Para que API REST acceda al esquema)
-- ============================================================
GRANT USAGE ON SCHEMA hotel TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA hotel TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hotel TO anon, authenticated;
