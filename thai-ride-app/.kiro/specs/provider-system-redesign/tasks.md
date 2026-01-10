# Implementation Plan: Provider System Redesign

## Overview

การพัฒนาระบบ Provider ใหม่ทั้งหมดสำหรับแพลตฟอร์ม Thai Ride App โดยแบ่งการทำงานเป็น phases ที่สามารถทำได้ทีละส่วน มีการทดสอบในแต่ละขั้นตอน และสามารถ integrate กับระบบเดิมได้

**เทคโนโลยีที่ใช้:**

- Frontend: Vue 3 + TypeScript + Pinia + Tailwind CSS
- Backend: Supabase (PostgreSQL + Edge Functions)
- Testing: Vitest + fast-check (Property-Based Testing)

## Tasks

### Phase 1: Database Schema and Core Infrastructure

- [x] 1. Set up database schema for provider system

  - Create providers table with all required fields and indexes
  - Create provider_documents table with status tracking
  - Create provider_vehicles table
  - Create jobs table with spatial indexes
  - Create earnings table with breakdown fields
  - Create withdrawals table
  - Create notifications table
  - Create all ENUM types (provider_status, service_type, job_status, etc.)
  - Set up Row Level Security (RLS) policies for all tables
  - _Requirements: 1.2, 2.3, 4.1, 6.1, 9.1, 10.1_

- [x] 1.1 Write property test for database schema

  - **Property 1: Provider Registration Creates Pending Status**
  - **Validates: Requirements 1.2**

- [x] 2. Create database functions and triggers

  - Create function: `update_provider_location(p_job_id, p_location)`
  - Create function: `accept_job(p_job_id, p_provider_id)` with validation
  - Create function: `calculate_earnings(p_job_id)` with breakdown
  - Create function: `can_access_provider_routes(p_user_id)`
  - Create trigger: `update_wallet_on_earning()` for automatic wallet updates
  - Create trigger: `check_document_expiry()` for automatic suspension
  - Create materialized view: `provider_performance_metrics`
  - _Requirements: 3.6, 5.7, 6.1, 6.6, 7.2, 7.3, 9.3_

- [x] 2.1 Write property tests for database functions

  - **Property 21: Job Completion Updates Earnings**
  - **Property 22: Earnings Addition to Wallet**
  - **Property 23: Earnings Breakdown Sum**
  - **Validates: Requirements 5.7, 6.1, 6.3**

- [x] 3. Set up Supabase Storage for documents

  - Create storage bucket: `provider-documents` with security policies
  - Configure file upload limits and allowed types
  - Set up automatic thumbnail generation for images
  - _Requirements: 1.5, 9.1_

- [x] 4. Checkpoint - Database and infrastructure ready
  - Ensure all migrations run successfully
  - Verify RLS policies work correctly
  - Test database functions manually
  - Ask the user if questions arise

### Phase 2: Provider Registration and Onboarding

- [-] 5. Create provider registration components

  - [x] 5.1 Create `ProviderRegistrationForm.vue` with validation
    - Form fields: first_name, last_name, email, phone_number
    - Service type multi-select with icons
    - Terms and conditions checkbox
    - Form validation with error messages
    - _Requirements: 1.1, 1.2_

- [x] 5.2 Write property test for registration form validation

  - **Property 1: Provider Registration Creates Pending Status**
  - **Validates: Requirements 1.2**

- [x] 6. Create email verification flow

  - [x] 6.1 Create `EmailVerification.vue` component
    - Display verification code input
    - Resend code functionality
    - Auto-redirect after verification
    - _Requirements: 1.3, 1.4_

- [x] 6.2 Write property test for email verification

  - **Property 2: Email Verification Triggers Notification**
  - **Validates: Requirements 1.3**

- [x] 7. Create document upload system

  - [x] 7.1 Create `DocumentUpload.vue` component
    - File picker with drag-and-drop
    - Image preview before upload
    - Progress indicator
    - Document type selector
    - Expiry date picker for documents with expiration
    - _Requirements: 1.5, 9.1_

