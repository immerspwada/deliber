# Provider Job Detail - Technical Architecture

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vue Component Layer                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ProviderJobDetailView.vue                         │ │
│  │  - UI Rendering                                    │ │
│  │  - User Interactions                               │ │
│  │  - State Display                                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Composables Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │useProviderJob│  │useJobStatus  │  │useETA        │  │
│  │Detail        │  │Flow          │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │useNavigation │  │useURLTracking│  │useErrorHandler│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Services Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Supabase      │  │Google Maps   │  │Storage       │  │
│  │Client        │  │API           │  │Service       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ride_requests │  │users         │  │storage       │  │
│  │(PostgreSQL)  │  │(profiles)    │  │(buckets)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 📦 Component Architecture

### Main Component Structure

```typescript
// ProviderJobDetailView.vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Composables
import { useProviderJobDetail } from '@/composables/useProviderJobDetail'
import { useJobStatusFlow } from '@/composables/useJobStatusFlow'
import { useETA } from '@/composables/useETA'
import { useNavigation } from '@/composables/useNavigation'
import { useURLTracking } from '@/composables/useURLTracking'
import { useRoleAccess } from '@/composables/useRoleAccess'

// Child Components
import StatusProgress from '@/components/provider/StatusProgress.vue'
import CustomerCard from '@/components/provider/CustomerCard.vue'
import ETACard from '@/components/provider/ETACard.vue'
import RouteCard from '@/components/provider/RouteCard.vue'
import ActionBar from '@/components/provider/ActionBar.vue'
import CancelModal from '@/components/provider/CancelModal.vue'
import ChatDrawer from '@/components/ChatDrawer.vue'
import PhotoEvidence from '@/components/provider/PhotoEvidence.vue'

// State Management
const route = useRoute()
const router = useRouter()

const {
  job,
  loading,
  updating,
  error,
  loadJob,
  updateStatus,
  cancelJob,
  handlePhotoUploaded
} = useProviderJobDetail({
  enableRealtime: true,
  enableLocationTracking: true,
  cacheTimeout: 5 * 60 * 1000
})

const {
  currentStatusIndex,
  nextStatus,
  canProgress,
  isCompleted,
  isCancelled
} = useJobStatusFlow(computed(() => job.value?.status))

const { eta, startTracking, stopTracking } = useETA()
const { navigate } = useNavigation()
const { updateStep, migrateOldURL } = useURLTracking()
const { canAccessProvider, providerId } = useRoleAccess()

// Lifecycle
onMounted(async () => {
  migrateOldURL()
  const jobId = route.params.id as string
  await loadJob(jobId)
  if (job.value) {
    startTracking(job.value.pickup_lat, job.value.pickup_lng)
  }
})

onUnmounted(() => {
  stopTracking()
})
</script>
```

### Component Hierarchy

```
ProviderJobDetailView
├── Header
│   ├── BackButton
│   ├── Title
│   └── TrackingID
├── StatusProgress
│   └── StatusStep[] (4 steps)
├── CompletedBanner (conditional)
├── CancelledBanner (conditional)
├── CustomerCard
│   ├── Avatar
│   ├── Info
│   └── ContactButtons
│       ├── CallButton
│       └── ChatButton
├── ETACard (conditional)
│   ├── TimeDisplay
│   └── DistanceDisplay
├── RouteCard
│   ├── PickupPoint
│   ├── RouteLine
│   └── DropoffPoint
├── NotesCard (conditional)
├── FareDisplay
├── PhotoEvidence (conditional)
│   ├── PickupPhoto
│   └── DropoffPhoto
├── ActionBar (fixed bottom)
│   ├── NavigateButton
│   ├── UpdateStatusButton
│   └── CancelButton
├── CancelModal (teleport)
└── ChatDrawer (teleport)
```

## 🔄 Data Flow

### 1. Initial Load Flow

```
User navigates to /provider/job/{id}
         ↓
Router guard checks authentication
         ↓
Component mounts
         ↓
migrateOldURL() - standardize URL format
         ↓
loadJob(jobId)
         ↓
Check cache (5 min TTL)
         ↓
If not cached:
  - Query ride_requests table
  - Query users table (customer profile)
  - Verify provider ownership (RLS)
         ↓
Transform to JobDetail type
         ↓
Setup realtime subscription
         ↓
Start ETA tracking
         ↓
Update URL with current step
         ↓
Render UI
```

### 2. Status Update Flow

```
User clicks "Update Status" button
         ↓
Validate: canProgress && !updating
         ↓
Set updating = true
         ↓
Calculate next status (from STATUS_FLOW)
         ↓
Build update object with timestamps
         ↓
Update database (ride_requests)
         ↓
On success:
  - Update local state
  - Update URL step
  - Clear cache
  - Trigger haptic feedback
  - Trigger sound feedback
  - If completed: notify customer
         ↓
Set updating = false
```

### 3. Realtime Update Flow

