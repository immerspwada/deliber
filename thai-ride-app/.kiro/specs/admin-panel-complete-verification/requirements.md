# Requirements Document

## Introduction

This specification defines the complete verification and database setup for the Admin Panel system. The system consists of 20 administrative routes that require full database support, RPC functions, and proper RLS policies to function correctly. The goal is to ensure 100% operational status for all admin features including dashboard analytics, user management, order tracking, financial operations, marketing tools, and system monitoring.

## Glossary

- **Admin_Panel**: The administrative interface accessible at `/admin` routes
- **RPC_Function**: Remote Procedure Call function in PostgreSQL/Supabase
- **RLS_Policy**: Row Level Security policy for database access control
- **Dual_Role_System**: Architecture where providers have both auth.uid (user) and provider_id (provider record)
- **Provider_V2**: The providers_v2 table that links user_id to provider_id
- **Migration**: Database schema change file in supabase/migrations/
- **MCP_Power**: Supabase MCP tool for database operations
- **Admin_Role**: User role with full system access
- **Real_Time_Feature**: Feature using Supabase real-time subscriptions
- **CRUD_Operation**: Create, Read, Update, Delete operations

## Requirements

### Requirement 1: Database Schema Verification

**User Story:** As a system administrator, I want all required database tables to exist and be properly configured, so that the admin panel can access all necessary data.

#### Acceptance Criteria

1. WHEN the system starts, THE Database SHALL contain all tables required by admin routes
2. WHEN checking table schemas, THE Database SHALL have correct column types and constraints
3. WHEN verifying relationships, THE Database SHALL have proper foreign key constraints
4. WHEN checking indexes, THE Database SHALL have performance indexes on frequently queried columns
5. THE Database SHALL include the providers_v2 table with user_id column for dual-role support

### Requirement 2: RPC Function Creation (Priority 1 - Critical)

**User Story:** As an admin panel developer, I want critical RPC functions to exist, so that dashboard and core features can retrieve data efficiently.

#### Acceptance Criteria

1. THE Database SHALL provide get_admin_dashboard_stats() function returning overall system statistics
2. THE Database SHALL provide get_admin_customers() function with filter and search parameters
3. THE Database SHALL provide get_admin_providers_v2() function returning provider list with status
4. WHEN get_admin_orders() is called, THE Database SHALL return order data (already exists in migration 295)
5. WHEN get_active_providers_locations() is called, THE Database SHALL return real-time provider locations (already exists in migration 251)

### Requirement 3: RPC Function Creation (Priority 2 - Important)

**User Story:** As an admin panel developer, I want service-specific RPC functions to exist, so that specialized admin views can display filtered data.

#### Acceptance Criteria

1. THE Database SHALL provide get_admin_delivery_orders() function for delivery-specific orders
2. THE Database SHALL provide get_admin_shopping_orders() function for shopping-specific orders
3. THE Database SHALL provide get_scheduled_rides() function for scheduled ride bookings
4. THE Database SHALL provide get_provider_withdrawals_admin() function for withdrawal request management
5. THE Database SHALL provide get_topup_requests_admin() function for topup request management

### Requirement 4: RPC Function Creation (Priority 3 - Analytics)

**User Story:** As an admin panel developer, I want analytics RPC functions to exist, so that reporting and monitoring features can display insights.

#### Acceptance Criteria

1. THE Database SHALL provide get_admin_revenue_stats() function with date range parameters
2. THE Database SHALL provide get_admin_payment_stats() function for payment analytics
3. WHEN get_push_analytics() is called, THE Database SHALL return push notification metrics (already exists)
4. WHEN get_cron_job_stats() is called, THE Database SHALL return cron job monitoring data (already exists in migration 278)
5. WHEN get_provider_heatmap_data() is called, THE Database SHALL return provider location heatmap data (already exists in migration 279)

### Requirement 5: RLS Policy Verification for Admin Role

