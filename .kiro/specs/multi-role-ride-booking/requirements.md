# Requirements Document

## Introduction

ระบบ Multi-Role Ride Booking สำหรับบริการเรียกรถ ที่รองรับ 3 บทบาท (Customer, Provider, Admin) ทำงานพร้อมกันแบบ Real-time โดยรับประกัน State Consistency, ACID Transactions และ Zero Money Loss

## Glossary

- **Customer**: ผู้ใช้บริการที่เรียกรถ
- **Provider**: คนขับรถที่ให้บริการ (Driver/Rider)
- **Admin**: ผู้ดูแลระบบที่มีสิทธิ์จัดการทุกอย่าง
- **Ride_Request**: คำขอเรียกรถจาก Customer
- **Wallet**: กระเป๋าเงินของ Customer
- **Wallet_Hold**: การกันเงินไว้ชั่วคราวระหว่างรอบริการ
- **Race_Condition**: สถานการณ์ที่ Provider หลายคนพยายามรับงานพร้อมกัน
- **Atomic_Transaction**: การดำเนินการที่ต้องสำเร็จทั้งหมดหรือล้มเหลวทั้งหมด
- **Realtime_Sync**: การอัพเดทสถานะแบบทันที (<200ms) ไปยังทุกฝ่าย
- **Audit_Log**: บันทึกการเปลี่ยนแปลงสถานะทุกครั้ง

## Requirements

### Requirement 1: Customer Ride Creation

**User Story:** As a Customer, I want to create a ride request with automatic wallet hold, so that I can book a ride with guaranteed payment.

#### Acceptance Criteria

1. WHEN a Customer submits a ride request, THE Ride_System SHALL verify wallet balance is greater than or equal to estimated fare
2. IF wallet balance is insufficient, THEN THE Ride_System SHALL reject the request and display "ยอดเงินไม่เพียงพอ"
3. WHEN wallet balance is sufficient, THE Ride_System SHALL atomically hold the estimated fare and create a pending ride request
4. IF the atomic transaction fails at any step, THEN THE Ride_System SHALL rollback all changes and return the held amount
5. WHEN a ride request is created successfully, THE Ride_System SHALL generate a unique tracking ID with format "RID-YYYYMMDD-XXXXXX"
6. WHEN a ride request is created, THE Ride_System SHALL broadcast to nearby available Providers within 5km radius

### Requirement 2: Provider Job Notification

**User Story:** As a Provider, I want to receive instant notifications for new ride requests, so that I can accept jobs quickly.

#### Acceptance Criteria

1. WHEN a new ride request is created within 5km of Provider's location, THE Notification_System SHALL send push notification within 1 second
2. WHEN Provider receives notification, THE Provider_App SHALL play a sound alert and display job details
3. WHILE Provider is offline, THE Notification_System SHALL queue notifications for delivery when online
4. WHEN Provider opens the app, THE Provider_Dashboard SHALL display all pending ride requests sorted by distance

### Requirement 3: Provider Job Acceptance (Race Condition Handling)

**User Story:** As a Provider, I want to accept a ride request with guaranteed assignment, so that I don't lose jobs to race conditions.

#### Acceptance Criteria

1. WHEN Provider clicks accept, THE Ride_System SHALL acquire a database lock on the ride request
2. IF the ride is already accepted by another Provider, THEN THE Ride_System SHALL return "RIDE_ALREADY_ACCEPTED" error within 100ms
3. WHEN Provider loses the race, THE Provider_App SHALL display "งานนี้มีคนรับแล้ว" message
4. WHEN Provider wins the race, THE Ride_System SHALL atomically update ride status to "matched" and assign provider_id
5. WHEN ride is matched, THE Ride_System SHALL update Provider status to "busy" and set current_ride_id
6. WHEN ride is matched, THE Ride_System SHALL notify Customer with Provider details within 200ms

### Requirement 4: Real-time State Synchronization

**User Story:** As a Customer, I want to see real-time updates of my ride status, so that I know exactly what's happening.

#### Acceptance Criteria

1. WHEN ride status changes, THE Realtime_System SHALL propagate the change to Customer within 200ms
2. WHEN ride status changes, THE Realtime_System SHALL propagate the change to Admin dashboard within 200ms
3. WHEN Provider location updates, THE Tracking_System SHALL broadcast to Customer every 5 seconds
4. WHEN ride is matched, THE Customer_App SHALL display Provider name, photo, vehicle plate, and real-time location
5. WHILE ride is in progress, THE Customer_App SHALL display ETA and route visualization

### Requirement 5: Ride Status Flow

**User Story:** As a Provider, I want to update ride status through each phase, so that Customer and Admin can track progress.

