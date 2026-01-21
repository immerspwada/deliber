# System Architecture - Thai Ride App

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         THAI RIDE SUPER APP                             │
│                        Multi-Role Platform                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │  Customer   │    │  Provider   │    │    Admin    │                 │
│  │    App      │    │    App      │    │  Dashboard  │                 │
│  │  (42 routes)│    │ (24 routes) │    │(123 routes) │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            │                                            │
│                    ┌───────▼───────┐                                    │
│                    │   Vue 3 SPA   │                                    │
│                    │  + Pinia      │                                    │
│                    │  + Vue Router │                                    │
│                    └───────┬───────┘                                    │
│                            │                                            │
│         ┌──────────────────┼──────────────────┐                         │
│         │                  │                  │                         │
│  ┌──────▼──────┐   ┌───────▼───────┐  ┌──────▼──────┐                  │
│  │ Supabase    │   │  Supabase     │  │  Supabase   │                  │
│  │ Auth        │   │  Realtime     │  │  Storage    │                  │
│  └─────────────┘   └───────────────┘  └─────────────┘                  │
│                            │                                            │
│                    ┌───────▼───────┐                                    │
│                    │  PostgreSQL   │                                    │
│                    │  + RLS        │                                    │
│                    │  + Functions  │                                    │
│                    └───────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Route Architecture

### Route Distribution

```
Total: 197 Routes
├── Public:   8 routes  (4.1%)
├── Customer: 42 routes (21.3%)
├── Provider: 24 routes (12.2%)
└── Admin:    123 routes (62.4%)
```

### Route Patterns

```
/                       → Customer Home (redirect)
/login                  → Public Login
/register               → Public Register
/customer/*             → Customer Routes (auth required)
/provider/*             → Provider Routes (approved provider required)
/provider/onboarding    → Provider Onboarding (auth required, any user)
/admin/*                → Admin Routes (admin role required)
/admin/login            → Admin Login (separate auth)
/track/:id              → Public Tracking (no auth)
```

---

## 🗄️ Database Architecture

### Core Tables

```sql
-- User Management
users                    -- All users (customers by default)
service_providers        -- Provider profiles (linked to users)

-- Service Requests
ride_requests           -- Ride bookings
delivery_requests       -- Delivery orders
shopping_requests       -- Shopping orders
queue_bookings          -- Queue reservations
moving_requests         -- Moving services
laundry_requests        -- Laundry services

-- Financial
user_wallets            -- Wallet balances
wallet_transactions     -- Transaction history
topup_requests          -- Top-up requests
provider_withdrawals    -- Provider withdrawals
payments                -- Payment records
refunds                 -- Refund records

-- Ratings & Reviews
ride_ratings            -- Ride ratings
delivery_ratings        -- Delivery ratings
shopping_ratings        -- Shopping ratings
queue_ratings           -- Queue ratings
moving_ratings          -- Moving ratings
laundry_ratings         -- Laundry ratings

-- Notifications
user_notifications      -- In-app notifications
push_subscriptions      -- Push notification subscriptions
push_notification_queue -- Push notification queue

-- System
admin_audit_log         -- Admin action logs
feature_flags           -- Feature toggles
analytics_events        -- Analytics data
```

### UID System

```
Member UID:   TRD-XXXXXXXX  (users.member_uid)
Provider UID: PRV-XXXXXXXX  (service_providers.provider_uid)
Tracking ID:  XXX-YYYYMMDD-NNNNNN (per service type)

Prefixes:
- CUS: Customer
- DRV: Driver
- RDR: Rider
- RID: Ride Request
- DEL: Delivery Request
- SHP: Shopping Request
- QUE: Queue Booking
- MOV: Moving Request
- LAU: Laundry Request
```

---

## 🔐 Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Supabase   │────▶│  PostgreSQL │
│             │     │    Auth     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │    JWT Token      │    auth.uid()     │
       │◀──────────────────│                   │
       │                   │                   │
       │    API Request    │    RLS Check      │
       │──────────────────▶│──────────────────▶│
       │                   │                   │
       │    Response       │    Filtered Data  │
       │◀──────────────────│◀──────────────────│
```

### RLS Policy Layers

```sql
-- Layer 1: Admin Override
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Layer 2: Provider Access
CREATE POLICY "provider_access" ON table_name
  FOR SELECT TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM service_providers
      WHERE user_id = auth.uid()
    )
  );

-- Layer 3: Customer Access
CREATE POLICY "customer_access" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### Helper Functions

```sql
-- Check if user is admin
CREATE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get provider ID for user
CREATE FUNCTION get_provider_id(user_id UUID) RETURNS UUID AS $$
  SELECT id FROM service_providers
  WHERE user_id = user_id AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 🔄 Realtime Architecture

### Enabled Tables

```
✅ ride_requests        -- Status updates
✅ delivery_requests    -- Status updates
✅ shopping_requests    -- Status updates
✅ queue_bookings       -- Status updates
✅ moving_requests      -- Status updates
✅ laundry_requests     -- Status updates
✅ service_providers    -- Location & status
✅ user_notifications   -- New notifications
✅ wallet_transactions  -- Balance updates
✅ chat_messages        -- Real-time chat
```

### Subscription Pattern

```typescript
// Standard Realtime Subscription
const subscription = supabase
  .channel("channel-name")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "table_name",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      handleChange(payload);
    }
  )
  .subscribe();

