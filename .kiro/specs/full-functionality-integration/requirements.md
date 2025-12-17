# Requirements Document

## Introduction

เอกสารนี้กำหนดความต้องการสำหรับการทำให้ทุกฟีเจอร์ในแอปพลิเคชัน Thai Ride-Hailing ทำงานได้จริงกับฐานข้อมูล Supabase โดยเน้นการเชื่อมต่อที่ถูกต้อง ลื่นไหล และทำงานได้จริงครบทุก flow ตั้งแต่ลูกค้าเรียกรถ → คนขับรับงาน → จบงาน → ให้คะแนน

## Glossary

- **Thai_Ride_System**: ระบบเรียกรถหลักของแอปพลิเคชัน
- **Supabase_Backend**: ฐานข้อมูล PostgreSQL และ API ที่ใช้เป็น backend
- **Composable**: Vue.js composable functions ที่จัดการ business logic
- **RLS_Policy**: Row Level Security policies ใน Supabase
- **Realtime_Subscription**: การ subscribe ข้อมูลแบบ real-time จาก Supabase
- **Service_Provider**: ผู้ให้บริการ (คนขับรถ, คนส่งของ)
- **Customer**: ผู้ใช้บริการ
- **Admin**: ผู้ดูแลระบบ
- **Atomic_Operation**: การดำเนินการที่ต้องสำเร็จทั้งหมดหรือล้มเหลวทั้งหมด

## Requirements

### Requirement 1: Complete Ride Flow (Customer → Provider → Complete)

**User Story:** ในฐานะลูกค้า ฉันต้องการเรียกรถและติดตามจนจบงานได้จริง เพื่อให้สามารถเดินทางได้อย่างสะดวก

#### Acceptance Criteria

1. WHEN a customer creates a ride request THEN THE Thai_Ride_System SHALL save to database with status 'pending' and notify nearby providers via realtime
2. WHEN a provider accepts a ride THEN THE Thai_Ride_System SHALL atomically update status to 'matched' and assign provider_id using accept_ride_request RPC
3. WHEN a provider arrives at pickup THEN THE Thai_Ride_System SHALL update status to 'pickup' and notify customer via realtime
4. WHEN a provider starts the trip THEN THE Thai_Ride_System SHALL update status to 'in_progress' and start tracking
5. WHEN a provider completes the trip THEN THE Thai_Ride_System SHALL update status to 'completed', calculate final_fare, and add earnings to provider balance
6. WHEN a customer rates the ride THEN THE Thai_Ride_System SHALL save rating to ride_ratings table and update provider average rating

### Requirement 2: Complete Delivery Flow

**User Story:** ในฐานะลูกค้า ฉันต้องการส่งของและติดตามจนส่งถึงได้จริง เพื่อให้สามารถส่งพัสดุได้อย่างมั่นใจ

#### Acceptance Criteria

1. WHEN a customer creates a delivery request THEN THE Thai_Ride_System SHALL save to database with tracking_id and calculated fee
2. WHEN a provider accepts delivery THEN THE Thai_Ride_System SHALL atomically assign provider and update status to 'matched'
3. WHEN a provider picks up package THEN THE Thai_Ride_System SHALL update status to 'in_transit' and notify customer
4. WHEN a provider delivers package THEN THE Thai_Ride_System SHALL update status to 'delivered' and add earnings to provider balance
5. WHEN a customer rates delivery THEN THE Thai_Ride_System SHALL save rating to delivery_ratings table

### Requirement 3: Complete Shopping Flow

**User Story:** ในฐานะลูกค้า ฉันต้องการสั่งซื้อของและติดตามจนส่งถึงได้จริง เพื่อให้สามารถซื้อของได้สะดวก

#### Acceptance Criteria

1. WHEN a customer creates a shopping request THEN THE Thai_Ride_System SHALL save to database with item list and budget limit
2. WHEN a provider accepts shopping THEN THE Thai_Ride_System SHALL atomically assign provider and update status to 'matched'
3. WHEN a provider starts shopping THEN THE Thai_Ride_System SHALL update status to 'shopping' and allow item updates
4. WHEN a provider completes shopping THEN THE Thai_Ride_System SHALL update status to 'delivering' and show actual items purchased
5. WHEN a provider delivers items THEN THE Thai_Ride_System SHALL update status to 'completed' and calculate final total