- [x] 7.2 Create `OnboardingProgress.vue` component

  - Step indicator (1. Register → 2. Verify Email → 3. Upload Documents)
  - Progress percentage
  - Current step highlighting
  - _Requirements: 1.6_

- [x] 7.3 Write property tests for document upload

  - **Property 3: Document Upload Adds to Verification Queue**
  - **Property 4: Complete Documents Update Status**
  - **Validates: Requirements 1.5, 1.6**

- [x] 8. Create Edge Function: `provider-registration`

  - Handle provider registration with validation
  - Generate verification token
  - Send verification email
  - Return provider_id and status
  - _Requirements: 1.2, 1.3_

- [x] 9. Create Edge Function: `document-upload`

  - Upload document to Supabase Storage
  - Create document record in database
  - Add to verification queue
  - Return document_id and storage_path
  - _Requirements: 1.5, 9.4_

- [x] 10. Checkpoint - Registration flow complete
  - Test full registration flow end-to-end
  - Verify email sending works
  - Verify documents upload correctly
  - Ask the user if questions arise

### Phase 3: Admin Verification System

- [x] 11. Create admin verification queue components

  - [x] 11.1 Create `VerificationQueueView.vue` (Admin)
    - List of providers pending verification
    - Filters: service type, submission date
    - Sort by oldest first
    - Provider count badge
    - _Requirements: 2.1_

- [x] 11.2 Write property test for verification queue ordering

  - **Property 6: Verification Queue Ordering**
  - **Validates: Requirements 2.1**

- [-] 12. Create document review components

  - [x] 12.1 Create `DocumentReviewModal.vue` (Admin)
    - Document preview with zoom
    - Approve/Reject buttons
    - Rejection reason textarea (required for reject)
    - Document metadata display
    - _Requirements: 2.2, 2.4_

- [x] 12.2 Create `ProviderDetailModal.vue` (Admin)

  - Provider information display
  - All documents with status
  - Approve/Reject/Suspend actions
  - Action history timeline
  - _Requirements: 2.3, 2.4, 8.3_

- [x] 12.3 Write property tests for admin actions

  - **Property 7: Provider Approval Updates Status and Notifies**
  - **Property 8: Rejection Requires Reason**
  - **Property 9: Approval Creates Provider UID**
  - **Validates: Requirements 2.3, 2.4, 2.5**

- [x] 13. Create Edge Function: `document-verification`

  - Handle approve/reject actions
  - Update document status
  - Generate provider_uid on approval
  - Send notifications
  - Update provider status
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 14. Create Edge Function: `admin-provider-management`

  - Handle suspend/reactivate actions
  - Cancel active jobs on suspension
  - Send notifications to affected parties
  - Log admin actions
  - _Requirements: 8.4, 8.5, 8.6_

- [x] 14.1 Write property tests for provider management

  - **Property 31: Provider Suspension Blocks Access**
  - **Property 32: Suspension Cancels Active Jobs**
  - **Validates: Requirements 8.4, 8.5**

- [x] 15. Checkpoint - Admin verification system complete
  - Test approval flow
  - Test rejection flow with reason
  - Test suspension flow
  - Verify notifications sent correctly
  - Ask the user if questions arise

### Phase 4: Provider Dashboard and Status Management

- [-] 16. Create provider dashboard components

  - [x] 16.1 Create `ProviderDashboard.vue`
    - Online/Offline status toggle
    - Today's earnings card
    - Completed jobs count
    - Current rating display
    - Available jobs section
    - Active job card (if any)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 16.2 Create `OnlineStatusToggle.vue`

  - Toggle switch with animation
  - Status indicator (green/gray)
  - Confirmation modal for going offline with active job
  - _Requirements: 3.4_

