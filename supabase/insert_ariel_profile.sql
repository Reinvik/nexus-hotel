-- INSERTAR/ACTUALIZAR PERFIL DE ARIEL EN EL ESQUEMA HOTEL
INSERT INTO hotel.profiles (id, email, name, role, company_id, is_authorized)
VALUES (
  '94b8bae5-0ec2-409d-8937-bbaa2f710018',
  'ariel.mellag@gmail.com',
  'Ariel Mellag',
  'admin',
  '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
  true
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    company_id = '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
    is_authorized = true;
