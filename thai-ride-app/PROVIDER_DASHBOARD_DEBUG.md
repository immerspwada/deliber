# Provider Dashboard - Debug Guide

## ปัญหา: /provider ทำงานไม่ได้

### ขั้นตอนการแก้ไข

#### 1. ตรวจสอบ Console Errors
```
1. เปิด Browser
2. กด F12 (Developer Tools)
3. ไปที่ Tab "Console"
4. Refresh หน้า /provider
5. ดู error messages
```

**Error ที่พบบ่อย:**
- `Cannot read property 'value' of undefined` → Reactive ref ไม่ได้ initialize
- `Failed to fetch` → API endpoint ไม่ทำงาน
- `Unauthorized` → ไม่ได้ login หรือไม่ใช่ provider role

---

#### 2. ตรวจสอบ Authentication

```typescript
// เปิด Console แล้วพิมพ์:
localStorage.getItem('demo_mode')
localStorage.getItem('demo_user')
```

**ถ้าเป็น Demo Mode:**
```json
{
  "id": "demo-user-id",
  "role": "driver",  // หรือ "delivery"
  "email": "demo@provider.com"
}
```

**ถ้าไม่ใช่ Demo Mode:**
- ต้อง login ด้วย provider account
- ตรวจสอบว่า `service_providers` table มีข้อมูล

---

#### 3. ตรวจสอบ Database

```sql
-- ตรวจสอบว่ามี provider หรือไม่
SELECT * FROM service_providers LIMIT 5;

-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies WHERE tablename = 'service_providers';

-- ตรวจสอบ pending rides
SELECT * FROM ride_requests WHERE status = 'pending' LIMIT 5;
```

---

#### 4. ตรวจสอบ Network Requests

```
1. เปิด Developer Tools
2. ไปที่ Tab "Network"
3. Refresh หน้า /provider
4. ดู requests ที่ล้มเหลว (สีแดง)
```

**API Endpoints ที่ต้องทำงาน:**
- `GET /rest/v1/service_providers` → Fetch provider profile
- `GET /rest/v1/ride_requests` → Fetch pending rides
- `POST /rest/v1/rpc/get_provider_earnings_summary` → Fetch earnings

---

#### 5. Quick Fix: ใช้ Demo Mode

```typescript
// เปิด Console แล้วพิมพ์:
localStorage.setItem('demo_mode', 'true')
localStorage.setItem('demo_user', JSON.stringify({
  id: 'demo-provider-123',
  role: 'driver',
  email: 'demo@provider.com',
  first_name: 'Demo',
  last_name: 'Driver'
}))

// Refresh หน้า
location.reload()
```

---

#### 6. ตรวจสอบ Component Imports

```bash
# ตรวจสอบว่า components ทั้งหมด import ได้
cd thai-ride-app
npm run build
```

**ถ้ามี error:**
- `Cannot find module` → ไฟล์หายหรือ path ผิด
- `Unexpected token` → Syntax error ใน component

---

#### 7. Rollback to V2 (ถ้า V4 ไม่ทำงาน)

```typescript
// File: src/router/index.ts
{
  path: '/provider',
  name: 'ProviderDashboard',
  component: () => import('../views/provider/ProviderDashboardViewV2.vue'), // ใช้ V2
  meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
}
```

---

## Common Errors & Solutions

### Error 1: "Cannot read property 'value' of undefined"
**สาเหตุ:** Reactive ref ไม่ได้ initialize ก่อนใช้งาน

**แก้ไข:**
```typescript
// ❌ ผิด
const profile = ref()

// ✅ ถูก
const profile = ref(null)
```

---

### Error 2: "Failed to fetch"
**สาเหตุ:** Supabase URL หรือ API Key ผิด

**แก้ไข:**
```bash
# ตรวจสอบ .env
cat .env

# ต้องมี:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### Error 3: "Unauthorized"
**สาเหตุ:** ไม่ได้ login หรือ RLS policies block

**แก้ไข:**
```sql
-- ปิด RLS ชั่วคราว (สำหรับ debug)
ALTER TABLE service_providers DISABLE ROW LEVEL SECURITY;

-- หรือเพิ่ม policy ใหม่
CREATE POLICY "Allow provider to read own data"
ON service_providers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

---

### Error 4: "Component not found"
**สาเหตุ:** ไฟล์ component หายหรือ path ผิด

**แก้ไข:**
```bash
# ตรวจสอบว่าไฟล์มีอยู่
ls -la src/views/provider/ProviderDashboardViewV2.vue
ls -la src/components/provider/EarningsChart.vue
ls -la src/components/provider/ProviderSkeleton.vue
```

---

### Error 5: "WebSocket connection failed"
**สาเหตุ:** Realtime subscription ไม่ทำงาน

**แก้ไข:**
```typescript
// ปิด Realtime ชั่วคราว
const subscribeToAllRequests = () => {
  console.log('Realtime disabled for debugging')
  // Comment out subscription code
}
```

---

## Testing Checklist

- [ ] Browser console ไม่มี errors
- [ ] Network tab แสดง 200 OK สำหรับ API calls
- [ ] Provider profile โหลดได้
- [ ] Earnings chart แสดงผล
- [ ] Toggle online/offline ทำงาน
- [ ] Pending jobs แสดงผล (ถ้ามี)

---

## Emergency Rollback

ถ้าทุกอย่างไม่ทำงาน ให้ rollback:

```bash
cd thai-ride-app
git checkout src/router/index.ts
git checkout src/views/provider/
```

---

## Contact Support

ถ้ายังแก้ไม่ได้ ให้ส่ง:
1. Screenshot ของ Console errors
2. Screenshot ของ Network tab
3. ข้อมูล browser (Chrome/Firefox/Safari)
4. ข้อมูล OS (Mac/Windows/Linux)
