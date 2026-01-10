# Design Document: Provider System Redesign

## Overview

ระบบ Provider System Redesign เป็นการออกแบบระบบผู้ให้บริการแบบครบวงจรสำหรับแพลตฟอร์ม Thai Ride App ที่รองรับหลายประเภทบริการ (Multi-Service Platform) โดยมีเป้าหมายหลักคือ:

1. **Unified Provider Experience**: สร้างประสบการณ์ที่สอดคล้องกันสำหรับ Provider ทุกประเภท
2. **Efficient Admin Management**: ให้ Admin สามารถจัดการ Provider ได้อย่างมีประสิทธิภาพ
3. **Real-Time Operations**: รองรับการทำงานแบบเรียลไทม์สำหรับการจับคู่งานและการติดตาม
4. **Scalable Architecture**: ออกแบบให้รองรับการเติบโตของจำนวน Provider และ Transaction
5. **Compliance & Security**: รักษาความปลอดภัยและความถูกต้องของข้อมูล

### Key Design Principles

- **Mobile-First**: ออกแบบสำหรับการใช้งานบนมือถือเป็นหลัก
- **Offline-Capable**: รองรับการทำงานแบบ offline บางส่วน
- **Progressive Enhancement**: เพิ่มฟีเจอร์ได้โดยไม่กระทบระบบเดิม
- **Data Integrity**: ใช้ RLS และ Transaction เพื่อรักษาความถูกต้องของข้อมูล
- **Performance**: Optimize สำหรับ response time และ throughput

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Provider PWA (Vue 3)          Admin Dashboard (Vue 3)       │
│  - Dashboard                   - Provider Management         │
│  - Job Management              - Verification Queue          │
│  - Earnings                    - Analytics                   │
│  - Profile                     - Reports                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│  Edge Functions:                                             │
│  - provider-registration                                     │
│  - job-matching                                              │
│  - earnings-calculation                                      │
│  - notification-dispatcher                                   │
│  - document-verification                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - providers                                                 │
│  - provider_documents                                        │
│  - provider_vehicles                                         │
│  - jobs                                                      │
│  - earnings                                                  │
│  - withdrawals                                               │
│  - ratings                                                   │
│  - notifications                                             │
│  - incentives                                                │
│  - support_tickets                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
├─────────────────────────────────────────────────────────────┤
│  - Firebase Cloud Messaging (Push Notifications)            │
│  - Supabase Storage (Document Storage)                      │
│  - Email Service (Transactional Emails)                     │
│  - SMS Service (OTP & Alerts)                               │
│  - Payment Gateway (Withdrawals)                            │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**

- Vue 3.5+ with Composition API
- TypeScript 5.9+
- Pinia (State Management)
- Vue Router 4
- Tailwind CSS 4
- Vite PWA Plugin

**Backend:**

- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Edge Functions (Deno)
- Row Level Security (RLS)

**Real-Time:**

- Supabase Realtime (WebSocket)
- PostgreSQL LISTEN/NOTIFY

**Storage:**

- Supabase Storage (Documents, Images)
- PostgreSQL (Structured Data)

## Components and Interfaces

### 1. Provider Registration Module

**Components:**

- `ProviderRegistrationForm.vue` - แบบฟอร์มลงทะเบียน
- `ServiceTypeSelector.vue` - เลือกประเภทบริการ
- `EmailVerification.vue` - ยืนยันอีเมล
- `DocumentUpload.vue` - อัปโหลดเอกสาร
- `OnboardingProgress.vue` - แสดงความคืบหน้า

**API Endpoints:**

```typescript
// Edge Function: provider-registration
interface ProviderRegistrationRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  service_types: ServiceType[];
  referral_code?: string;
}

interface ProviderRegistrationResponse {
  provider_id: string;
  status: "pending";
  verification_token: string;
}
```

**Database Schema:**

```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_uid TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status provider_status NOT NULL DEFAULT 'pending',
  service_types service_type[] NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT
);

CREATE TYPE provider_status AS ENUM (
  'pending',
  'pending_verification',
  'approved',
  'active',
  'suspended',
  'rejected'
);

CREATE TYPE service_type AS ENUM (
  'ride',
  'delivery',
  'shopping',
  'moving',
  'laundry'
);
```

### 2. Document Verification Module

**Components:**

- `DocumentUploadCard.vue` - การ์ดอัปโหลดเอกสาร
- `DocumentPreview.vue` - แสดงตัวอย่างเอกสาร
- `DocumentStatusBadge.vue` - แสดงสถานะเอกสาร
- `VerificationQueue.vue` (Admin) - คิวตรวจสอบ
- `DocumentReviewModal.vue` (Admin) - รีวิวเอกสาร

**API Endpoints:**

