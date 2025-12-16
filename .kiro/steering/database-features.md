# Database Features Mapping Rules

## กฎการจัดการฐานข้อมูลและฟีเจอร์

### หลักการสำคัญ
1. **ทุกฟีเจอร์ต้องมีรหัสกำกับ** - ใช้รูปแบบ `F##` (เช่น F01, F02)
2. **ทุกฟีเจอร์ต้องระบุตาราง DB ที่เกี่ยวข้อง**
3. **ทุกฟีเจอร์ต้องระบุ Composable ที่รับผิดชอบ**
4. **เมื่อเพิ่มฟีเจอร์ใหม่ต้องอัพเดทเอกสารนี้**

---

## 📋 Feature Registry

### Core Features (F01-F10)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F01** | User Authentication | `stores/auth.ts` | `users` | 001 |
| **F02** | Ride Booking | `useServices.ts`, `stores/ride.ts` | `ride_requests`, `service_providers` | 001, 006 |
| **F03** | Delivery Service | `useDelivery.ts` | `delivery_requests` | 001, 007 |
| **F04** | Shopping Service | `useShopping.ts` | `shopping_requests` | 001, 007 |
| **F05** | Wallet/Balance | `useWallet.ts` | `user_wallets`, `wallet_transactions` | 007 |
| **F06** | Referral System | `useReferral.ts` | `referral_codes`, `referrals` | 007 |
| **F07** | Notifications | `useNotifications.ts` | `user_notifications` | 007 |
| **F08** | Payment Methods | `usePaymentMethods.ts` | `payment_methods` | 002 |
| **F09** | Saved Places | `useServices.ts` | `saved_places`, `recent_places` | 002 |
| **F10** | Promo Codes | `useServices.ts` | `promo_codes`, `user_promo_usage` | 002 |

### History & Communication (F11-F14)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F11** | Ride History | `useRideHistory.ts` | `ride_requests`, `ride_ratings` | 001, 002 |
| **F12** | Chat/Messaging | `useChat.ts` | `chat_sessions`, `chat_messages` | 003 |
| **F13** | Safety/SOS | `useSafety.ts` | `emergency_contacts`, `trip_shares`, `safety_incidents` | 003, 004 |
| **F14** | Provider Dashboard | `useProvider.ts` | `service_providers`, `ride_requests` | 001, 006 |

### Advanced Features (F15-F22)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F15** | Scheduled Rides | `useAdvancedFeatures.ts` | `scheduled_rides` | 005 |
| **F16** | Multi-Stop Rides | `useAdvancedFeatures.ts` | `ride_stops` | 005 |
| **F17** | Fare Splitting | `useAdvancedFeatures.ts` | `fare_splits`, `fare_split_participants` | 005 |
| **F18** | Favorite Drivers | `useAdvancedFeatures.ts` | `favorite_drivers`, `blocked_drivers`, `driver_preferences` | 005 |
| **F19** | Voice Calls | `useAdvancedFeatures.ts` | `voice_calls` | 005 |
| **F20** | Ride Insurance | `useAdvancedFeatures.ts` | `insurance_plans`, `user_insurance`, `insurance_claims` | 005 |
| **F21** | Subscription Plans | `useAdvancedFeatures.ts` | `subscription_plans`, `user_subscriptions`, `subscription_usage` | 005 |
| **F22** | Corporate Accounts | `useCorporate.ts` | `companies`, `company_employees`, `corporate_policies`, `corporate_ride_requests` | 005 |

### Admin & System (F23-F26)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F23** | Admin Dashboard | `useAdmin.ts` | ทุกตาราง | ทุก migration |
| **F24** | Support Tickets | `useAdmin.ts` | `support_tickets`, `complaints`, `refunds` | 003 |
| **F25** | Tracking System | `useTracking.ts` | `tracking_sequences` | 003 |
| **F26** | Service Ratings | `useServiceRatings.ts`, `useAdmin.ts` | `delivery_ratings`, `shopping_ratings` | 008 |

---

## 📁 Database Tables Reference

