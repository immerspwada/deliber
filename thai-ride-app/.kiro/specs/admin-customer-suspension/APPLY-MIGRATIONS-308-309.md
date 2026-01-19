# 🚀 Apply Migrations 308 & 309

## ปัญหาที่แก้ไข

**Migration 297** ดึง `status` จาก `users.status` (ไม่มี column นี้)  
**Migration 308** เพิ่ม `status` ไปที่ `profiles` table  
**Migration 309** แก้ไข RPC function ให้ใช้ `profiles.status` แทน

## ขั้นตอนการ Apply (Local)

### 1. เปิด Docker Desktop

```bash
# macOS: เปิดแอป Docker Desktop
open -a Docker

# รอจนกว่า Docker จะพร้อม (ประมาณ 10-30 วินาที)
```

### 2. Start Supabase Local

```bash
npx supabase start
```

### 3. Apply Migrations

```bash
# Apply migration 308 (เพิ่ม status columns ใน profiles)
npx supabase db push --local

# Migration 309 จะถูก apply พร้อมกัน
```

### 4. Generate Types

```bash
npx supabase gen types --local > src/types/database.ts
```

### 5. ตรวจสอบว่า Migration สำเร็จ

```bash
npx supabase db diff --local
# ควรแสดง: No schema changes detected
```

### 6. ทดสอบ RPC Function

```sql
-- เปิด Supabase Studio: http://localhost:54323
-- ไปที่ SQL Editor และรัน:

SELECT * FROM get_admin_customers(NULL, NULL, 10, 0);
```

## ขั้นตอนการ Deploy (Production)

### 1. Link to Production

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Apply Migrations

```bash
npx supabase db push
```

### 3. Generate Types

```bash
npx supabase gen types > src/types/database.ts
```

### 4. Verify

```bash
# ตรวจสอบใน Supabase Dashboard
# SQL Editor > Run:
SELECT * FROM get_admin_customers(NULL, NULL, 10, 0);
```

## ตรวจสอบว่าปุ่มระงับแสดงแล้ว

1. เปิด http://localhost:5173/admin/customers
2. ควรเห็นปุ่มระงับ (🚫) ในแต่ละแถว
3. คลิกปุ่มระงับ → กรอกเหตุผล → ยืนยัน
4. ลูกค้าควรถูกระงับและแสดงสถานะ "ระงับการใช้งาน"

## หากยังไม่เห็นปุ่ม

ตรวจสอบว่า:

- [ ] Docker เปิดแล้ว
- [ ] Supabase local running (`npx supabase status`)
- [ ] Migrations applied (`npx supabase db push --local`)
- [ ] Types generated
- [ ] Dev server restart (`npm run dev`)
- [ ] Browser cache cleared (Cmd+Shift+R)

## Schema Changes

### Migration 308

```sql
ALTER TABLE profiles ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN suspended_by UUID;
```

### Migration 309

```sql
-- แก้ไข get_admin_customers() ให้ใช้:
SELECT p.status FROM profiles p  -- แทน u.status FROM users u
```

## Expected Result

✅ ปุ่มระงับแสดงในตาราง  
✅ Modal ระงับทำงาน  
✅ สถานะอัปเดตทันที  
✅ ลูกค้าที่ถูกระงับไม่สามารถใช้งานได้