```
Database change occurs
         ↓
Supabase broadcasts UPDATE event
         ↓
Realtime channel receives payload
         ↓
Check version (updated_at timestamp)
         ↓
If newer:
  - Update job.value.status
  - Update job.value.fare (if changed)
  - Update URL step
  - Re-render UI
         ↓
If stale:
  - Ignore update
  - Log warning
```

### 4. ETA Tracking Flow

```
Component mounts
         ↓
startTracking(destination)
         ↓
Watch GPS location (5s interval)
         ↓
On location change:
  - Calculate distance
  - Estimate time
  - Update ETA display
         ↓
Component unmounts
         ↓
stopTracking()
```

## 🗄️ Database Schema

### ride_requests Table

```sql
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id TEXT UNIQUE,

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled'
  )),

  -- Parties
  user_id UUID REFERENCES auth.users(id),
  provider_id UUID REFERENCES providers_v2(id),

  -- Location
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,

  -- Pricing
  estimated_fare DECIMAL(10,2),
  final_fare DECIMAL(10,2),

  -- Details
  ride_type TEXT DEFAULT 'standard',
  notes TEXT,

  -- Evidence
  pickup_photo TEXT,
  dropoff_photo TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Cancellation
  cancellation_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'provider', 'admin'))
);

-- Indexes for performance
CREATE INDEX idx_ride_requests_provider ON ride_requests(provider_id, status);
CREATE INDEX idx_ride_requests_status ON ride_requests(status, created_at DESC);
CREATE INDEX idx_ride_requests_tracking ON ride_requests(tracking_id);
```

### RLS Policies

```sql
-- Provider can view their assigned jobs
CREATE POLICY "provider_view_own_jobs" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

-- Provider can update their assigned jobs
CREATE POLICY "provider_update_own_jobs" ON ride_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );
```

## 🔌 API Integration

### Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

### Query Patterns

```typescript
// Load job with customer profile
async function loadJob(jobId: string): Promise<JobDetail> {
  // 1. Load ride request
  const { data: rideData, error: rideError } = await supabase
    .from("ride_requests")
    .select(
      `
      id, status, ride_type, pickup_address, destination_address,
      pickup_lat, pickup_lng, destination_lat, destination_lng,
      estimated_fare, final_fare, notes, created_at, user_id, provider_id,
      pickup_photo, dropoff_photo
    `
    )
    .eq("id", jobId)
    .single();

  if (rideError) throw rideError;

  // 2. Load customer profile (optional)
  let customerProfile = null;
  if (rideData.user_id) {
    const { data: profileData } = await supabase
      .from("users")
      .select("id, name, phone, avatar_url")
      .eq("id", rideData.user_id)
      .maybeSingle();

    customerProfile = profileData;
  }

  // 3. Transform to JobDetail
  return {
    id: rideData.id,
    type: "ride",
    status: rideData.status,
    // ... rest of fields
    customer: customerProfile
      ? {
          id: customerProfile.id,
          name: customerProfile.name || "ลูกค้า",
          phone: customerProfile.phone || "",
          avatar_url: customerProfile.avatar_url,
        }
      : null,
  };
}
```

### Realtime Subscription

```typescript
// Setup realtime subscription
function setupRealtimeSubscription(jobId: string) {
  const channel = supabase
    .channel(`job-detail-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        handleRealtimeUpdate(payload.new);
      }
    )
    .subscribe();

  return channel;
}

// Cleanup
function cleanupRealtimeSubscription(channel) {
  channel.unsubscribe();
}
```

## 🧩 Composables Architecture

### useProviderJobDetail

**Purpose**: Main composable for job data management

**Responsibilities**:

- Load job data
- Update job status
- Cancel job
- Handle photo uploads
- Manage cache
- Setup realtime subscriptions

**API**:

```typescript
interface UseProviderJobDetailReturn {
  // State
  job: Readonly<Ref<JobDetail | null>>;
  loading: Readonly<Ref<boolean>>;
  updating: Readonly<Ref<boolean>>;
  error: Readonly<Ref<string | null>>;

  // Computed
  currentStatusIndex: Readonly<ComputedRef<number>>;
  nextStatus: Readonly<ComputedRef<StatusStep | null>>;
  canUpdate: Readonly<ComputedRef<boolean>>;
  isJobCompleted: Readonly<ComputedRef<boolean>>;
  isJobCancelled: Readonly<ComputedRef<boolean>>;

  // Methods
  loadJob: (jobId: string) => Promise<JobDetail | null>;
  updateStatus: () => Promise<UpdateStatusResponse>;
  cancelJob: (reason?: string) => Promise<CancelJobResponse>;
  handlePhotoUploaded: (type: "pickup" | "dropoff", url: string) => void;
  clearCache: (jobId?: string) => void;
}
```

### useJobStatusFlow

**Purpose**: Manage status flow logic

**Responsibilities**:

- Map database status to UI steps
- Calculate next status
- Validate status transitions
- Handle status aliases

**API**:

```typescript
interface UseJobStatusFlowReturn {
  STATUS_FLOW: readonly StatusStep[];
  currentStatusIndex: ComputedRef<number>;
  currentStep: ComputedRef<StatusStep | null>;
  nextStep: ComputedRef<StatusStep | null>;
  nextDbStatus: ComputedRef<string | null>;
  canProgress: ComputedRef<boolean>;
  isCompleted: ComputedRef<boolean>;
  isCancelled: ComputedRef<boolean>;
  debugInfo: ComputedRef<DebugInfo>;
}
```

### useETA

**Purpose**: Calculate and track ETA

**Responsibilities**:

- Track GPS location
- Calculate distance
- Estimate time
- Format display values

**API**:

```typescript
interface UseETAReturn {
  eta: Readonly<Ref<ETAData | null>>;
  arrivalTime: Readonly<ComputedRef<string>>;
  startTracking: (lat: number, lng: number) => void;
  updateETA: (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ) => void;
  stopTracking: () => void;
}
```

## 🔐 Security Architecture

### Authentication Flow

```
User logs in
     ↓
