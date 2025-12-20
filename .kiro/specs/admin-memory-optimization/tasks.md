# Implementation Plan: Admin Dashboard Memory Optimization

## Overview

This implementation plan transforms the admin dashboard memory optimization design into actionable coding tasks. The plan follows a 5-phase approach, starting with core infrastructure that provides the highest impact (60% of leaks), then progressively addressing high-traffic routes, financial routes, service management, and lower-priority routes.

Each task builds incrementally, with property-based tests integrated throughout to catch errors early. The plan assumes all context documents (requirements.md, design.md) are available during implementation.

## Tasks

- [x] 1. Create useAdminCleanup composable
  - Create `src/composables/useAdminCleanup.ts` with cleanup tracking
  - Implement addSubscription, addInterval, addTimeout, addCleanup methods
  - Add automatic cleanup on unmount using onUnmounted hook
  - Add error handling for failed cleanup operations
  - Add development mode logging
  - _Requirements: 1.4, 11.1, 11.2, 11.4_

- [ ] 1.1 Write property test for useAdminCleanup
  - **Property 10: useAdminCleanup Auto-Execution**
  - **Validates: Requirements 11.2, 11.4**
  - Test that all registered cleanup functions execute on unmount
  - Test error handling doesn't break cleanup chain
  - _Requirements: 11.2, 11.4_

- [x] 2. Implement session caching in router guards
  - Add session cache variables (cachedAdminSessionValid, adminSessionCacheTime)
  - Implement isAdminSessionValid() with 1-minute caching
  - Add global beforeEach guard for admin auth check
  - Add global afterEach guard to dispatch 'route-cleanup' event
  - Clear cache when leaving admin routes
  - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.5, 12.1, 12.2_

- [ ] 2.1 Write property test for session caching
  - **Property 3: Session Validation Caching**
  - **Validates: Requirements 1.3, 6.2, 6.3, 6.5**
  - Test localStorage accessed only once per minute
  - Test cache invalidation after 1 minute
  - _Requirements: 1.3, 6.2, 6.3, 6.5_

- [ ] 2.2 Write property test for cleanup event dispatch
  - **Property 9: Cleanup Event Dispatch**
  - **Validates: Requirements 1.5, 12.1**
  - Test event dispatched on every route transition
  - Test event contains correct from/to paths
  - _Requirements: 1.5, 12.1_

- [ ] 3. Optimize AdminLayout.vue
  - Convert menuSections to computed property for memoization
  - Add computed property for flattened menuItems
  - Add onUnmounted hook to clear sidebar state
  - Remove session check from onMounted (now handled by router guard)
  - _Requirements: 1.2_

- [x] 4. Refactor useAdmin.ts for state isolation
  - Move all module-level refs inside useAdmin function
  - Create fresh state instances on each call
  - Add cleanup() function to reset all state
  - Remove demo mode checks from hot paths (cache demo mode)
  - Add TypeScript types for all return values
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 4.1 Write property test for state isolation
  - **Property 4: State Isolation**
  - **Validates: Requirements 3.1, 3.2, 3.5**
  - Test each useAdmin call returns different instances
  - Test modifying one instance doesn't affect another
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 5. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix AdminDashboardView.vue
  - Import and use useAdminCleanup
  - Add cleanup for stats ref
  - Add cleanup for recentOrders array
  - Reset loading states in cleanup
  - Test navigation to/from dashboard
  - _Requirements: 7.1_

- [ ] 6.1 Write unit test for AdminDashboardView cleanup
  - Test stats cleared on unmount
  - Test recentOrders cleared on unmount
  - Test loading state reset
  - _Requirements: 7.1_

- [x] 7. Fix AdminOrdersView.vue (CRITICAL)
  - Import and use useAdminCleanup
  - Track 3 realtime channels (ride, delivery, shopping)
  - Add cleanup for orders array
  - Add cleanup for filteredOrders array
  - Reset statusFilter and searchQuery
  - Clear selectedOrder
  - _Requirements: 2.2, 7.2_

