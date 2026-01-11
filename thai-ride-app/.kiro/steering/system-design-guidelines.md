---
inclusion: always
---

# System Design Guidelines - Thai Ride App

## 🏗️ Architecture Principles

### Core Design Principles

- **Mobile-First Design**: ออกแบบสำหรับมือถือเป็นหลัก
- **Progressive Enhancement**: เพิ่มฟีเจอร์ได้โดยไม่กระทบระบบเดิม
- **Offline-Capable**: รองรับการทำงานแบบ offline บางส่วน
- **Real-Time Operations**: ใช้ WebSocket/Supabase Realtime สำหรับ live updates
- **Scalable Architecture**: ออกแบบให้รองรับการเติบโต
- **Data Integrity**: รักษาความถูกต้องของข้อมูลเป็นสำคัญ

### Multi-Role Architecture

```
Customer ←→ Provider ←→ Admin
    ↓         ↓        ↓
  Realtime State Sync
    ↓         ↓        ↓
   Supabase Database
```

## 🔧 Technical Standards

### Tech Stack Requirements

- **Frontend**: Vue 3.5+ (Composition API), TypeScript 5.9+, Pinia, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **PWA**: vite-plugin-pwa, Service Workers
- **Testing**: Vitest, Vue Test Utils, Property-Based Testing (fast-check)
- **Maps**: Leaflet, Google Maps API

### Code Standards

```typescript
// ✅ ต้องทำ
- ใช้ TypeScript strict mode เสมอ
- ห้ามใช้ `any` - ใช้ `unknown` แทน
- ทุก function ต้องมี return type
- ใช้ `<script setup lang="ts">` เสมอ
- Props: defineProps<T>(), Emits: defineEmits<T>()

// ❌ ห้ามทำ
- ใช้ `any` type
- ใช้ Options API
- Hardcode values ที่ควรเป็น constants
```

### Naming Conventions

- **Components**: PascalCase (e.g., `RideCard.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useRideTracking.ts`)
- **Stores**: camelCase with `use` prefix + `Store` suffix (e.g., `useRideStore.ts`)
- **Types**: PascalCase (e.g., `RideRequest`, `UserProfile`)
- **Files**: kebab-case สำหรับ utilities, camelCase สำหรับ services

## 🛡️ Security & Data Integrity

### Security Requirements

```typescript
// ✅ ต้องทำ
- ใช้ RLS (Row Level Security) ทุก table
- ห้าม hardcode secrets/API keys
- Validate ทุก user input ฝั่ง server
- ใช้ Supabase Auth สำหรับ authentication
- ใช้ HTTPS เสมอ

// ❌ ห้ามทำ
- เก็บ tokens ใน localStorage (ใช้ httpOnly cookies)
- Trust client-side validation เพียงอย่างเดียว
- Expose sensitive data ใน client bundle
```

### Data Integrity Rules

```sql
-- ✅ ใช้ ACID Transactions สำหรับ financial operations
BEGIN;
  -- Multiple related operations
  UPDATE wallets SET balance = balance - amount WHERE user_id = $1;
  INSERT INTO transactions (...) VALUES (...);
COMMIT;

-- ✅ Zero money loss guarantee
-- ✅ Atomic operations สำหรับ critical actions
-- ✅ Rollback guarantee เมื่อมี error
```

## ⚡ Performance Standards

### Response Time Requirements

- **API Endpoints**: < 500ms
- **Real-Time Updates**: < 200ms
- **Database Queries**: < 100ms
- **Page Load**: < 2s (First Contentful Paint)

### Performance Patterns

```typescript
// ✅ Cache hit rate > 85%
const cache = new LRUCache({ max: 1000, ttl: 300000 });

// ✅ Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private timeout = 60000;
}

// ✅ Exponential backoff retry
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  // Implementation
}
```

### Real-Time Requirements

- **State Propagation**: < 200ms
- **Location Updates**: ทุก 5 วินาที
- **ไม่ใช้ Polling**: purely reactive UI
- **Race Condition Handling**: ใช้ database locks

## 🎨 UI/UX Guidelines (MUNEEF Style)

### Design System

