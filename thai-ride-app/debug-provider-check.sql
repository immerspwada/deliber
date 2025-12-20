-- Debug script: ตรวจสอบว่า customer@demo.com สมัครเป็น provider แล้วหรือยัง

-- 1. ตรวจสอบ user_id ของ customer@demo.com
SELECT id, email, first_name, last_name 
FROM users 
WHERE email = 'customer@demo.com';

-- 2. ตรวจสอบ provider records ทั้งหมดของ customer@demo.com
SELECT sp.*, u.email, u.first_name, u.last_name
FROM service_providers sp
LEFT JOIN users u ON sp.user_id = u.id
WHERE u.email = 'customer@demo.com';

-- 3. ตรวจสอบ provider records ทั้งหมดที่ status = 'pending'
SELECT sp.id, sp.provider_type, sp.status, sp.created_at, u.email
FROM service_providers sp
LEFT JOIN users u ON sp.user_id = u.id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC
LIMIT 10;

-- 4. นับจำนวน providers แต่ละสถานะ
SELECT status, COUNT(*) as count
FROM service_providers
GROUP BY status;
