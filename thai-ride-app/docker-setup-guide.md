# 🐳 Docker Setup Guide สำหรับ Thai Ride App

## ปัญหาปัจจุบัน

```
failed to inspect service: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
Is the docker daemon running?
```

## 🚀 วิธีติดตั้ง Docker บน macOS

### วิธีที่ 1: ใช้ Homebrew (แนะนำ)

```bash
# ติดตั้ง Docker Desktop
brew install --cask docker

# เริ่ม Docker Desktop
open -a Docker
```

### วิธีที่ 2: ดาวน์โหลดจากเว็บไซต์

1. ไปที่ https://www.docker.com/products/docker-desktop/
2. ดาวน์โหลด Docker Desktop for Mac
3. ติดตั้งตามขั้นตอน
4. เปิดแอป Docker Desktop

## ✅ ตรวจสอบการติดตั้ง

### 1. ตรวจสอบ Docker

```bash
# ตรวจสอบเวอร์ชัน
docker --version
# ควรแสดง: Docker version 24.x.x

# ตรวจสอบสถานะ
docker info
# ควรแสดงข้อมูล Docker daemon

# ทดสอบรัน container
docker run hello-world
# ควรแสดง "Hello from Docker!"
```

### 2. ตรวจสอบ Docker Compose

```bash
docker compose version
# ควรแสดง: Docker Compose version v2.x.x
```

## 🗄️ เริ่ม Supabase Local

### 1. เริ่ม Supabase

```bash
# เริ่ม Supabase services
npx supabase start

# ตรวจสอบสถานะ
npx supabase status
```

### 2. ผลลัพธ์ที่คาดหวัง

```
supabase local development setup is running.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

## 🔧 Apply Migrations

### 1. Apply ล่าสุด

```bash
# Apply migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts
```

### 2. ตรวจสอบ Database

```bash
# เปิด Supabase Studio
open http://127.0.0.1:54323

# หรือตรวจสอบ tables
npx supabase db diff --local
```

## 🧪 ทดสอบระบบ

### 1. ทดสอบ Database Connection

เปิด `http://localhost:5173/debug-provider-jobs.html`

### 2. ทดสอบ Provider Job System

```bash
# รัน test script
node test-provider-job-visibility.js
```

### 3. ทดสอบ End-to-End

1. เปิด Customer page: `http://localhost:5173/customer/ride`
2. เปิด Provider page: `http://localhost:5173/provider`
3. สั่งงานจาก Customer
4. ตรวจสอบว่า Provider เห็นงาน

## 🚨 Troubleshooting

### ปัญหา: Docker Desktop ไม่เริ่ม

```bash
# ตรวจสอบ process
ps aux | grep -i docker

# Kill process ที่ค้าง
sudo pkill -f docker

# เริ่มใหม่
open -a Docker
```

### ปัญหา: Port ถูกใช้งาน

```bash
# ตรวจสอบ port ที่ใช้
lsof -i :54321
lsof -i :54322
lsof -i :54323

# Kill process ที่ใช้ port
sudo kill -9 <PID>
```

### ปัญหา: Supabase ไม่เริ่ม

```bash
# Reset Supabase
npx supabase stop
npx supabase start

# หรือ reset database
npx supabase db reset
```

### ปัญหา: Migration ล้มเหลว

```bash
# ตรวจสอบ migration status
npx supabase migration list --local

# Repair migration
npx supabase migration repair --status applied <migration_version>

# หรือ reset และ apply ใหม่
npx supabase db reset
npx supabase db push
```

## 📋 Checklist การติดตั้ง

- [ ] ✅ Docker Desktop ติดตั้งแล้ว
- [ ] ✅ Docker daemon ทำงาน
- [ ] ✅ `docker --version` แสดงเวอร์ชัน
- [ ] ✅ `npx supabase start` สำเร็จ
- [ ] ✅ `npx supabase status` แสดงข้อมูล
- [ ] ✅ Supabase Studio เปิดได้ (port 54323)
- [ ] ✅ Migration applied สำเร็จ
- [ ] ✅ TypeScript types generated
- [ ] ✅ Provider สามารถเห็นงานจาก Customer

## 🎯 Next Steps

เมื่อ Docker และ Supabase ทำงานแล้ว:

1. **ปิด Mock Mode** (ถ้าเปิดไว้)
2. **Refresh browser** ทั้ง Customer และ Provider
3. **ทดสอบระบบจริง** โดยสั่งงานจาก Customer
4. **ตรวจสอบ Console logs** เพื่อดู debug info
5. **Monitor Supabase logs** ด้วย `npx supabase logs`

## 💡 Tips

- ใช้ `npx supabase logs` เพื่อดู real-time logs
- ใช้ Supabase Studio เพื่อดูข้อมูลใน database
- ตั้ง Docker Desktop ให้เริ่มอัตโนมัติเมื่อเปิดเครื่อง
- Backup database ก่อนทำ migration ใหญ่