```css
/* ✅ Color Palette */
--primary-green: #00a86b;
--background: #ffffff;
--text-primary: #1a1a1a;
--text-secondary: #666666;

/* ✅ Typography */
font-family: "Sarabun", sans-serif;

/* ✅ Spacing & Layout */
border-radius: 12px-20px;
min-touch-target: 44px;
```

### Component Standards

- **Touch-Friendly**: 44px minimum touch targets
- **SVG Icons**: ห้ามใช้ emojis
- **Loading States**: แสดง skeleton หรือ spinner
- **Error States**: แสดงข้อความภาษาไทยที่เข้าใจง่าย
- **Empty States**: แสดงภาพและข้อความที่เหมาะสม

## 🗄️ Database Design

### Schema Standards

```sql
-- ✅ ใช้ UUID เป็น primary key
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ ใช้ ENUM สำหรับ status fields
CREATE TYPE provider_status AS ENUM (
  'pending', 'approved', 'active', 'suspended'
);

-- ✅ Proper indexing สำหรับ location queries
CREATE INDEX idx_providers_location ON providers USING GIST(location);

-- ✅ RLS policies ทุก table
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
```

### Migration Standards

- **Reversible**: ทุก migration ต้อง rollback ได้
- **Incremental**: แบ่งเป็น steps เล็กๆ
- **Tested**: ทดสอบใน staging ก่อน production
- **Documented**: มี comment อธิบาย purpose

## 🔄 Service Architecture

### Service Layer Pattern

```typescript
// ✅ Base Service Pattern
export abstract class BaseService {
  protected abstract serviceName: string;

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    // Implementation with exponential backoff
  }
}

// ✅ Service Registration
const serviceRegistry = new Map<string, BaseService>();

// ✅ Dependency Injection
export function useService<T extends BaseService>(
  serviceClass: new () => T
): T {
  // Implementation
}
```

### API Design Standards

```typescript
// ✅ Consistent Response Format
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

// ✅ Error Response Format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    request_id: string;
  };
}

// ✅ Edge Function Pattern
export default async function handler(req: Request): Promise<Response> {
  try {
    // Validate input
    // Process request
    // Return response
  } catch (error) {
    return handleError(error);
  }
}
```

## 🧪 Testing Strategy

### Testing Requirements

```typescript
// ✅ Dual Testing Approach
describe("Feature Tests", () => {
  // Unit Tests: specific examples
  it("should calculate correct earnings for standard ride", () => {
    // Implementation
  });

  // Property-Based Tests: universal properties
  it("should maintain data consistency for any valid input", () => {
    fc.assert(
      fc.property(
        fc.record({
          /* generators */
        }),
        async (input) => {
          // Test property
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Coverage Requirements

- **Unit Tests**: 80%+ code coverage
- **Property Tests**: ทุก correctness property
- **Integration Tests**: ทุก critical user flow
- **E2E Tests**: key scenarios end-to-end

### Test Organization

```
src/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── property/       # Property-based tests
└── e2e/           # End-to-end tests
```

## 🚨 Error Handling

### Error Categories & Handling

```typescript
// ✅ Error Classification
enum ErrorType {
  VALIDATION = "VALIDATION", // 400
  AUTHENTICATION = "AUTH", // 401
  AUTHORIZATION = "AUTHZ", // 403
  NOT_FOUND = "NOT_FOUND", // 404
  CONFLICT = "CONFLICT", // 409
  BUSINESS_LOGIC = "BUSINESS", // 422
  EXTERNAL_SERVICE = "EXTERNAL", // 502/503
  SYSTEM = "SYSTEM", // 500
}

// ✅ User-Friendly Messages (Thai)
const errorMessages = {
  INSUFFICIENT_BALANCE: "ยอดเงินในกระเป๋าไม่เพียงพอ",
  JOB_ALREADY_ACCEPTED: "งานนี้มีคนรับแล้ว",
  PROVIDER_SUSPENDED: "บัญชีถูกระงับชั่วคราว",
};
```

### Recovery Strategies

- **Automatic Retry**: สำหรับ transient failures
- **Circuit Breaker**: ป้องกัน cascade failures
- **Graceful Degradation**: fallback mechanisms
- **User Notification**: แจ้งเตือนที่เข้าใจง่าย

## 📊 Monitoring & Analytics

### Health Monitoring

```typescript
// ✅ Service Health Checks
interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  lastCheck: string;
  details?: Record<string, any>;
}