Supabase Auth creates session
     ↓
JWT token stored in localStorage
     ↓
Router guard checks auth.getUser()
     ↓
If authenticated: proceed
If not: redirect to /login
```

### Authorization Flow

```
User accesses /provider/job/{id}
     ↓
Router guard checks role
     ↓
If role !== 'provider': redirect to /unauthorized
     ↓
Component loads job
     ↓
RLS policy checks provider_id
     ↓
If provider_id matches: return data
If not: return empty (403)
```

### Input Validation

```typescript
// Validate job ID
const JobIdSchema = z.string().uuid();

// Validate cancel reason
const CancelReasonSchema = z.string().max(500).optional();

// Validate before API calls
const validation = JobIdSchema.safeParse(jobId);
if (!validation.success) {
  throw new AppError("Invalid job ID", ErrorCode.VALIDATION);
}
```

## 📊 Performance Architecture

### Caching Strategy

```typescript
// In-memory cache with TTL
const cache = new Map<
  string,
  {
    data: JobDetail;
    expires: number;
  }
>();

function getCached(jobId: string): JobDetail | null {
  const entry = cache.get(jobId);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  cache.delete(jobId);
  return null;
}

function setCache(jobId: string, data: JobDetail, ttl: number): void {
  cache.set(jobId, {
    data,
    expires: Date.now() + ttl,
  });
}
```

### Code Splitting

```typescript
// Route-level splitting
const routes = [
  {
    path: "/provider/job/:id",
    component: () => import("@/views/provider/ProviderJobDetailView.vue"),
    meta: { requiresAuth: true, allowedRoles: ["provider"] },
  },
];

// Component-level splitting
const PhotoEvidence = defineAsyncComponent(
  () => import("@/components/provider/PhotoEvidence.vue")
);
```

### Debouncing & Throttling

```typescript
// Debounce location updates
const debouncedLocationUpdate = useDebounceFn(
  updateLocation,
  5000 // 5 seconds
);

// Throttle ETA calculations
const throttledETAUpdate = useThrottleFn(
  calculateETA,
  3000 // 3 seconds
);
```

## 🧪 Testing Architecture

### Unit Tests

```typescript
// Test status flow logic
describe("useJobStatusFlow", () => {
  it("should calculate correct next status", () => {
    const jobStatus = ref("matched");
    const { nextDbStatus } = useJobStatusFlow(jobStatus);
    expect(nextDbStatus.value).toBe("pickup");
  });
});

// Test ETA calculations
describe("useETA", () => {
  it("should calculate distance correctly", () => {
    const { calculateDistance } = useETA();
    const distance = calculateDistance(13.7563, 100.5018, 13.7467, 100.5348);
    expect(distance).toBeCloseTo(3.5, 1);
  });
});
```

### Integration Tests

```typescript
// Test job loading
describe("loadJob", () => {
  it("should load job with customer profile", async () => {
    const { loadJob } = useProviderJobDetail();
    const job = await loadJob("test-job-id");
    expect(job).toBeDefined();
    expect(job?.customer).toBeDefined();
  });
});
```

### E2E Tests

```typescript
// Test complete flow
describe("Provider Job Detail Flow", () => {
  it("should complete job successfully", async () => {
    await page.goto("/provider/job/test-id");
    await page.click('[data-testid="update-status-btn"]');
    await page.waitForSelector('[data-testid="status-pickup"]');
    // ... continue flow
  });
});
```

## 📱 Mobile Architecture

### PWA Configuration

```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### Offline Support

```typescript
// Service Worker
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/provider/job/")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

## 🔄 State Management

### Local State (Component)

- UI state (modals, drawers)
- Form inputs
- Loading states

### Composable State (Shared)

- Job data
- ETA data
- User location

### Global State (Pinia)

- Auth state
- Provider profile
- App settings

## 📈 Monitoring & Logging

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from "@sentry/vue";

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

```typescript
// Track performance metrics
function trackPerformance(metric: string, value: number) {
  if (import.meta.env.PROD) {
    analytics.track("performance", {
      metric,
      value,
      page: "provider_job_detail",
    });
  }
}
```

### Debug Logging

```typescript
// Conditional logging
const DEBUG = import.meta.env.DEV;

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[JobDetail] ${message}`, data);
  }
}
```