```typescript
// Edge Function: document-upload
interface DocumentUploadRequest {
  provider_id: string;
  document_type: DocumentType;
  file: File;
  expiry_date?: string;
}

interface DocumentUploadResponse {
  document_id: string;
  storage_path: string;
  status: "pending";
}

// Edge Function: document-verification
interface DocumentVerificationRequest {
  document_id: string;
  action: "approve" | "reject";
  reason?: string;
  admin_id: string;
}
```

**Database Schema:**

```sql
CREATE TABLE provider_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  storage_path TEXT NOT NULL,
  status document_status DEFAULT 'pending',
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

CREATE TYPE document_type AS ENUM (
  'national_id',
  'driver_license',
  'vehicle_registration',
  'vehicle_insurance',
  'bank_account',
  'criminal_record',
  'health_certificate'
);

CREATE TYPE document_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);
```

### 3. Provider Dashboard Module

**Components:**

- `ProviderDashboard.vue` - หน้าแดชบอร์ดหลัก
- `OnlineStatusToggle.vue` - สวิตช์ออนไลน์/ออฟไลน์
- `TodayEarningsCard.vue` - การ์ดรายได้วันนี้
- `PerformanceMetricsCard.vue` - การ์ดตัวชี้วัด
- `AvailableJobsList.vue` - รายการงานที่รับได้
- `ActiveJobCard.vue` - การ์ดงานที่กำลังทำ

**State Management (Pinia):**

```typescript
// stores/provider.ts
interface ProviderState {
  profile: Provider | null;
  isOnline: boolean;
  currentJob: Job | null;
  availableJobs: Job[];
  todayEarnings: number;
  todayTrips: number;
  metrics: PerformanceMetrics;
  loading: boolean;
}

interface PerformanceMetrics {
  rating: number;
  acceptanceRate: number;
  completionRate: number;
  cancellationRate: number;
}

const useProviderStore = defineStore("provider", {
  state: (): ProviderState => ({
    profile: null,
    isOnline: false,
    currentJob: null,
    availableJobs: [],
    todayEarnings: 0,
    todayTrips: 0,
    metrics: {
      rating: 0,
      acceptanceRate: 0,
      completionRate: 0,
      cancellationRate: 0,
    },
    loading: false,
  }),

  actions: {
    async toggleOnlineStatus() {
      // Toggle online/offline
    },

    async loadAvailableJobs() {
      // Load jobs matching provider's service type and location
    },

    async acceptJob(jobId: string) {
      // Accept a job
    },

    async updateLocation(lat: number, lng: number) {
      // Update provider location
    },
  },
});
```

### 4. Job Management Module

**Components:**

- `JobCard.vue` - การ์ดแสดงงาน
- `JobDetailsModal.vue` - รายละเอียดงาน
- `JobAcceptanceSheet.vue` - Bottom sheet รับงาน
- `JobNavigationView.vue` - หน้านำทาง
- `JobCompletionSheet.vue` - Bottom sheet จบงาน

**API Endpoints:**

```typescript
// Edge Function: job-matching
interface JobMatchingRequest {
  provider_id: string;
  location: { lat: number; lng: number };
  service_types: ServiceType[];
  max_distance_km: number;
}

interface JobMatchingResponse {
  jobs: Job[];
}

// Edge Function: job-acceptance
interface JobAcceptanceRequest {
  job_id: string;
  provider_id: string;
}

interface JobAcceptanceResponse {
  success: boolean;
  job: Job;
  navigation_url: string;
}
```

**Database Schema:**

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  status job_status DEFAULT 'pending',
  provider_id UUID REFERENCES providers(id),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Location data
  pickup_location GEOGRAPHY(POINT) NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT),
  dropoff_address TEXT,

  -- Pricing
  base_fare DECIMAL(10,2) NOT NULL,
  distance_fare DECIMAL(10,2) DEFAULT 0,
  time_fare DECIMAL(10,2) DEFAULT 0,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  estimated_earnings DECIMAL(10,2) NOT NULL,
  actual_earnings DECIMAL(10,2),
  tip_amount DECIMAL(10,2) DEFAULT 0,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  cancellation_reason TEXT,
  cancelled_by TEXT
);

CREATE TYPE job_status AS ENUM (
  'pending',
  'offered',
  'accepted',
  'arrived',
  'in_progress',
  'completed',
  'cancelled'
);

