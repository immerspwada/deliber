# Provider Route Guard System

## Overview
ระบบป้องกันการเข้าถึง routes โดยไม่มีสิทธิ์ สำหรับทั้ง Provider และ Customer

---

## Route Protection Rules

### 1. Provider Routes (`/provider/*`)

**กฎการเข้าถึง:**
- ✅ **Approved Provider**: เข้าได้ทุก provider routes
- ❌ **Pending Provider**: redirect → `/provider/onboarding`
- ❌ **Rejected Provider**: redirect → `/provider/onboarding`
- ❌ **Suspended Provider**: redirect → `/provider/onboarding`
- ❌ **Not Verified**: redirect → `/provider/onboarding`
- ❌ **No Provider Account**: redirect → `/customer/become-provider`
- ❌ **Not Logged In**: redirect → `/login`

**ยกเว้น routes เหล่านี้ (ไม่ต้องตรวจสอบ):**
- `/provider/onboarding`
- `/provider/register`
- `/provider/documents`

### 2. Customer Routes (`/customer/*`)

**กฎการเข้าถึง:**
- ✅ **Regular Customer**: เข้าได้ทุก customer routes
- ✅ **Approved Provider**: เข้าได้ทุก customer routes (dual role)
- ❌ **Pending Provider**: redirect → `/provider/onboarding`
- ❌ **Rejected Provider**: redirect → `/provider/onboarding`
- ❌ **Suspended Provider**: redirect → `/provider/onboarding`
- ❌ **Not Verified Provider**: redirect → `/provider/onboarding`
- ❌ **Not Logged In**: redirect → `/login`

**เหตุผล:**
Provider ที่ยังไม่ได้รับอนุมัติควรดำเนินการให้เสร็จก่อน ไม่ควรใช้งานฝั่ง customer

---

## Database Functions

### 1. `can_access_provider_routes(p_user_id UUID)`

ตรวจสอบว่า user สามารถเข้าถึง provider routes ได้หรือไม่

**Returns:**
```sql
{
  can_access: BOOLEAN,
  provider_id: UUID,
  is_verified: BOOLEAN,
  status: TEXT,
  message: TEXT
}
```

**Logic:**
1. ไม่มี provider account → `can_access = FALSE`
2. ไม่ verified → `can_access = FALSE`
3. Status ≠ 'approved' → `can_access = FALSE`
4. ผ่านทุกเงื่อนไข → `can_access = TRUE`

### 2. `should_redirect_to_provider_onboarding(p_user_id UUID)`

ตรวจสอบว่า user ควรถูก redirect จาก customer routes ไป provider onboarding หรือไม่

**Returns:**
```sql
{
  should_redirect: BOOLEAN,
  provider_id: UUID,
  is_verified: BOOLEAN,
  status: TEXT,
  reason: TEXT
}
```

**Logic:**
1. ไม่มี provider account → `should_redirect = FALSE` (ใช้ customer ได้)
2. มี provider แต่ไม่ verified → `should_redirect = TRUE`
3. มี provider แต่ status ≠ 'approved' → `should_redirect = TRUE`
4. Provider approved → `should_redirect = FALSE` (ใช้ได้ทั้ง 2 ฝั่ง)

---

## Frontend Implementation

### Router Guard (`router/index.ts`)

```typescript
// Provider Routes
if (to.meta.isProviderRoute) {
  // 1. Check authentication
  // 2. Allow onboarding/register/documents without check
  // 3. Call can_access_provider_routes()
  // 4. Redirect based on result
}

// Customer Routes
if (to.meta.isCustomerRoute) {
  // 1. Check authentication
  // 2. Check if user has provider account
  // 3. If provider not approved → redirect to /provider/onboarding
  // 4. If approved or no provider → allow access
}
```

### Composable (`useProviderAccess.ts`)

