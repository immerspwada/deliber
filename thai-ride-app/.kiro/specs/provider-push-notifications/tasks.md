# Implementation Plan: Provider Push Notifications

## Overview

ระบบ Push Notification สำหรับ Provider มี infrastructure บางส่วนอยู่แล้ว:

- ✅ `usePushNotification` composable (มี TypeScript errors ต้องแก้)
- ✅ `push_subscriptions` migration (268)
- ✅ `sw-push.js` service worker
- ✅ VAPID keys generated (ใน VAPID_SETUP.md)
- ⚠️ ยังขาด Edge Function สำหรับ server-side push

## Tasks

- [x] 1. Fix TypeScript errors in usePushNotification composable

  - [x] 1.1 Fix Supabase type errors for push_subscriptions table
    - Add proper type casting for upsert operation
    - Fix `provider.id` type error
    - _Requirements: 2.2_
  - [x] 1.2 Fix NotificationOptions type error for actions
    - Use ServiceWorkerRegistration.showNotification with proper options
    - Remove unnecessary await on getKey calls
    - _Requirements: 3.2, 3.3_
  - [ ]\* 1.3 Write unit tests for usePushNotification
    - Test shouldShowNotificationPrompt logic
    - Test notifyNewJob content formatting
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Checkpoint - Verify composable works

  - Ensure all TypeScript errors are resolved
  - Test permission request flow manually

- [x] 3. Create Edge Function for server-side push

  - [x] 3.1 Create send-push-notification Edge Function
    - Use web-push library for sending notifications
    - Accept provider_ids, title, body, data parameters
    - Query active subscriptions from database
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 Implement push delivery with error handling
    - Handle 410/404 responses by marking subscription inactive
    - Log all delivery attempts
    - _Requirements: 6.3, 6.5_
  - [ ]\* 3.3 Write property test for subscription deactivation
    - **Property 8: Subscription Deactivation on Push Failure**
    - **Validates: Requirements 6.3**

- [x] 4. Create database trigger for new job notifications

  - [x] 4.1 Create trigger function to call Edge Function
    - Trigger on INSERT to ride_requests with status='pending'
    - Call Edge Function with job details
    - _Requirements: 6.4_
  - [ ]\* 4.2 Write integration test for trigger
    - Test that creating a ride_request triggers notification
    - _Requirements: 6.4_

- [x] 5. Checkpoint - Test end-to-end flow

  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Add property-based tests for core properties

  - [ ]\* 6.1 Write property test for prompt visibility logic
    - **Property 1: Prompt Visibility Logic**
    - **Validates: Requirements 1.1, 1.2, 1.5**
  - [ ]\* 6.2 Write property test for notification content
    - **Property 5: Notification Content Completeness**
    - **Validates: Requirements 3.2**
  - [ ]\* 6.3 Write property test for badge visibility
    - **Property 7: Badge Visibility Matches Subscription State**
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Verify RLS policies

  - [ ]\* 7.1 Write property test for Provider RLS isolation
    - **Property 10: Provider RLS Isolation**
    - **Validates: Requirements 7.3**
  - [ ]\* 7.2 Write property test for Admin RLS access
    - **Property 11: Admin RLS Access**
    - **Validates: Requirements 7.4**

- [x] 8. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise
  - Verify VAPID secrets are configured in Supabase Dashboard

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- VAPID keys are already generated - see `VAPID_SETUP.md`
- Migration 268 already creates the push_subscriptions table
- Service worker `sw-push.js` is already implemented
- Property tests use `fast-check` library with minimum 100 iterations
