# 🚀 Complete Setup Guide - Thai Ride App

## 📋 Overview

คู่มือการติดตั้งและแก้ไขปัญหาไรเดอร์ไม่เห็นงานแบบครบถ้วน รวมถึง Docker, Supabase, RLS Testing และ Error Handling

## 🎯 Quick Start (แนะนำ)

### วิธีที่ 1: Auto Setup Script

```bash
# รันคำสั่งเดียวจบ
npm run setup
```

### วิธีที่ 2: Manual Setup

```bash
# 1. ติดตั้ง Docker
npm run docker:install

# 2. เริ่ม Supabase
npm run supabase:start

# 3. Generate types
npm run supabase:types

# 4. เริ่ม dev server
npm run dev:full
```

## 🔧 Detailed Setup Steps

### Step 1: ติดตั้ง Docker Desktop

#### macOS (Homebrew)

```bash
brew install --cask docker-desktop
open -a Docker
```

#### macOS (Manual)

1. ดาวน์โหลดจาก https://www.docker.com/products/docker-desktop/
2. ติดตั้งและเปิด Docker Desktop
3. รอให้ Docker daemon เริ่มทำงาน

#### Linux (Ubuntu/Debian)

```bash
# ใช้ script ที่เตรียมไว้
bash scripts/install-docker.sh
```

### Step 2: ตรวจสอบ Docker

```bash
# ตรวจสอบเวอร์ชัน
docker --version
docker compose version

# ทดสอบ Docker
docker run hello-world
```

### Step 3: เริ่ม Supabase Local

```bash
# เริ่ม Supabase services
npx supabase start

# ตรวจสอบสถานะ
npx supabase status
```

### Step 4: Apply Migrations

```bash
# Apply ล่าสุด
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts
```

### Step 5: เริ่ม Development Server

```bash
npm run dev
```

## 🧪 Testing & Debugging

### RLS Policy Testing

```bash
# ทดสอบ RLS policies
npm run test:rls

# หรือใช้ debug page
npm run debug:jobs
```

### Manual Testing

1. เปิด `http://localhost:5173/provider`
2. กด F12 เปิด Console
3. ดู Debug Panel (ถ้าเป็น development mode)
4. กดปุ่ม "🧪 Run RLS Tests"

### Connection Health Check

- ดู Connection Status ที่มุมขวาบนของ Provider Dashboard
- สีเขียว = เชื่อมต่อปกติ
- สีแดง = ไม่สามารถเชื่อมต่อได้
- สีม่วง = โหมดสำรอง (Mock Mode)

## 🎭 Fallback Mode (Mock Mode)

### เมื่อไหร่ที่จะเข้า Mock Mode

- Docker ไม่ทำงาน
- Supabase local ไม่เริ่ม
- Database connection ล้มเหลว
- RLS policies บล็อกการเข้าถึง

### วิธีเปิด Mock Mode ด้วยตนเอง

```javascript
// ใน Browser Console
const script = document.createElement("script");
script.src = "/fix-rider-job-visibility-immediate.js";
document.head.appendChild(script);
```

### คุณสมบัติ Mock Mode

- แสดงงาน Mock 3 งานทันที
- สร้างงานใหม่ทุก 15 วินาที (30% chance)
- สามารถรับงานและทดสอบ UI ได้ปกติ
- แสดง Debug Panel ด้านล่างซ้าย

## 🔍 Troubleshooting

### ปัญหา: Docker ไม่ทำงาน

```bash
# ตรวจสอบ Docker daemon
docker info

# เริ่ม Docker Desktop (macOS)
open -a Docker

# เริ่ม Docker service (Linux)
sudo systemctl start docker
```

### ปัญหา: Supabase ไม่เริ่ม

```bash
# ตรวจสอบ port ที่ใช้
lsof -i :54321

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
npx supabase migration repair --status applied <version>

# หรือ reset และ apply ใหม่
npx supabase db reset
npx supabase db push
```

### ปัญหา: Provider ไม่เห็นงาน