- [ ] 7.1 Write property test for realtime subscription cleanup
  - **Property 2: Realtime Subscription Cleanup**
  - **Validates: Requirements 2.1, 2.5**
  - Test subscriptions decrease after unmount
  - Test works for any view with subscriptions
  - _Requirements: 2.1, 2.5_

- [ ] 7.2 Write unit test for AdminOrdersView cleanup
  - Test 3 channels unsubscribed on unmount
  - Test orders array cleared
  - Test filters reset
  - _Requirements: 2.2, 7.2_

- [x] 8. Fix AdminCustomersView.vue
  - Import and use useAdminCleanup
  - Add cleanup for customers array
  - Clear selectedCustomer
  - Reset filters object
  - Clear selectedTags array
  - Clear customerNotes array
  - _Requirements: 7.3_

- [ ] 8.1 Write unit test for AdminCustomersView cleanup
  - Test customers array cleared
  - Test filters reset
  - Test tags cleared
  - _Requirements: 7.3_

- [x] 9. Fix AdminProvidersView.vue
  - Import and use useAdminCleanup
  - Add cleanup for providers array
  - Clear selectedProvider
  - Unsubscribe external notification subscriptions
  - Reset verification queue
  - Clear filters
  - _Requirements: 7.4_

- [ ] 9.1 Write unit test for AdminProvidersView cleanup
  - Test providers array cleared
  - Test external notifications unsubscribed
  - Test verification queue reset
  - _Requirements: 7.4_

- [ ] 10. Checkpoint - Verify high-traffic routes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10.1 Write property test for memory release
  - **Property 1: Memory Release on Route Transition**
  - **Validates: Requirements 1.1, 7.5, 10.5, 15.1**
  - Test memory growth < 1MB for any route pair
  - Test across high-traffic routes specifically
  - _Requirements: 1.1, 7.5, 10.5, 15.1_

- [x] 11. Fix AdminTopupRequestsView.vue (CRITICAL)
  - Import and use useAdminCleanup
  - Track topup_requests realtime channel
  - Add cleanup for topupRequests array
  - Clear selectedRequest
  - Reset totalAmount to 0
  - Reset statusFilter and dateRange
  - _Requirements: 8.2_

- [ ] 11.1 Write unit test for AdminTopupRequestsView cleanup
  - Test realtime channel unsubscribed
  - Test sensitive data cleared
  - Test no data persists in memory
  - _Requirements: 8.2_

- [x] 12. Fix AdminPaymentsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for payments array
  - Clear selectedPayment
  - Reset totalRevenue and totalRefunds to 0
  - Reset paymentFilters
  - _Requirements: 8.3_

- [x] 13. Fix AdminRefundsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for refunds array
  - Clear selectedRefund
  - Reset refund calculations
  - Reset filters
  - _Requirements: 8.1_

- [x] 14. Fix AdminWalletsView.vue (already had cleanup)
  - Import and use useAdminCleanup
  - Add cleanup for wallets array
  - Clear wallet balance data
  - Reset filters
  - _Requirements: 8.4_

- [x] 15. Fix AdminWalletTransactionsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for transactions array
  - Clear transaction totals
  - Reset date range filters
  - _Requirements: 8.1_

- [x] 16. Fix AdminWithdrawalsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for withdrawals array
  - Clear pending withdrawal data
  - Reset filters
  - _Requirements: 8.1_

- [ ] 17. Fix AdminTipsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for tips array
  - Clear tip calculations
  - Reset filters
  - _Requirements: 8.1_

- [ ] 18. Fix AdminRevenueDashboardView.vue
  - Import and use useAdminCleanup
  - Add cleanup for revenue data
  - Dispose chart instances
  - Clear revenue calculations
  - Reset date range
  - _Requirements: 8.1_

