# Thai Ride App - System Architecture Overview

## 🎯 System Summary

**Thai Ride App** is a comprehensive Super App Platform with multi-role architecture supporting:

- **197 Routes** across 3 main roles
- **200+ Features** (F01-F251+)
- **100+ Database Tables**
- **150+ UI Components**
- **6 Core Services**: Ride, Delivery, Shopping, Queue, Moving, Laundry

---

## 📊 Route Distribution (197 Total Routes)

```
┌─────────────────────────────────────────────────────────────────┐
│                    THAI RIDE SUPER APP                          │
│                   Multi-Role Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 PUBLIC ROUTES (8 routes - 4.1%)                             │
│  ├── /login, /register, /verify-email                           │
│  ├── /auth/callback (OAuth)                                     │
│  ├── /onboarding                                                │
│  └── /track/:shareCode, /tracking, /tracking/:trackingId        │
│                                                                 │
│  👥 CUSTOMER APP (42 routes - 21.3%)                            │
│  ├── Core Services (10 routes)                                  │
│  │   ├── /customer (Home)                                       │
│  │   ├── /customer/services                                     │
│  │   ├── /customer/ride (V3 + Legacy)                           │
│  │   ├── /customer/delivery (V2 + Legacy)                       │
│  │   ├── /customer/shopping                                     │
│  │   ├── /customer/queue-booking                                │
│  │   ├── /customer/moving                                       │
│  │   └── /customer/laundry                                      │
│  │                                                              │
│  ├── Account & Profile (7 routes)                               │
│  │   ├── /customer/profile                                      │
│  │   ├── /customer/history                                      │
│  │   ├── /customer/wallet (Shared)                              │
│  │   ├── /customer/payment-methods                              │
│  │   ├── /customer/saved-places                                 │
│  │   ├── /customer/notifications                                │
│  │   └── /customer/settings                                     │
│  │                                                              │
│  ├── Loyalty & Rewards (8 routes)                               │
│  │   ├── /customer/loyalty                                      │
│  │   ├── /customer/promotions                                   │
│  │   ├── /customer/referral                                     │
│  │   ├── /customer/subscription                                 │
│  │   └── /customer/insurance                                    │
│  │                                                              │
│  ├── Advanced Features (9 routes)                               │
│  │   ├── /customer/scheduled-rides                              │
│  │   ├── /customer/favorite-drivers                             │
│  │   ├── /customer/safety (SOS, Trip Share)                     │
│  │   └── /customer/help                                         │
│  │                                                              │
│  └── Service Tracking (8 routes)                                │
│      ├── /customer/queue-booking/:id                            │
│      ├── /customer/moving/:id                                   │
│      ├── /customer/laundry/:id                                  │
│      └── /customer/receipt/:id                                  │
│                                                                 │
```