### ตารางหลัก (Core Tables)
```
users                    → F01 (Auth)
service_providers        → F02, F14 (Ride, Provider)
ride_requests           → F02, F11, F14 (Ride, History, Provider)
delivery_requests       → F03 (Delivery)
shopping_requests       → F04 (Shopping)
payments                → F08 (Payments)
```

### ตารางเสริม (Supporting Tables)
```
user_wallets            → F05 (Wallet)
wallet_transactions     → F05 (Wallet)
referral_codes          → F06 (Referral)
referrals               → F06 (Referral)
user_notifications      → F07 (Notifications)
payment_methods         → F08 (Payment Methods)
saved_places            → F09 (Saved Places)
recent_places           → F09 (Saved Places)
promo_codes             → F10 (Promos)
user_promo_usage        → F10 (Promos)
favorite_promos         → F10 (Promo Favorites)
ride_ratings            → F11 (History)
```

### ตาราง Chat & Safety
```
chat_sessions           → F12 (Chat)
chat_messages           → F12 (Chat)
emergency_contacts      → F13 (Safety)
trip_shares             → F13 (Safety)
safety_incidents        → F13 (Safety)
```

### ตาราง Advanced Features
```
scheduled_rides         → F15 (Scheduled)
ride_stops              → F16 (Multi-Stop)
fare_splits             → F17 (Fare Split)
fare_split_participants → F17 (Fare Split)
favorite_drivers        → F18 (Favorites)
blocked_drivers         → F18 (Favorites)
driver_preferences      → F18 (Favorites)
voice_calls             → F19 (Voice)
insurance_plans         → F20 (Insurance)
user_insurance          → F20 (Insurance)
insurance_claims        → F20 (Insurance)
subscription_plans      → F21 (Subscription)
user_subscriptions      → F21 (Subscription)
subscription_usage      → F21 (Subscription)
```

### ตาราง Corporate
```
companies               → F22 (Corporate)
company_employees       → F22 (Corporate)
corporate_policies      → F22 (Corporate)
corporate_ride_requests → F22 (Corporate)
```

### ตาราง System
```
support_tickets         → F24 (Support)
complaints              → F24 (Support)
refunds                 → F24 (Support)
tracking_sequences      → F25 (Tracking)
```

### ตาราง Ratings (F26)
```
ride_ratings            → F11, F26 (History, Ratings)
delivery_ratings        → F26 (Service Ratings)
shopping_ratings        → F26 (Service Ratings)
```

---

## 🔧 Database Functions Reference

| Function | ฟีเจอร์ | รหัส |
|----------|---------|------|
| `validate_thai_national_id()` | User validation | F01 |
| `find_nearby_providers()` | Find drivers | F02 |
| `get_ride_with_driver()` | Ride details | F02 |
| `get_pending_rides_for_provider()` | Provider requests | F14 |
| `validate_promo_code()` | Promo validation | F10 |
| `use_promo_code()` | Apply promo | F10 |
| `ensure_user_wallet()` | Wallet init | F05 |
| `add_wallet_transaction()` | Wallet transaction | F05 |
| `get_wallet_balance()` | Wallet balance | F05 |
| `generate_referral_code()` | Create referral | F06 |
| `apply_referral_code()` | Use referral | F06 |
| `send_notification()` | Send notification | F07 |
| `calculate_delivery_fee()` | Delivery pricing | F03 |
| `calculate_shopping_fee()` | Shopping pricing | F04 |
| `calculate_multistop_fare()` | Multi-stop pricing | F16 |
| `check_user_subscription()` | Check subscription | F21 |
| `apply_subscription_discount()` | Apply discount | F21 |
| `get_favorite_drivers()` | Get favorites | F18 |
| `is_driver_blocked()` | Check blocked | F18 |
| `generate_tracking_id()` | Create tracking ID | F25 |
| `lookup_by_tracking_id()` | Find by tracking | F25 |
| `submit_delivery_rating()` | Submit delivery rating | F26 |
| `submit_shopping_rating()` | Submit shopping rating | F26 |
| `get_provider_ratings_summary()` | Provider ratings summary | F26 |
| `send_rating_reminder_notification()` | Auto-send rating reminder | F07, F26 |
| `send_ride_rating_reminder()` | Auto-send ride rating reminder | F07, F26 |
| `use_notification_template()` | Use and track template usage | F07 |
| `get_users_by_segment()` | Get users by segment for targeting | F07 |
| `process_scheduled_notification()` | Process and send scheduled notification | F07 |
| `get_segment_user_count()` | Get user count for segment preview | F07 |
| `check_promo_expiry_notifications()` | Check and notify expiring promos | F10 |
| `notify_new_promo()` | Trigger for new promo notifications | F10 |
| `check_favorite_promo_alerts()` | Check and send favorite promo alerts | F10 |
| `notify_promo_low_stock()` | Trigger for low stock promo alerts | F10 |

