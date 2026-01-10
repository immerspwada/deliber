# 🚨 URGENT FIX: Missing providers_v2 Table

## ปัญหา

```
Error: Could not find the table 'public.providers_v2' in the schema cache
Code: PGRST205
```

## วิธีแก้ไขด่วน (เลือก 1 วิธี)

### 🔥 วิธีที่ 1: ใช้ Supabase Dashboard (แนะนำ - ใช้เวลา 2 นาที)

1. **เปิด Supabase Dashboard**

   - ไปที่: https://supabase.com/dashboard
   - เลือก project: `onsflqhkgqhydeupiqyt`
   - คลิก **SQL Editor** ในเมนูซ้าย

2. **Copy & Run SQL**

   ```sql
   -- Quick Fix: Create providers_v2 table
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2') THEN
           -- Create enum types
           DO $enum$ BEGIN
             CREATE TYPE provider_status AS ENUM (
               'pending', 'pending_verification', 'approved', 'active', 'suspended', 'rejected'
             );
           EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

           DO $enum$ BEGIN
             CREATE TYPE service_type AS ENUM (
               'ride', 'delivery', 'shopping', 'moving', 'laundry'
             );
           EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

           -- Create providers_v2 table
           CREATE TABLE providers_v2 (
             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
             user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
             provider_uid TEXT UNIQUE,
             first_name TEXT NOT NULL,
             last_name TEXT NOT NULL,
             email TEXT NOT NULL,
             phone_number TEXT NOT NULL,
             status provider_status NOT NULL DEFAULT 'pending',
             service_types service_type[] NOT NULL DEFAULT '{}',
             is_online BOOLEAN DEFAULT FALSE,
             current_location GEOGRAPHY(POINT),
             rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
             total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
             total_earnings DECIMAL(10,2) DEFAULT 0 CHECK (total_earnings >= 0),
             created_at TIMESTAMPTZ DEFAULT NOW(),
             updated_at TIMESTAMPTZ DEFAULT NOW(),
             approved_at TIMESTAMPTZ,
             suspended_at TIMESTAMPTZ,
             suspension_reason TEXT
           );

           -- Create indexes
           CREATE INDEX idx_providers_v2_user_id ON providers_v2(user_id);
           CREATE INDEX idx_providers_v2_status ON providers_v2(status);

           -- Enable RLS
           ALTER TABLE providers_v2 ENABLE ROW LEVEL SECURITY;

           -- Create RLS policies
           CREATE POLICY "Providers can view own profile" ON providers_v2 FOR SELECT USING (auth.uid() = user_id);
           CREATE POLICY "Providers can update own profile" ON providers_v2 FOR UPDATE USING (auth.uid() = user_id);
           CREATE POLICY "Anyone can insert provider" ON providers_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);

           -- Admin policies
           CREATE POLICY "Admins can view all providers" ON providers_v2 FOR SELECT USING (
             EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
           );

           CREATE POLICY "Admins can update all providers" ON providers_v2 FOR UPDATE USING (
             EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
           );

           RAISE NOTICE 'providers_v2 table created successfully!';
       ELSE
           RAISE NOTICE 'providers_v2 table already exists';
       END IF;
   END $$;
   ```

3. **คลิก RUN**
4. **ตรวจสอบผลลัพธ์** - ควรเห็น "providers_v2 table created successfully!"

### 🔧 วิธีที่ 2: ใช้ Browser Tool (ใช้เวลา 3 นาที)

1. **เปิดเครื่องมือ**

   - ไปที่: `http://localhost:5173/run-migration-browser.html`

2. **ทำตามขั้นตอน**
   - คลิก "Check Database Status"
   - คลิก "Show SQL" และ copy SQL
   - ไปที่ Supabase Dashboard SQL Editor
   - Paste และ run SQL
   - กลับมาคลิก "Verify Migration"

### 🚀 วิธีที่ 3: ใช้ Command Line (สำหรับ Advanced Users)

```bash
# ถ้ามี Supabase CLI
cd supabase
npx supabase migration up

# หรือ run migration file โดยตรง
npx supabase db push
```

## ✅ การตรวจสอบ

หลังจาก run SQL แล้ว:

1. **ทดสอบ Provider Onboarding**

   - ไปที่: `http://localhost:5173/provider/onboarding`
   - ควรไม่เห็น error PGRST205 อีก

2. **ตรวจสอบใน Supabase Dashboard**

   - ไปที่ Table Editor
   - ควรเห็นตาราง `providers_v2`

3. **ใช้เครื่องมือทดสอบ**
   - ไปที่: `http://localhost:5173/test-providers-v2-fix.html`
   - คลิก "ตรวจสอบตาราง providers_v2"
   - ควรเห็น "✅ ตาราง providers_v2 มีอยู่แล้ว"

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากแก้ไขแล้ว:

- ✅ หน้า `/provider/onboarding` ทำงานได้ปกติ
- ✅ ไม่มี error PGRST205
- ✅ ผู้ใช้สามารถสมัครเป็น provider ได้
- ✅ Provider system ทำงานเต็มรูปแบบ

## 🔍 หากยังมีปัญหา

1. **ตรวจสอบ Console Logs**

   - เปิด Developer Tools (F12)
   - ดู Console tab
   - หา error messages

2. **ใช้เครื่องมือ Debug**

   - `http://localhost:5173/test-providers-v2-fix.html`
   - `http://localhost:5173/run-migration-browser.html`

3. **ตรวจสอบ Supabase Project**
   - ตรวจสอบว่าใช้ project ที่ถูกต้อง
   - ตรวจสอบ API keys
   - ตรวจสอบ RLS policies

## 📞 Support

หากยังแก้ไขไม่ได้:

1. ส่ง screenshot ของ error
2. ส่ง console logs
3. ระบุขั้นตอนที่ทำไปแล้ว