### Requirement 4: Provider Dashboard Real Functionality

**User Story:** ในฐานะผู้ให้บริการ ฉันต้องการจัดการงานและรายได้ได้จริง เพื่อให้สามารถทำงานและถอนเงินได้

#### Acceptance Criteria

1. WHEN a provider goes online THEN THE Thai_Ride_System SHALL update is_available to true and start location tracking session
2. WHEN a provider views available jobs THEN THE Thai_Ride_System SHALL fetch pending requests within service radius
3. WHEN a provider accepts a job THEN THE Thai_Ride_System SHALL use atomic RPC to prevent double-booking
4. WHEN a provider updates job status THEN THE Thai_Ride_System SHALL validate status transition and notify customer
5. WHEN a provider completes a job THEN THE Thai_Ride_System SHALL add earnings to provider balance and update daily stats
6. WHEN a provider requests withdrawal THEN THE Thai_Ride_System SHALL validate balance and create withdrawal record

### Requirement 5: Admin Dashboard Real Functionality

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการจัดการข้อมูลทั้งหมดในระบบได้จริง เพื่อให้สามารถดูแลและควบคุมระบบได้

#### Acceptance Criteria

1. WHEN an admin views dashboard THEN THE Thai_Ride_System SHALL display real statistics from database aggregations
2. WHEN an admin manages users THEN THE Thai_Ride_System SHALL allow view, edit, suspend, and delete operations
3. WHEN an admin manages providers THEN THE Thai_Ride_System SHALL allow approval, rejection, suspension, and document verification
4. WHEN an admin manages orders THEN THE Thai_Ride_System SHALL allow status updates, cancellation, and refund processing
5. WHEN an admin manages promos THEN THE Thai_Ride_System SHALL allow create, edit, deactivate, and usage tracking

### Requirement 6: Payment and Wallet System

**User Story:** ในฐานะผู้ใช้ ฉันต้องการระบบการเงินที่ทำงานได้จริง เพื่อให้สามารถชำระเงินและจัดการกระเป๋าเงินได้

#### Acceptance Criteria

1. WHEN a user views wallet THEN THE Thai_Ride_System SHALL display accurate balance from user_wallets table
2. WHEN a user tops up wallet THEN THE Thai_Ride_System SHALL create wallet_transaction and update balance atomically
3. WHEN a payment is processed THEN THE Thai_Ride_System SHALL deduct from wallet using add_wallet_transaction RPC
4. WHEN a refund is issued THEN THE Thai_Ride_System SHALL add to wallet and record transaction with refund type
5. WHEN a provider earns money THEN THE Thai_Ride_System SHALL add to provider balance in service_providers table

### Requirement 7: Real-time Tracking and Sync

**User Story:** ในฐานะผู้ใช้ ฉันต้องการติดตามสถานะแบบ real-time เพื่อให้ทราบตำแหน่งและสถานะปัจจุบัน

#### Acceptance Criteria

1. WHEN a provider location changes THEN THE Thai_Ride_System SHALL update current_lat and current_lng via realtime channel
2. WHEN a customer tracks order THEN THE Thai_Ride_System SHALL subscribe to provider location and display on map
3. WHEN order status changes THEN THE Thai_Ride_System SHALL broadcast via realtime to all subscribed clients
4. WHEN a provider goes online or offline THEN THE Thai_Ride_System SHALL update availability and broadcast to admin dashboard
5. WHEN multiple users view same order THEN THE Thai_Ride_System SHALL sync status across all clients within 2 seconds

### Requirement 8: Notification System

**User Story:** ในฐานะผู้ใช้ ฉันต้องการรับการแจ้งเตือนที่ถูกต้อง เพื่อให้ทราบสถานะและข้อมูลสำคัญ

#### Acceptance Criteria