│ 🚙 PROVIDER APP (24 routes - 12.2%) │
│ ├── Dashboard & Core (6 routes) │
│ │ ├── /provider (Dashboard V4) │
│ │ ├── /provider/earnings │
│ │ ├── /provider/history │
│ │ ├── /provider/profile │
│ │ ├── /provider/performance │
│ │ └── /provider/wallet → /customer/wallet (Shared) │
│ │ │
│ ├── Onboarding & Setup (5 routes) │
│ │ ├── /provider/onboarding │
│ │ ├── /provider/register │
│ │ ├── /provider/vehicle │
│ │ ├── /provider/documents │
│ │ └── /provider/bank │
│ │ │
│ ├── Job Management (4 routes) │
│ │ ├── /provider/jobs (Available) │
│ │ ├── /provider/my-jobs (Active) │
│ │ ├── /provider/scheduled-rides │
│ │ └── /provider/incentives │
│ │ │
│ └── Settings & Support (5 routes) │
│ ├── /provider/notification-settings │
│ ├── /provider/notifications │
│ ├── /provider/settings │
│ └── /provider/help │
│ │
│ 🔐 ADMIN PANEL (123 routes - 62.4%) │
│ ├── Main Router (84 routes) │
│ │ ├── Authentication (3) │
│ │ │ ├── /admin/login │
│ │ │ ├── /admin → /admin/dashboard │
│ │ │ └── /admin/dashboard │
│ │ │ │
│ │ ├── User Management (6) │
│ │ │ ├── /admin/users │
│ │ │ ├── /admin/customers │
│ │ │ ├── /admin/providers │
│ │ │ └── /admin/verification-queue │
│ │ │ │
│ │ ├── Order Management (10) │
│ │ │ ├── /admin/orders │
│ │ │ ├── /admin/cancellations │
│ │ │ ├── /admin/ratings │
│ │ │ ├── /admin/scheduled-rides │
│ │ │ ├── /admin/queue-bookings │
│ │ │ ├── /admin/moving │
│ │ │ ├── /admin/laundry │
│ │ │ ├── /admin/live-map │
│ │ │ └── /admin/driver-tracking │
│ │ │ │
│ │ ├── Financial Management (11) │
│ │ │ ├── /admin/payments │
│ │ │ ├── /admin/withdrawals │
│ │ │ ├── /admin/wallets │
│ │ │ ├── /admin/topup-requests │
│ │ │ ├── /admin/refunds │
│ │ │ ├── /admin/wallet-transactions │
│ │ │ ├── /admin/revenue │
│ │ │ └── /admin/payment-settings │
│ │ │ │
│ │ ├── Marketing & Loyalty (5) │
│ │ │ ├── /admin/promos │
│ │ │ ├── /admin/referrals │
│ │ │ ├── /admin/loyalty │
│ │ │ ├── /admin/incentives │
│ │ │ └── /admin/subscriptions │
│ │ │ │
│ │ ├── Support & Feedback (4) │
│ │ │ ├── /admin/support │
│ │ │ ├── /admin/feedback │
│ │ │ └── /admin/fraud-alerts │
│ │ │ │
│ │ ├── Notifications (3) │
│ │ │ ├── /admin/notifications │
│ │ │ ├── /admin/push-notifications │
│ │ │ └── /admin/notification-templates │
│ │ │ │
│ │ ├── Analytics & Reports (7) │
│ │ │ ├── /admin/analytics │
│ │ │ ├── /admin/reports │
│ │ │ ├── /admin/ux-analytics │
│ │ │ ├── /admin/analytics-events │
│ │ │ ├── /admin/user-journey │
│ │ │ ├── /admin/performance │
│ │ │ └── /admin/cross-role-monitor │
│ │ │ │
│ │ ├── Settings & Configuration (11) │
│ │ │ ├── /admin/settings │
│ │ │ ├── /admin/service-areas │
│ │ │ ├── /admin/service-zones │
│ │ │ ├── /admin/surge-pricing │
│ │ │ ├── /admin/audit-log │
│ │ │ ├── /admin/security │
│ │ │ ├── /admin/insurance │
│ │ │ ├── /admin/corporate │
│ │ │ └── /admin/components │
│ │ │ │
│ │ └── Advanced Features (17) │
│ │ ├── /admin/feature-flags │
│ │ ├── /admin/ab-tests │
│ │ ├── /admin/system-health │
│ │ ├── /admin/production-dashboard │
│ │ ├── /admin/data-management │
│ │ ├── /admin/alerting │
│ │ ├── /admin/deployment │
│ │ ├── /admin/compliance │
│ │ ├── /admin/incidents │
│ │ ├── /admin/readiness │
│ │ └── /admin/error-recovery │
│ │ │
│ └── Admin V2 Router (39 routes) - Modern Architecture │
│ ├── Users Module (3) │
│ │ ├── /admin/customers │
│ │ ├── /admin/providers │
│ │ └── /admin/verification-queue │
│ │ │
│ ├── Orders Module (10) │
│ │ ├── /admin/orders │
│ │ ├── /admin/delivery │
│ │ ├── /admin/shopping │
│ │ ├── /admin/queue-bookings │
│ │ ├── /admin/moving │
│ │ ├── /admin/laundry │
│ │ ├── /admin/live-map │
│ │ ├── /admin/driver-tracking │
│ │ ├── /admin/scheduled-rides │
│ │ └── /admin/cancellations │
│ │ │
│ ├── Finance Module (7) │
│ │ ├── /admin/revenue │
│ │ ├── /admin/payments │
│ │ ├── /admin/wallets │
│ │ ├── /admin/topup-requests │
│ │ ├── /admin/withdrawals │
│ │ ├── /admin/refunds │
│ │ └── /admin/payment-settings │
│ │ │
│ ├── Marketing Module (4) │
│ │ ├── /admin/promos │
│ │ ├── /admin/referrals │
│ │ ├── /admin/loyalty │
│ │ └── /admin/incentives │
│ │ │
│ ├── Support Module (4) │
│ │ ├── /admin/support │
│ │ ├── /admin/feedback │
│ │ ├── /admin/ratings │
│ │ └── /admin/fraud-alerts │
│ │ │
│ ├── Analytics Module (3) │
│ │ ├── /admin/analytics │
│ │ ├── /admin/reports │
│ │ └── /admin/ux-analytics │
│ │ │
│ └── Settings Module (8) │
│ ├── /admin/settings │
│ ├── /admin/notifications │
│ ├── /admin/service-areas │
│ ├── /admin/service-zones │
│ ├── /admin/security │
│ └── /admin/audit-log │
│ │
└─────────────────────────────────────────────────────────────────┘

```

---

```

## 🎨 Feature Registry (200+ Features)

### Core Features (F01-F10)

| รหัส | ฟีเจอร์                            | Composable                                       | ตาราง DB                                                              | Migration     |
| ---- | ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ------------- |
| F01  | User Authentication & Registration | `stores/auth.ts`, `useAdmin.ts`                  | `users` (Member UID System)                                           | 001, 026, 027 |
| F02  | Ride Booking                       | `useServices.ts`, `stores/ride.ts`               | `ride_requests`, `service_providers`                                  | 001, 006      |
| F03  | Delivery Service                   | `useDelivery.ts`                                 | `delivery_requests`                                                   | 001, 007      |
| F04  | Shopping Service                   | `useShopping.ts`                                 | `shopping_requests`                                                   | 001, 007      |
| F05  | Wallet/Balance                     | `useWallet.ts`, `useWalletV2.ts`                 | `user_wallets`, `wallet_transactions`, `topup_requests`               | 007, 079      |
| F06  | Referral System                    | `useReferral.ts`                                 | `referral_codes`, `referrals`                                         | 007           |
| F07  | Notifications & Push               | `useNotifications.ts`, `usePushNotifications.ts` | `user_notifications`, `push_subscriptions`, `push_notification_queue` | 007, 015, 128 |
| F08  | Payment Methods                    | `usePaymentMethods.ts`                           | `payment_methods`                                                     | 002           |
| F09  | Saved Places                       | `useServices.ts`                                 | `saved_places`, `recent_places`                                       | 002           |
| F10  | Promo Codes                        | `useServices.ts`                                 | `promo_codes`, `user_promo_usage`, `favorite_promos`                  | 002           |

