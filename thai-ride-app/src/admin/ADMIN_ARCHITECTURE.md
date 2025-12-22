# 🏗️ Admin Dashboard Architecture V2

## Overview

ระบบ Admin Dashboard ใหม่ออกแบบตามหลัก Software Engineering ที่ดี:
- **Modular Design** - แยก modules ตาม domain
- **Clean Architecture** - แยก layers ชัดเจน
- **Security First** - RBAC, Audit, Session Management
- **Performance Optimized** - Lazy loading, caching

---

## 📁 Directory Structure

```
src/admin/
├── index.ts                    # Admin module entry point
├── router.ts                   # Admin routes configuration
├── types/                      # TypeScript types
│   ├── index.ts
│   ├── auth.types.ts
│   ├── user.types.ts
│   └── order.types.ts
├── composables/                # Admin-specific composables
│   ├── useAdminAuth.ts         # Authentication
│   ├── useAdminRBAC.ts         # Role-based access control
│   ├── useAdminSession.ts      # Session management
│   └── useAdminAudit.ts        # Audit logging
├── stores/                     # Pinia stores
│   ├── adminAuth.store.ts
│   └── adminUI.store.ts
├── components/                 # Shared admin components
│   ├── layout/
│   │   ├── AdminShell.vue      # Main layout wrapper
│   │   ├── AdminSidebar.vue    # Sidebar navigation
│   │   ├── AdminHeader.vue     # Top header
│   │   └── AdminBreadcrumb.vue
│   ├── common/
│   │   ├── AdminCard.vue
│   │   ├── AdminTable.vue
│   │   ├── AdminModal.vue
│   │   ├── AdminButton.vue
│   │   ├── AdminBadge.vue
│   │   └── AdminStats.vue
│   └── forms/
│       ├── AdminInput.vue
│       ├── AdminSelect.vue
│       └── AdminDatePicker.vue
├── modules/                    # Feature modules
│   ├── dashboard/
│   │   ├── DashboardView.vue
│   │   └── components/
│   ├── users/
│   │   ├── CustomersView.vue
│   │   ├── ProvidersView.vue
│   │   └── components/
│   ├── orders/
│   │   ├── OrdersView.vue
│   │   ├── OrderDetailView.vue
│   │   └── components/
│   ├── finance/
│   │   ├── RevenueView.vue
│   │   ├── PaymentsView.vue
│   │   ├── WalletsView.vue
│   │   └── components/
│   ├── marketing/
│   │   ├── PromosView.vue
│   │   ├── LoyaltyView.vue
│   │   └── components/
│   ├── support/
│   │   ├── TicketsView.vue
│   │   ├── FeedbackView.vue
│   │   └── components/
│   ├── analytics/
│   │   ├── AnalyticsView.vue
│   │   ├── ReportsView.vue
│   │   └── components/
│   └── settings/
│       ├── SettingsView.vue
│       ├── SecurityView.vue
│       └── components/
└── views/                      # Entry views
    └── AdminLoginView.vue
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN AUTH FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User visits /admin/login                                │
│     ↓                                                       │
│  2. Enter credentials (email + password)                    │
│     ↓                                                       │
│  3. Validate against Supabase Auth                          │
│     ↓                                                       │
│  4. Check admin role in users table                         │
│     ↓                                                       │
│  5. Create session (JWT + localStorage)                     │
│     ↓                                                       │
│  6. Redirect to /admin/dashboard                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

| Role | Level | Permissions |
|------|-------|-------------|
| `super_admin` | 100 | Full access, system config, user management |
| `admin` | 80 | All operations except system config |
| `manager` | 60 | View all, edit orders/users, limited settings |
| `support` | 40 | View all, respond to tickets, limited edit |
| `viewer` | 20 | Read-only access |

### Permission Matrix

| Module | super_admin | admin | manager | support | viewer |
|--------|-------------|-------|---------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users - View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users - Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Users - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Orders - View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Orders - Edit | ✅ | ✅ | ✅ | ✅ | ❌ |
| Finance - View | ✅ | ✅ | ✅ | ❌ | ❌ |
| Finance - Refund | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| System Config | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🎨 UI/UX Design

### Color Palette (Admin Theme)

```css
:root {
  /* Primary */
  --admin-primary: #00A86B;
  --admin-primary-hover: #008F5B;
  --admin-primary-light: #E8F5EF;
  
  /* Neutral */
  --admin-bg: #F5F7FA;
  --admin-surface: #FFFFFF;
  --admin-border: #E5E7EB;
  
  /* Text */
  --admin-text-primary: #1F2937;
  --admin-text-secondary: #6B7280;
  --admin-text-muted: #9CA3AF;
  
  /* Status */
  --admin-success: #10B981;
  --admin-warning: #F59E0B;
  --admin-error: #EF4444;
  --admin-info: #3B82F6;
}
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header (56px)                                    [User] [⚙] │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │              Main Content                    │
│   (260px)    │                                              │
│              │  ┌────────────────────────────────────────┐  │
│  [Dashboard] │  │ Breadcrumb: Admin > Users > Customers  │  │
│  [Users]     │  ├────────────────────────────────────────┤  │
│  [Orders]    │  │                                        │  │
│  [Finance]   │  │           Page Content                 │  │
│  [Marketing] │  │                                        │  │
│  [Support]   │  │                                        │  │
│  [Analytics] │  │                                        │  │
│  [Settings]  │  │                                        │  │
│              │  └────────────────────────────────────────┘  │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 📊 Module Breakdown