---

## 📝 Tracking ID Formats

| Prefix | Entity | ตัวอย่าง |
|--------|--------|----------|
| `CUS` | Customer | CUS-20251216-000001 |
| `DRV` | Driver | DRV-20251216-000001 |
| `RDR` | Rider (Delivery) | RDR-20251216-000001 |
| `RID` | Ride Request | RID-20251216-000001 |
| `DEL` | Delivery Request | DEL-20251216-000001 |
| `SHP` | Shopping Request | SHP-20251216-000001 |
| `PAY` | Payment | PAY-20251216-000001 |
| `TXN` | Transaction | TXN-20251216-000001 |
| `CHT` | Chat Session | CHT-20251216-000001 |
| `SUP` | Support Ticket | SUP-20251216-000001 |
| `CMP` | Complaint | CMP-20251216-000001 |
| `RFD` | Refund | RFD-20251216-000001 |

---

## ⚠️ กฎเมื่อเพิ่มฟีเจอร์ใหม่

### 1. สร้าง Migration ใหม่
```sql
-- ไฟล์: supabase/migrations/XXX_feature_name.sql
-- ระบุ Feature ID ใน comment
-- Feature: F## - Feature Name
```

### 2. สร้าง/อัพเดท Composable
```typescript
// ไฟล์: src/composables/useFeatureName.ts
// ระบุ Feature ID และตาราง DB ใน comment
/**
 * Feature: F## - Feature Name
 * Tables: table1, table2
 * Migration: XXX_feature_name.sql
 */
```

### 3. อัพเดท Admin Dashboard
- เพิ่มใน `useAdmin.ts` ถ้าต้องการจัดการจาก Admin
- เพิ่ม View ใน `src/views/Admin*.vue` ถ้าจำเป็น

### 4. อัพเดทเอกสารนี้
- เพิ่มรหัสฟีเจอร์ใหม่ในตาราง
- ระบุตาราง DB ที่เกี่ยวข้อง
- ระบุ Composable ที่รับผิดชอบ

---

## 🔄 Realtime Subscriptions

ตารางที่เปิด Realtime:
- `ride_requests` → F02, F14
- `service_providers` → F02, F14
- `chat_messages` → F12
- `user_notifications` → F07
- `wallet_transactions` → F05

---

## 📊 Migration Files

| ไฟล์ | รายละเอียด | ฟีเจอร์ที่เกี่ยวข้อง |
|------|------------|---------------------|
| `001_initial_schema.sql` | Core tables | F01, F02, F03, F04, F08 |
| `002_additional_features.sql` | Promos, Places, Ratings | F09, F10, F11 |
| `003_tracking_ids.sql` | Tracking, Chat, Support | F12, F24, F25 |
| `004_safety_features.sql` | Emergency, Trip Share | F13 |
| `005_advanced_features.sql` | Advanced features | F15-F22 |
| `006_fix_services_flow.sql` | Fix providers, RLS | F02, F14 |
| `007_complete_system.sql` | Wallet, Referral, Notifications | F05, F06, F07 |
| `008_service_ratings.sql` | Delivery/Shopping Ratings | F26 |
| `009_rating_notifications.sql` | Rating Reminder Triggers | F07, F26 |
| `010_notification_templates.sql` | Notification Templates | F07 |
| `011_scheduled_notifications.sql` | Scheduled Notifications & User Segmentation | F07 |
| `012_provider_documents_storage.sql` | Provider Documents Storage | F14 |
| `013_promo_favorites_and_category.sql` | Promo Favorites & Categories | F10 |
| `014_promo_alerts.sql` | Promo Alerts for Favorites | F10 |