-- Spatial index for location-based queries
CREATE INDEX idx_jobs_pickup_location ON jobs USING GIST(pickup_location);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'offered');
```

### 5. Real-Time Tracking Module

**Components:**

- `LiveLocationMap.vue` - แผนที่แสดงตำแหน่งเรียลไทม์
- `NavigationInterface.vue` - อินเทอร์เฟซนำทาง
- `JobStatusTracker.vue` - ติดตามสถานะงาน
- `CustomerNotificationPanel.vue` - แจ้งเตือนลูกค้า

**Real-Time Subscriptions:**

```typescript
// composables/useJobTracking.ts
export function useJobTracking(jobId: string) {
  const location = ref<{ lat: number; lng: number } | null>(null);
  const status = ref<JobStatus>("pending");

  // Subscribe to job updates
  const subscription = supabase
    .channel(`job:${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        status.value = payload.new.status;
      }
    )
    .subscribe();

  // Update location every 5 seconds
  const updateLocation = async (lat: number, lng: number) => {
    location.value = { lat, lng };
    await supabase.rpc("update_provider_location", {
      p_job_id: jobId,
      p_location: `POINT(${lng} ${lat})`,
    });
  };

  return { location, status, updateLocation };
}
```

**Database Functions:**

```sql
-- Update provider location
CREATE OR REPLACE FUNCTION update_provider_location(
  p_job_id UUID,
  p_location GEOGRAPHY
) RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET provider_location = p_location,
      updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6. Earnings and Wallet Module

**Components:**

- `EarningsOverview.vue` - ภาพรวมรายได้
- `EarningsChart.vue` - กราฟรายได้
- `EarningsBreakdown.vue` - รายละเอียดรายได้
- `WalletBalance.vue` - ยอดเงินในกระเป๋า
- `WithdrawalForm.vue` - ฟอร์มถอนเงิน
- `WithdrawalHistory.vue` - ประวัติการถอน

**API Endpoints:**

```typescript
// Edge Function: earnings-calculation
interface EarningsCalculationRequest {
  job_id: string;
  distance_km: number;
  duration_minutes: number;
  surge_multiplier: number;
}

interface EarningsCalculationResponse {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_amount: number;
  total_earnings: number;
  platform_fee: number;
  provider_earnings: number;
}

// Edge Function: withdrawal-request
interface WithdrawalRequest {
  provider_id: string;
  amount: number;
  bank_account_id: string;
}

interface WithdrawalResponse {
  withdrawal_id: string;
  status: "pending";
  estimated_completion: string;
}
```

**Database Schema:**

```sql
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Earnings breakdown
  base_fare DECIMAL(10,2) NOT NULL,
  distance_fare DECIMAL(10,2) DEFAULT 0,
  time_fare DECIMAL(10,2) DEFAULT 0,
  surge_amount DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,

  -- Totals
  gross_earnings DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_earnings DECIMAL(10,2) NOT NULL,

  -- Metadata
  service_type service_type NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out BOOLEAN DEFAULT FALSE,
  payout_id UUID REFERENCES withdrawals(id)
);

CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status withdrawal_status DEFAULT 'pending',
  bank_account_id UUID REFERENCES provider_bank_accounts(id),

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  transaction_id TEXT,
  rejection_reason TEXT
);

CREATE TYPE withdrawal_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected'
);

-- Trigger to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_on_earning()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallets
  SET balance = balance + NEW.net_earnings,
      updated_at = NOW()
  WHERE user_id = (SELECT user_id FROM providers WHERE id = NEW.provider_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_on_earning
AFTER INSERT ON earnings
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_earning();
```

### 7. Performance Metrics Module

**Components:**

- `PerformanceDashboard.vue` - แดชบอร์ดประสิทธิภาพ
- `RatingDisplay.vue` - แสดงคะแนน
- `MetricsCard.vue` - การ์ดตัวชี้วัด
- `ReviewsList.vue` - รายการรีวิว
- `PerformanceWarning.vue` - คำเตือนประสิทธิภาพ

**Database Views:**

```sql
-- Materialized view for performance metrics
CREATE MATERIALIZED VIEW provider_performance_metrics AS
SELECT
  p.id AS provider_id,
  p.rating,

  -- Acceptance rate
  COALESCE(
    COUNT(CASE WHEN j.status IN ('accepted', 'completed') THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status = 'offered' THEN 1 END), 0),
    0
  ) AS acceptance_rate,

  -- Completion rate
  COALESCE(
    COUNT(CASE WHEN j.status = 'completed' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status = 'accepted' THEN 1 END), 0),
    0
  ) AS completion_rate,

  -- Cancellation rate
  COALESCE(
    COUNT(CASE WHEN j.status = 'cancelled' AND j.cancelled_by = 'provider' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status IN ('accepted', 'completed', 'cancelled') THEN 1 END), 0),
    0
  ) AS cancellation_rate,

  -- Counts
  COUNT(CASE WHEN j.status = 'completed' THEN 1 END) AS total_completed_jobs,
  COUNT(CASE WHEN j.status = 'cancelled' THEN 1 END) AS total_cancelled_jobs,

  -- Last updated
  NOW() AS calculated_at
FROM providers p
LEFT JOIN jobs j ON j.provider_id = p.id
GROUP BY p.id, p.rating;

-- Refresh materialized view every 5 minutes
CREATE INDEX idx_provider_performance_metrics ON provider_performance_metrics(provider_id);
```

### 8. Admin Management Module

**Components:**

- `AdminProvidersView.vue` - หน้าจัดการ Provider
- `ProviderDetailModal.vue` - รายละเอียด Provider
- `VerificationQueueView.vue` - คิวตรวจสอบ
- `ProviderAnalytics.vue` - Analytics
- `ProviderActionsMenu.vue` - เมนูจัดการ

**API Endpoints:**

```typescript
// Edge Function: admin-provider-management
interface ProviderUpdateRequest {
  provider_id: string;
  action: "approve" | "reject" | "suspend" | "reactivate";
  reason?: string;
  admin_id: string;
}

