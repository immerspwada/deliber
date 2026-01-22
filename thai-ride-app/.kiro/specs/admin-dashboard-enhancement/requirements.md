# Admin Dashboard Enhancement - Requirements

**Date**: 2026-01-22  
**Status**: 📋 Planning  
**Priority**: 🔥 High

---

## 📋 Overview

Enhance the admin dashboard to provide better insights, real-time monitoring, and quick access to critical operations. Transform it from a basic landing page into a powerful command center.

---

## 🎯 Goals

1. **Real-Time Insights** - Live statistics and metrics
2. **Quick Actions** - One-click access to common tasks
3. **Alert System** - Immediate notification of issues requiring attention
4. **Performance Monitoring** - Track key business metrics
5. **Modern Design** - Consistent with new design system

---

## 👤 User Personas

### Primary: Platform Administrator

- **Needs**: Overview of platform health, pending tasks, critical alerts
- **Pain Points**: Too many clicks to reach important data, no real-time updates
- **Goals**: Quickly identify and resolve issues, monitor business metrics

### Secondary: Operations Manager

- **Needs**: Financial overview, order statistics, provider performance
- **Pain Points**: Manual data gathering, delayed insights
- **Goals**: Make data-driven decisions, optimize operations

---

## 🎨 User Stories

### US-1: Real-Time Statistics Dashboard

**As an** admin  
**I want** to see real-time platform statistics on the dashboard  
**So that** I can quickly understand the current state of the platform

**Acceptance Criteria:**

- [ ] Display total users (customers + providers)
- [ ] Show active orders/rides count
- [ ] Display today's revenue
- [ ] Show pending approvals count
- [ ] Auto-refresh every 30 seconds
- [ ] Visual indicators for trends (up/down arrows)
- [ ] Clickable cards that navigate to detail views

**Priority**: 🔥 Critical

---

### US-2: Pending Actions Alert System

**As an** admin  
**I want** to see all pending actions requiring my attention  
**So that** I can prioritize and complete urgent tasks

**Acceptance Criteria:**

- [ ] Show pending top-up requests count
- [ ] Display pending withdrawal requests
- [ ] Show pending provider approvals
- [ ] Display unresolved support tickets
- [ ] Color-coded urgency levels (red, yellow, green)
- [ ] One-click navigation to action page
- [ ] Badge notifications on sidebar menu

**Priority**: 🔥 Critical

---

### US-3: Quick Actions Panel

**As an** admin  
**I want** quick access to common administrative tasks  
**So that** I can perform frequent operations efficiently

**Acceptance Criteria:**

- [ ] Create new promotion
- [ ] Send platform notification
- [ ] View recent orders
- [ ] Access financial reports
- [ ] Manage service areas
- [ ] Configure system settings
- [ ] Large, touch-friendly buttons
- [ ] Icon + text labels

**Priority**: 🎯 High

---

### US-4: Revenue & Financial Overview

**As an** admin  
**I want** to see financial metrics and trends  
**So that** I can monitor business performance

**Acceptance Criteria:**

- [ ] Today's revenue
- [ ] This week's revenue
- [ ] This month's revenue
- [ ] Revenue trend chart (last 7 days)
- [ ] Commission earned
- [ ] Pending payouts
- [ ] Top revenue sources (ride, delivery, etc.)
- [ ] Export financial data button

**Priority**: 🎯 High

---

### US-5: Platform Health Monitoring

**As an** admin  
**I want** to monitor platform health and performance  
**So that** I can identify and resolve issues proactively

**Acceptance Criteria:**

- [ ] Active users count (online now)
- [ ] Active providers count (online now)
- [ ] Average response time
- [ ] Error rate (last hour)
- [ ] Database connection status
- [ ] Storage usage
- [ ] API health status
- [ ] Visual health indicators (green/yellow/red)

**Priority**: 🎯 High

---

### US-6: Recent Activity Feed

**As an** admin  
**I want** to see recent platform activity  
**So that** I can stay informed about what's happening

**Acceptance Criteria:**

- [ ] Last 10 orders/rides
- [ ] Recent user registrations
- [ ] Recent provider applications
- [ ] Recent top-up requests
- [ ] Recent withdrawals
- [ ] Timestamp for each activity
- [ ] User/provider name and action
- [ ] Click to view details

**Priority**: 🎯 Medium

---

### US-7: Performance Charts

**As an** admin  
**I want** to see visual charts of key metrics  
**So that** I can identify trends and patterns

**Acceptance Criteria:**

- [ ] Revenue trend chart (line chart)
- [ ] Orders by service type (pie chart)
- [ ] User growth chart (area chart)
- [ ] Provider performance chart (bar chart)
- [ ] Time period selector (day, week, month)
- [ ] Interactive tooltips
- [ ] Responsive design
- [ ] Export chart as image

**Priority**: 🎯 Medium

---

## 🎨 Design Mockup Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                    [Profile] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🚨 Pending Actions (5)                                  │ │
│ │ • 3 Top-up requests awaiting approval                   │ │
│ │ • 2 Provider applications pending review                │ │
│ │ [View All Pending →]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 👥 Users │ │ 🚗 Active│ │ 💰 Today │ │ ⏳ Pending│        │
│ │  12,345  │ │  Orders  │ │ Revenue  │ │ Approvals│        │
│ │  ↑ 12%   │ │    45    │ │ ฿25,000  │ │     5    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📊 Revenue Trend        │ │ 🎯 Quick Actions            │ │
│ │ [Line Chart]            │ │ • Create Promotion          │ │
│ │                         │ │ • Send Notification         │ │
│ │                         │ │ • View Reports              │ │
│ │                         │ │ • Manage Settings           │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 📋 Recent Activity      │ │ 🏥 Platform Health          │ │
│ │ • Order #1234 completed │ │ • Active Users: 234         │ │
│ │ • New user registered   │ │ • Active Providers: 45      │ │
│ │ • Top-up approved       │ │ • Response Time: 120ms      │ │
│ │ [View All →]            │ │ • Status: ✅ Healthy        │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Requirements