1. WHEN a notification is triggered THEN THE Thai_Ride_System SHALL save to user_notifications and display in notification center
2. WHEN a provider receives new job THEN THE Thai_Ride_System SHALL send push notification via push_notification_queue
3. WHEN order status changes THEN THE Thai_Ride_System SHALL notify relevant parties (customer, provider, admin)
4. WHEN a user marks notification as read THEN THE Thai_Ride_System SHALL update is_read status in database
5. WHEN push subscription is saved THEN THE Thai_Ride_System SHALL store in push_subscriptions table

### Requirement 9: Loyalty and Rewards System

**User Story:** ในฐานะลูกค้า ฉันต้องการสะสมและใช้คะแนนสะสมได้จริง เพื่อให้ได้รับสิทธิประโยชน์

#### Acceptance Criteria

1. WHEN a user completes a service THEN THE Thai_Ride_System SHALL award points using add_loyalty_points RPC
2. WHEN a user views loyalty status THEN THE Thai_Ride_System SHALL display points, tier, and available rewards from get_loyalty_summary
3. WHEN a user redeems a reward THEN THE Thai_Ride_System SHALL deduct points and create user_rewards record using redeem_reward RPC
4. WHEN a user tier changes THEN THE Thai_Ride_System SHALL update user_loyalty and notify user
5. WHEN admin manages rewards THEN THE Thai_Ride_System SHALL allow create, edit, and deactivate loyalty_rewards

### Requirement 10: Promo and Referral System

**User Story:** ในฐานะผู้ใช้ ฉันต้องการใช้โปรโมชั่นและระบบแนะนำเพื่อนได้จริง เพื่อให้ได้รับส่วนลดและรางวัล

#### Acceptance Criteria

1. WHEN a user applies promo code THEN THE Thai_Ride_System SHALL validate using validate_promo_code and apply discount
2. WHEN a user uses promo THEN THE Thai_Ride_System SHALL record in user_promo_usage and decrement usage_count
3. WHEN a user generates referral code THEN THE Thai_Ride_System SHALL create unique code in referral_codes table
4. WHEN a referee signs up with code THEN THE Thai_Ride_System SHALL reward both parties using apply_referral_code RPC
5. WHEN promo expires or runs out THEN THE Thai_Ride_System SHALL prevent usage and show appropriate message

### Requirement 11: Support and Safety Features

**User Story:** ในฐานะผู้ใช้ ฉันต้องการเข้าถึงระบบช่วยเหลือและความปลอดภัยได้จริง เพื่อให้รู้สึกปลอดภัยในการใช้บริการ

#### Acceptance Criteria

1. WHEN a user creates support ticket THEN THE Thai_Ride_System SHALL save to support_tickets and notify admin
2. WHEN a user triggers SOS THEN THE Thai_Ride_System SHALL create safety_incident and alert emergency_contacts
3. WHEN a user shares trip THEN THE Thai_Ride_System SHALL create trip_shares record with share link
4. WHEN admin responds to ticket THEN THE Thai_Ride_System SHALL update ticket and notify user
5. WHEN a user files complaint THEN THE Thai_Ride_System SHALL save to complaints table and track resolution

### Requirement 12: Scheduled Rides and Advanced Features

**User Story:** ในฐานะลูกค้า ฉันต้องการใช้ฟีเจอร์ขั้นสูงได้จริง เพื่อให้มีความยืดหยุ่นในการใช้บริการ

#### Acceptance Criteria

1. WHEN a user schedules a ride THEN THE Thai_Ride_System SHALL save to scheduled_rides and trigger at scheduled time
2. WHEN a user adds favorite driver THEN THE Thai_Ride_System SHALL save to favorite_drivers and prioritize in matching
3. WHEN a user subscribes to plan THEN THE Thai_Ride_System SHALL create user_subscriptions and apply benefits
4. WHEN a user purchases insurance THEN THE Thai_Ride_System SHALL create user_insurance and activate coverage
5. WHEN a user files insurance claim THEN THE Thai_Ride_System SHALL create insurance_claims and track status