### New Services (F158-F160)

| รหัส  | ฟีเจอร์                     | Composable             | ตาราง DB                                     | Migration |
| ----- | --------------------------- | ---------------------- | -------------------------------------------- | --------- |
| F158  | Queue Booking               | `useQueueBooking.ts`   | `queue_bookings`, `queue_ratings`            | 029, 031  |
| F158a | Queue Favorites & Wait Time | `useQueueFavorites.ts` | `queue_favorite_places`, `queue_place_stats` | 054       |
| F159  | Moving Service              | `useMoving.ts`         | `moving_requests`, `moving_ratings`          | 029, 031  |
| F160  | Laundry Service             | `useLaundry.ts`        | `laundry_requests`, `laundry_ratings`        | 029, 031  |

### Provider Features (F27-F28, F170)

| รหัส | ฟีเจอร์                        | Composable                 | ตาราง DB                                             | Migration |
| ---- | ------------------------------ | -------------------------- | ---------------------------------------------------- | --------- |
| F27  | Provider Earnings & Withdrawal | `useProviderEarnings.ts`   | `provider_bank_accounts`, `provider_withdrawals`     | 017       |
| F28  | Provider Online Hours Tracking | `useProviderEarnings.ts`   | `provider_online_sessions`, `provider_daily_stats`   | 017       |
| F170 | Provider Incentives            | `useProviderIncentives.ts` | `provider_incentives`, `provider_incentive_progress` | 042       |

### Loyalty & Rewards (F156)

| รหัส | ฟีเจอร์                  | Composable      | ตาราง DB                                                                  | Migration |
| ---- | ------------------------ | --------------- | ------------------------------------------------------------------------- | --------- |
| F156 | Customer Loyalty Program | `useLoyalty.ts` | `user_loyalty`, `loyalty_tiers`, `points_transactions`, `loyalty_rewards` | 023       |

### Advanced System (F202-F251)

| รหัส | ฟีเจอร์                  | Composable             | ตาราง DB                                              | Migration |
| ---- | ------------------------ | ---------------------- | ----------------------------------------------------- | --------- |
| F202 | Feature Flags System     | `useAdvancedSystem.ts` | `feature_flags`                                       | 045       |
| F203 | A/B Testing Framework    | `useAdvancedSystem.ts` | `ab_tests`, `ab_test_variants`, `ab_test_assignments` | 045       |
| F204 | User Preferences Manager | `useAdvancedSystem.ts` | `user_preferences`                                    | 045       |
| F237 | Analytics Tracker        | `useAdvancedSystem.ts` | `analytics_events`                                    | 045       |
| F251 | System Health Monitor    | `useAdvancedSystem.ts` | `system_health_log`                                   | 045       |

### Admin Features (F172-F173)

| รหัส | ฟีเจอร์               | Composable                 | ตาราง DB                                                      | Migration |
| ---- | --------------------- | -------------------------- | ------------------------------------------------------------- | --------- |
| F172 | Customer Notes & Tags | `useCustomerManagement.ts` | `customer_notes`, `customer_tags`, `customer_tag_assignments` | 080       |
| F173 | Admin RBAC System     | `useAdminRBAC.ts`          | `admin_audit_log`, `admin_sessions`, `admin_roles`            | 081       |

---

## 🗄️ Database Architecture (100+ Tables)

### Core Tables

```
users                    → F01 (Auth, Member UID)
service_providers        → F02, F14 (Provider UID, Dual-role)
ride_requests           → F02 (Ride booking)
delivery_requests       → F03 (Delivery service)
shopping_requests       → F04 (Shopping service)
queue_bookings          → F158 (Queue booking)
moving_requests         → F159 (Moving service)
laundry_requests        → F160 (Laundry service)
```

### Financial Tables

```
user_wallets            → F05 (Wallet balance)
wallet_transactions     → F05 (Transaction history)
topup_requests          → F05 (Top-up requests)
provider_withdrawals    → F27 (Provider withdrawals)
provider_bank_accounts  → F27 (Bank accounts)
payments                → F08 (Payment records)
payment_methods         → F08 (Payment methods)
refunds                 → F24 (Refund management)
```

### Loyalty & Marketing Tables

```
user_loyalty            → F156 (Loyalty status)
loyalty_tiers           → F156 (Tier definitions)
points_transactions     → F156 (Points history)
loyalty_rewards         → F156 (Available rewards)
user_rewards            → F156 (Redeemed rewards)
promo_codes             → F10 (Promo codes)
user_promo_usage        → F10 (Promo usage)
favorite_promos         → F10 (Favorite promos)
referral_codes          → F06 (Referral codes)
referrals               → F06 (Referral records)
```

### Notification Tables

```
user_notifications      → F07 (Notifications)
push_subscriptions      → F07 (Push subscriptions)
push_notification_queue → F07 (Push queue)
notification_templates  → F07 (Templates)
scheduled_notifications → F07 (Scheduled)
```

### Advanced System Tables

```
feature_flags           → F202 (Feature flags)
ab_tests                → F203 (A/B tests)
ab_test_variants        → F203 (Test variants)
user_preferences        → F204 (User preferences)
analytics_events        → F237 (Analytics)
system_health_log       → F251 (System health)
customer_tags           → F172 (Customer tags)
customer_notes          → F172 (Customer notes)
admin_audit_log         → F173 (Audit log)
```

---

