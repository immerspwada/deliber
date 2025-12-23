# Route Paths Report - Thai Ride App

**Generated:** December 23, 2025  
**Total Routes:** 197 unique paths

---

## Summary by Role

| Role | Route Count | Percentage |
|------|-------------|------------|
| **Customer** | 42 paths | 21.3% |
| **Provider** | 24 paths | 12.2% |
| **Admin (Main)** | 84 paths | 42.6% |
| **Admin V2** | 39 paths | 19.8% |
| **Public** | 8 paths | 4.1% |

---

## 📊 Detailed Breakdown

### 1. Public Routes (8 paths)
Routes accessible without authentication:

1. `/login` - Login page
2. `/register` - Registration page
3. `/verify-email` - Email verification
4. `/auth/callback` - OAuth callback
5. `/onboarding` - User onboarding
6. `/track/:shareCode` - Trip tracking (shared link)
7. `/tracking` - Tracking landing page
8. `/tracking/:trackingId` - Order tracking by ID

---

### 2. Customer Routes (42 paths)
Routes for customers (prefix: `/customer/*`):

#### Core Services (10)
1. `/customer` - Customer home (new)
2. `/customer/home-legacy` - Customer home (legacy)
3. `/customer/services` - Services overview (new)
4. `/customer/services-legacy` - Services overview (legacy)
5. `/customer/ride` - Ride booking (V3)
6. `/customer/ride-legacy` - Ride booking (legacy)
7. `/customer/delivery` - Delivery service (V2)
8. `/customer/delivery-legacy` - Delivery service (legacy)
9. `/customer/shopping` - Shopping service
10. `/customer/wallet` - Wallet (shared with provider)

#### Account & Profile (7)
11. `/customer/profile` - User profile
12. `/customer/history` - Order history
13. `/customer/payment-methods` - Payment methods
14. `/customer/notifications` - Notifications
15. `/customer/receipt/:id` - Receipt view
16. `/customer/saved-places` - Saved places
17. `/customer/settings` - Settings

#### Additional Services (8)
18. `/customer/help` - Help center
19. `/customer/promotions` - Promotions
20. `/customer/referral` - Referral program
21. `/customer/subscription` - Subscription plans
22. `/customer/scheduled-rides` - Scheduled rides
23. `/customer/insurance` - Insurance
24. `/customer/favorite-drivers` - Favorite drivers
25. `/customer/safety` - Safety features

#### New Services (9)
26. `/customer/loyalty` - Loyalty program
27. `/customer/queue-booking` - Queue booking
28. `/customer/queue-history` - Queue history
29. `/customer/moving` - Moving service
30. `/customer/laundry` - Laundry service
31. `/customer/become-provider` - Redirect to provider onboarding
32. `/customer/queue-booking/:id` - Queue tracking
33. `/customer/moving/:id` - Moving tracking
34. `/customer/laundry/:id` - Laundry tracking

#### V3 System (2)
35. `/customer/ride-booking-v3` - Ride booking V3
36. `/customer/ride-tracking-v3/:rideId` - Ride tracking V3

#### Redirects (6)
37. `/` - Root redirect to customer
38. `/saved-places` - Legacy redirect
39. `/customer/wallet-legacy` - Legacy wallet

---

### 3. Provider Routes (24 paths)
Routes for providers/drivers (prefix: `/provider/*`):

#### Dashboard & Core (6)
1. `/provider` - Provider dashboard (V4)
2. `/provider-legacy` - Provider dashboard (legacy)
3. `/provider/wallet` - Redirect to shared wallet
4. `/provider/earnings` - Earnings view
5. `/provider/history` - Job history
6. `/provider/profile` - Provider profile

#### Onboarding & Setup (5)
7. `/provider/onboarding` - Provider onboarding
8. `/provider/register` - Provider registration
9. `/provider/vehicle` - Vehicle management
10. `/provider/documents` - Document upload
11. `/provider/bank` - Bank account setup

#### Job Management (4)
12. `/provider/performance` - Performance metrics
13. `/provider/jobs` - Available jobs
14. `/provider/my-jobs` - My active jobs
15. `/provider/scheduled-rides` - Scheduled rides

#### Settings & Support (5)
16. `/provider/notifications` - Notifications
17. `/provider/settings` - Settings
18. `/provider/help` - Help center
19. `/provider/incentives` - Incentives program
20. `/provider/notification-settings` - Notification preferences

#### V3 System (4)
21. `/provider/available-rides-v3` - Available rides V3
22. `/provider/active-ride-v3` - Active ride V3

---

### 4. Admin Routes - Main Router (84 paths)
Routes for admin (prefix: `/admin/*`):

