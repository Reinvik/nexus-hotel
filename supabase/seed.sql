-- SEED DATA PARA NEXUS HOTEL
-- Inserta hotel demo y habitaciones de prueba

-- 1. Insertar empresa (Hotel)
INSERT INTO hotel.companies (id, name, slug, address, phone, email, flow_settings)
VALUES (
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    'Nexus Grand Hotel',
    'nexus-grand',
    'Av. Providencia 1234, Santiago, Chile',
    '+56 9 1234 5678',
    'contacto@nexusgrand.cl',
    '{"apiKey": "demo_key", "secret": "demo_secret", "isSandbox": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar configuración por defecto del hotel
INSERT INTO hotel.settings (company_id, check_in_time, check_out_time, theme_primary, theme_secondary, theme_accent, theme_is_dark)
VALUES (
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '14:00',
    '11:00',
    '#3b82f6',
    '#1e293b',
    '#10b981',
    true
)
ON CONFLICT (company_id) DO NOTHING;

-- 3. Insertar habitaciones de prueba
INSERT INTO hotel.rooms (company_id, room_number, name, type, price_per_day, status, description)
VALUES 
(
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '101',
    'Single Standard',
    'Single',
    35000,
    'Available',
    'Habitación individual acogedora con cama de 1 plaza y media, ideal para viajeros de negocios. Incluye Wi-Fi de alta velocidad, escritorio y Smart TV.'
),
(
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '102',
    'Doble Twin Standard',
    'Double',
    55000,
    'Available',
    'Habitación equipada con dos camas de 1 plaza y media, baño privado, caja de seguridad, calefacción individual y excelente iluminación natural.'
),
(
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '103',
    'Matrimonial Vista Ciudad',
    'Double',
    60000,
    'Dirty',
    'Habitación de pareja con una cómoda cama Queen Size, vista panorámica al centro de la ciudad, minibar premium y cafetera Nespresso.'
),
(
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '201',
    'Suite Presidencial',
    'Suite',
    120000,
    'Available',
    'Espectacular suite de dos ambientes. Cuenta con cama King Size, sala de estar independiente con sofá cama, jacuzzi privado, batas de baño de algodón egipcio y balcón privado.'
),
(
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    '202',
    'Deluxe Vista Cordillera',
    'Deluxe',
    85000,
    'Available',
    'Habitación ejecutiva de lujo con una vista inigualable a la Cordillera de los Andes. Cama King, baño con tina y ducha separadas, y servicio a la habitación preferente.'
)
ON CONFLICT (company_id, room_number) DO NOTHING;
