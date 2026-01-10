# Requirements Document

## Introduction

ระบบ Provider System Redesign เป็นการออกแบบและพัฒนาระบบผู้ให้บริการ (Provider) ใหม่ทั้งหมด สำหรับแพลตฟอร์ม Thai Ride App ที่รองรับหลายประเภทบริการ (Ride, Delivery, Shopping, Moving, Laundry) พร้อมระบบจัดการจาก Admin ที่มีประสิทธิภาพ

ระบบนี้จะครอบคลุมตั้งแต่การลงทะเบียน, การตรวจสอบเอกสาร, การจัดการงาน, การติดตามรายได้, ไปจนถึงการบริหารจัดการโดย Admin

## Glossary

- **Provider**: ผู้ให้บริการ (คนขับรถ, ไรเดอร์, นักช้อป, คนขนย้าย, คนซักผ้า)
- **Admin**: ผู้ดูแลระบบที่มีสิทธิ์จัดการ Provider ทั้งหมด
- **Provider_Dashboard**: หน้าแดชบอร์ดหลักของ Provider
- **Job**: งานที่ Provider สามารถรับได้
- **Order**: คำสั่งซื้อหรือการจองบริการจากลูกค้า
- **Onboarding**: กระบวนการลงทะเบียนและตรวจสอบเอกสาร Provider ใหม่
- **Verification_Queue**: คิวรอการตรวจสอบเอกสารโดย Admin
- **Provider_Status**: สถานะของ Provider (pending, approved, active, suspended, rejected)
- **Service_Type**: ประเภทบริการ (ride, delivery, shopping, moving, laundry)
- **Earnings**: รายได้ของ Provider
- **Wallet**: กระเป๋าเงินของ Provider
- **Withdrawal**: การถอนเงินของ Provider
- **Rating**: คะแนนประเมินของ Provider
- **Performance_Metrics**: ตัวชี้วัดประสิทธิภาพของ Provider
- **Real_Time_Tracking**: การติดตามตำแหน่งแบบเรียลไทม์
- **Notification_System**: ระบบแจ้งเตือน
- **Document_Verification**: การตรวจสอบเอกสาร

## Requirements

### Requirement 1: Provider Registration and Onboarding

**User Story:** As a new provider, I want to register and complete onboarding process, so that I can start providing services on the platform.

#### Acceptance Criteria

1. WHEN a user accesses the provider registration page, THE System SHALL display a registration form with required fields (name, phone, email, service type)
2. WHEN a user submits valid registration data, THE System SHALL create a provider account with status "pending"
3. WHEN a provider account is created, THE System SHALL send a verification email to the provider
4. WHEN a provider completes email verification, THE System SHALL redirect them to the document upload page
5. WHEN a provider uploads required documents (ID card, driver license, vehicle registration, bank account), THE System SHALL store them securely and add the provider to the verification queue
6. WHEN all required documents are uploaded, THE System SHALL update provider status to "pending_verification"
7. WHEN a provider's status is "pending_verification", THE System SHALL prevent them from accessing the main dashboard

### Requirement 2: Admin Provider Verification

**User Story:** As an admin, I want to review and verify provider applications, so that only qualified providers can use the platform.

#### Acceptance Criteria

1. WHEN an admin accesses the verification queue, THE System SHALL display all providers with status "pending_verification" ordered by submission date
2. WHEN an admin views a provider application, THE System SHALL display all uploaded documents with preview capability
3. WHEN an admin approves a provider, THE System SHALL update provider status to "approved" and send approval notification
4. WHEN an admin rejects a provider, THE System SHALL require a rejection reason and send rejection notification with the reason
5. WHEN a provider is approved, THE System SHALL create a provider_uid and enable access to the provider dashboard
6. WHEN a provider is rejected, THE System SHALL allow them to resubmit documents after reviewing the rejection reason

### Requirement 3: Provider Dashboard

**User Story:** As a provider, I want to access a comprehensive dashboard, so that I can manage my work and track my performance.

#### Acceptance Criteria

1. WHEN a provider with status "approved" or "active" accesses the dashboard, THE System SHALL display their current status (online/offline)
2. WHEN the dashboard loads, THE System SHALL display today's earnings, completed jobs, and current rating
3. WHEN the dashboard loads, THE System SHALL display available jobs matching the provider's service type
4. WHEN a provider toggles their online status, THE System SHALL update their availability in real-time
5. WHEN a provider is online, THE System SHALL send them job notifications based on their location and service type
6. WHEN the dashboard displays performance metrics, THE System SHALL show acceptance rate, completion rate, and average rating

### Requirement 4: Job Management

**User Story:** As a provider, I want to view and accept available jobs, so that I can earn income.

#### Acceptance Criteria

