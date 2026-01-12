# 🚀 Migration Guide: Service Favorites & Promotions

## ⚠️ สำคัญ: ต้อง Apply Migration ก่อนใช้งาน

ฟีเจอร์ Service Search, Favorites และ Promotions ต้องการ database schema ใหม่ที่อยู่ใน migration file:

```
supabase/migrations/241_service_favorites_and_promotions.sql
```

## 📋 วิธี Apply Migration

### 1. ตรวจสอบ Supabase Status

```bash
supabase status
```

### 2. Apply Migration (Local Development)

```bash
supabase db push --local
```

### 3. Apply Migration (Production)

```bash
supabase db push
```

### 4. Generate TypeScript Types

```bash
supabase gen types typescript --local > src/types/database.ts
```

## 🔍 ตรวจสอบว่า Migration สำเร็จ

หลัง apply migration แล้ว ควรเห็น:

1. **Tables ใหม่:**

   - `user_favorite_services`
   - `service_promotions`
   - `user_promotion_usage`

2. **Functions ใหม่:**

   - `get_user_favorite_services()`
   - `toggle_favorite_service()`
   - `get_service_promotions()`

3. **Sample Data:**
   - โปรโมชั่นตัวอย่าง 3 รายการ

## 🛠️ Fallback Handling

หากยังไม่ได้ apply migration, ระบบจะใช้ fallback queries:

- ✅ **Favorites**: ใช้ direct table queries แทน RPC functions
- ✅ **Promotions**: ใช้ direct table queries แทน RPC functions
- ✅ **Error Handling**: แสดง empty states แทน error messages

## 🔧 Troubleshooting

### ปัญหา: "Could not find the function"

```
Error: Could not find the function public.get_user_favorite_services
```

**วิธีแก้:**

1. ตรวจสอบว่า migration ถูก apply แล้วหรือไม่
2. รัน `supabase db push --local`
3. Restart development server

### ปัญหา: "Table does not exist"

```
Error: relation "user_favorite_services" does not exist
```

**วิธีแก้:**

1. ตรวจสอบ migration file ใน `supabase/migrations/`
2. รัน `supabase db reset --local` (จะลบข้อมูลทั้งหมด)
3. รัน `supabase db push --local`

## 📊 Database Schema

### user_favorite_services

```sql
CREATE TABLE user_favorite_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_id TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### service_promotions

```sql
CREATE TABLE service_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value DECIMAL(10,2),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

## ✅ เสร็จแล้ว!

หลัง apply migration สำเร็จ:

- ❌ Console errors จะหายไป
- ✅ Favorite buttons จะทำงานได้
- ✅ Promotions จะแสดงผล
- ✅ Search จะทำงานปกติ