## 🔄 Cross-Role Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANDATORY FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CUSTOMER                PROVIDER                 ADMIN         │
│  ────────                ────────                 ─────         │
│                                                                 │
│  1. สร้างคำสั่ง ──────────────────────────────→ เห็นในระบบ      │
│     [pending]                                   Analytics       │
│        ↓                                            ↓           │
│  2. รอคนรับ ←──────── รับงาน ─────────────────→ เห็นการจับคู่   │
│     [matched]         [matched]                  Push notify   │
│        ↓                  ↓                         ↓           │
│  3. ติดตามสถานะ ←──── อัพเดทสถานะ ────────────→ ดูความคืบหน้า  │
│     [in_progress]     [in_progress]              Realtime sync │
│     Realtime sync     Location tracking         Live map       │
│     ETA display       Navigation                                │
│        ↓                  ↓                         ↓           │
│  4. รับบริการ ←────── จบงาน ──────────────────→ เห็นสรุป       │
│     [completed]       [completed]                Performance    │
│     Auto-award        Earnings update            Revenue        │
│        ↓                  ↓                         ↓           │
│  5. ให้คะแนน ─────────────────────────────────→ ดูรีวิว        │
│     Rating            Rating received            Analytics      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Service Coverage Matrix

| Service      | Customer Action | Provider Type    | Admin View        | Tables              |
| ------------ | --------------- | ---------------- | ----------------- | ------------------- |
| **Ride**     | สั่งรถ          | Driver           | AdminRidesView    | `ride_requests`     |
| **Delivery** | ส่งของ          | Rider            | AdminDeliveryView | `delivery_requests` |
| **Shopping** | ซื้อของ         | Shopper          | AdminShoppingView | `shopping_requests` |
| **Queue**    | จองคิว          | Service Provider | AdminQueueView    | `queue_bookings`    |
| **Moving**   | ขนย้าย          | Mover            | AdminMovingView   | `moving_requests`   |
| **Laundry**  | ซักผ้า          | Laundry Provider | AdminLaundryView  | `laundry_requests`  |

---

## 🎨 UI Components (150+ Components)

### Customer Components (`src/components/customer/`)

```
WelcomeHeader.vue              - Welcome header with user info
QuickDestinationSearch.vue     - Smart search bar
CuteServiceGrid.vue            - Service grid with icons
ActiveOrderCard.vue            - Active order tracking card
SavedPlacesRow.vue             - Saved places list
PromoBanner.vue                - Promotional banner
LoyaltyCard.vue                - Loyalty points card
FloatingActionButton.vue       - FAB for quick actions
BottomNavigation.vue           - Bottom navigation bar
PullToRefresh.vue              - Pull to refresh
EmptyState.vue                 - Empty state placeholder
EnhancedServiceCard.vue        - Enhanced service card
ProgressiveLoadingOverlay.vue  - Loading overlay
SmartSearchBar.vue             - Smart search with autocomplete
ChatWidget.vue                 - Customer support chat
QuickRatingModal.vue           - Quick rating modal
RecentDestinations.vue         - Recent destinations
QuickShortcuts.vue             - Quick action shortcuts
ProviderCTA.vue                - Become provider CTA
```

### Provider Components (`src/components/provider/`)

```
OnlineToggle.vue               - Online/offline toggle
EarningsCard.vue               - Earnings summary card
EarningsChart.vue              - Earnings chart
JobDetailModal.vue             - Job detail modal
AcceptJobOverlay.vue           - Job acceptance overlay
ActiveJobView.vue              - Active job view
JobTimer.vue                   - Job timer
ConnectionStatusBar.vue        - Connection status
DeliveryProofCapture.vue       - Delivery proof photo
SignatureCapture.vue           - Signature capture
ProviderSkeleton.vue           - Loading skeleton
RideAcceptConfirmModal.vue     - Ride acceptance confirmation
ProviderOnboardingAlert.vue    - Onboarding alert
```

### Admin Components (`src/admin/components/`)

```
layout/
  AdminShell.vue               - Main admin shell
  AdminSidebar.vue             - Sidebar navigation
  AdminHeader.vue              - Header with user menu
  AdminToasts.vue              - Toast notifications

common/
  AdminTable.vue               - Data table
  AdminCard.vue                - Card component
  AdminModal.vue               - Modal dialog
  AdminButton.vue              - Button component
  AdminBadge.vue               - Badge component
  AdminStatCard.vue            - Stat card
  AdminStatusBadge.vue         - Status badge
  StatusUpdateModal.vue        - Status update modal
  ServiceDetailModal.vue       - Service detail modal
  UnifiedServiceDetailModal.vue - Unified service modal
  CollapsibleSection.vue       - Collapsible section

verification/
  VerificationQueueCard.vue    - Verification queue card
  VerificationModal.vue        - Verification modal
  VerificationStatsCards.vue   - Verification stats

admin/
  PermissionGuard.vue          - Permission guard
  DoubleConfirmModal.vue       - Double confirmation
```

### Shared Components (`src/components/`)

```
AppShell.vue                   - Main app shell
AdminLayout.vue                - Admin layout (legacy)
LocationPicker.vue             - Location picker
RideTracker.vue                - Ride tracking
ToastContainer.vue             - Toast container
AnimatedCounter.vue            - Animated counter
ProviderOrderCard.vue          - Provider order card
```

---

## 🔧 Composables Architecture (100+ Composables)

### Core Composables

```
useServices.ts                 - Core services (ride, delivery, shopping)
useWallet.ts                   - Wallet management
useWalletV2.ts                 - Wallet V2
useProvider.ts                 - Provider operations
useProviderDashboard.ts        - Provider dashboard
useAdmin.ts                    - Admin operations (legacy)
useAdminAuth.ts                - Admin authentication
useAdminAPI.ts                 - Admin API (V2)
useRoleSwitch.ts               - Role switching
```