interface ProviderUpdateResponse {
  success: boolean;
  provider: Provider;
  affected_jobs?: string[];
}

// Edge Function: admin-analytics
interface AnalyticsRequest {
  date_from: string;
  date_to: string;
  service_type?: ServiceType;
  status?: ProviderStatus;
}

interface AnalyticsResponse {
  total_providers: number;
  active_providers: number;
  pending_verifications: number;
  total_earnings: number;
  total_jobs: number;
  average_rating: number;
  growth_rate: number;
}
```

### 9. Notification System

**Components:**

- `NotificationCenter.vue` - ศูนย์แจ้งเตือน
- `NotificationItem.vue` - รายการแจ้งเตือน
- `PushNotificationHandler.vue` - จัดการ push notification

**API Endpoints:**

```typescript
// Edge Function: notification-dispatcher
interface NotificationRequest {
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: ("push" | "email" | "sms")[];
}

type NotificationType =
  | "job_available"
  | "job_accepted"
  | "application_approved"
  | "application_rejected"
  | "document_expiring"
  | "withdrawal_completed"
  | "rating_received"
  | "account_suspended";
```

**Database Schema:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,

  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  sent_push BOOLEAN DEFAULT FALSE,
  sent_email BOOLEAN DEFAULT FALSE,
  sent_sms BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM (
  'job_available',
  'job_accepted',
  'application_approved',
  'application_rejected',
  'document_expiring',
  'withdrawal_completed',
  'rating_received',
  'account_suspended'
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE read = FALSE;
```

## Data Models

### Core Entities