// ✅ Performance Metrics
interface PerformanceMetrics {
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  cacheHitRate: number;
}
```

### Logging Standards

```typescript
// ✅ Structured Logging
logger.info("Job accepted", {
  jobId: job.id,
  providerId: provider.id,
  customerId: customer.id,
  timestamp: new Date().toISOString(),
  metadata: { serviceType, location },
});

// ❌ ห้าม log sensitive data
// logger.info('User login', { password: '...' }); // ❌
```

## 🚀 Deployment & DevOps

### Environment Standards

```bash
# ✅ Environment Variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key

# ❌ ห้าม commit secrets
# .env
# .env.local
# .env.production
```

### CI/CD Pipeline

```yaml
# ✅ Required Checks
- Linting (ESLint + Prettier)
- Type Checking (TypeScript)
- Unit Tests (80%+ coverage)
- Property Tests (100 iterations)
- Integration Tests
- Security Scan
- Performance Tests
```

## 📱 PWA Requirements

### Service Worker Standards

```typescript
// ✅ Caching Strategy
const CACHE_STRATEGIES = {
  API: 'NetworkFirst',      // Fresh data preferred
  STATIC: 'CacheFirst',     // Performance optimized
  IMAGES: 'StaleWhileRevalidate' // Balance of both
};

// ✅ Offline Support
- Critical features work offline
- Queue actions for sync when online
- Clear offline indicators
```

### Push Notifications

```typescript
// ✅ Notification Categories
enum NotificationType {
  JOB_AVAILABLE = "job_available",
  JOB_ACCEPTED = "job_accepted",
  APPLICATION_APPROVED = "application_approved",
  WITHDRAWAL_COMPLETED = "withdrawal_completed",
}

// ✅ Multi-Channel Delivery
interface NotificationChannels {
  push: boolean;
  email: boolean;
  sms: boolean;
}
```

## 🔄 State Management

### Pinia Store Standards

```typescript
// ✅ Store Structure
interface StoreState {
  // Data
  items: Item[];
  currentItem: Item | null;

  // UI State
  loading: boolean;
  error: Error | null;

  // Metadata
  lastUpdated: string;
  pagination: PaginationState;
}

// ✅ Action Patterns
const useItemStore = defineStore("items", {
  state: (): StoreState => ({
    /* initial state */
  }),

  getters: {
    // Computed values
  },

  actions: {
    async fetchItems() {
      this.loading = true;
      try {
        // Fetch logic
      } catch (error) {
        this.error = error;
      } finally {
        this.loading = false;
      }
    },
  },
});
```

## 📋 Code Review Checklist

### Before Submitting PR

- [ ] TypeScript strict mode compliance
- [ ] All tests passing (unit + property + integration)
- [ ] Error handling implemented
- [ ] Performance considerations addressed
- [ ] Security review completed
- [ ] UI/UX guidelines followed
- [ ] Documentation updated
- [ ] Breaking changes documented

### Review Criteria

- [ ] Code follows naming conventions
- [ ] Proper error handling
- [ ] Performance optimizations
- [ ] Security best practices
- [ ] Test coverage adequate
- [ ] Documentation clear
- [ ] No hardcoded values
- [ ] Accessibility compliance

---

## 🎯 Key Takeaways

1. **Security First**: RLS, input validation, proper authentication
2. **Performance Matters**: < 500ms API, < 200ms real-time, 85%+ cache hit
3. **User Experience**: Mobile-first, offline-capable, Thai language
4. **Data Integrity**: ACID transactions, zero money loss, atomic operations
5. **Testing Required**: Unit + Property + Integration tests
6. **Real-Time**: WebSocket updates, no polling, race condition handling
7. **Scalability**: Service architecture, proper indexing, monitoring

**Remember**: ทุกการเปลี่ยนแปลงต้องผ่าน code review และ testing ก่อน deploy ทุกครั้ง
