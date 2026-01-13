# 🔧 Provider Job System Debug Guide

## 🚨 ปัญหาที่พบ: Provider ไม่ได้รับงานจาก Customer

จากภาพหน้าจอ เห็นว่า:

- **Customer**: กำลังหาคนขับ (0:05) - แสดงว่าสั่งงานแล้ว
- **Provider**: ออนไลน์ แต่ไม่มีงานเข้ามา

## 🔍 สาเหตุที่เป็นไปได้

### 1. Database ไม่ทำงาน

- Supabase local ไม่ได้รัน
- Docker daemon ไม่ทำงาน
- Connection timeout

### 2. Realtime Subscription ไม่ทำงาน

- WebSocket connection ล้มเหลว
- Channel subscription ไม่สำเร็จ
- Event filter ไม่ถูกต้อง

### 3. RLS Policy บล็อก

- Provider ไม่สามารถเห็น pending rides
- Permission ไม่ถูกต้อง

### 4. Table Schema ไม่ตรง

- Foreign key ผิด
- Column ขาดหาย

## 🛠️ วิธีแก้ไขทันที

### ขั้นตอนที่ 1: ใช้ Debug Mode

1. เปิด Provider Dashboard
2. กด F12 เปิด Developer Console
3. ดู Debug Info section (ถ้ามี)
4. กดปุ่ม "🔍 Debug Jobs"

### ขั้นตอนที่ 2: ใช้ Fallback Mode

1. ใน Debug section กดปุ่ม "🔄 Toggle Mode"
2. Refresh หน้า
3. ระบบจะใช้ Mock Data แทน Database
4. ควรเห็นงาน Mock ขึ้นมา

### ขั้นตอนที่ 3: ทดสอบด้วย Debug Files

1. เปิด `http://localhost:5173/debug-provider-jobs.html`
2. ทดสอบ Database Connection
3. สร้าง Test Ride
4. ทดสอบ Realtime Subscription

### ขั้นตอนที่ 4: ใช้ Browser Console

1. เปิด Provider page
2. กด F12
3. ไปที่ Console tab
4. Paste และรัน:

```javascript
// Load debug script
const script = document.createElement("script");
script.src = "/fix-provider-jobs-immediate.js";
document.head.appendChild(script);
```

## 🔧 การแก้ไขถาวร

### 1. เริ่ม Supabase Local

```bash
# ตรวจสอบ Docker
docker --version

# เริ่ม Supabase
npx supabase start

# ตรวจสอบสถานะ
npx supabase status
```

### 2. Apply Migration

```bash
# Apply latest migration
npx supabase db push

# Generate types
npx supabase gen types typescript --local > src/types/database.ts
```

### 3. ตรวจสอบ RLS Policies

```sql
-- ตรวจสอบ policies
SELECT * FROM pg_policies WHERE tablename = 'ride_requests';

-- ตรวจสอบ permissions
SELECT * FROM information_schema.table_privileges
WHERE table_name = 'ride_requests';
```

### 4. ทดสอบ Realtime

```javascript
// ใน Browser Console
const channel = supabase
  .channel("test")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "ride_requests",
    },
    (payload) => {
      console.log("New ride:", payload);
    }
  )
  .subscribe();
```

## 📋 Checklist การแก้ไข

- [ ] ✅ Database ทำงาน (Supabase local)
- [ ] ✅ Migration applied
- [ ] ✅ RLS policies ถูกต้อง
- [ ] ✅ Realtime subscription ทำงาน
- [ ] ✅ Provider online และ available
- [ ] ✅ Customer สามารถสร้าง ride request
- [ ] ✅ Provider ได้รับ notification

## 🚀 Quick Fix Commands

```bash
# 1. Start everything
docker start $(docker ps -aq)
npx supabase start
npm run dev

# 2. Reset database (ถ้าจำเป็น)
npx supabase db reset

# 3. Check logs
npx supabase logs
```

## 📱 การทดสอบ End-to-End

1. **เปิด 2 Browser Windows**

   - Window 1: Customer (`/customer/ride`)
   - Window 2: Provider (`/provider`)

2. **Provider Window**

   - Login as provider
   - Toggle online
   - ดู console logs

3. **Customer Window**

   - Login as customer
   - Book a ride
   - ดู console logs

4. **ตรวจสอบ**
   - Provider ควรได้รับ notification
   - Database ควรมี record ใหม่

## 🆘 Emergency Fallback

ถ้าไม่สามารถแก้ไขได้:

1. ใช้ Fallback Mode (Toggle Mode button)
2. ระบบจะใช้ Mock Data
3. จะมีงาน Mock ขึ้นมาทุก 10 วินาที
4. สามารถทดสอบ UI ได้ปกติ

## 📞 Debug Contacts

- Console logs: `[Provider]` prefix
- Error messages: ดูใน Network tab
- Database: ใช้ Supabase Studio
- Realtime: ดูใน WebSocket tab