### Service-Specific Composables

```
useDelivery.ts                 - Delivery service
useShopping.ts                 - Shopping service
useQueueBooking.ts             - Queue booking
useQueueFavorites.ts           - Queue favorites
useMoving.ts                   - Moving service
useLaundry.ts                  - Laundry service
useRideHistory.ts              - Ride history
useRecurringRides.ts           - Recurring rides
```

### Provider Composables

```
useProviderEarnings.ts         - Provider earnings
useProviderOnboarding.ts       - Provider onboarding
useProviderAccess.ts           - Provider access control
useProviderVerification.ts     - Provider verification
useProviderRealtime.ts         - Provider realtime
useProviderNotificationSettings.ts - Notification settings
useProviderIncentives.ts       - Provider incentives
useProviderJobPool.ts          - Job pool management
```

### Customer Composables

```
useCustomerBooking.ts          - Customer booking
useCustomerManagement.ts       - Customer management
useCustomerUXEnhancements.ts   - UX enhancements
useFavoriteShoppingLists.ts    - Shopping lists
useShoppingImages.ts           - Shopping images
```

### Admin Composables

```
useAdminServiceManagement.ts   - Service management
useAdminAnalytics.ts           - Analytics
useAdminCleanup.ts             - Data cleanup
useAdminRBAC.ts                - RBAC system
useServiceActions.ts           - Service actions
```

### Notification & Communication

```
useNotifications.ts            - Notifications
usePushNotifications.ts        - Push notifications
useNotificationTemplates.ts    - Notification templates
usePushTemplates.ts            - Push templates
useExternalNotifications.ts    - External notifications
useRealtimeChat.ts             - Realtime chat
useSupportChatV2.ts            - Support chat V2
```

### Loyalty & Marketing

```
useLoyalty.ts                  - Loyalty program
useLoyaltyTiers.ts             - Loyalty tiers
useReferral.ts                 - Referral system
usePromoCodeGenerator.ts       - Promo code generator
usePromoCampaign.ts            - Promo campaigns
```

### Advanced Features

```
useCrossRoleSync.ts            - Cross-role sync
usePerformanceMetrics.ts       - Performance metrics
usePerformanceMonitoring.ts    - Performance monitoring
useAdvancedErrorRecovery.ts    - Error recovery
useNetworkRecovery.ts          - Network recovery
useOfflineModeV2.ts            - Offline mode
useMultiLanguage.ts            - Multi-language
```

### Analytics & Tracking

```
useUXTracking.ts               - UX tracking
useCancellationAnalytics.ts    - Cancellation analytics
useCancellationAnalyticsV2.ts  - Cancellation analytics V2
useRetentionAnalytics.ts       - Retention analytics
useFeedbackAnalytics.ts        - Feedback analytics
usePeakHoursAnalysis.ts        - Peak hours analysis
useZoneAnalytics.ts            - Zone analytics
```

### Payment & Financial

```
usePaymentMethods.ts           - Payment methods
usePaymentSettings.ts          - Payment settings
usePaymentGateway.ts           - Payment gateway
usePaymentGatewayV2.ts         - Payment gateway V2
usePaymentReconciliation.ts    - Payment reconciliation
useAutomatedRefunds.ts         - Automated refunds
```

### System & Utilities

```
useToast.ts                    - Toast notifications
useHapticFeedback.ts           - Haptic feedback
useSoundNotification.ts        - Sound notifications
useDateRangePicker.ts          - Date range picker
useReportExport.ts             - Report export
```

---

## 🚀 Technology Stack

### Frontend

```
Framework:        Vue 3 (Composition API)
Language:         TypeScript
Build Tool:       Vite
State Management: Pinia
Router:           Vue Router (Multi-router architecture)
Styling:          Tailwind CSS + Custom Design System
UI Components:    Custom components (150+)
```

### Backend

```
Database:         Supabase (PostgreSQL)
Realtime:         Supabase Realtime
Storage:          Supabase Storage
Auth:             Supabase Auth
Edge Functions:   Supabase Functions (Deno)
RLS:              Row Level Security policies
```

### Infrastructure

```
Hosting:          Vercel
CDN:              Vercel Edge Network
Maps:             Google Maps API
Push:             Web Push API + Service Worker
PWA:              Workbox + Manifest
Analytics:        Custom analytics + Supabase
Monitoring:       Sentry + Custom health checks
```

### Development Tools

```
Testing:          Vitest + Property-based testing
Linting:          ESLint + Custom rules
Type Checking:    TypeScript strict mode
Git Hooks:        Husky
Package Manager:  npm
```

---

## 📁 Project Structure

```
thai-ride-app/
├── src/
│   ├── admin/                 # Admin V2 (Separate architecture)
│   │   ├── components/        # Admin components
│   │   │   ├── layout/        # Layout components
│   │   │   ├── common/        # Common components
│   │   │   └── verification/  # Verification components
│   │   ├── composables/       # Admin composables
│   │   ├── stores/            # Admin stores
│   │   ├── types/             # Admin types
│   │   ├── views/             # Admin views
│   │   ├── router.ts          # Admin router
│   │   └── styles/            # Admin styles
│   │
│   ├── components/            # Shared components
│   │   ├── customer/          # Customer components
│   │   ├── provider/          # Provider components
│   │   └── admin/             # Admin components (legacy)
│   │
│   ├── composables/           # Composables (100+)
│   ├── stores/                # Pinia stores
│   ├── views/                 # Views (Customer, Provider, Admin)
│   ├── router/                # Main router
│   ├── lib/                   # Utilities & libraries
│   ├── middleware/            # Route middleware
│   └── main.ts                # App entry point
│
├── supabase/
│   ├── migrations/            # Database migrations (167+)
│   └── functions/             # Edge functions
│
├── public/                    # Static assets
├── scripts/                   # Utility scripts
└── .kiro/                     # Kiro configuration
    └── steering/              # Steering rules
        ├── ui-design.md       # UI design guidelines
        ├── total-role-coverage.md  # Role coverage rules
        ├── database-features.md    # Database features mapping
        ├── admin-rules.md     # Admin rules
        └── system-architecture.md  # This file
```