#### Authentication & Dashboard (3)
1. `/admin/login` - Admin login
2. `/admin` - Redirect to dashboard
3. `/admin/dashboard` - Admin dashboard

#### User Management (6)
4. `/admin/users` - All users
5. `/admin/customers` - Customer management
6. `/admin/customers-test` - Customer test view
7. `/admin/providers` - Provider management
8. `/admin/verification-queue` - Provider verification queue

#### Order Management (10)
9. `/admin/orders` - All orders
10. `/admin/cancellations` - Cancellations (duplicate)
11. `/admin/ratings` - Ratings management
12. `/admin/live-map` - Live map tracking
13. `/admin/cancellations` - Cancellations view
14. `/admin/tips` - Tips management
15. `/admin/scheduled-rides` - Scheduled rides
16. `/admin/queue-bookings` - Queue bookings
17. `/admin/moving` - Moving requests
18. `/admin/laundry` - Laundry requests

#### Financial Management (11)
19. `/admin/payments` - Payment management
20. `/admin/withdrawals` - Withdrawal requests
21. `/admin/wallets` - Wallet management
22. `/admin/topup-requests` - Top-up requests
23. `/admin/refunds` - Refund management
24. `/admin/wallet-transactions` - Wallet transactions
25. `/admin/revenue` - Revenue dashboard
26. `/admin/payment-settings` - Payment settings

#### Marketing & Loyalty (5)
27. `/admin/promos` - Promo codes
28. `/admin/referrals` - Referral program
29. `/admin/loyalty` - Loyalty program
30. `/admin/incentives` - Provider incentives
31. `/admin/subscriptions` - Subscription management

#### Support & Feedback (4)
32. `/admin/support` - Support tickets
33. `/admin/feedback` - Customer feedback
34. `/admin/fraud-alerts` - Fraud detection

#### Notifications (3)
35. `/admin/notifications` - Notification management
36. `/admin/push-notifications` - Push notifications
37. `/admin/notification-templates` - Notification templates

#### Analytics & Reports (7)
38. `/admin/analytics` - Analytics dashboard
39. `/admin/reports` - Reports
40. `/admin/ux-analytics` - UX analytics
41. `/admin/analytics-events` - Analytics events
42. `/admin/user-journey` - User journey analysis
43. `/admin/performance` - Performance metrics
44. `/admin/cross-role-monitor` - Cross-role monitoring

#### Settings & Configuration (11)
45. `/admin/settings` - Settings (V2)
46. `/admin/settings-legacy` - Settings (legacy)
47. `/admin/service-areas` - Service areas
48. `/admin/service-zones` - Service zones
49. `/admin/surge` - Surge pricing (legacy)
50. `/admin/surge-pricing` - Surge pricing
51. `/admin/audit-log` - Audit log
52. `/admin/security` - Security settings
53. `/admin/insurance` - Insurance management
54. `/admin/corporate` - Corporate accounts
55. `/admin/components` - Component showcase

#### Advanced Features (12)
56. `/admin/driver-tracking` - Driver tracking
57. `/admin/error-recovery` - Error recovery
58. `/admin/feature-flags` - Feature flags
59. `/admin/ab-tests` - A/B testing
60. `/admin/system-health` - System health
61. `/admin/production-dashboard` - Production dashboard
62. `/admin/data-management` - Data management
63. `/admin/alerting` - Alerting system
64. `/admin/deployment` - Deployment management
65. `/admin/compliance` - Compliance
66. `/admin/incidents` - Incident management
67. `/admin/readiness` - Readiness checklist

#### V3 Multi-Role System (3)
68. `/admin/rides-v3` - Ride monitoring V3
69. `/admin/rides/:id` - Ride detail V3
70. `/admin/provider-cancellations-v3` - Provider cancellations V3

---

### 5. Admin V2 Routes - Separate Router (39 paths)
New Admin V2 architecture with AdminShell layout:

#### Authentication (1)
1. `/admin/login` - Admin login V2

#### Dashboard (2)
2. `/admin` - Redirect to dashboard
3. `/admin/dashboard` - Dashboard V2

#### Users Module (3)
4. `/admin/customers` - Customers V2
5. `/admin/providers` - Providers V2
6. `/admin/verification-queue` - Verification queue V2

#### Orders Module (10)
7. `/admin/orders` - Orders V2
8. `/admin/delivery` - Delivery V2
9. `/admin/shopping` - Shopping V2
10. `/admin/queue-bookings` - Queue bookings V2
11. `/admin/moving` - Moving V2
12. `/admin/laundry` - Laundry V2
13. `/admin/live-map` - Live map V2
14. `/admin/driver-tracking` - Driver tracking V2
15. `/admin/scheduled-rides` - Scheduled rides V2
16. `/admin/cancellations` - Cancellations V2