```typescript
// Provider
interface Provider {
  id: string;
  user_id: string;
  provider_uid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  status: ProviderStatus;
  service_types: ServiceType[];
  is_online: boolean;
  current_location?: { lat: number; lng: number };
  rating: number;
  total_trips: number;
  total_earnings: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  suspended_at?: string;
  suspension_reason?: string;
}

// Job
interface Job {
  id: string;
  order_id: string;
  service_type: ServiceType;
  status: JobStatus;
  provider_id?: string;
  customer_id: string;

  pickup_location: { lat: number; lng: number };
  pickup_address: string;
  dropoff_location?: { lat: number; lng: number };
  dropoff_address?: string;

  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  estimated_earnings: number;
  actual_earnings?: number;
  tip_amount: number;

  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;

  distance_km?: number;
  duration_minutes?: number;
  cancellation_reason?: string;
  cancelled_by?: "provider" | "customer" | "system";
}

// Earnings
interface Earnings {
  id: string;
  provider_id: string;
  job_id: string;

  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_amount: number;
  tip_amount: number;
  bonus_amount: number;

  gross_earnings: number;
  platform_fee: number;
  net_earnings: number;

  service_type: ServiceType;
  earned_at: string;
  paid_out: boolean;
  payout_id?: string;
}

// Document
interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  storage_path: string;
  status: DocumentStatus;
  expiry_date?: string;
  uploaded_at: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
}

// Vehicle
interface ProviderVehicle {
  id: string;
  provider_id: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  color: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  is_active: boolean;
  registration_expiry: string;
  insurance_expiry: string;
  created_at: string;
  verified_at?: string;
}

// Withdrawal
interface Withdrawal {
  id: string;
  provider_id: string;
  amount: number;
  status: WithdrawalStatus;
  bank_account_id: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  transaction_id?: string;
  rejection_reason?: string;
}

// Performance Metrics
interface PerformanceMetrics {
  provider_id: string;
  rating: number;
  acceptance_rate: number;
  completion_rate: number;
  cancellation_rate: number;
  total_completed_jobs: number;
  total_cancelled_jobs: number;
  calculated_at: string;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Provider Registration Creates Pending Status

_For any_ valid registration data (with required fields: name, email, phone, service types), when a provider account is created, the account status should be "pending".

**Validates: Requirements 1.2**

### Property 2: Email Verification Triggers Notification

_For any_ newly created provider account, the system should send a verification email containing a valid verification token.

**Validates: Requirements 1.3**

### Property 3: Document Upload Adds to Verification Queue

_For any_ provider who uploads a required document, the document should appear in the admin verification queue with status "pending".

**Validates: Requirements 1.5**

### Property 4: Complete Documents Update Status

_For any_ provider, when all required documents for their service types are uploaded, the provider status should transition to "pending_verification".

**Validates: Requirements 1.6**

### Property 5: Pending Verification Blocks Dashboard Access

_For any_ provider with status "pending_verification", attempts to access the main dashboard should be denied.

**Validates: Requirements 1.7**

### Property 6: Verification Queue Ordering

_For any_ query to the verification queue, providers should be returned in ascending order by submission date (oldest first).

**Validates: Requirements 2.1**

### Property 7: Provider Approval Updates Status and Notifies

_For any_ provider that an admin approves, the provider status should update to "approved" AND an approval notification should be sent.

**Validates: Requirements 2.3**

### Property 8: Rejection Requires Reason

_For any_ provider rejection action, a rejection reason must be provided, and the rejection notification should include that reason.

**Validates: Requirements 2.4**

### Property 9: Approval Creates Provider UID

_For any_ approved provider, a unique provider_uid should be generated and the provider should gain access to the dashboard.

**Validates: Requirements 2.5**

### Property 10: Dashboard Displays Current Metrics

_For any_ provider with status "approved" or "active" accessing the dashboard, the system should display their current day's earnings, completed jobs count, and rating.

**Validates: Requirements 3.2**

### Property 11: Available Jobs Match Service Type

_For any_ provider viewing available jobs, all displayed jobs should match at least one of the provider's registered service types.

**Validates: Requirements 3.3**

### Property 12: Online Status Updates Availability

_For any_ provider, toggling online status should immediately update their availability for job matching.

**Validates: Requirements 3.4**

### Property 13: Performance Metrics Calculation

_For any_ provider, the acceptance rate should equal (accepted jobs / offered jobs), completion rate should equal (completed jobs / accepted jobs), and cancellation rate should equal (cancelled jobs / accepted jobs).

**Validates: Requirements 3.6**

### Property 14: Geographic Job Filtering

_For any_ online provider, available jobs should only include jobs within their configured service area radius.

**Validates: Requirements 4.1**

### Property 15: Job Notification Targeting

_For any_ new job, push notifications should be sent only to providers who are: (1) online, (2) match the service type, and (3) are within the service area.

**Validates: Requirements 4.2**

### Property 16: Job Acceptance Assignment

_For any_ job that a provider accepts, the job should be assigned to that provider AND a notification should be sent to the customer.

**Validates: Requirements 4.4**

### Property 17: Job Acceptance Removes from Others

_For any_ job that is accepted by a provider, the job should be removed from all other providers' available jobs lists.

**Validates: Requirements 4.5**

### Property 18: Active Job Blocks New Acceptance

_For any_ provider with an active job (status: accepted, arrived, or in_progress), attempts to accept new jobs should be blocked.

**Validates: Requirements 4.7**

### Property 19: Location Update Frequency

_For any_ provider with an active job, location updates should be sent to the customer at intervals of 5 seconds (±1 second tolerance).

**Validates: Requirements 5.2**

### Property 20: Job Status Transitions

_For any_ job, status transitions should follow the valid sequence: pending → offered → accepted → arrived → in_progress → completed (or cancelled at any point).

**Validates: Requirements 5.4, 5.5**

### Property 21: Job Completion Updates Earnings

_For any_ completed job, the provider's wallet balance should increase by the net earnings amount AND their total jobs count should increment by 1.

**Validates: Requirements 5.7**

### Property 22: Earnings Addition to Wallet

_For any_ completed job, the earnings should be added to the provider's wallet balance immediately (within 1 second).

**Validates: Requirements 6.1**

### Property 23: Earnings Breakdown Sum

_For any_ job earnings, the sum of (base_fare + distance_fare + time_fare + tip_amount + bonus_amount) should equal gross_earnings, and (gross_earnings - platform_fee) should equal net_earnings.

**Validates: Requirements 6.3**

### Property 24: Minimum Withdrawal Validation

_For any_ withdrawal request, if the amount is less than 100 THB, the request should be rejected with an appropriate error message.

**Validates: Requirements 6.4**

### Property 25: Valid Withdrawal Creates Pending Request

_For any_ valid withdrawal request (amount ≥ 100 THB and balance sufficient), a withdrawal record should be created with status "pending".

**Validates: Requirements 6.5**

### Property 26: Withdrawal Processing Deducts Balance

_For any_ withdrawal that is processed by admin, the provider's wallet balance should decrease by the withdrawal amount AND the withdrawal status should update to "completed".

**Validates: Requirements 6.6**

### Property 27: Insufficient Balance Blocks Withdrawal

_For any_ withdrawal request where the amount exceeds the provider's wallet balance, the request should be rejected.

**Validates: Requirements 6.7**

### Property 28: Rating Warning Threshold

_For any_ provider whose rating drops below 4.0, a warning message should be displayed on their performance page.

**Validates: Requirements 7.6**

### Property 29: Cancellation Rate Warning

_For any_ provider whose cancellation rate exceeds 20%, a warning message should be displayed on their performance page.

**Validates: Requirements 7.7**

### Property 30: Admin Provider Search

_For any_ admin search query, results should include providers matching the query in any of these fields: name, phone, email, or provider_uid.

**Validates: Requirements 8.2**

### Property 31: Provider Suspension Blocks Access

_For any_ provider that an admin suspends, the provider's access should be immediately blocked AND a suspension reason must be provided.

**Validates: Requirements 8.4**

### Property 32: Suspension Cancels Active Jobs

_For any_ provider that is suspended, all their active jobs (status: accepted, arrived, in_progress) should be cancelled AND affected customers should be notified.

**Validates: Requirements 8.5**

### Property 33: Document Expiry Warning

_For any_ document with an expiry date within 30 days, an expiration warning should be displayed to the provider.

**Validates: Requirements 9.2**

### Property 34: Document Expiry Suspends Provider

_For any_ document that expires, if it is a required document, the provider status should automatically update to "suspended" AND a renewal notification should be sent.

**Validates: Requirements 9.3**

### Property 35: All Documents Approved Restores Status

_For any_ suspended provider, when all their documents become approved, the provider status should update to "approved".

**Validates: Requirements 9.7**

### Property 36: Job Notification Timing

_For any_ new job, push notifications should be sent to eligible providers within 10 seconds of job creation.

**Validates: Requirements 10.1**

### Property 37: Multi-Channel Approval Notification

_For any_ provider whose application is approved, notifications should be sent via both push notification AND email.

**Validates: Requirements 10.2**

### Property 38: Rejection Notification Includes Reason

_For any_ provider whose application is rejected, the rejection notification should include the rejection reason.

**Validates: Requirements 10.3**

### Property 39: Multi-Service Job Display

_For any_ provider with multiple service types, available jobs should include jobs from all their registered service types.

**Validates: Requirements 11.2**

### Property 40: Service Type Earnings Breakdown

_For any_ provider with multiple service types, earnings display should show separate totals for each service type.

**Validates: Requirements 11.6**

### Property 41: Separate Ratings Per Service Type

_For any_ provider with multiple service types, ratings should be calculated and stored separately for each service type.

**Validates: Requirements 11.7**

### Property 42: Incentive Completion Auto-Bonus

_For any_ provider who completes an incentive program's requirements, the bonus amount should be automatically added to their wallet.

**Validates: Requirements 13.3**

### Property 43: Bonus Earnings Separation

_For any_ earnings display, bonus amounts should be shown separately from regular earnings (base + distance + time fares).

**Validates: Requirements 13.5**

### Property 44: Support Ticket Creation

_For any_ provider who submits a support request, a ticket should be created AND a confirmation notification should be sent.

**Validates: Requirements 14.4**

### Property 45: Vehicle Approval Enables Assignment

_For any_ vehicle that an admin approves, the vehicle should become available for job assignments.

**Validates: Requirements 15.4**

### Property 46: Vehicle Expiry Suspension

_For any_ vehicle whose registration expires, the vehicle should be automatically suspended AND the provider should be notified.

**Validates: Requirements 15.6**

### Property 47: Critical Vehicle Update Requires Reverification

_For any_ vehicle update that changes critical details (plate number, vehicle type, or registration document), the vehicle should be added back to the verification queue.

**Validates: Requirements 15.7**

## Error Handling

### Error Categories

**1. Validation Errors (400)**

- Invalid input data
- Missing required fields
- Format violations
- Business rule violations

**2. Authentication Errors (401)**

- Invalid or expired tokens
- Unauthorized access attempts
- Session expired

**3. Authorization Errors (403)**

- Insufficient permissions
- Status-based access denial (e.g., pending provider accessing dashboard)
- Suspended account access

**4. Not Found Errors (404)**

- Provider not found
- Job not found
- Document not found

**5. Conflict Errors (409)**

- Duplicate provider_uid
- Job already accepted by another provider
- Concurrent modification conflicts

**6. Business Logic Errors (422)**

- Insufficient wallet balance
- Provider already has active job
- Document already verified
- Invalid status transition

**7. External Service Errors (502/503)**

- Payment gateway failures
- Email service failures
- SMS service failures
- Storage service failures

**8. System Errors (500)**

- Database errors
- Unexpected exceptions
- Data integrity violations

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
    request_id: string
  }
}

// Example
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "ยอดเงินในกระเป๋าไม่เพียงพอสำหรับการถอน",
    "details": {
      "requested_amount": 500,
      "current_balance": 350,
      "minimum_balance": 0
    },
    "timestamp": "2026-01-08T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Error Handling Strategies

**Frontend Error Handling:**

```typescript
// composables/useErrorHandler.ts
export function useErrorHandler() {
  const toast = useToast();

  const handleError = (error: any) => {
    // Log error for debugging
    console.error("[Error]", error);

    // Extract error details
    const errorCode = error?.error?.code || "UNKNOWN_ERROR";
    const errorMessage =
      error?.error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

    // Show user-friendly message
    toast.error(errorMessage);

    // Handle specific error codes
    switch (errorCode) {
      case "UNAUTHORIZED":
        // Redirect to login
        router.push("/login");
        break;

      case "PROVIDER_SUSPENDED":
        // Show suspension modal
        showSuspensionModal(error.error.details);
        break;

      case "INSUFFICIENT_BALANCE":
        // Show balance warning
        showBalanceWarning(error.error.details);
        break;

      // ... other cases
    }
  };

  return { handleError };
}
```

**Backend Error Handling (Edge Functions):**

```typescript
// utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