// Cleanup on unmount
onUnmounted(() => {
  subscription.unsubscribe();
});
```

---

## 📁 Project Structure

```
thai-ride-app/
├── src/
│   ├── admin/                    # Admin V2 Module
│   │   ├── components/           # Admin components
│   │   │   ├── layout/           # Shell, Sidebar, Header
│   │   │   ├── common/           # Table, Card, Modal
│   │   │   └── verification/     # Verification components
│   │   ├── composables/          # Admin composables
│   │   ├── stores/               # Admin stores
│   │   ├── types/                # Admin types
│   │   ├── views/                # Admin views
│   │   └── router.ts             # Admin router
│   │
│   ├── components/               # Shared components
│   │   ├── customer/             # Customer components
│   │   ├── provider/             # Provider components
│   │   ├── shared/               # Shared components
│   │   └── admin/                # Admin components (legacy)
│   │
│   ├── composables/              # Composables (100+)
│   │   ├── useServices.ts        # Core services
│   │   ├── useProvider.ts        # Provider operations
│   │   ├── useWallet.ts          # Wallet management
│   │   └── ...
│   │
│   ├── views/                    # Views
│   │   ├── customer/             # Customer views
│   │   ├── provider/             # Provider views
│   │   └── Admin*.vue            # Admin views (legacy)
│   │
│   ├── stores/                   # Pinia stores
│   ├── router/                   # Main router
│   ├── lib/                      # Utilities
│   ├── middleware/               # Route guards
│   └── main.ts                   # Entry point
│
├── supabase/
│   ├── migrations/               # Database migrations (200+)
│   └── functions/                # Edge functions
│
└── public/                       # Static assets
```

---

## 🧩 Component Architecture

### Component Hierarchy

```
App.vue
├── AppShell.vue (Customer/Provider)
│   ├── WelcomeHeader.vue
│   ├── [Page Content]
│   └── BottomNavigation.vue
│
└── AdminShell.vue (Admin)
    ├── AdminHeader.vue
    ├── AdminSidebar.vue
    └── [Admin Page Content]
```

### Component Naming Convention

```
Customer:  [Feature]View.vue, [Feature]Card.vue
Provider:  Provider[Feature]View.vue
Admin:     Admin[Feature]View.vue (legacy)
           [Feature]View.vue (in admin/views/)
Shared:    [Component]Name.vue
```

---

## 🔧 Composable Architecture

### Composable Categories

```
Core Services:
├── useServices.ts          # Ride, Delivery, Shopping
├── useDelivery.ts          # Delivery specific
├── useShopping.ts          # Shopping specific
├── useQueueBooking.ts      # Queue booking
├── useMoving.ts            # Moving service
└── useLaundry.ts           # Laundry service

Provider:
├── useProvider.ts          # Provider operations
├── useProviderDashboard.ts # Dashboard data
├── useProviderEarnings.ts  # Earnings & withdrawal
└── useProviderRealtime.ts  # Realtime updates

Admin:
├── useAdmin.ts             # Admin operations (legacy)
├── useAdminAPI.ts          # Admin API (V2)
├── useAdminAuth.ts         # Admin authentication
└── useAdminAnalytics.ts    # Analytics

Shared:
├── useWallet.ts            # Wallet management
├── useNotifications.ts     # Notifications
├── usePushNotifications.ts # Push notifications
├── useRealtime.ts          # Realtime subscriptions
└── useCrossRoleSync.ts     # Cross-role sync
```

### Composable Dependencies

```
useServices
├── useWallet (payment)
├── useNotifications (alerts)
└── useRealtime (status sync)

useProvider
├── useProviderRealtime (job updates)
├── useNotifications (job alerts)
└── useWallet (earnings)

useAdmin
├── useAdminAuth (authentication)
├── useAdminAPI (data operations)
└── useAdminAnalytics (reporting)
```

---

## 📊 Data Flow Architecture

### Service Request Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Customer │───▶│ Supabase │───▶│ Provider │───▶│  Admin   │
│ Creates  │    │ Insert   │    │ Receives │    │  Sees    │
│ Request  │    │ + RLS    │    │ via RT   │    │ via RT   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     │               │               │               │
     ▼               ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Tracking │◀───│ Status   │◀───│ Provider │    │ Override │
│ Updates  │    │ Update   │    │ Updates  │    │ if needed│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Notification Flow

```
Status Change
     │
     ├──▶ Push Notification (if enabled)
     │         │
     │         └──▶ Service Worker ──▶ Device
     │
     ├──▶ In-App Notification
     │         │
     │         └──▶ user_notifications table
     │
     └──▶ Realtime Update
               │
               └──▶ All subscribed clients
```

---

## 🚀 Technology Stack

### Frontend

```
Framework:        Vue 3.4+ (Composition API)
Language:         TypeScript 5.0+
Build Tool:       Vite 5.0+
State:            Pinia 2.1+
Router:           Vue Router 4.2+
Styling:          Tailwind CSS 3.4+
Components:       Custom (150+)
```

### Backend

```
Database:         Supabase (PostgreSQL 15)
Realtime:         Supabase Realtime
Storage:          Supabase Storage
Auth:             Supabase Auth
Functions:        Supabase Edge Functions (Deno)
```

### Infrastructure

```
Hosting:          Vercel
CDN:              Vercel Edge Network
Maps:             Google Maps API
Push:             Web Push API
PWA:              Workbox
Monitoring:       Sentry
```

---

## 📈 Scalability Considerations

### Database

```
- Connection pooling via Supabase
- Indexed queries for common operations
- Partitioning for large tables (future)
- Read replicas (future)
```

### Frontend

```
- Code splitting by route
- Lazy loading components
- Virtual scrolling for lists
- Image optimization
- Service worker caching
```

### Realtime

```
- Channel-based subscriptions
- Filtered subscriptions (reduce payload)
- Reconnection handling
- Offline queue
```

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