### Database Queries

#### Dashboard Statistics

```sql
-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_customers', (SELECT COUNT(*) FROM users WHERE role = 'customer'),
    'total_providers', (SELECT COUNT(*) FROM providers_v2 WHERE status = 'approved'),
    'active_orders', (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'accepted', 'in_progress')),
    'today_revenue', (SELECT COALESCE(SUM(total_fare), 0) FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'),
    'pending_topups', (SELECT COUNT(*) FROM topup_requests WHERE status = 'pending'),
    'pending_withdrawals', (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending'),
    'pending_providers', (SELECT COUNT(*) FROM providers_v2 WHERE status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Revenue Trend

```sql
-- Get revenue trend (last 7 days)
CREATE OR REPLACE FUNCTION get_revenue_trend(days INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  revenue DECIMAL(12,2),
  order_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COALESCE(SUM(total_fare), 0) as revenue,
    COUNT(*)::INT as order_count
  FROM ride_requests
  WHERE status = 'completed'
    AND created_at >= CURRENT_DATE - days
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Real-Time Updates

Use Supabase Realtime for live updates:

```typescript
// Subscribe to order changes
const orderSubscription = supabase
  .channel("dashboard-orders")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "ride_requests",
    },
    (payload) => {
      // Update dashboard stats
      refreshStats();
    },
  )
  .subscribe();

// Subscribe to topup requests
const topupSubscription = supabase
  .channel("dashboard-topups")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "topup_requests",
    },
    (payload) => {
      // Show notification
      showNotification("New top-up request");
      refreshPendingCount();
    },
  )
  .subscribe();
```

### Chart Library

Use Chart.js or Apache ECharts:

```typescript
import { Line, Pie, Bar } from "vue-chartjs";

// Revenue trend chart
const revenueChartData = {
  labels: dates,
  datasets: [
    {
      label: "Revenue",
      data: revenues,
      borderColor: "rgb(59, 130, 246)",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      tension: 0.4,
    },
  ],
};
```

---

## 🎨 Component Structure

```
src/admin/views/
├── DashboardView.vue                 # Main dashboard
└── components/
    ├── DashboardStats.vue            # Stats cards
    ├── PendingActionsAlert.vue       # Alert banner
    ├── QuickActionsPanel.vue         # Quick action buttons
    ├── RevenueChart.vue              # Revenue trend chart
    ├── RecentActivityFeed.vue        # Activity list
    ├── PlatformHealthStatus.vue      # Health indicators
    └── OrdersByTypeChart.vue         # Pie chart
```

---

## 📊 Performance Requirements

### Load Time

- Initial page load: < 2 seconds
- Stats refresh: < 500ms
- Chart rendering: < 1 second

### Real-Time Updates

- WebSocket connection established within 1 second
- Updates reflected within 2 seconds of database change
- No UI blocking during updates

### Data Freshness

- Stats auto-refresh every 30 seconds
- Manual refresh button available
- Last updated timestamp displayed

---

## ♿ Accessibility Requirements

- [ ] All stats cards keyboard navigable
- [ ] Charts have text alternatives
- [ ] Color not sole indicator of status
- [ ] ARIA labels on all interactive elements
- [ ] Screen reader announcements for updates
- [ ] High contrast mode support

---

## 📱 Responsive Design

### Mobile (< 640px)

- Stack all cards vertically
- Simplified charts (smaller data points)
- Collapsible sections
- Touch-friendly buttons (min 44px)

### Tablet (640px - 1024px)

- 2-column grid for stats cards
- Side-by-side charts
- Adequate spacing

### Desktop (> 1024px)

- 4-column grid for stats cards
- Full-width charts
- Sidebar for quick actions

---

## 🔐 Security & Permissions

### Admin Role Verification

```typescript
// Verify admin access
const { user } = useAuthStore();
if (user?.role !== "admin") {
  router.push("/admin/unauthorized");
}
```

### RLS Policies

All dashboard functions must verify admin role:

```sql
-- Example RLS check in function
IF NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid() AND role = 'admin'
) THEN
  RAISE EXCEPTION 'Access denied. Admin privileges required.';
END IF;
```

---

## ✅ Definition of Done

- [ ] All user stories implemented
- [ ] Real-time updates working
- [ ] Charts rendering correctly
- [ ] Mobile responsive
- [ ] Accessibility compliant (WCAG 2.1 AA)
- [ ] Performance metrics met
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Code review approved

---

## 🎯 Success Metrics

### User Experience

- Time to find critical information: < 5 seconds
- Task completion rate: > 95%
- User satisfaction score: > 4.5/5

### Technical

- Page load time: < 2s
- Real-time update latency: < 2s
- Error rate: < 0.1%
- Uptime: > 99.9%

### Business

- Reduced response time to pending actions
- Increased admin productivity
- Better decision-making with real-time data

---

## 📚 Related Documentation

- [Admin Settings UX Redesign](../admin-settings-ux-redesign/requirements.md)
- [Table Design System](../admin-ui-consistency/TABLE-DESIGN-SYSTEM.md)
- [Design Tokens](../../src/admin/styles/design-tokens.ts)

---

**Created**: 2026-01-22  
**Status**: 📋 Ready for Implementation  
**Estimated Effort**: 2-3 weeks