1. WHEN a provider is online, THE System SHALL display available jobs within their service area
2. WHEN a new job becomes available, THE System SHALL send a push notification to nearby online providers
3. WHEN a provider views a job, THE System SHALL display pickup location, destination, estimated earnings, and distance
4. WHEN a provider accepts a job, THE System SHALL assign the job to them and notify the customer
5. WHEN a provider accepts a job, THE System SHALL remove the job from other providers' available jobs list
6. WHEN a provider rejects a job, THE System SHALL offer the job to the next available provider
7. WHEN a provider has an active job, THE System SHALL prevent them from accepting new jobs until completion

### Requirement 5: Real-Time Job Tracking

**User Story:** As a provider, I want to track my current job in real-time, so that I can navigate efficiently and update customers.

#### Acceptance Criteria

1. WHEN a provider accepts a job, THE System SHALL display a navigation interface with turn-by-turn directions
2. WHEN a provider is en route, THE System SHALL update their location to the customer every 5 seconds
3. WHEN a provider arrives at pickup location, THE System SHALL enable "Arrived" button
4. WHEN a provider clicks "Arrived", THE System SHALL notify the customer and update job status to "arrived"
5. WHEN a provider starts the job (pickup complete), THE System SHALL update job status to "in_progress"
6. WHEN a provider completes the job, THE System SHALL enable "Complete" button and require delivery confirmation
7. WHEN a job is completed, THE System SHALL update provider earnings and job count immediately

### Requirement 6: Earnings and Wallet Management

**User Story:** As a provider, I want to track my earnings and manage my wallet, so that I can monitor my income and withdraw funds.

#### Acceptance Criteria

1. WHEN a provider completes a job, THE System SHALL add the earnings to their wallet balance immediately
2. WHEN a provider accesses the earnings page, THE System SHALL display daily, weekly, and monthly earnings with charts
3. WHEN a provider views earnings breakdown, THE System SHALL show base fare, distance fare, time fare, tips, and bonuses separately
4. WHEN a provider requests a withdrawal, THE System SHALL validate minimum withdrawal amount (100 THB)
5. WHEN a withdrawal request is valid, THE System SHALL create a withdrawal request with status "pending"
6. WHEN a withdrawal is processed by admin, THE System SHALL deduct the amount from wallet and update status to "completed"
7. WHEN a provider has insufficient balance, THE System SHALL prevent withdrawal and display error message

### Requirement 7: Provider Performance Tracking

**User Story:** As a provider, I want to view my performance metrics, so that I can improve my service quality.

#### Acceptance Criteria

1. WHEN a provider accesses the performance page, THE System SHALL display their current rating (1-5 stars)
2. WHEN the performance page loads, THE System SHALL display acceptance rate (accepted jobs / offered jobs)
3. WHEN the performance page loads, THE System SHALL display completion rate (completed jobs / accepted jobs)
4. WHEN the performance page loads, THE System SHALL display cancellation rate
5. WHEN a provider views ratings, THE System SHALL display recent customer reviews with comments
6. WHEN a provider's rating drops below 4.0, THE System SHALL display a warning message
7. WHEN a provider's cancellation rate exceeds 20%, THE System SHALL display a warning message

### Requirement 8: Admin Provider Management

**User Story:** As an admin, I want to manage all providers, so that I can maintain platform quality and handle issues.

#### Acceptance Criteria

1. WHEN an admin accesses the providers page, THE System SHALL display all providers with filters (status, service type, rating)
2. WHEN an admin searches for a provider, THE System SHALL search by name, phone, email, or provider_uid
3. WHEN an admin views a provider profile, THE System SHALL display complete information including documents, earnings, and job history
4. WHEN an admin suspends a provider, THE System SHALL require a suspension reason and immediately block provider access
5. WHEN a provider is suspended, THE System SHALL cancel their active jobs and notify affected customers
6. WHEN an admin reactivates a suspended provider, THE System SHALL restore their access and send reactivation notification
7. WHEN an admin views provider analytics, THE System SHALL display total providers, active providers, and pending verifications

### Requirement 9: Document Management

**User Story:** As a provider, I want to manage my documents, so that I can keep my account compliant and up-to-date.

#### Acceptance Criteria

1. WHEN a provider accesses the documents page, THE System SHALL display all uploaded documents with status (approved, pending, rejected, expired)
2. WHEN a document is expiring within 30 days, THE System SHALL display an expiration warning
3. WHEN a document expires, THE System SHALL update provider status to "suspended" and send renewal notification
4. WHEN a provider uploads a new document, THE System SHALL add it to the verification queue
5. WHEN an admin approves a document, THE System SHALL update document status to "approved"
6. WHEN an admin rejects a document, THE System SHALL require a rejection reason and allow provider to reupload
7. WHEN all documents are approved, THE System SHALL update provider status to "approved" if previously suspended

### Requirement 10: Notification System

