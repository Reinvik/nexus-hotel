-- CHECK USER ARIEL
SELECT id, email, created_at FROM auth.users WHERE email = 'ariel.mellag@gmail.com';
SELECT id, email, role, company_id, is_authorized FROM hotel.profiles WHERE email = 'ariel.mellag@gmail.com';
