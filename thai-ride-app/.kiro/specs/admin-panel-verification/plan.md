# 🔍 Admin Panel Verification Plan

## เป้าหมาย

ตรวจสอบ Admin Panel ทั้งหมดที่ `/admin` ให้ทำงานได้จริง 100%

## Phase 1: Database Schema Verification (ตรวจสอบฐานข้อมูล)

### 1.1 ตรวจสอบ Tables ที่จำเป็น

```sql
-- Tables หลักที่ Admin ต้องใช้
- users (ลูกค้า + admin)
- providers_v2 (ผู้ให้บริการ)
- ride_requests (ออเดอร์)
- delivery_orders (ส่งของ)
- shopping_orders (ช้อปปิ้ง)
- wallet_transactions (การเงิน)
- provider_withdrawals (ถอนเงิน)
- topup_requests (เติมเงิน)
- promo_codes (โปรโมชั่น)
- push_subscriptions (Push Notifications)
- cron_job_logs (Cron Jobs)
- provider_location_history (Heatmap)
```

### 1.2 ตรวจสอบ RPC Functions

```sql
-- Admin RPC Functions ที่ต้องมี
✓ get_admin_dashboard_stats()
✓ get_admin_customers()
✓ get_admin_providers_v2()
✓ get_admin_orders()
✓ get_admin_delivery_orders()
✓ get_admin_shopping_orders()
✓ get_active_providers_locations()
✓ get_scheduled_rides()
✓ get_admin_revenue_stats()
✓ get_admin_payment_stats()
✓ get_provider_withdrawals_admin()
✓ get_topup_requests_admin()
✓ get_push_analytics()
✓ get_cron_job_stats()
✓ get_provider_heatmap_data()
```

### 1.3 ตรวจสอบ RLS Policies

```sql
-- Admin ต้องมีสิทธิ์เข้าถึงทุก table
- ตรวจสอบ policies สำหรับ role = 'admin' หรือ 'super_admin'
- ตรวจสอบว่า admin สามารถ SELECT, INSERT, UPDATE, DELETE ได้
```

## Phase 2: View-by-View Verification (ตรวจสอบทีละหน้า)

### 2.1 Dashboard (แดชบอร์ด)

**Route:** `/admin/dashboard`
**View:** `DashboardView.vue`

**ตรวจสอบ:**

- [ ] แสดงสถิติรวม (Total Orders, Active Providers, Revenue)
- [ ] แสดงกราฟ Revenue
- [ ] แสดง Recent Orders
- [ ] Real-time updates ทำงาน

**Database Dependencies:**

- `get_admin_dashboard_stats()`
- `ride_requests` table
- `providers_v2` table

**Action Items:**

1. ตรวจสอบว่า RPC function มีอยู่
2. ทดสอบ query ใน Supabase
3. ตรวจสอบ RLS policies
4. ทดสอบ UI loading

---

### 2.2 Customers (ลูกค้า)

**Route:** `/admin/customers`
**View:** `CustomersView.vue`

**ตรวจสอบ:**

- [ ] แสดงรายชื่อลูกค้าทั้งหมด
- [ ] Filter by status (active, suspended)
- [ ] Search by name/email
- [ ] View customer details
- [ ] Suspend/Unsuspend customer

**Database Dependencies:**

- `users` table
- `get_admin_customers()` RPC
- Customer suspension system (migration 296)

**Action Items:**

1. ตรวจสอบ `users` table schema
2. สร้าง/ตรวจสอบ `get_admin_customers()` RPC
3. ตรวจสอบ suspension columns
4. ทดสอบ filter และ search

---

### 2.3 Providers (ผู้ให้บริการ)

**Route:** `/admin/providers`
**View:** `ProvidersView.vue`

**ตรวจสอบ:**

- [ ] แสดงรายชื่อ providers ทั้งหมด
- [ ] Filter by status (pending, approved, rejected)
- [ ] View provider details
- [ ] Approve/Reject providers
- [ ] View documents

**Database Dependencies:**

- `providers_v2` table
- `get_admin_providers_v2()` RPC
- `provider_documents` storage bucket

**Action Items:**