**User Story:** As a security engineer, I want proper RLS policies for admin access, so that admins can access all data while maintaining security.

#### Acceptance Criteria

1. WHEN an admin user queries any table, THE RLS_Policy SHALL allow full read access
2. WHEN an admin user modifies data, THE RLS_Policy SHALL allow appropriate write operations
3. WHEN checking admin role, THE RLS_Policy SHALL verify role from profiles table
4. THE RLS_Policy SHALL use SELECT wrapper pattern (SELECT auth.uid()) for performance optimization
5. WHEN non-admin users attempt admin operations, THE RLS_Policy SHALL deny access

### Requirement 6: Dual-Role System Verification

**User Story:** As a database administrator, I want dual-role system properly implemented, so that provider-related queries work correctly.

#### Acceptance Criteria

1. WHEN querying provider data, THE System SHALL join through providers_v2.user_id
2. WHEN checking provider access, THE RLS_Policy SHALL use providers_v2.user_id = auth.uid()
3. THE System SHALL NOT directly compare provider_id with auth.uid()
4. WHEN a provider accesses their data, THE System SHALL resolve user_id to provider_id correctly
5. WHEN creating new provider records, THE System SHALL maintain user_id and provider_id relationship

### Requirement 7: Admin Dashboard Route Functionality

**User Story:** As an admin user, I want the dashboard to display system statistics, so that I can monitor overall system health.

#### Acceptance Criteria

1. WHEN accessing /admin/dashboard, THE Admin_Panel SHALL display total users, providers, and orders
2. WHEN viewing dashboard, THE Admin_Panel SHALL show revenue graphs with date filters
3. WHEN dashboard loads, THE Admin_Panel SHALL display real-time active provider count
4. WHEN viewing statistics, THE Admin_Panel SHALL show completion rates and average ratings
5. THE Admin_Panel SHALL load dashboard data within 2 seconds

### Requirement 8: User Management Routes Functionality

**User Story:** As an admin user, I want to manage customers and providers, so that I can maintain user quality and handle issues.

#### Acceptance Criteria

1. WHEN accessing /admin/customers, THE Admin_Panel SHALL display customer list with search and filters
2. WHEN viewing customer details, THE Admin_Panel SHALL show order history and account status
3. WHEN accessing /admin/providers, THE Admin_Panel SHALL display provider list with approval status
4. WHEN viewing provider details, THE Admin_Panel SHALL show documents, ratings, and earnings
5. WHEN accessing /admin/verification-queue, THE Admin_Panel SHALL display pending provider verifications
6. WHEN admin suspends a user, THE System SHALL update user status and prevent access

### Requirement 9: Order Management Routes Functionality

**User Story:** As an admin user, I want to view and manage all orders, so that I can handle disputes and monitor service quality.

#### Acceptance Criteria

1. WHEN accessing /admin/orders, THE Admin_Panel SHALL display all orders with status filters
2. WHEN accessing /admin/delivery, THE Admin_Panel SHALL display delivery orders only
3. WHEN accessing /admin/shopping, THE Admin_Panel SHALL display shopping orders only
4. WHEN accessing /admin/driver-tracking, THE Admin_Panel SHALL show real-time provider locations on map
5. WHEN accessing /admin/scheduled-rides, THE Admin_Panel SHALL display future scheduled bookings
6. WHEN viewing order details, THE Admin_Panel SHALL show evidence photos and chat history

### Requirement 10: Financial Management Routes Functionality

**User Story:** As an admin user, I want to manage financial operations, so that I can process payments and monitor revenue.

#### Acceptance Criteria

1. WHEN accessing /admin/revenue, THE Admin_Panel SHALL display revenue breakdown by service type
2. WHEN viewing revenue, THE Admin_Panel SHALL show graphs with date range selection
3. WHEN accessing /admin/payments, THE Admin_Panel SHALL display payment transactions with filters
4. WHEN accessing /admin/withdrawals, THE Admin_Panel SHALL display provider withdrawal requests
5. WHEN admin approves withdrawal, THE System SHALL update wallet balance and create transaction
6. WHEN accessing /admin/topup-requests, THE Admin_Panel SHALL display customer topup requests
7. WHEN admin approves topup, THE System SHALL update customer wallet balance

