# Requirements Document

## Introduction

ระบบ Push Notification ขั้นสูงที่เพิ่มความสามารถ 3 ส่วน:

1. **Silent Push for Background Sync** - ส่ง silent push เพื่อ sync ข้อมูลใน background โดยไม่รบกวนผู้ใช้
2. **Notification Preferences** - ให้ Provider เลือกประเภท notification ที่ต้องการรับ
3. **Push Analytics Dashboard** - Admin dashboard แสดงสถิติการส่ง notification

## Glossary

- **Silent_Push**: Push notification ที่ไม่แสดงผลให้ผู้ใช้เห็น ใช้สำหรับ trigger background sync
- **Notification_Preferences**: การตั้งค่าประเภท notification ที่ Provider ต้องการรับ
- **Push_Analytics**: ข้อมูลสถิติการส่ง notification รวมถึง delivery rate, open rate
- **Provider**: ผู้ให้บริการที่รับงานจากระบบ
- **Admin**: ผู้ดูแลระบบที่มีสิทธิ์เข้าถึงข้อมูลทั้งหมด
- **Background_Sync**: การ sync ข้อมูลใน background โดยไม่ต้องเปิดแอป

## Requirements

### Requirement 1: Silent Push for Background Sync

**User Story:** As a Provider, I want my app to sync data in the background, so that I always have the latest job information when I open the app.

#### Acceptance Criteria

1. WHEN the server sends a silent push, THE Service_Worker SHALL trigger a background sync without displaying a notification
2. WHEN a background sync is triggered, THE System SHALL fetch and cache the latest available jobs
3. WHEN a background sync is triggered, THE System SHALL update the Provider's earnings data
4. IF the app is open when silent push arrives, THEN THE System SHALL refresh the current view data
5. THE System SHALL send silent push every 15 minutes to online Providers

### Requirement 2: Notification Type Categories

**User Story:** As a Provider, I want to choose which types of notifications I receive, so that I only get alerts that are relevant to me.

#### Acceptance Criteria

1. THE System SHALL support the following notification categories: new_job, job_update, earnings, promotions, system_announcements
2. WHEN a Provider opens notification settings, THE System SHALL display all categories with toggle switches
3. WHEN a Provider disables a category, THE System SHALL NOT send notifications of that type to the Provider
4. THE System SHALL enable all notification categories by default for new Providers
5. WHEN a Provider changes preferences, THE System SHALL persist the changes immediately

### Requirement 3: Notification Preferences UI

**User Story:** As a Provider, I want an easy-to-use settings page for notifications, so that I can quickly adjust my preferences.

#### Acceptance Criteria

1. WHEN a Provider navigates to notification settings, THE System SHALL display a list of notification categories with descriptions
2. WHEN a Provider toggles a category, THE System SHALL show immediate visual feedback
3. THE System SHALL display the current notification permission status (granted/denied/default)
4. IF notification permission is denied, THEN THE System SHALL show instructions to enable in browser settings
5. THE System SHALL allow Provider to test notifications with a "ทดสอบ" button

### Requirement 4: Push Delivery Logging

**User Story:** As an Admin, I want to track all push notification deliveries, so that I can monitor system health and debug issues.

#### Acceptance Criteria

1. WHEN a push notification is sent, THE System SHALL log: timestamp, provider_id, notification_type, status (sent/delivered/failed), error_message
2. THE System SHALL store push logs for at least 30 days
3. WHEN a push delivery fails, THE System SHALL log the specific error code and message
4. THE System SHALL track delivery latency (time from send to delivery confirmation)

### Requirement 5: Push Analytics Dashboard

**User Story:** As an Admin, I want to view push notification statistics, so that I can understand engagement and optimize notification strategy.

#### Acceptance Criteria

1. WHEN an Admin opens the Push Analytics page, THE System SHALL display summary metrics: total sent, delivery rate, failure rate
2. THE System SHALL display a chart showing notification volume over time (last 7 days, 30 days)
3. THE System SHALL display breakdown by notification type (new_job, earnings, etc.)
4. THE System SHALL display top failure reasons with counts
5. WHEN an Admin clicks on a time period, THE System SHALL show detailed logs for that period

### Requirement 6: Notification Preferences Database Schema

**User Story:** As a system, I want to store notification preferences securely, so that preferences are persisted across sessions.

#### Acceptance Criteria

1. THE notification_preferences table SHALL store: provider_id, category, enabled, updated_at
2. THE notification_preferences table SHALL have a unique constraint on (provider_id, category)
3. THE notification_preferences table SHALL have RLS policies allowing Providers to manage only their own preferences
4. THE notification_preferences table SHALL have RLS policies allowing Admins to view all preferences

### Requirement 7: Push Logs Database Schema

**User Story:** As a system, I want to store push logs efficiently, so that analytics queries are fast.

#### Acceptance Criteria

1. THE push_logs table SHALL store: id, provider_id, notification_type, title, body, status, error_message, sent_at, delivered_at, latency_ms
2. THE push_logs table SHALL have indexes on (sent_at, notification_type) for analytics queries
3. THE push_logs table SHALL have RLS policies allowing only Admins to view logs
4. THE System SHALL automatically delete logs older than 30 days via scheduled cleanup
