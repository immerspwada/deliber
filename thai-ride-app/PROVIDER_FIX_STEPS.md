# 🔧 Provider Dashboard Fix - Step by Step

## ปัญหา

ไม่สามารถรับงานได้เพราะ database ไม่มี column `accepted_at` ใน table `ride_requests`

## วิธีแก้ (เลือก 1 ใน 2)

### ✅ วิธีที่ 1: Apply Migration (แนะนำ)

1. **เปิด Docker Desktop**

   ```bash
   # เปิด Docker Desktop application
   ```

2. **Start Supabase**

   ```bash
   npx supabase start
   ```

3. **Apply Migration**

   ```bash
   npx supabase db push --local
   ```

4. **Generate Types**

   ```bash
   npx supabase gen types typescript --local > src/types/database.ts
   ```

5. **Restart Dev Server**

   ```bash
   # กด Ctrl+C ใน terminal ที่รัน npm run dev
   npm run dev
   ```

6. **ทดสอบ**
   - เปิด http://localhost:5173/provider
   - กดปุ่ม "รับงาน" ควรทำงานได้แล้ว

---

### 🔄 วิธีที่ 2: ใช้ Hosted Supabase (ถ้า Docker ไม่ได้)

1. **Apply Migration to Hosted**

   ```bash
   npx supabase db push
   ```

2. **Generate Types**

   ```bash
   npx supabase gen types typescript > src/types/database.ts
   ```

3. **Update .env**

   ```bash
   # ตรวจสอบว่า .env ใช้ hosted Supabase URL
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Restart Dev Server**
   ```bash
   npm run dev
   ```

---

## 📊 Migration ที่สร้างไว้แล้ว

ไฟล์: `supabase/migrations/263_add_accepted_at_to_ride_requests.sql`

เพิ่ม columns:

- ✅ `accepted_at` - เวลาที่ provider รับงาน
- ✅ `arrived_at` - เวลาที่ provider ถึงจุดรับ
- ✅ `started_at` - เวลาที่เริ่มเดินทาง
- ✅ `completed_at` - เวลาที่เสร็จสิ้น

พร้อม indexes สำหรับ performance

---

## 🧪 ทดสอบว่าแก้แล้ว

```bash
# ตรวจสอบว่า column มีแล้ว
npx supabase db diff --local

# หรือ query ตรง
psql -h localhost -p 54322 -U postgres -d postgres -c "\d ride_requests"
```

---

## ❓ ถ้ายังไม่ได้

1. ตรวจสอบ Docker status:

   ```bash
   docker ps
   ```

2. ตรวจสอบ Supabase status:

   ```bash
   npx supabase status
   ```

3. ดู logs:

   ```bash
   npx supabase logs db
   ```

4. Reset database (ระวัง: จะลบข้อมูลทั้งหมด):
   ```bash
   npx supabase db reset --local
   ```
