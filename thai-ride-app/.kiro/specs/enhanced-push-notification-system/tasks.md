# Implementation Plan: Enhanced Push Notification System

## Overview

ระบบ Push Notification ขั้นสูงที่เพิ่ม Silent Push, Notification Preferences, และ Push Analytics Dashboard

## Tasks

- [x] 1. Create database schema for notification preferences and push logs

  - [x] 1.1 Create notification_preferences table with RLS
    - Create table with provider_id, category, enabled, timestamps
    - Add unique constraint on (provider_id, category)
    - Add RLS policies for Provider and Admin access
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 1.2 Create push_logs table with indexes
    - Create table with all required fields
    - Add indexes for analytics queries (sent_at, notification_type, status)
    - Add RLS policy for Admin-only access
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 1.3 Write property test for RLS isolation
    - **Property 14: Preferences RLS Isolation**
    - **Property 15: Push Logs Admin-Only RLS**
    - **Validates: Requirements 6.3, 7.3**

- [x] 2. Checkpoint - Verify database schema

  - Run migration and verify tables created correctly
  - Test RLS policies manually

- [x] 3. Implement Notification Preferences

  - [x] 3.1 Create useNotificationPreferences composable
    - Implement loadPreferences, toggleCategory, isEnabled
    - Handle default preferences for new providers
    - _Requirements: 2.3, 2.4, 2.5_
  - [x] 3.2 Create NotificationPreferencesView component
    - Display all categories with toggle switches
    - Show permission status
    - Add test notification button
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 3.3 Write property test for preference filtering
    - **Property 3: Disabled Categories Filter Notifications**
    - **Validates: Requirements 2.3**
  - [ ] 3.4 Write property test for default preferences
    - **Property 4: New Providers Have All Categories Enabled**
    - **Validates: Requirements 2.4**

- [x] 4. Implement Silent Push for Background Sync

  - [x] 4.1 Update Service Worker to handle silent push
    - Detect silent_sync type in push payload
    - Trigger background sync without showing notification
    - _Requirements: 1.1_
  - [x] 4.2 Implement background sync handler
    - Fetch and cache latest jobs
    - Update earnings data
    - Notify app if open
    - _Requirements: 1.2, 1.3, 1.4_
  - [ ] 4.3 Write property test for silent push
    - **Property 1: Silent Push Does Not Display Notification**
    - **Validates: Requirements 1.1**

- [x] 5. Checkpoint - Test preferences and silent push

  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Update Edge Function for preferences and logging

  - [x] 6.1 Update send-push-notification to check preferences
    - Query provider preferences before sending
    - Filter out disabled categories
    - _Requirements: 2.3_
  - [x] 6.2 Add push logging to Edge Function
    - Log all send attempts with required fields
    - Calculate and store latency on delivery confirmation
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ] 6.3 Write property test for logging completeness
    - **Property 7: Push Logs Contain All Required Fields**
    - **Validates: Requirements 4.1, 4.3**

- [x] 7. Create scheduled job for silent push

  - [x] 7.1 Create pg_cron job for silent push
    - Schedule every 15 minutes
    - Send silent push to online providers
    - _Requirements: 1.5_

- [x] 8. Implement Push Analytics Dashboard

  - [x] 8.1 Create usePushAnalytics composable
    - Implement loadAnalytics with metrics calculation
    - Implement volume aggregation by time
    - Implement breakdown by notification type
    - Implement failure reasons aggregation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 8.2 Create PushAnalyticsDashboard component
    - Display summary metrics cards
    - Display volume chart (7 days, 30 days)
    - Display breakdown by type
    - Display top failure reasons
    - Add date range filter for detailed logs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 8.3 Write property tests for analytics
    - **Property 9: Analytics Metrics Calculation**
    - **Property 10: Volume Aggregation by Time**
    - **Property 11: Breakdown by Notification Type**
    - **Property 12: Failure Reasons Aggregation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 9. Add admin route for Push Analytics

  - [x] 9.1 Add route to admin router
    - Create /admin/push-analytics route
    - Add navigation link in admin sidebar
    - _Requirements: 5.1_

- [x] 10. Create cleanup function for old logs

  - [x] 10.1 Create pg_cron job for log cleanup
    - Delete logs older than 30 days
    - Schedule daily at midnight
    - _Requirements: 7.4_

- [x] 11. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise
  - Verify analytics dashboard shows correct data

## Notes

- All tasks including property tests are required for comprehensive coverage
- This spec builds on top of the existing push notification infrastructure
- Property tests use `fast-check` library with minimum 100 iterations
- Silent push requires Background Sync API support in browser