---

## 🔐 Dual-Role System Architecture

### หลักการ

**1 User ID สามารถเป็นทั้ง Customer และ Provider ได้**

```
┌─────────────────────────────────────────────────────────────┐
│                    DUAL-ROLE ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  users (ทุกคนเริ่มต้นที่นี่)                                  │
│  ├── id (UUID) ─────────────────┐                           │
│  ├── member_uid (TRD-XXXXXXXX)  │                           │
│  ├── first_name                 │                           │
│  ├── last_name                  │                           │
│  ├── phone_number               │                           │
│  └── email (optional)           │                           │
│                                 │                           │
│                                 ▼                           │
│  service_providers (เมื่อสมัครเป็น Provider)                 │
│  ├── id (UUID)                                              │
│  ├── user_id (FK → users.id) ◄──┘                           │
│  ├── provider_uid (PRV-XXXXXXXX)                            │
│  ├── provider_type (driver/rider/shopper/mover/laundry)     │
│  ├── status (pending/approved/rejected/suspended)           │
│  ├── is_verified                                            │
│  └── application_count                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UID System

| UID Type         | Format         | ตาราง                            | ใช้สำหรับ       |
| ---------------- | -------------- | -------------------------------- | --------------- |
| **Member UID**   | `TRD-XXXXXXXX` | `users.member_uid`               | ติดตามลูกค้า    |
| **Provider UID** | `PRV-XXXXXXXX` | `service_providers.provider_uid` | ติดตาม Provider |

### Provider Status Flow

```
ลูกค้าสมัครเป็น Provider
        ↓
    [pending] ──────────────────────────────────────┐
        ↓                                           │
   Admin ตรวจสอบ                                    │
        ↓                                           │
  ┌─────┴─────┐                                     │
  ↓           ↓                                     │
[approved] [rejected] ──→ สมัครใหม่ได้ ─────────────┘
  ↓
