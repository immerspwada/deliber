-- 🚨 INSTANT FIX: สร้างตาราง providers_v2 ทันที
-- Copy โค้ดนี้ไปรันใน Supabase Dashboard SQL Editor

DO $$ 
BEGIN
    -- ตรวจสอบว่าตาราง providers_v2 มีอยู่หรือไม่
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2') THEN
        
        RAISE NOTICE '🔧 กำลังสร้างตาราง providers_v2...';
        
        -- สร้าง enum types ถ้ายังไม่มี
        DO $enum$ BEGIN
          CREATE TYPE provider_status AS ENUM (
            'pending',           -- รอการตรวจสอบ
            'pending_verification', -- รอการยืนยันเอกสาร
            'approved',          -- อนุมัติแล้ว
            'active',            -- ใช้งานได้
            'suspended',         -- ถูกระงับ
            'rejected'           -- ถูกปฏิเสธ
          );
        EXCEPTION WHEN duplicate_object THEN 
          RAISE NOTICE '⚠️ provider_status enum มีอยู่แล้ว';
        END $enum$;

        DO $enum$ BEGIN
          CREATE TYPE service_type AS ENUM (
            'ride',              -- รับส่งผู้โดยสาร
            'delivery',          -- ส่งของ
            'shopping',          -- ช้อปปิ้ง
            'moving',            -- ขนย้าย
            'laundry'            -- ซักรีด
          );
        EXCEPTION WHEN duplicate_object THEN 
          RAISE NOTICE '⚠️ service_type enum มีอยู่แล้ว';
        END $enum$;

        -- สร้างตาราง providers_v2
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
          suspension_reason TEXT,
          
          -- ข้อจำกัดสำหรับความปลอดภัย
          CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
          CONSTRAINT valid_phone CHECK (phone_number ~* '^\d{10}$')
        );

        -- สร้าง indexes เพื่อความเร็ว
        CREATE INDEX idx_providers_v2_user_id ON providers_v2(user_id);
        CREATE INDEX idx_providers_v2_status ON providers_v2(status);
        CREATE INDEX idx_providers_v2_provider_uid ON providers_v2(provider_uid);
        CREATE INDEX idx_providers_v2_online ON providers_v2(is_online) WHERE is_online = TRUE;
        CREATE INDEX idx_providers_v2_location ON providers_v2 USING GIST(current_location) WHERE is_online = TRUE;

        -- เปิดใช้งาน Row Level Security (RLS)
        ALTER TABLE providers_v2 ENABLE ROW LEVEL SECURITY;

        -- สร้าง RLS policies สำหรับความปลอดภัย
        
        -- ไรเดอร์ดูข้อมูลตัวเองได้
        CREATE POLICY "Providers can view own profile" 
          ON providers_v2 FOR SELECT
          USING (auth.uid() = user_id);

        -- ไรเดอร์แก้ไขข้อมูลตัวเองได้
        CREATE POLICY "Providers can update own profile" 
          ON providers_v2 FOR UPDATE
          USING (auth.uid() = user_id);

        -- ทุกคนสมัครเป็นไรเดอร์ได้
        CREATE POLICY "Anyone can insert provider (registration)" 
          ON providers_v2 FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        -- Admin ดูข้อมูลไรเดอร์ทุกคนได้
        CREATE POLICY "Admins can view all providers" 
          ON providers_v2 FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'super_admin')
            )
            OR
            EXISTS (
              SELECT 1 FROM auth.users
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
          );

        -- Admin แก้ไขข้อมูลไรเดอร์ทุกคนได้
        CREATE POLICY "Admins can update all providers" 
          ON providers_v2 FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'super_admin')
            )
            OR
            EXISTS (
              SELECT 1 FROM auth.users
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
          );

        -- สร้าง trigger สำหรับ updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        CREATE TRIGGER update_providers_v2_updated_at
          BEFORE UPDATE ON providers_v2
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE '✅ ตาราง providers_v2 ถูกสร้างเรียบร้อยแล้ว!';
        
    ELSE
        RAISE NOTICE '⚠️ ตาราง providers_v2 มีอยู่แล้ว';
    END IF;
END $$;

-- ตรวจสอบว่าตารางถูกสร้างแล้ว
SELECT 
    'providers_v2' as table_name,
    COUNT(*) as record_count,
    '✅ ตารางพร้อมใช้งาน!' as status
FROM providers_v2;

-- แสดงข้อมูลตาราง
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'providers_v2' 
ORDER BY ordinal_position;