export function handleError(error: any): Response {
  // Log error
  console.error("[Error]", error);

  // Determine status code
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // Create error response
  const errorResponse: ErrorResponse = {
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "เกิดข้อผิดพลาดภายในระบบ",
      details: error.details,
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Database Error Handling:**

```sql
-- Custom exception handling in functions
CREATE OR REPLACE FUNCTION accept_job(
  p_job_id UUID,
  p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_job_status job_status;
  v_provider_has_active_job BOOLEAN;
BEGIN
  -- Check if job is still available
  SELECT status INTO v_job_status
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job_status != 'offered' THEN
    RAISE EXCEPTION 'JOB_NOT_AVAILABLE: งานนี้ถูกรับไปแล้ว'
      USING HINT = 'job_id=' || p_job_id;
  END IF;

  -- Check if provider has active job
  SELECT EXISTS(
    SELECT 1 FROM jobs
    WHERE provider_id = p_provider_id
    AND status IN ('accepted', 'arrived', 'in_progress')
  ) INTO v_provider_has_active_job;

  IF v_provider_has_active_job THEN
    RAISE EXCEPTION 'PROVIDER_HAS_ACTIVE_JOB: คุณมีงานที่กำลังทำอยู่แล้ว'
      USING HINT = 'provider_id=' || p_provider_id;
  END IF;

  -- Accept job
  UPDATE jobs
  SET status = 'accepted',
      provider_id = p_provider_id,
      accepted_at = NOW()
  WHERE id = p_job_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Retry Strategies

**Exponential Backoff for External Services:**

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
const result = await retryWithBackoff(
  () => sendPushNotification(providerId, notification),
  3,
  1000
);
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private threshold: number = 5, private timeout: number = 60000) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

## Testing Strategy

### Testing Approach

ระบบนี้จะใช้ **Dual Testing Approach** ที่ผสมผสานระหว่าง:

1. **Unit Tests**: ทดสอบ specific examples, edge cases, และ error conditions
2. **Property-Based Tests**: ทดสอบ universal properties across all inputs

ทั้งสองแบบเสริมกันและจำเป็นสำหรับ comprehensive coverage:

- Unit tests จับ bugs ที่เฉพาะเจาะจง
- Property tests ตรวจสอบความถูกต้องโดยรวม

### Testing Framework

**Property-Based Testing Library:**

- **fast-check** (TypeScript/JavaScript) - สำหรับ frontend และ Edge Functions
- เหตุผล: รองรับ TypeScript ดี, มี generators ครบถ้วน, integration กับ Vitest ง่าย

**Unit Testing Framework:**

- **Vitest** - สำหรับ Vue components และ TypeScript code
- **Supabase Test Helpers** - สำหรับ database functions

### Property-Based Test Configuration

**ทุก property test ต้อง:**

- รันอย่างน้อย **100 iterations** (เพราะใช้ randomization)
- มี comment tag อ้างอิงถึง design property
- Tag format: `// Feature: provider-system-redesign, Property {number}: {property_text}`

**ตัวอย่าง:**

```typescript
import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("Provider Registration", () => {
  // Feature: provider-system-redesign, Property 1: Provider Registration Creates Pending Status
  it("should create provider with pending status for any valid registration data", () => {
    fc.assert(
      fc.property(
        fc.record({
          first_name: fc.string({ minLength: 1, maxLength: 50 }),
          last_name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          phone_number: fc
            .string({ minLength: 10, maxLength: 10 })
            .map((s) => "0" + s.slice(1)),
          service_types: fc.array(
            fc.constantFrom(
              "ride",
              "delivery",
              "shopping",
              "moving",
              "laundry"
            ),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async (registrationData) => {
          const result = await registerProvider(registrationData);
          expect(result.status).toBe("pending");
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: provider-system-redesign, Property 4: Complete Documents Update Status
  it("should update status to pending_verification when all documents uploaded", () => {
    fc.assert(
      fc.property(
        fc.record({
          provider_id: fc.uuid(),
          service_type: fc.constantFrom("ride", "delivery", "shopping"),
          documents: fc.array(
            fc.record({
              type: fc.constantFrom(
                "national_id",
                "driver_license",
                "vehicle_registration"
              ),
              file: fc.constant(new File(["test"], "test.pdf")),
            })
          ),
        }),
        async ({ provider_id, documents }) => {
          // Upload all required documents
          for (const doc of documents) {
            await uploadDocument(provider_id, doc.type, doc.file);
          }

          // Check status
          const provider = await getProvider(provider_id);
          expect(provider.status).toBe("pending_verification");
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Examples

```typescript
describe("Earnings Calculation", () => {
  it("should calculate correct earnings for a standard ride", () => {
    const job = {
      base_fare: 35,
      distance_km: 5,
      duration_minutes: 15,
      surge_multiplier: 1.0,
    };

    const earnings = calculateEarnings(job);

    expect(earnings.base_fare).toBe(35);
    expect(earnings.distance_fare).toBe(25); // 5 * 5 THB/km
    expect(earnings.time_fare).toBe(15); // 15 * 1 THB/min
    expect(earnings.gross_earnings).toBe(75);
    expect(earnings.platform_fee).toBe(15); // 20%
    expect(earnings.net_earnings).toBe(60);
  });

  it("should handle surge pricing correctly", () => {
    const job = {
      base_fare: 35,
      distance_km: 5,
      duration_minutes: 15,
      surge_multiplier: 1.5,
    };

    const earnings = calculateEarnings(job);

    expect(earnings.surge_amount).toBe(37.5); // (35 + 25 + 15) * 0.5
    expect(earnings.gross_earnings).toBe(112.5);
  });

  it("should reject withdrawal below minimum amount", async () => {
    const provider_id = "test-provider-id";
    const amount = 50; // Below 100 THB minimum

    await expect(requestWithdrawal(provider_id, amount)).rejects.toThrow(
      "INSUFFICIENT_AMOUNT"
    );
  });
});
```

### Integration Test Examples

```typescript
describe("Job Acceptance Flow", () => {
  it("should complete full job acceptance flow", async () => {
    // Setup
    const provider = await createTestProvider({
      status: "approved",
      is_online: true,
    });
    const job = await createTestJob({ status: "offered" });

    // Accept job
    const result = await acceptJob(job.id, provider.id);
    expect(result.success).toBe(true);

    // Verify job assigned
    const updatedJob = await getJob(job.id);
    expect(updatedJob.status).toBe("accepted");
    expect(updatedJob.provider_id).toBe(provider.id);

    // Verify customer notified
    const notifications = await getNotifications(job.customer_id);
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: "job_accepted",
        data: expect.objectContaining({ job_id: job.id }),
      })
    );

    // Verify removed from other providers
    const otherProvider = await createTestProvider({
      status: "approved",
      is_online: true,
    });
    const availableJobs = await getAvailableJobs(otherProvider.id);
    expect(availableJobs).not.toContainEqual(
      expect.objectContaining({ id: job.id })
    );
  });
});
```

### Database Function Tests

```sql
-- Test provider registration
BEGIN;
  SELECT plan(3);

  -- Test 1: Create provider with pending status
  SELECT lives_ok(
    $$INSERT INTO providers (first_name, last_name, email, phone_number, service_types)
      VALUES ('John', 'Doe', 'john@example.com', '0812345678', ARRAY['ride']::service_type[])$$,
    'Should create provider successfully'
  );

  -- Test 2: Verify pending status
  SELECT is(
    (SELECT status FROM providers WHERE email = 'john@example.com'),
    'pending'::provider_status,
    'Provider should have pending status'
  );

  -- Test 3: Verify provider_uid is null initially
  SELECT is(
    (SELECT provider_uid FROM providers WHERE email = 'john@example.com'),
    NULL,
    'Provider UID should be null initially'
  );

  SELECT * FROM finish();