1. ตรวจสอบ `providers_v2` table
2. สร้าง/ตรวจสอบ `get_admin_providers_v2()` RPC
3. ตรวจสอบ storage bucket RLS
4. ทดสอบ approve/reject workflow

---

### 2.4 Verification Queue (คิวตรวจสอบ)

**Route:** `/admin/verification-queue`
**View:** `VerificationQueueView.vue`

**ตรวจสอบ:**

- [ ] แสดง providers ที่รอตรวจสอบ
- [ ] View documents (ID card, license, vehicle)
- [ ] Approve/Reject with reason
- [ ] Send notification to provider

**Database Dependencies:**

- `providers_v2` table (status = 'pending')
- `provider_documents` storage
- `get_pending_providers()` RPC

**Action Items:**

1. สร้าง `get_pending_providers()` RPC
2. ตรวจสอบ document storage
3. ทดสอบ approve/reject flow
4. ทดสอบ notification system

---

### 2.5 All Orders (ออเดอร์ทั้งหมด)

**Route:** `/admin/orders`
**View:** `OrdersView.vue`

**ตรวจสอบ:**

- [ ] แสดงออเดอร์ทั้งหมด (ride, delivery, shopping)
- [ ] Filter by status, service type, date
- [ ] Search by order ID, customer name
- [ ] View order details
- [ ] Cancel order (with refund)

**Database Dependencies:**

- `ride_requests` table
- `get_admin_orders()` RPC (migration 295)
- Evidence photos

**Action Items:**

1. ตรวจสอบ `get_admin_orders()` RPC
2. ตรวจสอบว่ารวม evidence photos
3. ทดสอบ filter และ search
4. ทดสอบ cancel order flow

---

### 2.6 Delivery (ส่งของ)

**Route:** `/admin/delivery`
**View:** `DeliveryView.vue`

**ตรวจสอบ:**

- [ ] แสดง delivery orders
- [ ] Filter by status
- [ ] View delivery details
- [ ] Track delivery location

**Database Dependencies:**

- `delivery_orders` table
- `get_admin_delivery_orders()` RPC

**Action Items:**

1. สร้าง `get_admin_delivery_orders()` RPC
2. ตรวจสอบ delivery_orders schema
3. ทดสอบ real-time tracking

---

### 2.7 Shopping (ช้อปปิ้ง)

**Route:** `/admin/shopping`
**View:** `ShoppingView.vue`

**ตรวจสอบ:**

- [ ] แสดง shopping orders
- [ ] View shopping list
- [ ] View receipt photos
- [ ] Track shopper location

**Database Dependencies:**

- `shopping_orders` table
- `shopping_items` table
- `get_admin_shopping_orders()` RPC

**Action Items:**

1. ตรวจสอบ `get_admin_shopping_orders()` RPC
2. ตรวจสอบ shopping_items relation
3. ทดสอบ receipt photo display

---

### 2.8 Driver Tracking (ติดตามคนขับ)

**Route:** `/admin/driver-tracking`
**View:** `DriverTrackingView.vue`

**ตรวจสอบ:**

- [ ] แสดงแผนที่ real-time
- [ ] แสดง active providers บนแผนที่
- [ ] Filter by service type
- [ ] View provider details on click

**Database Dependencies:**

- `provider_location_history` table (migration 252)
- `get_active_providers_locations()` RPC (migration 251)
- Real-time subscription

**Action Items:**

1. ตรวจสอบ `get_active_providers_locations()` RPC
2. ทดสอบ real-time subscription
3. ทดสอบแผนที่ Leaflet
4. ตรวจสอบ performance

---

### 2.9 Scheduled Rides (นัดหมาย)

**Route:** `/admin/scheduled-rides`
**View:** `ScheduledRidesView.vue`

**ตรวจสอบ:**

- [ ] แสดง scheduled rides
- [ ] Filter by date range
- [ ] View ride details
- [ ] Cancel scheduled ride

**Database Dependencies:**

- `ride_requests` table (scheduled_at IS NOT NULL)
- `get_scheduled_rides()` RPC

**Action Items:**

1. สร้าง `get_scheduled_rides()` RPC
2. ตรวจสอบ scheduled_at column
3. ทดสอบ date filter

