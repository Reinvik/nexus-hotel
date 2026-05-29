-- ACTUALIZAR TRIGGER PARA AUTORIZAR NUEVOS USUARIOS DE PRUEBA
-- Vincula automáticamente a los nuevos usuarios al hotel demo y los autoriza

CREATE OR REPLACE FUNCTION hotel.handle_new_user_hotel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hotel.profiles (id, email, name, role, company_id, is_authorized)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE 
      WHEN new.email = 'ariel.mellag@gmail.com' THEN 'admin'::text 
      WHEN new.email LIKE '%limpieza%' OR new.email LIKE '%cleaner%' THEN 'cleaner'::text
      ELSE 'receptionist'::text 
    END,
    '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b'::uuid,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET company_id = '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b'::uuid,
      is_authorized = true;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
