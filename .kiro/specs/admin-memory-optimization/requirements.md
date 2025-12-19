# Requirements Document: Admin Dashboard Memory Optimization

## Introduction

This specification addresses critical memory leaks in the Thai Ride Admin Dashboard that prevent 50-session stability. The admin dashboard currently experiences 5-10MB memory growth per route transition, accumulating 250-500 active subscriptions and 200+ active timers over extended use. This refactoring will implement systematic memory cleanup across all 72 admin routes to achieve < 1MB memory growth per transition and zero memory leaks.

## Glossary

- **Admin Dashboard**: The administrative interface at `/admin/*` for managing the Thai Ride platform
- **Route Transition**: Navigation from one admin view to another
- **Memory Leak**: Failure to release memory when components are unmounted
- **Realtime Subscription**: Supabase channel subscription for live data updates
- **Session**: A continuous period of admin dashboard usage
- **50-Session Stability**: Ability to navigate 50+ times without memory degradation
- **Cleanup**: Process of releasing resources when leaving a route
- **Shared State**: Reactive refs that persist across multiple component instances
- **useAdmin**: Core composable providing admin functionality across views
- **AdminLayout**: Shared layout component wrapping all admin routes

## Requirements

### Requirement 1: Core Infrastructure Memory Management

**User Story:** As a system administrator, I want the admin dashboard to maintain stable memory usage during extended sessions, so that I can work efficiently without browser slowdowns or crashes.

#### Acceptance Criteria

1. WHEN an admin navigates between routes, THE System SHALL release all memory allocated by the previous route
2. WHEN AdminLayout.vue unmounts, THE System SHALL clear all sidebar state and dispose computed properties
3. WHEN session validation occurs, THE System SHALL cache the result for 1 minute to avoid repeated localStorage access
4. THE System SHALL provide a universal cleanup utility (useAdminCleanup) for all admin views
5. WHEN a route transition occurs, THE System SHALL dispatch a cleanup event that views can listen to

### Requirement 2: Realtime Subscription Management

**User Story:** As a system administrator, I want realtime subscriptions to be properly cleaned up when I leave a view, so that the system doesn't accumulate hundreds of active connections.

#### Acceptance Criteria

1. WHEN a view with realtime subscriptions unmounts, THE System SHALL unsubscribe from all Supabase channels
2. WHEN AdminOrdersView unmounts, THE System SHALL unsubscribe from ride_requests, delivery_requests, and shopping_requests channels
3. WHEN AdminTopupRequestsView unmounts, THE System SHALL unsubscribe from topup_requests channel
4. WHEN AdminDriverTrackingView unmounts, THE System SHALL unsubscribe from provider location updates
5. WHEN any admin view unmounts, THE System SHALL ensure zero active subscriptions remain from that view

### Requirement 3: Shared State Isolation

**User Story:** As a system administrator, I want each admin view to have isolated state, so that data from one view doesn't pollute another view.

#### Acceptance Criteria

1. WHEN useAdmin.ts is called, THE System SHALL return fresh state instances instead of shared refs
2. WHEN a view using useAdmin unmounts, THE System SHALL provide a cleanup function to reset state
3. THE System SHALL NOT use module-level reactive refs that persist across component instances
4. WHEN navigating from Dashboard to Orders and back, THE System SHALL show fresh data without stale state
5. WHEN stats, recentOrders, or recentUsers refs are accessed, THE System SHALL ensure they are scoped to the current component instance

### Requirement 4: Timer and Interval Cleanup

**User Story:** As a system administrator, I want all timers and intervals to be cleared when I leave a view, so that background processes don't accumulate.

#### Acceptance Criteria

1. WHEN a view with setInterval unmounts, THE System SHALL clear all intervals created by that view
2. WHEN a view with setTimeout unmounts, THE System SHALL clear all timeouts created by that view
3. WHEN AdminDriverTrackingView unmounts, THE System SHALL clear the 10-second location polling interval
4. WHEN AdminPerformanceView unmounts, THE System SHALL clear the 30-second metrics update interval
5. THE useAdminCleanup composable SHALL track and automatically clear all registered intervals and timeouts

### Requirement 5: Data Array Cleanup

**User Story:** As a system administrator, I want large data arrays to be cleared when I leave a view, so that memory is freed for other operations.

#### Acceptance Criteria

1. WHEN AdminOrdersView unmounts, THE System SHALL clear the orders array
2. WHEN AdminCustomersView unmounts, THE System SHALL clear the customers array
3. WHEN AdminProvidersView unmounts, THE System SHALL clear the providers array
4. WHEN any financial view unmounts, THE System SHALL clear all sensitive financial data arrays
5. WHEN a view unmounts, THE System SHALL reset all filter states and search queries

### Requirement 6: Session Management Optimization

**User Story:** As a system administrator, I want session validation to be efficient, so that route transitions are fast and don't cause unnecessary localStorage access.

#### Acceptance Criteria

1. WHEN the admin dashboard loads, THE System SHALL validate the session once and cache the result
2. THE System SHALL revalidate the session only after the 1-minute cache expires
3. WHEN navigating between admin routes, THE System SHALL NOT perform session validation on every route mount
4. WHEN the session expires (8 hours), THE System SHALL clear the cache and redirect to login
5. THE System SHALL reduce localStorage access from 3,600 checks per 50 sessions to approximately 50 checks

### Requirement 7: High-Traffic Route Optimization

**User Story:** As a system administrator, I want frequently accessed routes (Dashboard, Orders, Customers, Providers) to have minimal memory overhead, so that navigation feels instant.

#### Acceptance Criteria