- [x] 16.3 Write property tests for dashboard

  - **Property 10: Dashboard Displays Current Metrics**
  - **Property 11: Available Jobs Match Service Type**
  - **Property 12: Online Status Updates Availability**
  - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 17. Create Pinia store: `useProviderStore`

  - State: profile, isOnline, currentJob, availableJobs, metrics
  - Actions: toggleOnlineStatus, loadAvailableJobs, acceptJob, updateLocation
  - Getters: todayEarnings, todayTrips, canAcceptJobs
  - Real-time subscriptions for job updates
  - _Requirements: 3.1, 3.4, 4.1_

- [ ] 18. Create performance metrics components

  - [ ] 18.1 Create `PerformanceMetricsCard.vue`
    - Rating with stars
    - Acceptance rate percentage
    - Completion rate percentage
    - Cancellation rate percentage
    - Warning badges for low metrics
    - _Requirements: 3.6, 7.1, 7.2, 7.3, 7.4_

- [ ] 18.2 Write property tests for performance metrics

  - **Property 13: Performance Metrics Calculation**
  - **Property 28: Rating Warning Threshold**
  - **Property 29: Cancellation Rate Warning**
  - **Validates: Requirements 3.6, 7.6, 7.7**

- [ ] 19. Checkpoint - Dashboard and status management complete
  - Test online/offline toggle
  - Verify metrics display correctly
  - Test real-time updates
  - Ask the user if questions arise

### Phase 5: Job Management and Matching

- [ ] 20. Create job matching system

  - [ ] 20.1 Create Edge Function: `job-matching`
    - Query jobs within service area (using PostGIS)
    - Filter by service type
    - Calculate distance from provider
    - Sort by distance and earnings
    - Return available jobs list
    - _Requirements: 4.1, 4.2_

- [ ] 20.2 Write property tests for job matching

  - **Property 14: Geographic Job Filtering**
  - **Property 15: Job Notification Targeting**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 21. Create job display components

  - [ ] 21.1 Create `JobCard.vue`
    - Pickup and dropoff addresses
    - Estimated earnings (highlighted)
    - Distance and duration
    - Service type badge
    - Accept button
    - _Requirements: 4.3_

- [ ] 21.2 Create `JobDetailsModal.vue`

  - Full job information
  - Map with pickup/dropoff markers
    - Route preview
    - Customer rating (if available)
    - Special instructions
    - Accept/Decline buttons
    - _Requirements: 4.3_

- [ ] 22. Create job acceptance system

  - [ ] 22.1 Create Edge Function: `job-acceptance`
    - Validate job is still available
    - Check provider doesn't have active job
    - Assign job to provider
    - Remove from other providers' lists
    - Notify customer
    - Return navigation URL
    - _Requirements: 4.4, 4.5, 4.7_

- [ ] 22.2 Write property tests for job acceptance

  - **Property 16: Job Acceptance Assignment**
  - **Property 17: Job Acceptance Removes from Others**
  - **Property 18: Active Job Blocks New Acceptance**
  - **Validates: Requirements 4.4, 4.5, 4.7**

- [ ] 23. Create job rejection handling

  - Offer job to next available provider
  - Update job status
  - Log rejection for metrics
  - _Requirements: 4.6_

- [ ] 24. Checkpoint - Job matching and acceptance complete
  - Test job matching with different locations
  - Test job acceptance flow
  - Test concurrent acceptance attempts
  - Verify notifications sent
  - Ask the user if questions arise

### Phase 6: Real-Time Job Tracking

- [ ] 25. Create job tracking components

  - [ ] 25.1 Create `JobNavigationView.vue`
    - Map with route display
    - Turn-by-turn directions
    - Current location marker
    - Pickup/Dropoff markers
    - ETA display
    - Status action buttons (Arrived, Start, Complete)
    - _Requirements: 5.1, 5.3, 5.6_

- [ ] 25.2 Create `JobStatusTracker.vue`

  - Status timeline (Accepted → Arrived → In Progress → Completed)
  - Current status highlighting
  - Timestamps for each status
  - _Requirements: 5.4, 5.5_

