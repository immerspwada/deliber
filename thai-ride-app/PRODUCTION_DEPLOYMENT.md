# 🚀 Production Deployment Guide

## ⚠️ สำคัญ: Migration ต้อง Apply ใน Production

ฟีเจอร์ Service Search, Favorites และ Promotions ต้องการ database schema ใหม่

## 📋 Manual Deployment Steps

### 1. เตรียม Migration File

```bash
# ตรวจสอบว่ามี migration file
ls -la supabase/migrations/241_service_favorites_and_promotions.sql
```

### 2. Apply Migration ใน Production

#### Option A: ใช้ Supabase CLI (แนะนำ)

```bash
# Link project (ถ้ายังไม่ได้ทำ)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push --linked

# Generate types
supabase gen types typescript --linked > src/types/database.ts
```

#### Option B: ใช้ Supabase Dashboard

1. เข้า Supabase Dashboard → SQL Editor
2. Copy content จาก `supabase/migrations/241_service_favorites_and_promotions.sql`
3. Paste และ Run SQL
4. ตรวจสอบว่า tables และ functions ถูกสร้างแล้ว

### 3. ตรวจสอบ Schema ใน Production

#### Tables ที่ต้องมี:

- `user_favorite_services`
- `service_promotions`
- `user_promotion_usage`

#### Functions ที่ต้องมี:

- `get_user_favorite_services(UUID)`
- `toggle_favorite_service(UUID, TEXT)`
- `get_service_promotions(TEXT)`

#### ตรวจสอบด้วย SQL:

```sql
-- ตรวจสอบ tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_favorite_services', 'service_promotions', 'user_promotion_usage');

-- ตรวจสอบ functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_favorite_services', 'toggle_favorite_service', 'get_service_promotions');
```

## 🔧 Fallback Mechanism

Code ได้เตรียม fallback mechanism แล้ว:

### ✅ ถ้า Migration Applied สำเร็จ:

- ใช้ RPC functions (เร็วกว่า)
- Full functionality
- Optimized queries

### ✅ ถ้า Migration ยังไม่ Applied:

- ใช้ direct table queries
- แสดง error message ที่ชัดเจน
- ไม่ crash application

## 🚨 Error Handling

### Console Errors ที่คาดหวัง (ก่อน apply migration):

```
POST /rest/v1/rpc/get_user_favorite_services 404 (Not Found)
POST /rest/v1/rpc/get_service_promotions 404 (Not Found)
```

### Error Messages ใน Code:

```
Database schema not ready. Please apply migration 241.
```

## 📊 Production Checklist

- [ ] Migration file exists: `241_service_favorites_and_promotions.sql`
- [ ] Supabase project linked
- [ ] Migration applied successfully
- [ ] Tables created with correct schema
- [ ] RLS policies enabled
- [ ] Functions created and working
- [ ] Sample data inserted
- [ ] TypeScript types generated
- [ ] Frontend errors resolved
- [ ] Favorite functionality working
- [ ] Promotions displaying correctly

## 🔄 Rollback Plan

ถ้าเกิดปัญหา สามารถ rollback ได้:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_user_favorite_services(UUID);
DROP FUNCTION IF EXISTS toggle_favorite_service(UUID, TEXT);
DROP FUNCTION IF EXISTS get_service_promotions(TEXT);

-- Drop tables (จะลบข้อมูลทั้งหมด!)
DROP TABLE IF EXISTS user_promotion_usage;
DROP TABLE IF EXISTS service_promotions;
DROP TABLE IF EXISTS user_favorite_services;
```

## 🎯 Testing ใน Production

### 1. Test Favorites:

- เข้าหน้า `/customer/services`
- กดปุ่ม heart บน service card
- ตรวจสอบว่า favorite state เปลี่ยน
- Refresh page ดูว่า state คงอยู่

### 2. Test Promotions:

- ตรวจสอบว่า promotions section แสดงผล
- ดู promotion badges บน service cards
- ตรวจสอบ promotion expiry dates

### 3. Test Search:

- ใช้ search bar หา services
- ตรวจสอบ real-time filtering
- ทดสอบ clear search

## 📞 Support

หากเกิดปัญหา:

1. ตรวจสอบ console errors
2. ดู network tab ใน DevTools
3. ตรวจสอบ Supabase logs
4. ใช้ fallback mechanism ชั่วคราว