#### Acceptance Criteria

1. THE Ride_System SHALL enforce status flow: pending → matched → arriving → picked_up → in_progress → completed
2. WHEN Provider updates status, THE Ride_System SHALL validate the transition is allowed
3. IF status transition is invalid, THEN THE Ride_System SHALL reject the update and return error
4. WHEN status changes, THE Audit_System SHALL log the change with timestamp, actor, and role
5. WHEN status changes to "arriving", THE Customer_App SHALL display "คนขับกำลังมาหาคุณ"
6. WHEN status changes to "picked_up", THE Customer_App SHALL display "เริ่มเดินทาง"

### Requirement 6: Ride Completion and Payment Settlement

**User Story:** As a Provider, I want to complete a ride with automatic payment settlement, so that I receive my earnings immediately.

#### Acceptance Criteria

1. WHEN Provider marks ride as completed, THE Payment_System SHALL atomically release wallet hold and settle payment
2. IF actual fare is less than estimated, THEN THE Payment_System SHALL refund the difference to Customer wallet
3. WHEN payment is settled, THE Payment_System SHALL calculate platform fee (20%) and provider earnings (80%)
4. WHEN payment is settled, THE Payment_System SHALL add earnings to Provider's pending balance
5. WHEN ride is completed, THE Loyalty_System SHALL award points to Customer (1 point per 10 THB)
6. WHEN ride is completed, THE Notification_System SHALL prompt Customer to rate the ride
7. WHEN ride is completed, THE Provider_System SHALL update Provider status to "available"

### Requirement 7: Ride Cancellation and Refund

**User Story:** As a Customer, I want to cancel a ride with fair refund policy, so that I'm not unfairly charged.

#### Acceptance Criteria

1. WHEN Customer cancels before matching, THE Refund_System SHALL return 100% of held amount
2. WHEN Customer cancels after matching, THE Refund_System SHALL return 80% and charge 20% cancellation fee
3. WHEN Provider cancels, THE Refund_System SHALL return 100% to Customer and log Provider penalty
4. WHEN Admin cancels, THE Refund_System SHALL return 100% to Customer
5. WHEN cancellation occurs, THE Refund_System SHALL atomically update ride status and process refund
6. WHEN cancellation occurs, THE Notification_System SHALL notify all affected parties
7. WHEN Provider cancels, THE Audit_System SHALL log cancellation in provider_cancellation_log

### Requirement 8: Network Failure Recovery

**User Story:** As a System, I want to automatically recover from Provider disconnections, so that Customers are not stranded.

#### Acceptance Criteria

1. WHILE Provider is matched, THE Monitoring_System SHALL track last_location_update timestamp
2. IF Provider has no location update for 2 minutes, THEN THE Monitoring_System SHALL mark Provider as potentially offline
3. IF ride is stuck in matched/arriving for 5 minutes with offline Provider, THEN THE Recovery_System SHALL auto-cancel and reassign
4. WHEN auto-cancellation occurs, THE Refund_System SHALL return 100% to Customer
5. WHEN auto-cancellation occurs, THE Notification_System SHALL inform Customer "กำลังหาคนขับใหม่"
6. WHEN auto-cancellation occurs, THE Broadcast_System SHALL re-broadcast to nearby Providers

### Requirement 9: Admin Real-time Monitoring

**User Story:** As an Admin, I want to monitor all rides in real-time, so that I can intervene when needed.

#### Acceptance Criteria

1. WHEN Admin opens dashboard, THE Admin_Dashboard SHALL display all active rides with real-time status
2. WHEN any ride status changes, THE Admin_Dashboard SHALL update within 200ms
3. THE Admin_Dashboard SHALL display ride details including Customer info, Provider info, and payment status
4. WHEN Admin views a ride, THE Admin_Dashboard SHALL show complete audit trail with timestamps
5. THE Admin SHALL be able to cancel any ride with full refund to Customer
6. THE Admin SHALL be able to view Provider cancellation history and penalty count

### Requirement 10: Data Integrity and Security

**User Story:** As a System, I want to ensure data integrity and prevent unauthorized access, so that the system is secure and reliable.

#### Acceptance Criteria

1. THE Database SHALL enforce wallet balance cannot be negative
2. THE Database SHALL enforce held_balance cannot be negative
3. THE RLS_Policy SHALL allow Customers to only view their own rides
4. THE RLS_Policy SHALL allow Providers to view pending rides and their own accepted rides
5. THE RLS_Policy SHALL allow Admins to view and modify all rides
6. WHEN any financial transaction occurs, THE Audit_System SHALL log the transaction with full details
