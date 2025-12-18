# Requirements Document

## Introduction

เอกสารนี้กำหนดความต้องการสำหรับการสร้าง database tables และ backend สำหรับบริการใหม่ 3 อย่าง ได้แก่ Queue Booking (จองคิว), Moving Service (ยกของ/ขนย้าย), และ Laundry Service (ซักผ้า) เพื่อให้ทำงานได้จริงใน production กับ Supabase

## Glossary

- **Thai_Ride_System**: ระบบหลักของแอปพลิเคชัน Thai Ride-Hailing
- **Queue_Booking**: บริการจองคิวร้านค้า/โรงพยาบาล/หน่วยงานราชการ
- **Moving_Service**: บริการยกของ/ขนย้าย
- **Laundry_Service**: บริการรับ-ส่งซักผ้า
- **Service_Provider**: ผู้ให้บริการ (คนรับงาน)
- **Customer**: ผู้ใช้บริการ
- **Tracking_ID**: รหัสติดตามงานในรูปแบบ PREFIX-YYYYMMDD-XXXXXX
- **Atomic_Operation**: การดำเนินการที่ต้องสำเร็จทั้งหมดหรือล้มเหลวทั้งหมด
- **RLS_Policy**: Row Level Security policies ใน Supabase

## Requirements

### Requirement 1: Queue Booking Service

**User Story:** ในฐานะลูกค้า ฉันต้องการจองคิวร้านค้า/โรงพยาบาล/หน่วยงานราชการ และติดตามสถานะได้ เพื่อให้ไม่ต้องรอคิวนาน

#### Acceptance Criteria

1. WHEN a customer creates a queue booking THEN THE Thai_Ride_System SHALL save to queue_bookings table with status 'pending' and generate tracking_id (QUE-YYYYMMDD-XXXXXX)
2. WHEN a customer selects a category (hospital, bank, government, restaurant, salon, other) THEN THE Thai_Ride_System SHALL store the category in the booking record
3. WHEN a customer specifies date and time THEN THE Thai_Ride_System SHALL validate that the scheduled time is in the future
4. WHEN a provider accepts a queue booking THEN THE Thai_Ride_System SHALL atomically update status to 'confirmed' and assign provider_id
5. WHEN a provider completes the queue service THEN THE Thai_Ride_System SHALL update status to 'completed' and add earnings to provider balance
6. WHEN a customer cancels a booking THEN THE Thai_Ride_System SHALL update status to 'cancelled' and record cancellation reason
7. WHEN a customer views booking history THEN THE Thai_Ride_System SHALL return all bookings for that user ordered by created_at descending

### Requirement 2: Moving Service

**User Story:** ในฐานะลูกค้า ฉันต้องการใช้บริการยกของ/ขนย้าย และติดตามสถานะได้ เพื่อให้สามารถขนย้ายสิ่งของได้สะดวก

#### Acceptance Criteria

1. WHEN a customer creates a moving request THEN THE Thai_Ride_System SHALL save to moving_requests table with status 'pending' and generate tracking_id (MOV-YYYYMMDD-XXXXXX)
2. WHEN a customer selects service type (small, medium, large) THEN THE Thai_Ride_System SHALL calculate estimated price based on service type
3. WHEN a customer specifies pickup and destination addresses THEN THE Thai_Ride_System SHALL store both locations with coordinates
4. WHEN a customer specifies number of helpers (1, 2, 3+) THEN THE Thai_Ride_System SHALL store helper count and adjust pricing
5. WHEN a provider accepts a moving request THEN THE Thai_Ride_System SHALL atomically update status to 'matched' and assign provider_id
6. WHEN a provider arrives at pickup location THEN THE Thai_Ride_System SHALL update status to 'pickup' and notify customer
7. WHEN a provider starts moving THEN THE Thai_Ride_System SHALL update status to 'in_progress'
8. WHEN a provider completes the moving THEN THE Thai_Ride_System SHALL update status to 'completed', calculate final_price, and add earnings to provider balance
9. WHEN a customer rates the moving service THEN THE Thai_Ride_System SHALL save rating to moving_ratings table

### Requirement 3: Laundry Service

**User Story:** ในฐานะลูกค้า ฉันต้องการใช้บริการรับ-ส่งซักผ้า และติดตามสถานะได้ เพื่อให้สามารถซักผ้าได้สะดวก

