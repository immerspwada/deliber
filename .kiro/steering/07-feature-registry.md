# Feature Registry - Thai Ride App

## 🏷️ Feature ID System

### ID Format

```
F[Category][Number] - Feature Name

Categories:
├── F01-F10   → Core Features
├── F11-F26   → Extended Features
├── F27-F50   → Provider Features
├── F51-F100  → UI Components
├── F156-F170 → New Services
├── F172-F201 → Performance
└── F202-F251 → Advanced System
```

---

## 📋 Core Features (F01-F10)

| ID  | Feature                  | Composable                                       | Tables                                                  | Migration     |
| :-- | :----------------------- | :----------------------------------------------- | :------------------------------------------------------ | :------------ |
| F01 | User Auth & Registration | `stores/auth.ts`                                 | `users`                                                 | 001, 026, 027 |
| F02 | Ride Booking             | `useServices.ts`, `stores/ride.ts`               | `ride_requests`, `service_providers`                    | 001, 006      |
| F03 | Delivery Service         | `useDelivery.ts`                                 | `delivery_requests`                                     | 001, 007      |
| F04 | Shopping Service         | `useShopping.ts`                                 | `shopping_requests`                                     | 001, 007      |
| F05 | Wallet/Balance           | `useWallet.ts`                                   | `user_wallets`, `wallet_transactions`, `topup_requests` | 007, 079      |
| F06 | Referral System          | `useReferral.ts`                                 | `referral_codes`, `referrals`                           | 007           |
| F07 | Notifications & Push     | `useNotifications.ts`, `usePushNotifications.ts` | `user_notifications`, `push_subscriptions`              | 007, 015, 128 |
| F08 | Payment Methods          | `usePaymentMethods.ts`                           | `payment_methods`                                       | 002           |
| F09 | Saved Places             | `useServices.ts`                                 | `saved_places`, `recent_places`                         | 002           |
| F10 | Promo Codes              | `useServices.ts`                                 | `promo_codes`, `user_promo_usage`                       | 002           |

---

## 📋 Extended Features (F11-F26)

| ID  | Feature            | Composable               | Tables                                     | Migration     |
| :-- | :----------------- | :----------------------- | :----------------------------------------- | :------------ |
| F11 | Ride History       | `useRideHistory.ts`      | `ride_requests`, `ride_ratings`            | 001, 002      |
| F12 | Chat/Messaging     | `useChat.ts`             | `chat_sessions`, `chat_messages`           | 003           |
| F13 | Safety/SOS         | `useSafety.ts`           | `emergency_contacts`, `trip_shares`        | 003, 004      |
| F14 | Provider Dashboard | `useProvider.ts`         | `service_providers`, `ride_requests`       | 001, 006, 019 |
| F15 | Scheduled Rides    | `useAdvancedFeatures.ts` | `scheduled_rides`                          | 005           |
| F16 | Multi-Stop Rides   | `useAdvancedFeatures.ts` | `ride_stops`                               | 005           |
| F17 | Fare Splitting     | `useAdvancedFeatures.ts` | `fare_splits`                              | 005           |
| F18 | Favorite Drivers   | `useAdvancedFeatures.ts` | `favorite_drivers`, `blocked_drivers`      | 005           |
| F19 | Voice Calls        | `useAdvancedFeatures.ts` | `voice_calls`                              | 005           |
| F20 | Ride Insurance     | `useAdvancedFeatures.ts` | `insurance_plans`, `user_insurance`        | 005           |
| F21 | Subscription Plans | `useAdvancedFeatures.ts` | `subscription_plans`, `user_subscriptions` | 005           |
| F22 | Corporate Accounts | `useCorporate.ts`        | `companies`, `company_employees`           | 005           |
| F23 | Admin Dashboard    | `useAdmin.ts`            | All tables                                 | All           |
| F24 | Support Tickets    | `useAdmin.ts`            | `support_tickets`, `complaints`, `refunds` | 003           |
| F25 | Tracking System    | `useTracking.ts`         | `tracking_sequences`                       | 003           |
| F26 | Service Ratings    | `useServiceRatings.ts`   | `delivery_ratings`, `shopping_ratings`     | 008           |

---

## 📋 Provider Features (F27-F50)

| ID  | Feature               | Composable                  | Tables                                             | Migration |
| :-- | :-------------------- | :-------------------------- | :------------------------------------------------- | :-------- |
| F27 | Provider Earnings     | `useProviderEarnings.ts`    | `provider_bank_accounts`, `provider_withdrawals`   | 017       |
| F28 | Online Hours Tracking | `useProviderEarnings.ts`    | `provider_online_sessions`, `provider_daily_stats` | 017       |
| F29 | i18n                  | `useI18n.ts`                | -                                                  | -         |
| F30 | Status Audit Log      | `useAuditLog.ts`            | `status_audit_log`                                 | 018       |
| F31 | GPS Tracking          | `useProviderTracking.ts`    | `service_providers`                                | -         |
| F32 | Error Monitoring      | `lib/sentry.ts`             | -                                                  | -         |
| F33 | Driver Location       | `useDriverTracking.ts`      | `service_providers`                                | -         |
| F34 | Geofencing            | `useGeofencing.ts`          | -                                                  | -         |
| F35 | Analytics Dashboard   | `useAnalytics.ts`           | Multiple                                           | -         |
| F36 | Surge Pricing         | `useSurgePricing.ts`        | `app_settings`                                     | -         |
| F37 | Performance Score     | `useProviderPerformance.ts` | `service_providers`, `ride_ratings`                | -         |

---

## 📋 New Services (F156-F170)