### Requirement 11: Marketing and Analytics Routes Functionality

**User Story:** As an admin user, I want marketing and analytics tools, so that I can manage promotions and monitor system performance.

#### Acceptance Criteria

1. WHEN accessing /admin/promos, THE Admin_Panel SHALL display promotion list with status
2. WHEN creating promotion, THE Admin_Panel SHALL validate promo code uniqueness and dates
3. WHEN accessing /admin/analytics, THE Admin_Panel SHALL display usage statistics and trends
4. WHEN accessing /admin/push-analytics, THE Admin_Panel SHALL display push notification metrics
5. WHEN accessing /admin/cron-jobs, THE Admin_Panel SHALL display cron job execution history
6. WHEN accessing /admin/provider-heatmap, THE Admin_Panel SHALL display provider location density map

### Requirement 12: System Settings and Health Routes Functionality

**User Story:** As an admin user, I want system configuration and monitoring tools, so that I can maintain system health.

#### Acceptance Criteria

1. WHEN accessing /admin/settings, THE Admin_Panel SHALL display system configuration options
2. WHEN updating settings, THE System SHALL validate and persist configuration changes
3. WHEN accessing /admin/system-health, THE Admin_Panel SHALL display system logs and error rates
4. WHEN viewing system health, THE Admin_Panel SHALL show database connection status
5. WHEN viewing system health, THE Admin_Panel SHALL show API response times

### Requirement 13: Real-Time Features Functionality

**User Story:** As an admin user, I want real-time updates in the admin panel, so that I can monitor live system activity.

#### Acceptance Criteria

1. WHEN viewing driver tracking, THE Admin_Panel SHALL update provider locations in real-time
2. WHEN viewing dashboard, THE Admin_Panel SHALL update statistics every 30 seconds
3. WHEN new orders arrive, THE Admin_Panel SHALL show notifications
4. WHEN provider status changes, THE Admin_Panel SHALL update provider list
5. THE Real_Time_Feature SHALL use Supabase real-time subscriptions

### Requirement 14: Performance Requirements

**User Story:** As an admin user, I want fast page loads and responsive interactions, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN loading any admin route, THE Admin_Panel SHALL display content within 2 seconds
2. WHEN executing RPC functions, THE Database SHALL return results within 500 milliseconds
3. WHEN filtering or searching, THE Admin_Panel SHALL show results within 1 second
4. WHEN viewing large lists, THE Admin_Panel SHALL implement pagination with 20 items per page
5. THE System SHALL use database indexes for frequently queried columns

### Requirement 15: Security and Access Control

**User Story:** As a security engineer, I want proper access control and audit logging, so that admin actions are secure and traceable.

#### Acceptance Criteria

1. WHEN non-admin user attempts admin access, THE System SHALL redirect to unauthorized page
2. WHEN admin performs sensitive operations, THE System SHALL log the action with timestamp and user
3. WHEN checking permissions, THE System SHALL verify admin role from profiles table
4. THE System SHALL use RLS policies for all database access
5. THE System SHALL validate all input data before database operations

### Requirement 16: Error Handling and User Feedback

**User Story:** As an admin user, I want clear error messages and feedback, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN database operation fails, THE Admin_Panel SHALL display user-friendly error message
2. WHEN RPC function returns error, THE Admin_Panel SHALL show specific error details
3. WHEN network request fails, THE Admin_Panel SHALL show retry option
4. WHEN operation succeeds, THE Admin_Panel SHALL show success confirmation
5. THE Admin_Panel SHALL log errors to console for debugging

### Requirement 17: Migration Management

**User Story:** As a database administrator, I want proper migration files, so that database changes are version controlled and reproducible.

#### Acceptance Criteria