1. **ตรวจสอบ Connection Status** - ดูที่มุมขวาบน
2. **รัน RLS Tests** - กดปุ่ม "🧪 Run RLS Tests"
3. **ดู Console Logs** - กด F12 และดู Console
4. **ใช้ Mock Mode** - ถ้าต้องการทดสอบ UI ทันที

### ปัญหา: TypeScript Errors

```bash
# Generate types ใหม่
npm run supabase:types

# Type check
npm run build:check
```

## 📊 Monitoring & Logs

### Supabase Logs

```bash
# ดู logs แบบ real-time
npx supabase logs

# ดู logs เฉพาะ service
npx supabase logs --service postgres
npx supabase logs --service api
```

### Browser Console Logs

- `[Health]` - Connection health checks
- `[JobPool]` - Job pool operations
- `[Provider]` - Provider actions
- `[RLS Test]` - RLS policy tests

### Performance Monitoring

- Connection latency แสดงใน Health Status
- Job loading time ใน Console
- Database query performance ใน Supabase logs

## 🚀 Production Deployment

### Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=production
```

### Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel --prod
```

### Production Checklist

- [ ] Environment variables ตั้งค่าถูกต้อง
- [ ] Supabase project ใน production
- [ ] RLS policies ทำงานใน production
- [ ] Error tracking (Sentry) เปิดใช้งาน
- [ ] Performance monitoring เปิดใช้งาน

## 📚 Useful Commands

### Development

```bash
npm run dev              # Start dev server
npm run dev:full         # Start Supabase + dev server
npm run build:check      # Type check + build
npm run test             # Run tests
npm run lint             # Lint code
```

### Supabase

```bash
npm run supabase:start   # Start Supabase
npm run supabase:stop    # Stop Supabase
npm run supabase:status  # Check status
npm run supabase:reset   # Reset database
npm run supabase:push    # Apply migrations
npm run supabase:types   # Generate types
```

### Docker

```bash
npm run docker:install   # Install Docker
npm run docker:check     # Check Docker version
docker ps               # List containers
docker logs <container> # View container logs
```

### Testing & Debug

```bash
npm run test:rls        # Test RLS policies
npm run debug:jobs      # Open debug page
```

## 🎉 Success Indicators

### ✅ Everything Working

- Connection Status: 🟢 เชื่อมต่อแล้ว
- Provider Dashboard แสดงงานจริง
- RLS Tests: ผ่านทุกข้อ
- Console ไม่มี error

### ⚠️ Fallback Mode

- Connection Status: 🟣 โหมดสำรอง
- Provider Dashboard แสดงงาน Mock
- Debug Panel แสดง "Mock Mode Active"
- งานใหม่เพิ่มทุก 15 วินาที

### ❌ System Down

- Connection Status: 🔴 ไม่สามารถเชื่อมต่อได้
- Error messages ใน Console
- ไม่มีงานแสดง
- RLS Tests ล้มเหลว

## 🆘 Emergency Procedures

### Quick Fix (5 minutes)

1. เปิด Mock Mode ทันที
2. ทดสอบ UI และ workflow
3. แก้ไข Docker/Supabase ทีหลัง

### Full Recovery (15 minutes)

1. ตรวจสอบ Docker status
2. Restart Supabase services
3. Apply migrations
4. Generate types
5. Restart dev server

### Nuclear Option (30 minutes)

1. Stop ทุกอย่าง
2. Reset Supabase database
3. Apply migrations ใหม่
4. Generate types ใหม่
5. Test ทุกอย่างใหม่

## 📞 Support

### Debug Information

- Connection diagnostics ใน Health Status
- RLS test results
- Browser console logs
- Supabase logs

### Common Issues

- Docker not running → Install/start Docker
- Port conflicts → Change ports or kill processes
- Permission errors → Check RLS policies
- Type errors → Regenerate types

---

**🎯 Goal**: ให้ระบบทำงานได้ 100% โดยมี Fallback Mode รองรับเมื่อเกิดปัญหา
