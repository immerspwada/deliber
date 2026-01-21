# 🚀 Production Deployment - Admin Settings System

## สถานการ์ปัจจุบัน

❌ **Local Supabase มีปัญหา** - Migrations เก่าหลายร้อยไฟล์มี syntax errors
✅ **Solution: Deploy ไป Supabase Cloud โดยตรง**

---

## 🎯 Deploy to Production (Recommended)

### Step 1: Create Supabase Project

1. ไปที่ https://supabase.com
2. Sign in / Sign up
3. Click "New Project"
4. ตั้งค่า:
   - **Name:** thai-ride-app-production
   - **Database Password:** (เก็บไว้ปลอดภัย)
   - **Region:** Southeast Asia (Singapore)
5. รอ ~2 นาที ให้ project สร้างเสร็จ

### Step 2: Get Project Credentials

จาก Supabase Dashboard:

1. ไปที่ **Settings** → **API**
2. Copy ค่าเหล่านี้:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon/public key:** `eyJhbGc...`
   - **service_role key:** `eyJhbGc...` (เก็บเป็นความลับ)

### Step 3: Link Local Project

```bash
# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Project ref อยู่ใน URL: https://app.supabase.com/project/YOUR_PROJECT_REF
```

### Step 4: Apply Migration 310 Only

เนื่องจาก migrations เก่ามีปัญหา เราจะ apply เฉพาะ migration 310:

```bash
# Option 1: ผ่าน Supabase Dashboard (แนะนำ)
# 1. ไปที่ SQL Editor ใน Supabase Dashboard
# 2. Copy เนื้อหาจาก supabase/migrations/310_comprehensive_admin_settings_system.sql
# 3. Paste และ Run

# Option 2: ผ่าน CLI (ถ้า link สำเร็จ)
npx supabase db push --include-all
```

### Step 5: Update Environment Variables

สร้างไฟล์ `.env.production`:

```bash
# .env.production
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
```

### Step 6: Update Code to Use Production

แก้ไข `src/views/AdminSettingsView.vue`:

```typescript
// เปลี่ยนจาก
const USE_MOCK = true;

// เป็น
const USE_MOCK = false;
```

### Step 7: Test Locally with Production Database

```bash
# ใช้ production env
npm run dev -- --mode production

# หรือ
cp .env.production .env.local
npm run dev
```

### Step 8: Verify

1. เปิด http://localhost:5173/admin/settings
2. ตรวจสอบว่า:
   - ✅ Settings โหลดจาก database
   - ✅ แก้ไขค่าได้
   - ✅ บันทึกค่าได้
   - ✅ Audit log ทำงาน
   - ✅ ข้อมูลไม่หายหลัง reload

---

## 🔧 Alternative: Fix Local Supabase

ถ้าต้องการใช้ local development:

### Option A: Skip Problematic Migrations

```bash
# สร้าง fresh database โดยข้าม migrations เก่า
# 1. Backup migrations เก่า
mkdir supabase/migrations_backup
mv supabase/migrations/0*.sql supabase/migrations_backup/
mv supabase/migrations/1*.sql supabase/migrations_backup/
mv supabase/migrations/2*.sql supabase/migrations_backup/

# 2. เก็บเฉพาะ migration 310
# (migration 310 จะอยู่คนเดียว)

# 3. Start Supabase
npx supabase start

# 4. คืน migrations เก่า (ถ้าต้องการ)
mv supabase/migrations_backup/* supabase/migrations/
```

### Option B: Create Fresh Schema

```bash
# 1. Stop Supabase
npx supabase stop

# 2. ลบ volume เก่า
docker volume rm supabase_db_thai-ride-app

# 3. สร้าง baseline migration ใหม่
# (รวม schema ทั้งหมดที่ต้องการ)

# 4. Start ใหม่
npx supabase start
```

---

## 📊 Verification Checklist

หลัง deploy เสร็จ ตรวจสอบ:

### Database

```sql
-- ใน Supabase SQL Editor
SELECT COUNT(*) FROM system_settings;
-- Expected: 50

SELECT COUNT(*) FROM settings_audit_log;
-- Expected: 0 (ยังไม่มี changes)

SELECT * FROM system_settings WHERE category = 'general';
-- Expected: 6 settings
```

### Application

- [ ] เปิด /admin/settings ได้
- [ ] เห็น 50 settings
- [ ] แก้ไขค่าได้
- [ ] บันทึกได้
- [ ] Audit log ทำงาน
- [ ] Search ทำงาน
- [ ] Mobile responsive

### Security

- [ ] RLS policies active
- [ ] Admin-only access
- [ ] Audit logging works
- [ ] Input validation works

---

## 🚀 Deploy to Vercel/Netlify

หลังจากทดสอบเสร็จ:

### Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variables ใน Vercel Dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Build
npm run build

# 4. Deploy
netlify deploy --prod --dir=dist

# 5. Set environment variables ใน Netlify Dashboard
```

---

## 💡 Recommendations

### For Production

1. **ใช้ Supabase Cloud** - stable, managed, no local issues
2. **Apply migration 310 only** - ข้าม migrations เก่าที่มีปัญหา
3. **Test thoroughly** - ทดสอบทุก feature ก่อน deploy
4. **Monitor audit log** - ดู changes ที่เกิดขึ้น
5. **Backup regularly** - export settings เป็น JSON

### For Development

1. **ใช้ mock data** - สำหรับ UI development
2. **Connect to cloud** - สำหรับ integration testing
3. **Fix local later** - ไม่จำเป็นต้องรีบ fix local

---

## 🆘 Troubleshooting

### Can't Link Project

```bash
# ตรวจสอบ project ref
# ดูใน URL: https://app.supabase.com/project/YOUR_PROJECT_REF

# Login ใหม่
npx supabase login

# Link ใหม่
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Migration Fails

```bash
# Apply ผ่าน Dashboard แทน
# 1. Copy SQL จาก migration file
# 2. Paste ใน SQL Editor
# 3. Run
```

### Settings Not Loading

```typescript
// ตรวจสอบ environment variables
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);

// ตรวจสอบ USE_MOCK flag
console.log("USE_MOCK:", USE_MOCK);
```

### RLS Errors

```sql
-- ตรวจสอบ admin role
SELECT * FROM profiles WHERE role = 'admin';

-- ถ้าไม่มี สร้าง admin user
INSERT INTO profiles (id, role)
VALUES (auth.uid(), 'admin');
```

---

## 📝 Summary

**แนะนำ: Deploy ไป Supabase Cloud**

1. สร้าง Supabase project
2. Apply migration 310 ผ่าน Dashboard
3. Update environment variables
4. เปลี่ยน USE_MOCK = false
5. Test
6. Deploy to Vercel/Netlify

**Time required:** ~15 นาที
**Result:** Production-ready admin settings system

---

**Status:** ✅ Ready to Deploy
**Migration:** 310_comprehensive_admin_settings_system.sql
**Deployment:** Supabase Cloud + Vercel
**Time:** ~15 minutes
