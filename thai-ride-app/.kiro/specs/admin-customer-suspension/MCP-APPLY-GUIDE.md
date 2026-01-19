# 🔌 MCP Apply Migrations Guide

## ⚠️ Docker ไม่ได้เปิด

ตรวจพบว่า Docker daemon ไม่ได้ running

## ขั้นตอนแก้ไข:

### 1. เปิด Docker Desktop

```bash
# macOS
open -a Docker

# หรือเปิดจาก Applications
```

รอ 10-30 วินาที จนกว่า Docker จะพร้อม

### 2. ตรวจสอบ Docker

```bash
docker ps
# ควรแสดงรายการ containers (อาจว่างเปล่า)
```

### 3. Start Supabase Local

```bash
npx supabase start
```

### 4. ตรวจสอบ Supabase Status

```bash
npx supabase status
```

ควรแสดง:

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
...
```

## หลังจาก Docker เปิดแล้ว

ให้พิมพ์: **"ใช้ mcp"** อีกครั้ง

ระบบจะ:

1. ✅ ตรวจสอบ schema ปัจจุบัน
2. ✅ Apply migration 308 (เพิ่ม status columns)
3. ✅ Apply migration 309 (แก้ไข RPC function)
4. ✅ Generate types
5. ✅ Verify ว่าทำงานถูกต้อง

## ทำไมต้องใช้ MCP?

MCP (Model Context Protocol) ช่วย:

- 🔍 ตรวจสอบ schema แบบ real-time
- ⚡ Execute SQL โดยตรง
- 📊 ดู logs และ advisors
- ✅ Verify migrations ทันที
- 🚀 เร็วกว่าการรัน CLI แยก

## Alternative: Manual Apply

หากไม่ต้องการใช้ MCP:

```bash
# 1. Start Supabase
npx supabase start

# 2. Apply migrations
npx supabase db push --local

# 3. Generate types
npx supabase gen types --local > src/types/database.ts

# 4. Verify
npx supabase db diff --local
```

## Next Steps

หลัง apply migrations สำเร็จ:

1. Restart dev server: `npm run dev`
2. เปิด http://localhost:5173/admin/customers
3. ตรวจสอบปุ่มระงับ (🚫)
4. ทดสอบระงับ/ปลดระงับ
