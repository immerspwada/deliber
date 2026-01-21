# Requirements Document

## Introduction

ระบบ Push Notification สำหรับ Provider เพื่อแจ้งเตือนเมื่อมีงานใหม่เข้ามา แม้ว่าแอปจะปิดอยู่ก็ตาม ช่วยให้ Provider ไม่พลาดโอกาสในการรับงาน และเพิ่มประสิทธิภาพในการจับคู่งานกับ Provider

## Glossary

- **Push_Notification_System**: ระบบแจ้งเตือนผ่าน Web Push API ที่ส่งการแจ้งเตือนไปยังอุปกรณ์ของ Provider
- **VAPID_Keys**: Voluntary Application Server Identification keys ใช้สำหรับยืนยันตัวตนของ server ที่ส่ง push notification
- **Service_Worker**: Background script ที่ทำงานแยกจาก main thread สำหรับรับและแสดง push notification
- **Push_Subscription**: ข้อมูลการสมัครรับ push notification ของ Provider แต่ละคน
- **Provider**: ผู้ให้บริการที่รับงานจากระบบ (คนขับ, คนส่งของ)
- **Edge_Function**: Supabase serverless function สำหรับส่ง push notification จาก server

## Requirements

### Requirement 1: Push Notification Permission Request

**User Story:** As a Provider, I want to be prompted to enable push notifications, so that I can receive job alerts even when the app is closed.

#### Acceptance Criteria

1. WHEN a Provider opens the home page for the first time AND push notifications are supported, THE Push_Notification_System SHALL display a permission prompt after 3 seconds
2. WHEN a Provider has previously dismissed the prompt within 7 days, THE Push_Notification_System SHALL NOT display the prompt again
3. WHEN a Provider clicks "เปิดเลย" (Enable), THE Push_Notification_System SHALL request browser notification permission
4. WHEN a Provider clicks "ไว้ทีหลัง" (Later), THE Push_Notification_System SHALL dismiss the prompt and store the dismissal timestamp
5. IF the browser does not support push notifications, THEN THE Push_Notification_System SHALL NOT display the permission prompt

### Requirement 2: Push Subscription Management

**User Story:** As a Provider, I want my push subscription to be saved securely, so that I can receive notifications on this device.

#### Acceptance Criteria

1. WHEN notification permission is granted, THE Push_Notification_System SHALL create a push subscription using VAPID public key
2. WHEN a push subscription is created, THE Push_Notification_System SHALL store the subscription (endpoint, p256dh key, auth key) in the push_subscriptions table
3. WHEN a Provider already has a subscription on this device, THE Push_Notification_System SHALL update the existing subscription instead of creating a duplicate
4. WHEN a Provider unsubscribes from notifications, THE Push_Notification_System SHALL mark the subscription as inactive in the database
5. IF the VAPID public key is not configured, THEN THE Push_Notification_System SHALL log a warning and disable push functionality

### Requirement 3: New Job Notification Delivery

**User Story:** As a Provider, I want to receive push notifications when new jobs are available, so that I can quickly accept them.

#### Acceptance Criteria

1. WHEN a new ride_request with status 'pending' is created, THE Push_Notification_System SHALL send push notifications to all online Providers with active subscriptions
2. WHEN sending a notification, THE Push_Notification_System SHALL include job details: service type icon, estimated fare, and pickup address
3. WHEN a Provider receives a notification, THE Push_Notification_System SHALL display it with vibration pattern [200, 100, 200] and require interaction
4. WHEN a Provider clicks the notification, THE Push_Notification_System SHALL navigate to the provider dashboard or job detail page
5. IF a Provider is offline (is_online = false), THEN THE Push_Notification_System SHALL NOT send notifications to that Provider

### Requirement 4: Service Worker Push Handler

**User Story:** As a Provider, I want notifications to work even when the app is closed, so that I never miss a job opportunity.

#### Acceptance Criteria

1. THE Service_Worker SHALL register the push event handler on load
2. WHEN a push event is received, THE Service_Worker SHALL parse the payload and display a notification with the provided title, body, and icon
3. WHEN a notification is clicked, THE Service_Worker SHALL focus an existing app window or open a new one
4. WHEN the notification action "dismiss" is clicked, THE Service_Worker SHALL close the notification without navigation
5. WHEN the push subscription changes, THE Service_Worker SHALL notify the app to update the subscription in the database

### Requirement 5: Notification Status Indicator

**User Story:** As a Provider, I want to see if notifications are enabled, so that I know I will receive job alerts.

#### Acceptance Criteria

1. WHEN a Provider is subscribed to push notifications, THE Push_Notification_System SHALL display a notification badge icon in the header
2. WHEN a Provider is not subscribed, THE Push_Notification_System SHALL NOT display the notification badge
3. THE notification badge SHALL be visible on the provider home page header

### Requirement 6: Server-Side Push Delivery

**User Story:** As a system, I want to send push notifications from the server, so that notifications are delivered reliably even when the app is closed.

#### Acceptance Criteria

1. THE Edge_Function SHALL use web-push library to send notifications
2. WHEN sending a notification, THE Edge_Function SHALL use VAPID private key for authentication
3. WHEN a push endpoint returns 410 (Gone) or 404 (Not Found), THE Edge_Function SHALL mark the subscription as inactive
4. WHEN a new ride_request is created, THE database trigger SHALL invoke the Edge_Function to send notifications
5. THE Edge_Function SHALL log all notification delivery attempts for monitoring

### Requirement 7: Database Schema for Push Subscriptions

**User Story:** As a system, I want to store push subscriptions securely, so that notifications can be sent to the correct devices.

#### Acceptance Criteria

1. THE push_subscriptions table SHALL store: provider_id, endpoint, keys (JSONB), user_agent, created_at, updated_at, last_used_at, is_active
2. THE push_subscriptions table SHALL have a unique constraint on (provider_id, endpoint) to prevent duplicates
3. THE push_subscriptions table SHALL have RLS policies allowing Providers to manage only their own subscriptions
4. THE push_subscriptions table SHALL have RLS policies allowing Admins to view all subscriptions
5. WHEN a subscription is updated, THE database trigger SHALL automatically update the updated_at timestamp