#### Acceptance Criteria

1. WHEN a customer creates a laundry request THEN THE Thai_Ride_System SHALL save to laundry_requests table with status 'pending' and generate tracking_id (LAU-YYYYMMDD-XXXXXX)
2. WHEN a customer selects service types (wash-fold, wash-iron, dry-clean, express) THEN THE Thai_Ride_System SHALL store selected services as JSON array
3. WHEN a customer specifies pickup address and schedule THEN THE Thai_Ride_System SHALL store address and scheduled pickup time
4. WHEN a provider accepts a laundry request THEN THE Thai_Ride_System SHALL atomically update status to 'matched' and assign provider_id
5. WHEN a provider picks up laundry THEN THE Thai_Ride_System SHALL update status to 'picked_up' and record actual weight
6. WHEN a provider completes washing THEN THE Thai_Ride_System SHALL update status to 'ready' and calculate final price based on weight
7. WHEN a provider delivers laundry THEN THE Thai_Ride_System SHALL update status to 'delivered' and add earnings to provider balance
8. WHEN a customer rates the laundry service THEN THE Thai_Ride_System SHALL save rating to laundry_ratings table

### Requirement 4: Provider Job Management for New Services

**User Story:** ในฐานะผู้ให้บริการ ฉันต้องการรับงานและจัดการงานบริการใหม่ทั้ง 3 ประเภทได้ เพื่อให้สามารถหารายได้เพิ่มเติม

#### Acceptance Criteria

1. WHEN a provider views available jobs THEN THE Thai_Ride_System SHALL fetch pending requests from all service types (queue, moving, laundry)
2. WHEN a provider accepts a job THEN THE Thai_Ride_System SHALL use atomic RPC to prevent double-booking
3. WHEN a provider updates job status THEN THE Thai_Ride_System SHALL validate status transition and notify customer via realtime
4. WHEN a provider completes a job THEN THE Thai_Ride_System SHALL add earnings to provider balance and update daily stats
5. WHEN a provider views earnings THEN THE Thai_Ride_System SHALL include earnings from all service types

### Requirement 5: Admin Management for New Services

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการจัดการข้อมูลบริการใหม่ทั้ง 3 ประเภทได้ เพื่อให้สามารถดูแลและควบคุมระบบได้

#### Acceptance Criteria

1. WHEN an admin views dashboard THEN THE Thai_Ride_System SHALL display statistics for all service types including queue, moving, and laundry
2. WHEN an admin views orders THEN THE Thai_Ride_System SHALL allow filtering by service type (ride, delivery, shopping, queue, moving, laundry)
3. WHEN an admin manages queue bookings THEN THE Thai_Ride_System SHALL allow view, status update, and cancellation
4. WHEN an admin manages moving requests THEN THE Thai_Ride_System SHALL allow view, status update, price adjustment, and cancellation
5. WHEN an admin manages laundry requests THEN THE Thai_Ride_System SHALL allow view, status update, weight update, and cancellation

### Requirement 6: Realtime Updates for New Services

**User Story:** ในฐานะผู้ใช้ ฉันต้องการติดตามสถานะบริการใหม่แบบ real-time เพื่อให้ทราบความคืบหน้าทันที

#### Acceptance Criteria

1. WHEN queue booking status changes THEN THE Thai_Ride_System SHALL broadcast via realtime to customer
2. WHEN moving request status changes THEN THE Thai_Ride_System SHALL broadcast via realtime to customer and show provider location
3. WHEN laundry request status changes THEN THE Thai_Ride_System SHALL broadcast via realtime to customer
4. WHEN a provider accepts any new service job THEN THE Thai_Ride_System SHALL notify customer via push notification

### Requirement 7: Notification System for New Services

**User Story:** ในฐานะผู้ใช้ ฉันต้องการรับการแจ้งเตือนสำหรับบริการใหม่ เพื่อให้ทราบสถานะและข้อมูลสำคัญ

#### Acceptance Criteria

1. WHEN a queue booking is confirmed THEN THE Thai_Ride_System SHALL send notification to customer with booking details
2. WHEN a moving provider arrives THEN THE Thai_Ride_System SHALL send notification to customer
3. WHEN laundry is ready for delivery THEN THE Thai_Ride_System SHALL send notification to customer
4. WHEN any new service job is available THEN THE Thai_Ride_System SHALL notify nearby providers