1. WHEN creating new RPC functions, THE System SHALL generate migration file in supabase/migrations/
2. WHEN modifying schema, THE Migration SHALL include DROP IF EXISTS statements
3. WHEN creating policies, THE Migration SHALL drop existing policies before creating new ones
4. THE Migration SHALL include comments explaining purpose and changes
5. WHEN applying migrations, THE System SHALL execute them in sequential order

### Requirement 18: Testing and Verification

**User Story:** As a quality assurance engineer, I want comprehensive testing, so that all features work correctly.

#### Acceptance Criteria

1. WHEN testing admin routes, THE System SHALL verify all 20 routes load without errors
2. WHEN testing RPC functions, THE System SHALL verify all 15 functions return expected data
3. WHEN testing CRUD operations, THE System SHALL verify create, read, update, delete work correctly
4. WHEN testing real-time features, THE System SHALL verify subscriptions receive updates
5. WHEN testing performance, THE System SHALL verify page loads and API calls meet targets

### Requirement 19: Documentation and Maintenance

**User Story:** As a developer, I want clear documentation, so that I can understand and maintain the system.

#### Acceptance Criteria

1. THE System SHALL provide README documenting all admin routes and their purpose
2. THE System SHALL document all RPC functions with parameters and return types
3. THE System SHALL document RLS policies and security model
4. THE System SHALL document dual-role system architecture
5. THE System SHALL provide troubleshooting guide for common issues

### Requirement 20: Development Environment Setup

**User Story:** As a developer, I want easy local development setup, so that I can test changes before deployment.

#### Acceptance Criteria

1. THE System SHALL use Supabase local development with Docker
2. WHEN starting development, THE System SHALL provide commands to start Supabase
3. WHEN applying migrations, THE System SHALL use npx supabase db push --local
4. WHEN generating types, THE System SHALL use npx supabase gen types --local
5. THE System SHALL provide scripts for common development tasks

### Requirement 21: Production Deployment

**User Story:** As a system administrator, I want to safely deploy database changes to production, so that the admin panel works correctly in the live environment.

#### Acceptance Criteria

1. WHEN deploying to production, THE System SHALL apply all pending migrations to production database
2. WHEN migration 301 is applied, THE RPC functions SHALL check admin role in users table instead of profiles table
3. WHEN verifying deployment, THE System SHALL confirm all RPC functions exist in production
4. WHEN testing production, THE Admin_Panel SHALL load without 404 errors for RPC functions
5. WHEN admin user logs in, THE System SHALL verify user has correct role in users table
6. THE System SHALL provide rollback plan in case of deployment issues
7. THE System SHALL backup production database before applying migrations
8. WHEN deployment completes, THE System SHALL regenerate TypeScript types from production schema

#### Production Deployment Checklist

- [ ] Backup production database
- [ ] Review migration SQL carefully
- [ ] Test in staging environment (if available)
- [ ] Apply migration via Supabase Dashboard SQL Editor
- [ ] Verify RPC functions exist with verification query
- [ ] Test admin providers page loads successfully
- [ ] Verify admin user has correct role in users table
- [ ] Monitor Supabase logs for errors
- [ ] Regenerate TypeScript types
- [ ] Test critical admin functions

#### Migration 301 Details

**Purpose**: Fix admin RPC functions to check role in correct table

**Changes**:

- Updates `get_admin_providers_v2()` to check `users.role` instead of `profiles.role`
- Updates `count_admin_providers_v2()` to check `users.role`
- Updates `get_admin_customers()` to check `users.role`
- Updates `count_admin_customers()` to check `users.role`
- Supports both `admin` and `super_admin` roles
- Provides better error messages showing current role

**Impact**:

- Fixes 404 errors on admin providers page
- Enables admin panel to function correctly in production
- No breaking changes for existing users
- No data migration required

**Rollback**:

- Can restore old functions if needed
- No data changes, only function definitions
- Safe to rollback by dropping and recreating functions