| ID    | Feature             | Composable                 | Tables                                                 | Migration |
| :---- | :------------------ | :------------------------- | :----------------------------------------------------- | :-------- |
| F156  | Loyalty Program     | `useLoyalty.ts`            | `user_loyalty`, `loyalty_tiers`, `points_transactions` | 023       |
| F157  | Offline Mode        | `useOfflineStorage.ts`     | IndexedDB                                              | -         |
| F158  | Queue Booking       | `useQueueBooking.ts`       | `queue_bookings`, `queue_ratings`                      | 029, 031  |
| F158a | Queue Favorites     | `useQueueFavorites.ts`     | `queue_favorite_places`, `queue_place_stats`           | 054       |
| F159  | Moving Service      | `useMoving.ts`             | `moving_requests`, `moving_ratings`                    | 029, 031  |
| F160  | Laundry Service     | `useLaundry.ts`            | `laundry_requests`, `laundry_ratings`                  | 029, 031  |
| F167  | Service Bundles     | `useServiceBundles.ts`     | `service_bundles`, `bundle_templates`                  | 167       |
| F170  | Provider Incentives | `useProviderIncentives.ts` | `provider_incentives`, `provider_incentive_progress`   | 042       |

---

## 📋 Admin Features (F172-F173)

| ID   | Feature               | Composable                 | Tables                              | Migration |
| :--- | :-------------------- | :------------------------- | :---------------------------------- | :-------- |
| F172 | Customer Notes & Tags | `useCustomerManagement.ts` | `customer_notes`, `customer_tags`   | 080       |
| F173 | Admin RBAC            | `useAdminRBAC.ts`          | `admin_audit_log`, `admin_sessions` | 081       |

---

## 📋 Advanced System (F202-F251)

| ID   | Feature           | Composable             | Tables                         | Migration |
| :--- | :---------------- | :--------------------- | :----------------------------- | :-------- |
| F202 | Feature Flags     | `useAdvancedSystem.ts` | `feature_flags`                | 045       |
| F203 | A/B Testing       | `useAdvancedSystem.ts` | `ab_tests`, `ab_test_variants` | 045       |
| F204 | User Preferences  | `useAdvancedSystem.ts` | `user_preferences`             | 045       |
| F237 | Analytics Tracker | `useAdvancedSystem.ts` | `analytics_events`             | 045       |
| F251 | System Health     | `useAdvancedSystem.ts` | `system_health_log`            | 045       |
| F254 | Quick Reorder     | `useQuickReorder.ts`   | `reorder_analytics`            | 170       |

---

## 🗄️ Database Tables Quick Reference

### User Management

```
users                    → F01
service_providers        → F02, F14
```

### Service Requests

```
ride_requests           → F02
delivery_requests       → F03
shopping_requests       → F04
queue_bookings          → F158
moving_requests         → F159
laundry_requests        → F160
```

### Financial

```
user_wallets            → F05
wallet_transactions     → F05
topup_requests          → F05
provider_withdrawals    → F27
payments                → F08
refunds                 → F24
```

### Ratings

```
ride_ratings            → F11
delivery_ratings        → F26
shopping_ratings        → F26
queue_ratings           → F158
moving_ratings          → F159
laundry_ratings         → F160
```

### Notifications

```
user_notifications      → F07
push_subscriptions      → F07
push_notification_queue → F07
notification_templates  → F07
```

### System

```
admin_audit_log         → F173
feature_flags           → F202
analytics_events        → F237
system_health_log       → F251
```

---

## 🔧 Database Functions Quick Reference

| Function                   | Feature | Description              |
| :------------------------- | :------ | :----------------------- |
| `generate_member_uid()`    | F01     | Auto-generate Member UID |
| `get_user_by_member_uid()` | F01     | Lookup user by UID       |
| `find_nearby_providers()`  | F02     | Find available drivers   |
| `accept_ride_request()`    | F14     | Atomic ride acceptance   |
| `update_ride_status()`     | F14     | Update ride status       |
| `ensure_user_wallet()`     | F05     | Initialize wallet        |
| `add_wallet_transaction()` | F05     | Add transaction          |
| `validate_promo_code()`    | F10     | Validate promo           |
| `add_loyalty_points()`     | F156    | Add/deduct points        |
| `redeem_reward()`          | F156    | Redeem loyalty reward    |
| `get_feature_flag()`       | F202    | Get feature flag status  |
| `assign_ab_test_variant()` | F203    | Assign A/B test variant  |

---

## 📝 Tracking ID Formats

| Prefix | Entity        | Example             |
| :----- | :------------ | :------------------ |
| TRD    | Member UID    | TRD-A1B2C3D4        |
| PRV    | Provider UID  | PRV-X9Y8Z7W6        |
| RID    | Ride Request  | RID-20251229-000001 |
| DEL    | Delivery      | DEL-20251229-000001 |
| SHP    | Shopping      | SHP-20251229-000001 |
| QUE    | Queue Booking | QUE-20251229-000001 |
| MOV    | Moving        | MOV-20251229-000001 |
| LAU    | Laundry       | LAU-20251229-000001 |

---

## ➕ Adding New Features

### Step 1: Assign Feature ID

```
1. Check existing IDs in this registry
2. Assign next available ID in appropriate category
3. Document in this file
```

### Step 2: Create Migration

```sql
-- ============================================
-- Migration: XXX_feature_name.sql
-- Feature: F## - Feature Name
-- Date: YYYY-MM-DD
-- ============================================
```

### Step 3: Update Registry

```
1. Add entry to appropriate table above
2. Include: ID, Feature, Composable, Tables, Migration
3. Update Database Tables section if new tables
4. Update Functions section if new functions
```

### Step 4: Execute Migration

```
MANDATORY: Execute via MCP Supabase immediately after creation
```

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