- [ ] 26. Create location tracking composable

  - [ ] 26.1 Create `useJobTracking.ts`
    - Get current location from GPS
    - Update location every 5 seconds
    - Subscribe to job status changes
    - Handle location permission errors
    - _Requirements: 5.2_

- [ ] 26.2 Write property tests for location tracking

  - **Property 19: Location Update Frequency**
  - **Property 20: Job Status Transitions**
  - **Validates: Requirements 5.2, 5.4, 5.5**

- [ ] 27. Create job completion flow

  - [ ] 27.1 Create `JobCompletionSheet.vue`
    - Delivery confirmation (photo/signature)
    - Completion notes
    - Complete button
    - _Requirements: 5.6_

- [ ] 27.2 Create Edge Function: `job-completion`

  - Update job status to completed
  - Calculate final earnings
  - Update provider wallet
  - Increment job count
  - Trigger rating request to customer
  - _Requirements: 5.7, 6.1_

- [ ] 27.3 Write property test for job completion

  - **Property 21: Job Completion Updates Earnings**
  - **Validates: Requirements 5.7**

- [ ] 28. Checkpoint - Real-time tracking complete
  - Test location updates
  - Test status transitions
  - Test job completion flow
  - Verify earnings calculated correctly
  - Ask the user if questions arise

### Phase 7: Earnings and Wallet System

- [ ] 29. Create earnings display components

  - [ ] 29.1 Create `EarningsOverview.vue`
    - Current wallet balance (large display)
    - Today's earnings
    - This week's earnings
    - This month's earnings
    - Earnings chart (daily for past 7 days)
    - _Requirements: 6.2_

- [ ] 29.2 Create `EarningsBreakdown.vue`

  - Base fare
  - Distance fare
  - Time fare
  - Surge amount
  - Tips
  - Bonuses
  - Platform fee (deduction)
  - Net earnings (highlighted)
  - _Requirements: 6.3_

- [ ] 29.3 Write property test for earnings breakdown

  - **Property 23: Earnings Breakdown Sum**
  - **Validates: Requirements 6.3**

- [ ] 30. Create withdrawal system

  - [ ] 30.1 Create `WithdrawalForm.vue`
    - Amount input with validation (min 100 THB)
    - Available balance display
    - Bank account selector
    - Estimated completion time
    - Submit button
    - _Requirements: 6.4, 6.5_

- [ ] 30.2 Create `WithdrawalHistory.vue`

  - List of past withdrawals
  - Status badges (pending, processing, completed, failed)
  - Amount and date
  - Transaction ID (for completed)
  - _Requirements: 6.5, 6.6_

- [ ] 30.3 Write property tests for withdrawal

  - **Property 24: Minimum Withdrawal Validation**
  - **Property 25: Valid Withdrawal Creates Pending Request**
  - **Property 27: Insufficient Balance Blocks Withdrawal**
  - **Validates: Requirements 6.4, 6.5, 6.7**

- [ ] 31. Create Edge Function: `withdrawal-request`

  - Validate minimum amount (100 THB)
  - Check sufficient balance
  - Create withdrawal record
  - Return withdrawal_id and estimated completion
  - _Requirements: 6.4, 6.5_

- [ ] 32. Create Edge Function: `withdrawal-processing` (Admin)

  - Process withdrawal request
  - Deduct from wallet
  - Update status to completed
  - Send confirmation notification
  - _Requirements: 6.6_

- [ ] 32.1 Write property test for withdrawal processing

  - **Property 26: Withdrawal Processing Deducts Balance**
  - **Validates: Requirements 6.6**

- [ ] 33. Checkpoint - Earnings and wallet system complete
  - Test earnings display
  - Test withdrawal request
  - Test withdrawal processing
  - Verify balance updates correctly
  - Ask the user if questions arise

### Phase 8: Notification System

- [ ] 34. Set up Firebase Cloud Messaging

  - Configure FCM in Firebase Console
  - Add FCM credentials to Supabase
  - Set up service worker for push notifications
  - _Requirements: 10.1, 10.2_