[active] ←→ [suspended] (Admin ระงับ/ปลดระงับ)
```

### Route Access Control

| Route Pattern          | Access Rule                     |
| ---------------------- | ------------------------------- |
| `/customer/*`          | ทุกคนที่ authenticated          |
| `/provider/onboarding` | ทุกคนที่ authenticated          |
| `/provider/*` (อื่นๆ)  | เฉพาะ approved/active providers |
| `/admin/*`             | เฉพาะ admin role                |
| `/login`, `/register`  | Public                          |
| `/tracking/*`          | Public (ไม่ต้อง login)          |

---

## 🎯 Development Guidelines

### เมื่อเพิ่มฟีเจอร์ใหม่ ต้องทำครบทุก Layer

#### 1. Database Layer (Supabase)

- [ ] สร้าง Migration file (`supabase/migrations/XXX_feature_name.sql`)
- [ ] กำหนด RLS Policies สำหรับทุก Role (admin, provider, customer)
- [ ] Enable Realtime (ถ้าต้องการ sync)
- [ ] สร้าง Functions สำหรับ critical operations
- [ ] อัพเดท `database-features.md` ด้วยรหัสฟีเจอร์ใหม่

#### 2. Backend/API Layer

- [ ] สร้าง Atomic Functions สำหรับ critical operations
- [ ] ตรวจสอบ Role ใน Function
- [ ] Handle errors properly
- [ ] Add transaction support ถ้าจำเป็น

#### 3. Frontend Layer - Customer Side

- [ ] สร้าง/อัพเดท Composable (`useFeatureName.ts`)
- [ ] สร้าง View (`CustomerFeatureView.vue`)
- [ ] เพิ่ม Route ใน router
- [ ] Realtime subscription (ถ้าจำเป็น)
- [ ] Push notification integration

#### 4. Frontend Layer - Provider Side

- [ ] อัพเดท `useProvider.ts` หรือสร้าง composable ใหม่
- [ ] สร้าง/อัพเดท Provider View
- [ ] Realtime subscription รับงานใหม่
- [ ] Push notification แจ้งเตือนงานใหม่
- [ ] Job acceptance/update UI

#### 5. Frontend Layer - Admin Side

- [ ] อัพเดท `useAdmin.ts` หรือ `useAdminAPI.ts`
- [ ] สร้าง Admin View (`AdminFeatureView.vue`)
- [ ] เพิ่ม menu item ใน AdminSidebar
- [ ] สามารถ CRUD ข้อมูลได้
- [ ] Analytics/Reports (ถ้าจำเป็น)

#### 6. Notifications

- [ ] ส่งแจ้งเตือนทุกฝ่ายเมื่อสถานะเปลี่ยน
- [ ] Push notification (ถ้าเปิดใช้)
- [ ] In-app notification
- [ ] Email notification (ถ้าจำเป็น)

#### 7. Testing

- [ ] Unit tests สำหรับ composables
- [ ] Integration tests สำหรับ cross-role flow
- [ ] Property-based tests สำหรับ critical paths
- [ ] Manual testing ทุก role

---

## ⚠️ ข้อห้ามเด็ดขาด

| ❌ ห้ามทำ                    | ✅ ต้องทำ                             |
| ---------------------------- | ------------------------------------- |
| สร้างฟีเจอร์แค่ฝั่ง Customer | ทำครบทั้ง Customer + Provider + Admin |
| ใช้ Mock Data                | Query จาก Database เท่านั้น           |
| ไม่มี Realtime sync          | ต้องมี Realtime ทุกฝ่าย               |
| ไม่มี Push notification      | ต้องแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง     |
| Admin ดูไม่ได้               | Admin ต้องดู/จัดการได้ทุกอย่าง        |
| Provider รับงานไม่ได้        | Provider ต้องรับ/อัพเดท/จบงานได้      |
| ไม่มี RLS                    | ทุกตารางต้องมี RLS policies           |
| ใช้ Emoji แทน SVG            | ใช้ SVG icons เท่านั้น                |
| สีสันฉูดฉาด                  | ใช้สีเขียว (#00A86B) เป็น accent หลัก |

---

## 📊 Key Metrics & Statistics

### Route Distribution

```
Total Routes:        197
├── Public:          8 (4.1%)
├── Customer:        42 (21.3%)
├── Provider:        24 (12.2%)
└── Admin:           123 (62.4%)
    ├── Main Router: 84 (42.6%)
    └── V2 Router:   39 (19.8%)
```

### Feature Distribution

```
Total Features:      200+
├── Core:            F01-F10 (10)
├── History & Comm:  F11-F14 (4)
├── Advanced:        F15-F22 (8)
├── Admin & System:  F23-F26 (4)
├── Provider:        F27-F28 (2)
├── New Services:    F158-F160 (3)
├── Loyalty:         F156 (1)
├── Admin Features:  F172-F173 (2)
└── Advanced System: F202-F251 (50+)
```

### Database Statistics

```
Total Tables:        100+
├── Core Tables:     8
├── Financial:       8
├── Loyalty:         9
├── Notifications:   5
├── Advanced:        8
└── Others:          60+

Total Migrations:    167+
Total Functions:     100+
Total RLS Policies:  200+
```

### Component Statistics

```
Total Components:    150+
├── Customer:        19
├── Provider:        13
├── Admin:           30+
└── Shared:          88+

Total Composables:   100+
Total Views:         80+
```

---

## 🔄 Real-time Features

### Realtime-Enabled Tables

```
✅ ride_requests           - Ride status updates
✅ delivery_requests       - Delivery tracking
✅ shopping_requests       - Shopping status
✅ queue_bookings          - Queue updates
✅ moving_requests         - Moving tracking
✅ laundry_requests        - Laundry status
✅ service_providers       - Provider location & status
✅ chat_messages           - Real-time chat
✅ user_notifications      - Notifications
✅ wallet_transactions     - Wallet updates
```

### Push Notification Types

```
📱 Order Status Updates    - Customer & Provider
📱 New Job Available       - Provider
📱 Job Matched             - Customer & Provider
📱 Payment Received        - Provider
📱 Promo Alerts            - Customer
📱 Loyalty Rewards         - Customer
📱 System Announcements    - All users
📱 Emergency Alerts        - All users
```

---

## 🎨 Design System (MUNEEF Style)

### Color Palette

```css
/* Primary Colors */
--primary:           #00A86B  /* Green - Main accent */
--primary-hover:     #008F5B  /* Dark Green */
--primary-light:     #E8F5EF  /* Light Green */

/* Text Colors */
--text-primary:      #1A1A1A  /* Near Black */
--text-secondary:    #666666  /* Gray */
--text-muted:        #999999  /* Light Gray */

/* Background Colors */
--bg-white:          #FFFFFF  /* White */
--bg-secondary:      #F5F5F5  /* Off White */

/* Border Colors */
--border:            #E8E8E8  /* Light Gray */
--border-light:      #F0F0F0  /* Very Light Gray */