### 1. Dashboard Module
- Overview stats (orders, revenue, users)
- Real-time activity feed
- Quick actions
- Charts (daily/weekly/monthly)

### 2. Users Module
- **Customers**: List, search, filter, view details, edit
- **Providers**: List, approve/reject, verify documents
- **Verification Queue**: Pending provider applications

### 3. Orders Module
- **All Orders**: Rides, Delivery, Shopping, Queue, Moving, Laundry
- **Order Detail**: Full order info, timeline, actions
- **Cancellations**: Cancelled orders, reasons, refunds

### 4. Finance Module
- **Revenue**: Dashboard, charts, breakdown
- **Payments**: Transaction history
- **Wallets**: User wallets, top-ups
- **Withdrawals**: Provider withdrawal requests
- **Refunds**: Refund requests and processing

### 5. Marketing Module
- **Promos**: Create/edit promo codes
- **Referrals**: Referral program stats
- **Loyalty**: Points, tiers, rewards
- **Incentives**: Provider bonuses

### 6. Support Module
- **Tickets**: Support tickets
- **Feedback**: Customer feedback, NPS
- **Ratings**: Service ratings
- **Fraud Alerts**: Suspicious activity

### 7. Analytics Module
- **Overview**: Key metrics
- **Reports**: Generate reports
- **User Journey**: Funnel analysis
- **UX Analytics**: User behavior

### 8. Settings Module
- **General**: App settings
- **Notifications**: Push, templates
- **Service Areas**: Geographic coverage
- **Security**: Audit log, sessions
- **System Health**: Monitoring

---

## 🔄 State Management

### Pinia Stores

```typescript
// adminAuth.store.ts
interface AdminAuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  permissions: Permission[]
  session: AdminSession | null
}

// adminUI.store.ts
interface AdminUIState {
  sidebarCollapsed: boolean
  currentModule: string
  breadcrumbs: Breadcrumb[]
  notifications: Notification[]
}
```

---

## 🚀 Performance Optimizations

1. **Lazy Loading**: All modules loaded on-demand
2. **Route-based Code Splitting**: Each module is a separate chunk
3. **Caching**: API responses cached with TTL
4. **Virtual Scrolling**: For large data tables
5. **Debounced Search**: Prevent excessive API calls
6. **Optimistic Updates**: Instant UI feedback

---

## 📝 Implementation Checklist

### Phase 1: Foundation
- [ ] Create admin directory structure
- [ ] Setup admin router
- [ ] Create AdminShell layout
- [ ] Implement authentication
- [ ] Create base components

### Phase 2: Core Modules
- [ ] Dashboard module
- [ ] Users module (Customers, Providers)
- [ ] Orders module

### Phase 3: Finance & Marketing
- [ ] Finance module
- [ ] Marketing module

### Phase 4: Support & Analytics
- [ ] Support module
- [ ] Analytics module

### Phase 5: Settings & Polish
- [ ] Settings module
- [ ] RBAC implementation
- [ ] Audit logging
- [ ] Performance optimization

---

## 🔗 API Endpoints

All admin APIs use RPC functions for security:

| Function | Description |
|----------|-------------|
| `admin_get_dashboard_stats` | Dashboard overview |
| `admin_get_customers` | List customers with pagination |
| `admin_get_providers` | List providers with filters |
| `admin_get_orders` | List all orders |
| `admin_update_order_status` | Update order status |
| `admin_approve_provider` | Approve provider application |
| `admin_get_revenue_stats` | Revenue analytics |
| `admin_create_promo` | Create promo code |
| `admin_get_audit_log` | Audit log entries |

---

## 🛡️ Security Measures

1. **Session Management**: 8-hour TTL, auto-logout
2. **Rate Limiting**: Max 5 login attempts, 1-min lockout
3. **Audit Logging**: All admin actions logged
4. **RBAC**: Permission-based access control
5. **Input Validation**: Server-side validation
6. **HTTPS Only**: Secure connections
7. **CSP Headers**: Content Security Policy