- [ ] 18.1 Write property test for financial data security
  - **Property 7: Financial Data Security**
  - **Validates: Requirements 8.1, 8.5**
  - Test no sensitive data in memory after unmount
  - Test works for any financial view
  - _Requirements: 8.1, 8.5_

- [ ] 19. Checkpoint - Verify financial routes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Fix AdminDriverTrackingView.vue (CRITICAL)
  - Import and use useAdminCleanup
  - Track provider location realtime channel
  - Track 10-second polling interval
  - Add cleanup for drivers array
  - Clear mapMarkers array
  - Clear selectedDriver
  - Dispose map instance
  - _Requirements: 9.1, 9.4_

- [ ] 20.1 Write property test for map resource cleanup
  - **Property 8: Map Resource Cleanup**
  - **Validates: Requirements 9.3, 9.5**
  - Test polling intervals stopped
  - Test map instances disposed
  - Test works for any map view
  - _Requirements: 9.3, 9.5_

- [ ] 20.2 Write unit test for AdminDriverTrackingView cleanup
  - Test realtime channel unsubscribed
  - Test polling interval cleared
  - Test map markers cleared
  - _Requirements: 9.1, 9.4_

- [ ] 21. Fix AdminScheduledRidesView.vue
  - Import and use useAdminCleanup
  - Add cleanup for scheduled rides array
  - Reset filters
  - Clear selected ride
  - _Requirements: 5.5_

- [ ] 22. Fix AdminRecurringRidesView.vue
  - Import and use useAdminCleanup
  - Add cleanup for recurring rides array
  - Reset filters
  - Clear selected ride
  - _Requirements: 5.5_

- [ ] 23. Fix AdminDeliveryView.vue
  - Import and use useAdminCleanup
  - Add cleanup for delivery requests array
  - Reset filters
  - Clear selected delivery
  - _Requirements: 5.5_

- [ ] 24. Fix AdminShoppingView.vue
  - Import and use useAdminCleanup
  - Add cleanup for shopping requests array
  - Reset filters
  - Clear selected shopping request
  - _Requirements: 5.5_

- [ ] 25. Fix AdminQueueView.vue
  - Import and use useAdminCleanup
  - Add cleanup for queue bookings array
  - Reset filters
  - Clear selected booking
  - _Requirements: 5.5_

- [ ] 26. Fix AdminMovingView.vue
  - Import and use useAdminCleanup
  - Add cleanup for moving requests array
  - Reset filters
  - Clear selected request
  - _Requirements: 5.5_

- [ ] 27. Fix AdminLaundryView.vue
  - Import and use useAdminCleanup
  - Add cleanup for laundry requests array
  - Reset filters
  - Clear selected request
  - _Requirements: 5.5_

- [ ] 28. Fix AdminCancellationsView.vue
  - Import and use useAdminCleanup
  - Add cleanup for cancellations array
  - Reset filters
  - Clear analytics data
  - _Requirements: 5.5_

- [ ] 28.1 Write property test for data array cleanup
  - **Property 6: Data Array Cleanup**
  - **Validates: Requirements 5.4, 5.5**
  - Test arrays cleared on unmount
  - Test filters reset
  - Test works for any view with data arrays
  - _Requirements: 5.4, 5.5_

- [ ] 29. Checkpoint - Verify service management routes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 30. Fix marketing views (batch)
  - Fix AdminPromosView.vue
  - Fix AdminReferralsView.vue
  - Fix AdminLoyaltyView.vue
  - Fix AdminIncentivesView.vue
  - Fix AdminSubscriptionsView.vue
  - Apply standard cleanup pattern to each
  - _Requirements: 5.5_

- [ ] 31. Fix support views (batch)
  - Fix AdminRatingsView.vue
  - Fix AdminFeedbackView.vue
  - Fix AdminSupportView.vue
  - Fix AdminFraudAlertsView.vue
  - Fix AdminCorporateView.vue
  - Apply standard cleanup pattern to each
  - _Requirements: 5.5_