- [ ] 35. Create notification components

  - [ ] 35.1 Create `NotificationCenter.vue`
    - List of notifications
    - Unread badge
    - Mark as read functionality
    - Filter by type
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 35.2 Create `NotificationItem.vue`

  - Icon based on type
  - Title and body
  - Timestamp
    - Action button (if applicable)
    - Read/Unread indicator
    - _Requirements: 10.1_

- [ ] 36. Create Edge Function: `notification-dispatcher`

  - Send push notification via FCM
  - Send email via email service
  - Send SMS via SMS service (optional)
  - Create notification record in database
  - Handle delivery failures with retry
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 36.1 Write property tests for notifications

  - **Property 36: Job Notification Timing**
  - **Property 37: Multi-Channel Approval Notification**
  - **Property 38: Rejection Notification Includes Reason**
  - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 37. Create notification triggers

  - Job available notification (within 10 seconds)
  - Application approved notification (push + email)
  - Application rejected notification (with reason)
  - Document expiring notification (30, 7, 1 days before)
  - Rating received notification
  - Withdrawal completed notification
  - Account suspended notification
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 38. Checkpoint - Notification system complete
  - Test push notifications
  - Test email notifications
  - Test notification timing
  - Verify notification content
  - Ask the user if questions arise

### Phase 9: Multi-Service Type Support

- [ ] 39. Implement multi-service type features

  - [ ] 39.1 Update `ProviderRegistrationForm.vue`
    - Allow multiple service type selection
    - Show required documents per service type
    - _Requirements: 11.1_

- [ ] 39.2 Write property test for multi-service registration

  - **Property 39: Multi-Service Job Display**
  - **Validates: Requirements 11.2**

- [ ] 40. Create service type switching

  - [ ] 40.1 Create `ServiceTypeSwitcher.vue`
    - Dropdown or tabs for service types
    - Update available jobs on switch
    - Show active service type badge
    - _Requirements: 11.3_

- [ ] 41. Update earnings display for multi-service

  - Add service type filter to earnings page
  - Show breakdown by service type
  - Separate charts per service type
  - _Requirements: 11.6_

- [ ] 41.1 Write property test for service type earnings

  - **Property 40: Service Type Earnings Breakdown**
  - **Validates: Requirements 11.6**

- [ ] 42. Implement separate ratings per service type

  - Update rating calculation to group by service type
  - Display ratings per service type on profile
  - Show service-specific rating on job cards
  - _Requirements: 11.7_

- [ ] 42.1 Write property test for separate ratings

  - **Property 41: Separate Ratings Per Service Type**
  - **Validates: Requirements 11.7**

- [ ] 43. Checkpoint - Multi-service support complete
  - Test multiple service type registration
  - Test service type switching
  - Test earnings breakdown by service type
  - Verify separate ratings
  - Ask the user if questions arise

### Phase 10: Admin Analytics and Management

- [ ] 44. Create admin analytics dashboard

  - [ ] 44.1 Create `AdminAnalyticsDashboard.vue`
    - Total providers count
    - Active providers count
    - Pending verifications count
    - Provider growth chart
    - Average rating by service type
    - Total earnings by service type
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 44.2 Write property tests for analytics

  - **Property 42: Analytics aggregation calculations**
  - **Validates: Requirements 12.1, 12.3**

- [ ] 45. Create admin provider management

  - [ ] 45.1 Update `ProvidersView.vue`
    - Add filters: status, service type, rating
    - Add search: name, phone, email, provider_uid
    - Add bulk actions
    - Add export functionality
    - _Requirements: 8.1, 8.2_

- [ ] 45.2 Write property test for provider search

  - **Property 30: Admin Provider Search**
  - **Validates: Requirements 8.2**

- [ ] 46. Create admin reporting system

  - [ ] 46.1 Create `ReportGenerator.vue`
    - Date range picker
    - Service type filter
    - Status filter
    - Metrics selection
    - Export to CSV/Excel
    - _Requirements: 12.4, 12.5, 12.7_