ROLLBACK;
```

### Performance Tests

```typescript
describe("Performance Tests", () => {
  it("should load available jobs within 500ms", async () => {
    const provider_id = "test-provider-id";
    const location = { lat: 13.7563, lng: 100.5018 };

    const startTime = Date.now();
    const jobs = await getAvailableJobs(provider_id, location);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
    expect(jobs.length).toBeGreaterThan(0);
  });

  it("should handle 100 concurrent job acceptances", async () => {
    const jobs = await createTestJobs(100);
    const providers = await createTestProviders(100);

    const acceptances = jobs.map((job, i) =>
      acceptJob(job.id, providers[i].id)
    );

    const results = await Promise.allSettled(acceptances);

    // All should succeed
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBe(100);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Property Tests**: All 47 correctness properties implemented
- **Integration Tests**: All critical user flows covered
- **E2E Tests**: Key scenarios (registration → verification → first job → payout)

### Continuous Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run property tests
        run: npm run test:property

      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Testing Best Practices

1. **Test Isolation**: แต่ละ test ต้องเป็นอิสระ ไม่พึ่งพา test อื่น
2. **Test Data**: ใช้ factories/fixtures สำหรับสร้าง test data
3. **Cleanup**: ทำความสะอาด test data หลังแต่ละ test
4. **Mocking**: Mock external services (email, SMS, payment) แต่ไม่ mock business logic
5. **Assertions**: ใช้ assertions ที่ชัดเจนและเฉพาะเจาะจง
6. **Error Cases**: ทดสอบทั้ง happy path และ error cases
7. **Edge Cases**: ทดสอบ boundary values และ edge cases
8. **Performance**: วัด performance ของ critical paths