---

### 2.10 Revenue (รายได้)

**Route:** `/admin/revenue`
**View:** `RevenueView.vue`

**ตรวจสอบ:**

- [ ] แสดงรายได้รวม
- [ ] แสดงกราฟรายได้ตามวัน/เดือน
- [ ] Breakdown by service type
- [ ] Export to CSV

**Database Dependencies:**

- `wallet_transactions` table
- `get_admin_revenue_stats()` RPC

**Action Items:**

1. สร้าง `get_admin_revenue_stats()` RPC
2. ตรวจสอบ wallet_transactions
3. ทดสอบกราฟ
4. ทดสอบ export

---

### 2.11 Payments (การชำระเงิน)

**Route:** `/admin/payments`
**View:** `PaymentsView.vue`

**ตรวจสอบ:**

- [ ] แสดง payment transactions
- [ ] Filter by status, method
- [ ] View payment details
- [ ] Refund payment

**Database Dependencies:**

- `wallet_transactions` table
- `get_admin_payment_stats()` RPC

**Action Items:**

1. สร้าง `get_admin_payment_stats()` RPC
2. ทดสอบ refund flow
3. ตรวจสอบ payment methods

---

### 2.12 Withdrawals (ถอนเงิน)

**Route:** `/admin/withdrawals`
**View:** `WithdrawalsView.vue` / `AdminProviderWithdrawalsView.vue`

**ตรวจสอบ:**

- [ ] แสดง withdrawal requests
- [ ] Filter by status (pending, approved, rejected)
- [ ] Approve/Reject withdrawal
- [ ] View bank account details

**Database Dependencies:**

- `provider_withdrawals` table (migration 292)
- `get_provider_withdrawals_admin()` RPC
- `useAdminProviderWithdrawals` composable

**Action Items:**

1. ตรวจสอบ `get_provider_withdrawals_admin()` RPC
2. ทดสอบ approve/reject flow
3. ตรวจสอบ bank account display
4. ทดสอบ notification to provider

---

### 2.13 Top-up Requests (เติมเงิน)

**Route:** `/admin/topup-requests`
**View:** `AdminTopupRequestsView.vue`

**ตรวจสอบ:**

- [ ] แสดง topup requests
- [ ] Filter by status
- [ ] Approve/Reject topup
- [ ] View slip photo

**Database Dependencies:**

- `topup_requests` table
- `get_topup_requests_admin()` RPC
- `useAdminTopup` composable

**Action Items:**

1. สร้าง `get_topup_requests_admin()` RPC
2. ตรวจสอบ topup_requests table
3. ทดสอบ slip photo display
4. ทดสอบ approve flow

---

### 2.14 Promotions (โปรโมชั่น)

**Route:** `/admin/promos`
**View:** `PromoManagementView.vue`

**ตรวจสอบ:**

- [ ] แสดงรายการโปรโมชั่น
- [ ] Create new promo
- [ ] Edit promo
- [ ] Activate/Deactivate promo
- [ ] View usage stats

**Database Dependencies:**

- `promo_codes` table
- `promo_usage` table

**Action Items:**

1. ตรวจสอบ promo_codes schema
2. ทดสอบ create/edit flow
3. ทดสอบ usage tracking
4. ตรวจสอบ validation rules

---

### 2.15 Analytics (วิเคราะห์)

**Route:** `/admin/analytics`
**View:** `AdminAnalyticsView.vue`

**ตรวจสอบ:**

- [ ] แสดงกราฟสถิติต่างๆ
- [ ] User growth
- [ ] Order trends
- [ ] Revenue trends
- [ ] Provider performance

**Database Dependencies:**

- Multiple tables
- Analytics RPC functions

**Action Items:**

1. สร้าง analytics RPC functions
2. ทดสอบกราฟทั้งหมด
3. ตรวจสอบ performance

---

### 2.16 Push Notifications (Push Analytics)

**Route:** `/admin/push-analytics`
**View:** `PushAnalyticsView.vue`

**ตรวจสอบ:**

- [ ] แสดงสถิติ push notifications
- [ ] Delivery rate
- [ ] Click rate
- [ ] Failed notifications
- [ ] Send test notification