/* Status Colors */
--success:           #00A86B  /* Green */
--warning:           #F5A623  /* Orange */
--error:             #E53935  /* Red */
--location-marker:   #E53935  /* Red for destination */
```

### Typography

```
Font Family:  'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif
Headings:     Bold (700), Near Black (#1A1A1A)
Body:         Regular/Medium (400-500), Gray tones
```

### Component Styling

```
Buttons:      border-radius: 14px, padding: 18px 24px
Cards:        border-radius: 16-20px, subtle shadow
Inputs:       border-radius: 12px, padding: 16px
Icons:        SVG only (NO EMOJI), 20-24px, outline style
```

### Design Principles

```
✅ Clean & Modern       - สะอาด ทันสมัย
✅ Green Accent         - สีเขียวเป็นหลัก
✅ Whitespace           - ใช้ช่องว่างเยอะ
✅ Touch-friendly       - ปุ่มขนาดใหญ่พอ (min 44px)
✅ Mobile-first         - ออกแบบสำหรับมือถือเป็นหลัก
✅ SVG Icons            - ใช้ SVG เท่านั้น (ห้าม Emoji)

❌ No Emoji             - ห้ามใช้ Emoji
❌ No Gradients         - ไม่ใช้ gradient เยอะ
❌ No Multiple Fonts    - ใช้ font เดียว
❌ No Flashy Colors     - ไม่ใช้สีฉูดฉาด
```

---

## 🚀 Production Readiness

### Performance Optimizations

```
✅ Code Splitting          - Route-based lazy loading
✅ Tree Shaking            - Remove unused code
✅ Image Optimization      - WebP, lazy loading
✅ Bundle Size             - Optimized chunks
✅ Caching Strategy        - Service worker + CDN
✅ Database Indexing       - Optimized queries
✅ Connection Pooling      - Supabase connection pool
✅ CDN Integration         - Vercel Edge Network
```

### Security Features

```
✅ RLS Policies            - Row Level Security on all tables
✅ RBAC System             - Role-based access control
✅ Audit Logging           - Track all admin actions
✅ Input Validation        - Server-side validation
✅ SQL Injection Prevention - Parameterized queries
✅ XSS Protection          - Content sanitization
✅ CSRF Protection         - Token-based
✅ Rate Limiting           - API rate limits
```

### Monitoring & Observability

```
✅ Error Tracking          - Sentry integration
✅ Performance Monitoring  - Core Web Vitals
✅ Analytics               - Custom analytics + Supabase
✅ Health Checks           - System health monitoring
✅ Uptime Monitoring       - Service availability
✅ Database Monitoring     - Query performance
✅ Real-time Alerts        - Critical issue alerts
```

### Scalability Features

```
✅ Horizontal Scaling      - Vercel serverless
✅ Database Scaling        - Supabase auto-scaling
✅ CDN Distribution        - Global edge network
✅ Load Balancing          - Automatic load distribution
✅ Caching Layers          - Multi-level caching
✅ Queue System            - Background job processing
✅ Microservices Ready     - Modular architecture
```

---

## 📝 Quick Reference

### Important Files to Check When Adding Features

#### Database

```
supabase/migrations/          - All database migrations
.kiro/steering/database-features.md  - Feature registry
```

#### Customer Side

```
src/composables/useServices.ts       - Core services
src/composables/useDelivery.ts       - Delivery service
src/composables/useShopping.ts       - Shopping service
src/composables/useQueueBooking.ts   - Queue booking
src/views/Customer*.vue              - Customer views
src/components/customer/             - Customer components
```

#### Provider Side

```
src/composables/useProvider.ts       - Provider operations
src/composables/useProviderDashboard.ts  - Dashboard
src/views/provider/                  - Provider views
src/components/provider/             - Provider components
```

#### Admin Side

```
src/admin/composables/useAdminAPI.ts - Admin API (V2)
src/admin/views/                     - Admin views (V2)
src/admin/components/                - Admin components (V2)
src/composables/useAdmin.ts          - Admin operations (legacy)
src/views/Admin*.vue                 - Admin views (legacy)
```

#### Shared

```
src/composables/useNotifications.ts  - Notifications
src/composables/usePushNotifications.ts  - Push notifications
src/composables/useCrossRoleSync.ts  - Cross-role sync
src/lib/                             - Utilities & libraries
```

### Common Commands

#### Development

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run type-check       # TypeScript type checking
npm run lint             # Run ESLint
```

#### Database

```bash
# Run migrations
supabase db push

# Reset database
supabase db reset

# Generate types
npm run generate-types
```

#### Testing

```bash
npm run test             # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
```

---

## 🎯 Next Steps & Recommendations

### Immediate Priorities

1. **Consolidate Legacy Routes** - Remove duplicate/legacy routes
2. **Merge Admin Routers** - Unify Main + V2 admin routers
3. **Complete Documentation** - Document all 200+ features
4. **Performance Audit** - Optimize bundle size and load times
5. **Security Audit** - Review all RLS policies and permissions

### Feature Enhancements

1. **Advanced Analytics** - Enhanced reporting and insights
2. **AI-Powered Matching** - Smart provider-customer matching
3. **Dynamic Pricing** - Real-time surge pricing
4. **Fleet Management** - Advanced fleet operations
5. **Corporate Accounts** - B2B features

### Technical Improvements

1. **Micro-frontend Architecture** - Split into smaller apps
2. **GraphQL Integration** - Replace REST with GraphQL
3. **WebSocket Optimization** - Reduce realtime overhead
4. **Progressive Web App** - Enhanced PWA features
5. **Offline-First** - Better offline support

---

## 📚 Related Documentation

- `ui-design.md` - UI Design Guidelines (MUNEEF Style)
- `total-role-coverage.md` - Total Role Coverage Framework
- `database-features.md` - Database Features Mapping
- `admin-rules.md` - Admin Dashboard Rules
- `ROUTE_PATHS_REPORT.md` - Complete route listing
- `SERVICES_ARCHITECTURE.md` - Services architecture
- `RIDE_SYSTEM_ARCHITECTURE.md` - Ride system details

---

## ✅ Checklist for New Developers

### Getting Started

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up Supabase project
- [ ] Configure environment variables
- [ ] Run migrations
- [ ] Start dev server
- [ ] Read all steering rules

### Understanding the System

- [ ] Review this architecture document
- [ ] Understand dual-role system
- [ ] Learn cross-role integration flow
- [ ] Study database schema
- [ ] Review UI design guidelines
- [ ] Understand RLS policies

### Before Making Changes

- [ ] Check if feature affects all 3 roles
- [ ] Plan database changes first
- [ ] Design cross-role flow
- [ ] Consider realtime requirements
- [ ] Plan notification strategy
- [ ] Review security implications

### After Making Changes

- [ ] Update database-features.md
- [ ] Test all 3 roles
- [ ] Verify realtime sync
- [ ] Test notifications
- [ ] Update documentation
- [ ] Run all tests

---

**Last Updated:** December 25, 2024  
**Version:** 1.0.0  
**Maintained By:** Development Team