**Methods:**
- `checkAccess()` - ตรวจสอบสิทธิ์เข้า provider routes
- `checkRedirectFromCustomer()` - ตรวจสอบว่าควร redirect จาก customer หรือไม่
- `navigateToProvider()` - นำทางไป provider พร้อมตรวจสอบ
- `getStatusMessage` - แสดง message ตามสถานะ

---

## Testing Scenarios

### Scenario 1: ลูกค้าธรรมดา (No Provider Account)
```
1. Login as customer
2. Access /customer → ✅ Allow
3. Access /provider → ❌ Redirect to /customer/become-provider
```

### Scenario 2: Provider ที่ยังไม่ Verified
```
1. Login as provider (not verified)
2. Access /customer → ❌ Redirect to /provider/onboarding
3. Access /provider → ❌ Redirect to /provider/onboarding
4. Access /provider/onboarding → ✅ Allow
5. Access /provider/documents → ✅ Allow
```

### Scenario 3: Provider รอการอนุมัติ (Pending)
```
1. Login as provider (verified, pending)
2. Access /customer → ❌ Redirect to /provider/onboarding
3. Access /provider → ❌ Redirect to /provider/onboarding
4. Access /provider/onboarding → ✅ Allow (แสดงสถานะรอ)
```

### Scenario 4: Provider ถูกปฏิเสธ (Rejected)
```
1. Login as provider (rejected)
2. Access /customer → ❌ Redirect to /provider/onboarding
3. Access /provider → ❌ Redirect to /provider/onboarding
4. Access /provider/onboarding → ✅ Allow (แสดงเหตุผล + ติดต่อแอดมิน)
```

### Scenario 5: Provider ถูกระงับ (Suspended)
```
1. Login as provider (suspended)
2. Access /customer → ❌ Redirect to /provider/onboarding
3. Access /provider → ❌ Redirect to /provider/onboarding
4. Access /provider/onboarding → ✅ Allow (แสดงเหตุผล + ติดต่อแอดมิน)
```

### Scenario 6: Provider ที่ได้รับอนุมัติ (Approved)
```
1. Login as provider (approved)
2. Access /customer → ✅ Allow (dual role)
3. Access /provider → ✅ Allow
4. Can switch between customer and provider freely
```

---

## UI Components

### ProviderOnboardingAlert.vue

แสดง modal เมื่อถูก redirect พร้อม:
- Icon ตามสถานะ (pending/rejected/suspended)
- Title และ message ที่เหมาะสม
- Action button (อัพโหลดเอกสาร/ดูสถานะ/ติดต่อแอดมิน)
- Secondary action (กลับหน้าหลัก)

---

## Admin Dashboard Integration

Admin ควรมี view สำหรับ:
1. **Provider Verification Queue** - รายการรอการอนุมัติ
2. **Provider Management** - จัดการสถานะ provider
3. **Document Review** - ตรวจสอบเอกสาร
4. **Approval/Rejection** - อนุมัติ/ปฏิเสธพร้อมเหตุผล

---

## Security Considerations

1. **Frontend Guard** - ป้องกันการเข้าถึงโดยไม่ตั้งใจ
2. **Database RLS** - ป้องกันการเข้าถึงข้อมูลโดยตรง
3. **Function Security** - ใช้ SECURITY DEFINER
4. **Error Handling** - Fail open สำหรับ customer routes, fail closed สำหรับ provider routes

---

## Migration File

**File:** `094_provider_route_guard.sql`

**Contains:**
- `can_access_provider_routes()` function
- `should_redirect_to_provider_onboarding()` function
- Permissions and comments

---

## Future Enhancements

1. **Cache Access Status** - cache ผลการตรวจสอบ 30 วินาที
2. **Loading States** - แสดง loading ขณะตรวจสอบ
3. **Toast Notifications** - แจ้งเตือนเมื่อถูก redirect
4. **Analytics** - track การ redirect และสถานะ provider
5. **Admin Notifications** - แจ้งแอดมินเมื่อมี provider ใหม่รอการอนุมัติ