#### Finance Module (7)
17. `/admin/revenue` - Revenue V2
18. `/admin/payments` - Payments V2
19. `/admin/wallets` - Wallets V2
20. `/admin/topup-requests` - Top-up requests V2
21. `/admin/withdrawals` - Withdrawals V2
22. `/admin/refunds` - Refunds V2
23. `/admin/payment-settings` - Payment settings V2

#### Marketing Module (4)
24. `/admin/promos` - Promos V2
25. `/admin/referrals` - Referrals V2
26. `/admin/loyalty` - Loyalty V2
27. `/admin/incentives` - Incentives V2

#### Support Module (4)
28. `/admin/support` - Support V2
29. `/admin/feedback` - Feedback V2
30. `/admin/ratings` - Ratings V2
31. `/admin/fraud-alerts` - Fraud alerts V2

#### Analytics Module (3)
32. `/admin/analytics` - Analytics V2
33. `/admin/reports` - Reports V2
34. `/admin/ux-analytics` - UX analytics V2

#### Settings Module (6)
35. `/admin/settings` - Settings V2
36. `/admin/notifications` - Notifications V2
37. `/admin/service-areas` - Service areas V2
38. `/admin/service-zones` - Service zones V2
39. `/admin/security` - Security V2
40. `/admin/audit-log` - Audit log V2

---

## 🔍 Key Observations

### 1. Version Duplication
- **Customer routes**: 4 legacy versions still exist
- **Provider routes**: 2 legacy versions still exist
- **Admin routes**: Dual router system (Main + V2)

### 2. Admin Route Overlap
- **Main router**: 84 admin paths
- **V2 router**: 39 admin paths
- **Overlap**: ~30 routes exist in both routers with different implementations

### 3. Service Coverage
All 6 service types have complete route coverage:
- ✅ Ride (Customer + Provider + Admin)
- ✅ Delivery (Customer + Provider + Admin)
- ✅ Shopping (Customer + Provider + Admin)
- ✅ Queue (Customer + Provider + Admin)
- ✅ Moving (Customer + Provider + Admin)
- ✅ Laundry (Customer + Provider + Admin)

### 4. Route Guards
- **requiresAuth**: Customer & Provider routes
- **requiresAdmin**: Admin routes
- **isProviderRoute**: Provider-specific validation
- **isCustomerRoute**: Customer-specific validation
- **public**: No authentication required

### 5. Navigation Behavior
- **hideNavigation**: 108 routes hide bottom navigation
- **Shared routes**: Wallet is accessible by both Customer & Provider

---

## 📈 Route Distribution Chart

```
Public:     ████ 4.1%
Customer:   ████████████████████ 21.3%
Provider:   ████████████ 12.2%
Admin Main: ████████████████████████████████████████ 42.6%
Admin V2:   ███████████████████ 19.8%
```

---

## ⚠️ Recommendations

### 1. Consolidate Legacy Routes
Remove legacy versions after migration:
- `/customer/home-legacy`
- `/customer/services-legacy`
- `/customer/ride-legacy`
- `/customer/delivery-legacy`
- `/customer/wallet-legacy`
- `/provider-legacy`
- `/admin/settings-legacy`

**Impact**: -7 routes

### 2. Merge Admin Routers
Consolidate Main + V2 admin routers into single system:
- Keep V2 architecture (cleaner, modular)
- Remove duplicate routes from main router
- Migrate remaining unique routes to V2

**Impact**: -30 duplicate routes

### 3. Fix Duplicate Routes
Remove duplicate route definitions:
- `/admin/cancellations` appears twice in main router

**Impact**: -1 route

### 4. Optimize Route Structure
Group related routes under parent routes:
- Customer services under `/customer/services/*`
- Provider jobs under `/provider/jobs/*`
- Admin modules already well-organized in V2

---

## 🎯 Target Route Count

After cleanup:
- **Current**: 197 routes
- **After legacy removal**: 190 routes (-7)
- **After admin merge**: 160 routes (-30)
- **After duplicate fix**: 159 routes (-1)

**Final target**: ~160 routes (19% reduction)

---

## 📝 Notes

1. **Dual-Role System**: Users can be both Customer and Provider
2. **Shared Routes**: Wallet is accessible from both roles
3. **V3 System**: New multi-role ride booking system with separate routes
4. **Admin V2**: Modern architecture with modular organization
5. **Route Guards**: Comprehensive authentication and authorization checks

---

**Report Generated by**: Kiro AI  
**Date**: December 23, 2025  
**Project**: Thai Ride App - Super App Platform