**Database Dependencies:**

- `push_subscriptions` table (migration 268, 289)
- `push_notification_logs` table
- `get_push_analytics()` RPC
- `usePushAnalytics` composable

**Action Items:**

1. ตรวจสอบ `get_push_analytics()` RPC
2. ทดสอบ analytics display
3. ทดสอบ send test notification
4. ตรวจสอบ cron jobs (migration 290)

---

### 2.17 Cron Jobs

**Route:** `/admin/cron-jobs`
**View:** `CronJobMonitoringView.vue`

**ตรวจสอบ:**

- [ ] แสดงรายการ cron jobs
- [ ] View execution history
- [ ] View success/failure rate
- [ ] Manual trigger
- [ ] View error logs

**Database Dependencies:**

- `cron_job_logs` table (migration 278)
- `get_cron_job_stats()` RPC
- `useCronJobMonitoring` composable

**Action Items:**

1. ตรวจสอบ `get_cron_job_stats()` RPC
2. ทดสอบ history display
3. ทดสอบ manual trigger
4. ตรวจสอบ error handling

---

### 2.18 Heatmap

**Route:** `/admin/provider-heatmap`
**View:** `ProviderHeatmapView.vue`

**ตรวจสอบ:**

- [ ] แสดง heatmap บนแผนที่
- [ ] Filter by time range
- [ ] Filter by service type
- [ ] Time-lapse animation
- [ ] Density areas

**Database Dependencies:**

- `provider_location_history` table (migration 252)
- `get_provider_heatmap_data()` RPC (migration 279)
- `useProviderHeatmap` composable

**Action Items:**

1. ตรวจสอบ `get_provider_heatmap_data()` RPC
2. ทดสอบ heatmap rendering
3. ทดสอบ time-lapse
4. ตรวจสอบ performance

---

### 2.19 Settings (ตั้งค่าทั่วไป)

**Route:** `/admin/settings`
**View:** `AdminSettingsView.vue`

**ตรวจสอบ:**

- [ ] แสดงการตั้งค่าระบบ
- [ ] Edit settings
- [ ] Save settings
- [ ] Reset to default

**Database Dependencies:**

- `system_settings` table

**Action Items:**

1. สร้าง `system_settings` table
2. ทดสอบ edit/save flow
3. ตรวจสอบ validation

---

### 2.20 System Health (สุขภาพระบบ)

**Route:** `/admin/system-health`
**View:** `SystemLogsView.vue`

**ตรวจสอบ:**

- [ ] แสดง system logs
- [ ] Filter by level (error, warning, info)
- [ ] Search logs
- [ ] View error details
- [ ] Clear old logs

**Database Dependencies:**

- Supabase logs API
- `system_logs` table (optional)

**Action Items:**

1. ตรวจสอบ Supabase logs API
2. ทดสอบ log display
3. ทดสอบ filter และ search

---

## Phase 3: Database Functions Creation (สร้าง RPC Functions)

### 3.1 Priority 1 - Critical Functions (ต้องมีก่อน)

```sql
1. get_admin_dashboard_stats() - Dashboard
2. get_admin_customers() - Customers list
3. get_admin_providers_v2() - Providers list
4. get_admin_orders() - Orders list (มีแล้ว - migration 295)
5. get_active_providers_locations() - Driver tracking (มีแล้ว - migration 251)
```

### 3.2 Priority 2 - Important Functions

```sql
6. get_admin_delivery_orders() - Delivery list
7. get_admin_shopping_orders() - Shopping list
8. get_scheduled_rides() - Scheduled rides
9. get_provider_withdrawals_admin() - Withdrawals
10. get_topup_requests_admin() - Topup requests
```

### 3.3 Priority 3 - Analytics Functions

```sql
11. get_admin_revenue_stats() - Revenue analytics
12. get_admin_payment_stats() - Payment analytics
13. get_push_analytics() - Push notification analytics (มีแล้ว)
14. get_cron_job_stats() - Cron job monitoring (มีแล้ว - migration 278)
15. get_provider_heatmap_data() - Heatmap (มีแล้ว - migration 279)
```

---

## Phase 4: Testing Workflow (ขั้นตอนการทดสอบ)