- [x] 32. Fix analytics views (batch)
  - Fix AdminAnalyticsView.vue
  - Fix AdminReportsView.vue
  - Fix AdminUXAnalyticsView.vue
  - Fix AdminAnalyticsEventsView.vue
  - Fix AdminUserJourneyView.vue
  - Dispose chart instances in each
  - _Requirements: 13.5_

- [ ] 32.1 Write property test for chart disposal
  - **Property 12: Chart Disposal**
  - **Validates: Requirements 13.5**
  - Test chart instances disposed
  - Test chart memory released
  - Test works for any view with charts
  - _Requirements: 13.5_

- [x] 33. Fix system settings views (batch)
  - Fix AdminSettingsViewV2.vue
  - Fix AdminNotificationsView.vue
  - Fix AdminServiceAreaView.vue
  - Fix AdminSurgeView.vue
  - Fix AdminFeatureFlagsView.vue
  - Fix AdminABTestsView.vue
  - Fix AdminAuditLogView.vue
  - Fix AdminErrorRecoveryView.vue
  - Fix AdminInsuranceView.vue
  - Apply standard cleanup pattern to each
  - _Requirements: 5.5_

- [x] 34. Fix AdminSystemHealthView.vue (realtime)
  - Import and use useAdminCleanup
  - Track system health realtime channel
  - Add cleanup for health metrics
  - Clear monitoring interval
  - _Requirements: 2.1_

- [x] 35. Fix AdminPerformanceView.vue (realtime)
  - Import and use useAdminCleanup
  - Track performance metrics realtime channel
  - Clear 30-second metrics update interval
  - Add cleanup for performance data
  - _Requirements: 2.1, 4.4_

- [ ] 35.1 Write property test for interval cleanup
  - **Property 5: Interval and Timeout Cleanup**
  - **Validates: Requirements 4.1, 4.2, 4.5**
  - Test intervals cleared on unmount
  - Test timeouts cleared on unmount
  - Test works for any view with timers
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 36. Checkpoint - Verify all routes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 37. Write property test for form state reset
  - **Property 13: Form State Reset**
  - **Validates: Requirements 14.1, 14.2, 14.5**
  - Test form fields reset on unmount
  - Test modals closed on unmount
  - Test validation errors cleared
  - _Requirements: 14.1, 14.2, 14.5_

- [ ] 38. Write property test for cleanup error resilience
  - **Property 11: Cleanup Error Resilience**
  - **Validates: Requirements 11.4, 12.5**
  - Test cleanup continues after error
  - Test navigation not blocked by cleanup error
  - _Requirements: 11.4, 12.5_

- [ ] 39. Write property test for navigation performance
  - **Property 15: Navigation Performance**
  - **Validates: Requirements 15.4**
  - Test route transitions < 100ms
  - Test performance maintained during extended session
  - _Requirements: 15.4_

- [ ] 40. Write 50-session stability test
  - **Property 14: 50-Session Stability**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.5**
  - Test 50 random navigations
  - Test memory growth < 50MB total
  - Test zero active subscriptions
  - Test zero active intervals
  - Test no console errors
  - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 41. Final checkpoint - Verify 50-session stability
  - Run full test suite
  - Run memory profiler
  - Verify all success metrics achieved
  - Document any remaining issues

## Notes

- All tasks are required for comprehensive memory optimization
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All cleanup patterns follow the useAdminCleanup utility
- Financial views require extra attention to data security
- Realtime views must unsubscribe on unmount
- Map views must dispose instances and stop polling

## Success Criteria

After completing all tasks:
- ✅ Memory growth < 1MB per route transition
- ✅ Zero active subscriptions after unmount
- ✅ Zero active intervals after unmount
- ✅ Session validation cached (1-minute TTL)
- ✅ 50-session stability achieved
- ✅ All property tests passing (100 iterations each)
- ✅ All unit tests passing
- ✅ No console errors or warnings
- ✅ Navigation responsive (< 100ms per transition)