- [ ] 47. Create Edge Function: `admin-analytics`

  - Generate analytics data
  - Apply filters
  - Calculate aggregations
  - Return formatted data
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 48. Checkpoint - Admin analytics complete
  - Test analytics dashboard
  - Test provider management
  - Test report generation
  - Test export functionality
  - Ask the user if questions arise

### Phase 11: Additional Features

- [ ] 49. Create incentives system

  - [ ] 49.1 Create `IncentivesView.vue`
    - List of active incentives
    - Progress bars
    - Completed incentives history
    - _Requirements: 13.1, 13.2_

- [ ] 49.2 Create Edge Function: `incentive-checker`

  - Check if provider completed incentive
  - Add bonus to wallet
  - Send congratulations notification
  - _Requirements: 13.3, 13.4_

- [ ] 49.3 Write property tests for incentives

  - **Property 42: Incentive Completion Auto-Bonus**
  - **Property 43: Bonus Earnings Separation**
  - **Validates: Requirements 13.3, 13.5**

- [ ] 50. Create support system

  - [ ] 50.1 Create `ProviderHelpView.vue`
    - FAQ list with search
    - Contact form
    - Support ticket history
    - Emergency contact button
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 50.2 Create `SupportTicketCard.vue`

  - Ticket details
  - Status badge
  - Response thread
  - _Requirements: 14.6_

- [ ] 50.3 Write property test for support tickets

  - **Property 44: Support Ticket Creation**
  - **Validates: Requirements 14.4**

- [ ] 51. Create vehicle management

  - [ ] 51.1 Create `ProviderVehicleView.vue`
    - List of registered vehicles
    - Add vehicle form
    - Active vehicle selector
    - Document upload for vehicle
    - _Requirements: 15.1, 15.2, 15.5_

- [ ] 51.2 Write property tests for vehicle management

  - **Property 45: Vehicle Approval Enables Assignment**
  - **Property 46: Vehicle Expiry Suspension**
  - **Property 47: Critical Vehicle Update Requires Reverification**
  - **Validates: Requirements 15.4, 15.6, 15.7**

- [ ] 52. Create document management

  - [ ] 52.1 Create `ProviderDocumentsView.vue`
    - List of all documents with status
    - Expiry warnings
    - Reupload functionality
    - Document history
    - _Requirements: 9.1, 9.2, 9.4_

- [ ] 52.2 Write property tests for document management

  - **Property 33: Document Expiry Warning**
  - **Property 34: Document Expiry Suspends Provider**
  - **Property 35: All Documents Approved Restores Status**
  - **Validates: Requirements 9.2, 9.3, 9.7**

- [ ] 53. Final checkpoint - All features complete
  - Test all features end-to-end
  - Verify all property tests pass
  - Check performance metrics
  - Review security policies
  - Ask the user if questions arise

### Phase 12: Testing and Optimization

- [ ] 54. Run full property-based test suite

  - Execute all 47 property tests
  - Verify 100+ iterations per test
  - Fix any failing tests
  - Document any edge cases found

- [ ] 55. Run integration tests

  - Test complete user flows
  - Test admin workflows
  - Test error scenarios
  - Test concurrent operations

- [ ] 56. Performance optimization

  - Optimize database queries
  - Add database indexes where needed
  - Implement caching for frequently accessed data
  - Optimize real-time subscriptions

- [ ] 57. Security audit

  - Review RLS policies
  - Test authentication flows
  - Verify authorization checks
  - Check for SQL injection vulnerabilities
  - Test rate limiting

- [ ] 58. Final deployment preparation
  - Create deployment checklist
  - Set up monitoring and logging
  - Configure error tracking (Sentry)
  - Prepare rollback plan
  - Document deployment steps

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All database changes should be done through migrations
- All Edge Functions should have error handling and logging
- All components should follow Vue 3 Composition API patterns
- All TypeScript code should use strict mode