**User Story:** As a provider, I want to receive timely notifications, so that I don't miss important updates and job opportunities.

#### Acceptance Criteria

1. WHEN a new job is available, THE System SHALL send a push notification to nearby online providers within 10 seconds
2. WHEN a provider's application is approved, THE System SHALL send an approval notification via push and email
3. WHEN a provider's application is rejected, THE System SHALL send a rejection notification with reason
4. WHEN a document is expiring, THE System SHALL send a reminder notification 30 days, 7 days, and 1 day before expiration
5. WHEN a provider receives a new rating, THE System SHALL send a notification with the rating and comment
6. WHEN a withdrawal is processed, THE System SHALL send a confirmation notification
7. WHEN a provider is suspended, THE System SHALL send an immediate notification with suspension reason

### Requirement 11: Multi-Service Type Support

**User Story:** As a provider, I want to offer multiple service types, so that I can maximize my earning opportunities.

#### Acceptance Criteria

1. WHEN a provider registers, THE System SHALL allow selection of multiple service types (ride, delivery, shopping, moving, laundry)
2. WHEN a provider has multiple service types, THE System SHALL display jobs from all selected types
3. WHEN a provider switches service type, THE System SHALL update their available jobs list immediately
4. WHEN a provider completes verification for one service type, THE System SHALL allow them to add additional service types
5. WHEN a provider adds a new service type, THE System SHALL require additional documents if needed (e.g., vehicle registration for ride service)
6. WHEN displaying earnings, THE System SHALL show breakdown by service type
7. WHEN calculating ratings, THE System SHALL maintain separate ratings for each service type

### Requirement 12: Admin Analytics and Reporting

**User Story:** As an admin, I want to view comprehensive analytics, so that I can make data-driven decisions about provider management.

#### Acceptance Criteria

1. WHEN an admin accesses the analytics dashboard, THE System SHALL display total active providers by service type
2. WHEN the analytics dashboard loads, THE System SHALL display provider growth chart (daily, weekly, monthly)
3. WHEN viewing provider performance, THE System SHALL display average rating, completion rate, and earnings by service type
4. WHEN an admin generates a report, THE System SHALL allow filtering by date range, service type, and status
5. WHEN a report is generated, THE System SHALL include provider count, total earnings, total jobs, and average metrics
6. WHEN viewing geographic distribution, THE System SHALL display a heatmap of provider locations
7. WHEN exporting data, THE System SHALL generate CSV or Excel files with selected metrics

### Requirement 13: Provider Incentives and Bonuses

**User Story:** As a provider, I want to participate in incentive programs, so that I can earn additional income.

#### Acceptance Criteria

1. WHEN a provider accesses the incentives page, THE System SHALL display active incentive programs
2. WHEN an incentive program is active, THE System SHALL display progress towards completion (e.g., 8/10 trips completed)
3. WHEN a provider completes an incentive requirement, THE System SHALL automatically add the bonus to their wallet
4. WHEN a provider earns a bonus, THE System SHALL send a congratulations notification
5. WHEN viewing earnings, THE System SHALL display bonuses separately from regular earnings
6. WHEN an admin creates a new incentive, THE System SHALL notify eligible providers
7. WHEN an incentive expires, THE System SHALL remove it from the active incentives list

### Requirement 14: Provider Support System

**User Story:** As a provider, I want to access support resources, so that I can resolve issues and get help when needed.

#### Acceptance Criteria

1. WHEN a provider accesses the help page, THE System SHALL display FAQs organized by category
2. WHEN a provider searches for help, THE System SHALL search FAQ content and display relevant results
3. WHEN a provider needs direct support, THE System SHALL provide a contact form with issue categories
4. WHEN a provider submits a support request, THE System SHALL create a ticket and send confirmation
5. WHEN an admin responds to a support ticket, THE System SHALL notify the provider
6. WHEN viewing support history, THE System SHALL display all previous tickets with status
7. WHEN a provider has an active job issue, THE System SHALL provide emergency contact button

### Requirement 15: Vehicle and Equipment Management

**User Story:** As a provider, I want to manage my vehicle and equipment information, so that I can keep my profile accurate and compliant.

#### Acceptance Criteria

1. WHEN a provider accesses the vehicle page, THE System SHALL display all registered vehicles
2. WHEN a provider adds a new vehicle, THE System SHALL require vehicle type, make, model, year, plate number, and registration document
3. WHEN a vehicle is added, THE System SHALL add it to the verification queue
4. WHEN an admin approves a vehicle, THE System SHALL enable it for job assignments
5. WHEN a provider has multiple vehicles, THE System SHALL allow selection of active vehicle before going online
6. WHEN a vehicle registration expires, THE System SHALL suspend the vehicle and notify the provider
7. WHEN a provider updates vehicle information, THE System SHALL require re-verification if critical details change