### 4.1 Database Testing

```bash
# 1. Check Supabase status
npx supabase status

# 2. Check migrations
npx supabase migration list --local

# 3. Apply pending migrations
npx supabase db push --local

# 4. Generate types
npx supabase gen types --local > src/types/database.ts

# 5. Test RPC functions
# Use Supabase Studio or SQL editor
```

### 4.2 Frontend Testing

```bash
# 1. Start dev server
npm run dev

# 2. Login as admin
# Navigate to http://localhost:5173/admin/login

# 3. Test each route
# Click through all menu items

# 4. Check console for errors
# Open browser DevTools

# 5. Check network requests
# Monitor API calls in Network tab
```

### 4.3 Integration Testing

```bash
# 1. Test with real data
# Create test customers, providers, orders

# 2. Test CRUD operations
# Create, Read, Update, Delete

# 3. Test real-time features
# Open multiple tabs, test updates

# 4. Test error handling
# Try invalid inputs, network errors
```

---

## Phase 5: Issue Tracking (ติดตามปัญหา)

### 5.1 Known Issues Template

```markdown
## Issue: [Title]

**Route:** /admin/xxx
**View:** XxxView.vue
**Severity:** High/Medium/Low

**Problem:**
[Description]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Database:**

- [ ] Table exists
- [ ] RPC function exists
- [ ] RLS policy correct
- [ ] Data available

**Frontend:**

- [ ] Component loads
- [ ] Data displays
- [ ] Actions work
- [ ] No console errors

**Fix:**
[Solution steps]
```

---

## Phase 6: Completion Checklist (เช็คลิสต์สุดท้าย)

### 6.1 Database ✓

- [ ] All tables exist
- [ ] All RPC functions created
- [ ] All RLS policies correct
- [ ] Test data available
- [ ] Migrations applied
- [ ] Types generated

### 6.2 Routes ✓

- [ ] All routes defined
- [ ] All views exist
- [ ] All components load
- [ ] No 404 errors
- [ ] Auth guards work

### 6.3 Functionality ✓

- [ ] Dashboard shows stats
- [ ] Lists display data
- [ ] Filters work
- [ ] Search works
- [ ] CRUD operations work
- [ ] Real-time updates work
- [ ] Notifications work

### 6.4 Performance ✓

- [ ] Page load < 2s
- [ ] API calls < 500ms
- [ ] No memory leaks
- [ ] No console errors
- [ ] No console warnings

### 6.5 Security ✓

- [ ] Admin auth required
- [ ] RLS policies enforced
- [ ] No data leaks
- [ ] Input validation
- [ ] XSS prevention

---

## Execution Order (ลำดับการทำงาน)

### Step 1: Database Verification (30 min)

1. Activate Supabase MCP
2. Check all tables
3. Check all RPC functions
4. Check all RLS policies
5. Create missing functions

### Step 2: Critical Views (1 hour)

1. Dashboard
2. Customers
3. Providers
4. Orders

### Step 3: Secondary Views (1 hour)

1. Delivery
2. Shopping
3. Driver Tracking
4. Scheduled Rides

### Step 4: Finance Views (45 min)

1. Revenue
2. Payments
3. Withdrawals
4. Topup Requests

### Step 5: Analytics Views (45 min)

1. Analytics
2. Push Analytics
3. Cron Jobs
4. Heatmap

### Step 6: Settings Views (30 min)

1. Promotions
2. Settings
3. System Health

### Step 7: Integration Testing (1 hour)

1. End-to-end testing
2. Real-time features
3. Error handling
4. Performance testing

---

## Total Estimated Time: 5-6 hours

## Success Criteria

✅ All 20 admin routes work
✅ All database queries return data
✅ All CRUD operations work
✅ No console errors
✅ Real-time features work
✅ Performance acceptable
✅ Security verified

---

## Next Steps

1. เริ่มจาก Phase 1: Database Verification
2. ใช้ MCP Supabase เพื่อตรวจสอบและสร้าง RPC functions
3. ทดสอบทีละ view ตาม Phase 2
4. แก้ไขปัญหาที่พบ
5. ทำ integration testing
6. สรุปผลและ document