1. WHEN AdminDashboardView unmounts, THE System SHALL clear stats and recentOrders refs
2. WHEN AdminOrdersView unmounts, THE System SHALL unsubscribe from 3 realtime channels and clear order data
3. WHEN AdminCustomersView unmounts, THE System SHALL clear customer data, notes, and tags
4. WHEN AdminProvidersView unmounts, THE System SHALL clear provider data and external notification subscriptions
5. WHEN navigating between these 4 high-traffic routes, THE System SHALL maintain memory growth below 1MB per transition

### Requirement 8: Financial Data Security

**User Story:** As a system administrator, I want sensitive financial data to be completely cleared from memory when I leave financial views, so that data security is maintained.

#### Acceptance Criteria

1. WHEN any financial view unmounts, THE System SHALL clear all payment, refund, and transaction data
2. WHEN AdminTopupRequestsView unmounts, THE System SHALL clear topup request data and unsubscribe from realtime updates
3. WHEN AdminPaymentsView unmounts, THE System SHALL clear payment data and reset total calculations
4. WHEN AdminWalletsView unmounts, THE System SHALL clear wallet balance and transaction data
5. THE System SHALL ensure no sensitive financial data persists in memory after unmount

### Requirement 9: Map and Geolocation Cleanup

**User Story:** As a system administrator, I want map instances and location tracking to be properly disposed when I leave map views, so that geolocation resources are released.

#### Acceptance Criteria

1. WHEN AdminDriverTrackingView unmounts, THE System SHALL clear all map markers and overlays
2. WHEN AdminLiveMapView unmounts, THE System SHALL dispose the map instance
3. WHEN any map view unmounts, THE System SHALL stop all location polling intervals
4. WHEN AdminDriverTrackingView unmounts, THE System SHALL unsubscribe from provider location realtime updates
5. THE System SHALL ensure map-related memory is fully released on unmount

### Requirement 10: Performance Monitoring and Validation

**User Story:** As a system administrator, I want to monitor memory usage and validate that cleanup is working, so that I can ensure long-term stability.

#### Acceptance Criteria

1. WHEN in development mode, THE System SHALL log cleanup operations to the console
2. WHEN a view unmounts, THE System SHALL log the number of subscriptions, intervals, and cleanup functions executed
3. THE System SHALL provide a way to monitor active Supabase channels in development mode
4. WHEN memory profiling is enabled, THE System SHALL track memory growth per route transition
5. THE System SHALL achieve < 1MB memory growth per route transition after all optimizations

### Requirement 11: Universal Cleanup Pattern

**User Story:** As a developer, I want a consistent cleanup pattern for all admin views, so that new views automatically follow best practices.

#### Acceptance Criteria

1. THE System SHALL provide useAdminCleanup composable with addSubscription, addInterval, addTimeout, and addCleanup methods
2. WHEN useAdminCleanup is used in a component, THE System SHALL automatically execute all cleanup on unmount
3. THE System SHALL provide TypeScript types for all cleanup functions
4. THE System SHALL handle cleanup errors gracefully without breaking the application
5. WHEN a new admin view is created, THE developer SHALL be able to add cleanup by importing useAdminCleanup

### Requirement 12: Router Guard Integration

**User Story:** As a system administrator, I want route transitions to automatically trigger cleanup, so that no manual intervention is needed.

#### Acceptance Criteria

1. WHEN navigating away from an admin route, THE System SHALL dispatch a 'route-cleanup' event
2. THE System SHALL provide a global afterEach router guard that triggers cleanup
3. WHEN a route has requiresCleanup meta, THE System SHALL ensure cleanup is executed
4. THE System SHALL track route transitions for analytics purposes
5. WHEN cleanup fails, THE System SHALL log the error but allow navigation to proceed

### Requirement 13: Chart and Visualization Cleanup

**User Story:** As a system administrator, I want chart instances to be properly disposed when I leave analytics views, so that chart libraries don't leak memory.

#### Acceptance Criteria

1. WHEN AdminAnalyticsView unmounts, THE System SHALL dispose all chart instances
2. WHEN AdminReportsView unmounts, THE System SHALL clear chart data and dispose chart objects
3. WHEN AdminUXAnalyticsView unmounts, THE System SHALL clear event logs and dispose visualizations
4. WHEN AdminRevenueDashboardView unmounts, THE System SHALL dispose revenue charts
5. THE System SHALL ensure chart library memory is fully released on unmount

### Requirement 14: Form and Modal State Cleanup

**User Story:** As a system administrator, I want form data and modal states to be cleared when I leave a view, so that stale form data doesn't appear when I return.

#### Acceptance Criteria

1. WHEN a view with forms unmounts, THE System SHALL reset all form fields to initial values
2. WHEN a view with modals unmounts, THE System SHALL close all open modals and clear modal state
3. WHEN AdminCustomersView unmounts, THE System SHALL clear customer note forms and tag selection
4. WHEN AdminProvidersView unmounts, THE System SHALL clear verification forms and document uploads
5. THE System SHALL ensure no form validation errors persist after unmount

### Requirement 15: 50-Session Stability Achievement

**User Story:** As a system administrator, I want to navigate through the admin dashboard 50+ times without experiencing slowdowns, so that I can work efficiently throughout my shift.

#### Acceptance Criteria

1. WHEN an admin navigates 50 times between different routes, THE System SHALL maintain memory growth below 50MB total
2. WHEN memory profiling is performed after 50 navigations, THE System SHALL show zero active subscriptions
3. WHEN memory profiling is performed after 50 navigations, THE System SHALL show zero active intervals
4. WHEN an admin uses the dashboard for an extended session, THE System SHALL maintain responsive navigation (< 100ms per transition)
5. THE System SHALL achieve 50-session stability with no console errors or warnings
