# Design Document: Admin Dashboard Memory Optimization

## Overview

This design implements a comprehensive memory management system for the Thai Ride Admin Dashboard to achieve 50-session stability. The solution addresses critical memory leaks across 72 admin routes by implementing systematic cleanup patterns, optimizing shared state management, and providing universal cleanup utilities.

The design follows a phased approach, prioritizing core infrastructure fixes that provide the highest impact (60% of leaks), followed by high-traffic routes (25%), financial routes (10%), and lower-priority routes (5%).

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Router       │────────▶│ AdminLayout  │                 │
│  │ Guards       │         │ (Shared)     │                 │
│  └──────────────┘         └──────────────┘                 │
│         │                        │                          │
│         │                        │                          │
│         ▼                        ▼                          │
│  ┌──────────────────────────────────────────┐              │
│  │      useAdminCleanup (Universal)         │              │
│  │  - addSubscription()                     │              │
│  │  - addInterval()                         │              │
│  │  - addTimeout()                          │              │
│  │  - addCleanup()                          │              │
│  │  - cleanup() [auto on unmount]          │              │
│  └──────────────────────────────────────────┘              │
│         │                                                   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │           Admin Views (72 routes)               │       │
│  │                                                  │       │
│  │  High-Traffic:                                  │       │
│  │  - AdminDashboardView                           │       │
│  │  - AdminOrdersView (3 realtime channels)       │       │
│  │  - AdminCustomersView                           │       │
│  │  - AdminProvidersView                           │       │
│  │                                                  │       │
│  │  Financial (7 views):                           │       │
│  │  - AdminTopupRequestsView (realtime)            │       │
│  │  - AdminPaymentsView                            │       │
│  │  - AdminRefundsView                             │       │
│  │  - ... 4 more                                   │       │
│  │                                                  │       │
│  │  Service Management (12 views):                 │       │
│  │  - AdminDriverTrackingView (realtime + polling)│       │
│  │  - ... 11 more                                  │       │
│  │                                                  │       │
│  │  Lower Priority (49 views)                      │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Navigation
      │
      ▼
Router beforeEach Guard
      │
      ├─▶ Check admin auth (cached 1 min)
      │
      ▼
Load New Route
      │
      ├─▶ Mount component
      │   ├─▶ Setup realtime subscriptions
      │   ├─▶ Setup intervals/timeouts
      │   ├─▶ Register with useAdminCleanup
      │   └─▶ Load data
      │
      ▼
Router afterEach Guard
      │
      ├─▶ Dispatch 'route-cleanup' event
      │
      ▼
Previous Route Cleanup
      │
      ├─▶ useAdminCleanup.cleanup()
      │   ├─▶ Unsubscribe realtime channels
      │   ├─▶ Clear intervals/timeouts
      │   ├─▶ Execute custom cleanup functions
      │   ├─▶ Clear data arrays
      │   └─▶ Reset state
      │
      ▼
Memory Released
```

## Components and Interfaces

### 1. useAdminCleanup Composable

**Purpose**: Universal cleanup utility for all admin views

**Interface**:
```typescript
interface AdminCleanup {
  // Track realtime subscriptions
  addSubscription(channel: RealtimeChannel): void
  
  // Track intervals
  addInterval(intervalId: number): void
  
  // Track timeouts
  addTimeout(timeoutId: number): void
  
  // Register custom cleanup function
  addCleanup(cleanupFn: () => void): void
  
  // Execute all cleanup (auto-called on unmount)
  cleanup(): void
}

export function useAdminCleanup(): AdminCleanup
```

**Implementation Strategy**:
```typescript
// src/composables/useAdminCleanup.ts
import { onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export function useAdminCleanup() {
  const subscriptions: RealtimeChannel[] = []
  const intervals: number[] = []
  const timeouts: number[] = []
  const cleanupFunctions: (() => void)[] = []
  
  const addSubscription = (channel: RealtimeChannel) => {
    subscriptions.push(channel)
  }
  
  const addInterval = (intervalId: number) => {
    intervals.push(intervalId)
  }
  
  const addTimeout = (timeoutId: number) => {
    timeouts.push(timeoutId)
  }
  
  const addCleanup = (cleanupFn: () => void) => {
    cleanupFunctions.push(cleanupFn)
  }
  
  const cleanup = () => {
    try {
      // Unsubscribe realtime channels
      subscriptions.forEach(channel => {
        supabase.removeChannel(channel)
      })
      subscriptions.length = 0
      
      // Clear intervals
      intervals.forEach(id => clearInterval(id))
      intervals.length = 0
      
      // Clear timeouts
      timeouts.forEach(id => clearTimeout(id))
      timeouts.length = 0
      
      // Execute custom cleanup
      cleanupFunctions.forEach(fn => {
        try {
          fn()
        } catch (error) {
          console.error('Cleanup function error:', error)
        }
      })
      cleanupFunctions.length = 0
      
      if (import.meta.env.DEV) {
        console.log('[useAdminCleanup] Cleanup complete')
      }
    } catch (error) {
      console.error('[useAdminCleanup] Cleanup error:', error)
    }
  }
  
  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    addSubscription,
    addInterval,
    addTimeout,
    addCleanup,
    cleanup
  }
}
```

### 2. Refactored useAdmin Composable

**Purpose**: Provide admin functionality with isolated state

**Current Problem**:
```typescript
// BAD: Module-level shared state
const stats = ref({ ... })
const recentOrders = ref([])

export function useAdmin() {
  return { stats, recentOrders }
}
```

**Solution**:
```typescript
// GOOD: Function-scoped isolated state
export function useAdmin() {
  const stats = ref({
    totalUsers: 0,
    totalProviders: 0,
    totalOrders: 0,
    totalRevenue: 0
  })
  
  const recentOrders = ref([])
  const recentUsers = ref([])
  const recentPayments = ref([])
  
  const cleanup = () => {
    stats.value = {
      totalUsers: 0,
      totalProviders: 0,
      totalOrders: 0,
      totalRevenue: 0
    }
    recentOrders.value = []
    recentUsers.value = []
    recentPayments.value = []
  }
  
  return {
    stats,
    recentOrders,
    recentUsers,
    recentPayments,
    cleanup,
    // ... other functions
  }
}
```

### 3. Optimized AdminLayout

**Purpose**: Shared layout with minimal overhead

**Optimizations**:
```typescript
// src/components/AdminLayout.vue
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

// Memoize menu sections (static data)
const menuSections = computed(() => [
  {
    title: '',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/admin/orders', label: 'Orders', icon: 'orders' },
      { path: '/admin/live-map', label: 'Live Map', icon: 'map' }
    ]
  },
  // ... other sections
])

// Memoize flattened menu items
const menuItems = computed(() => 
  menuSections.value.flatMap(section => section.items)
)

// Cleanup on unmount
onUnmounted(() => {
  sidebarOpen.value = false
  // Computed properties auto-disposed by Vue
})
</script>
```

### 4. Router Guards

**Purpose**: Centralized auth and cleanup management

**Implementation**:
```typescript
// src/router/index.ts

// Session cache
const ADMIN_SESSION_CACHE_TTL = 60000 // 1 minute
let cachedAdminSessionValid: boolean | null = null
let adminSessionCacheTime = 0

const isAdminSessionValid = (): boolean => {
  const now = Date.now()
  
  // Return cached result if still valid
  if (cachedAdminSessionValid !== null && 
      (now - adminSessionCacheTime) < ADMIN_SESSION_CACHE_TTL) {
    return cachedAdminSessionValid
  }
  
  // Check session
  const adminToken = localStorage.getItem('admin_token')
  const loginTime = localStorage.getItem('admin_login_time')
  
  if (!adminToken || !loginTime) {
    cachedAdminSessionValid = false
    adminSessionCacheTime = now
    return false
  }
  
  const elapsed = now - parseInt(loginTime)
  const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours
  
  if (elapsed > SESSION_TTL) {
    // Clear session
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_login_time')
    localStorage.removeItem('admin_email')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_name')
    
    cachedAdminSessionValid = false
    adminSessionCacheTime = now
    return false
  }
  
  cachedAdminSessionValid = true
  adminSessionCacheTime = now
  return true
}

// Global beforeEach guard
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAdmin) {
    if (!isAdminSessionValid()) {
      next('/admin/login')
      return
    }
  }
  next()
})

// Global afterEach guard for cleanup
router.afterEach((to, from) => {
  if (from.path !== to.path) {
    // Dispatch cleanup event
    window.dispatchEvent(new CustomEvent('route-cleanup', {
      detail: { from: from.path, to: to.path }
    }))
    
    // Clear session cache if leaving admin
    if (!to.path.startsWith('/admin')) {
      cachedAdminSessionValid = null
      adminSessionCacheTime = 0
    }
  }
})
```

## Data Models

### Cleanup Tracking

```typescript
interface CleanupTracker {
  subscriptions: RealtimeChannel[]
  intervals: number[]
  timeouts: number[]
  cleanupFunctions: (() => void)[]
}
```

### Session Cache

```typescript
interface SessionCache {
  isValid: boolean | null
  timestamp: number
  ttl: number // milliseconds
}
```

### Memory Metrics

```typescript
interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
}

interface RouteTransitionMetrics {
  from: string
  to: string
  memoryBefore: MemoryMetrics
  memoryAfter: MemoryMetrics
  memoryGrowth: number
  duration: number
  subscriptionsCleared: number
  intervalsCleared: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Memory Release on Route Transition
*For any* pair of admin routes, when navigating from route A to route B, the memory growth should be less than 1MB
**Validates: Requirements 1.1, 7.5, 10.5, 15.1**

### Property 2: Realtime Subscription Cleanup
*For any* admin view with realtime subscriptions, after unmounting, the number of active Supabase channels should decrease by the number of channels that view created
**Validates: Requirements 2.1, 2.5**

### Property 3: Session Validation Caching
*For any* sequence of session validation calls within a 1-minute window, localStorage should be accessed only once
**Validates: Requirements 1.3, 6.2, 6.3, 6.5**

### Property 4: State Isolation
*For any* two concurrent calls to useAdmin(), the returned state refs should be different instances
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 5: Interval and Timeout Cleanup
*For any* admin view that creates intervals or timeouts, after unmounting, all intervals and timeouts should be cleared
**Validates: Requirements 4.1, 4.2, 4.5**

### Property 6: Data Array Cleanup
*For any* admin view with data arrays, after unmounting, all arrays should be empty and filter states should be reset
**Validates: Requirements 5.4, 5.5**

### Property 7: Financial Data Security
*For any* financial view, after unmounting, memory inspection should show no sensitive financial data (payment amounts, account numbers, transaction IDs)
**Validates: Requirements 8.1, 8.5**

### Property 8: Map Resource Cleanup
*For any* map view, after unmounting, all location polling intervals should be stopped and map instances should be disposed
**Validates: Requirements 9.3, 9.5**

### Property 9: Cleanup Event Dispatch
*For any* route transition, a 'route-cleanup' event should be dispatched with the correct from/to paths
**Validates: Requirements 1.5, 12.1**

### Property 10: useAdminCleanup Auto-Execution
*For any* component using useAdminCleanup, when the component unmounts, all registered cleanup functions should execute
**Validates: Requirements 11.2, 11.4**

### Property 11: Cleanup Error Resilience
*For any* cleanup function that throws an error, the cleanup process should continue and navigation should not be blocked
**Validates: Requirements 11.4, 12.5**

### Property 12: Chart Disposal
*For any* view with chart instances, after unmounting, all chart objects should be disposed and chart memory should be released
**Validates: Requirements 13.5**

### Property 13: Form State Reset
*For any* view with forms or modals, after unmounting, all form fields should be reset and modals should be closed
**Validates: Requirements 14.1, 14.2, 14.5**

### Property 14: 50-Session Stability
*For any* sequence of 50 random route navigations, the total memory growth should be less than 50MB, active subscriptions should be zero, and active intervals should be zero
**Validates: Requirements 15.1, 15.2, 15.3, 15.5**

### Property 15: Navigation Performance
*For any* route transition during an extended session, the navigation duration should be less than 100ms
**Validates: Requirements 15.4**

## Error Handling

### Cleanup Errors

**Strategy**: Graceful degradation with logging

```typescript
const cleanup = () => {
  try {
    // Attempt cleanup
    subscriptions.forEach(channel => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.error('Failed to remove channel:', error)
        // Continue with other cleanups
      }
    })
    
    // ... other cleanup operations
  } catch (error) {
    console.error('Cleanup error:', error)
    // Don't throw - allow navigation to proceed
  }
}
```

### Session Expiry

**Strategy**: Clear cache and redirect

```typescript
if (elapsed > SESSION_TTL) {
  // Clear all session data
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_login_time')
  localStorage.removeItem('admin_email')
  localStorage.removeItem('admin_role')
  localStorage.removeItem('admin_name')
  
  // Clear cache
  cachedAdminSessionValid = null
  adminSessionCacheTime = 0
  
  // Redirect to login
  router.push('/admin/login')
}
```

### Memory Profiling Errors

**Strategy**: Fail silently in production, log in development

```typescript
const measureMemory = (): MemoryMetrics | null => {
  try {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: memory.jsHeapSizeLimit,
        arrayBuffers: 0
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Memory profiling not available:', error)
    }
  }
  return null
}
```

## Testing Strategy

### Dual Testing Approach

This project requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Testing

Unit tests focus on specific examples and edge cases:

**Examples**:
```typescript
// AdminOrdersView specific cleanup
describe('AdminOrdersView cleanup', () => {
  it('should unsubscribe from 3 realtime channels on unmount', async () => {
    const wrapper = mount(AdminOrdersView)
    
    // Verify 3 channels created
    expect(supabase.getChannels()).toHaveLength(3)
    
    // Unmount
    wrapper.unmount()
    
    // Verify channels cleared
    expect(supabase.getChannels()).toHaveLength(0)
  })
})

// Session expiry edge case
describe('Session expiry', () => {
  it('should redirect to login after 8 hours', () => {
    // Set login time to 8 hours ago
    const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000)
    localStorage.setItem('admin_login_time', eightHoursAgo.toString())
    
    // Navigate to admin route
    router.push('/admin/dashboard')
    
    // Should redirect to login
    expect(router.currentRoute.value.path).toBe('/admin/login')
  })
})
```

### Property-Based Testing

Property tests verify universal properties across many generated inputs:

**Configuration**: Minimum 100 iterations per property test

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Examples**:
```typescript
import fc from 'fast-check'

// Property 1: Memory Release on Route Transition
describe('Property 1: Memory Release', () => {
  it('should maintain < 1MB memory growth per transition', () => {
    /**
     * Feature: admin-memory-optimization, Property 1: Memory Release on Route Transition
     * For any pair of admin routes, memory growth should be < 1MB
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...adminRoutes), // from route
        fc.constantFrom(...adminRoutes), // to route
        async (fromRoute, toRoute) => {
          const memoryBefore = getMemoryUsage()
          
          await router.push(fromRoute)
          await router.push(toRoute)
          
          const memoryAfter = getMemoryUsage()
          const growth = memoryAfter - memoryBefore
          
          expect(growth).toBeLessThan(1024 * 1024) // 1MB
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 2: Realtime Subscription Cleanup
describe('Property 2: Subscription Cleanup', () => {
  it('should clear all subscriptions on unmount', () => {
    /**
     * Feature: admin-memory-optimization, Property 2: Realtime Subscription Cleanup
     * For any view with subscriptions, channels should decrease after unmount
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...viewsWithSubscriptions),
        async (ViewComponent) => {
          const channelsBefore = supabase.getChannels().length
          
          const wrapper = mount(ViewComponent)
          const channelsDuring = supabase.getChannels().length
          
          wrapper.unmount()
          const channelsAfter = supabase.getChannels().length
          
          // Channels should increase during mount
          expect(channelsDuring).toBeGreaterThan(channelsBefore)
          
          // Channels should return to baseline after unmount
          expect(channelsAfter).toBe(channelsBefore)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 3: Session Validation Caching
describe('Property 3: Session Caching', () => {
  it('should access localStorage only once per minute', () => {
    /**
     * Feature: admin-memory-optimization, Property 3: Session Validation Caching
     * For any sequence of validations within 1 minute, localStorage accessed once
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // number of validation calls
        (numCalls) => {
          const spy = jest.spyOn(Storage.prototype, 'getItem')
          
          // Call validation multiple times within 1 minute
          for (let i = 0; i < numCalls; i++) {
            isAdminSessionValid()
          }
          
          // Should only access localStorage once
          expect(spy).toHaveBeenCalledTimes(1)
          
          spy.mockRestore()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 4: State Isolation
describe('Property 4: State Isolation', () => {
  it('should return different state instances per call', () => {
    /**
     * Feature: admin-memory-optimization, Property 4: State Isolation
     * For any two calls to useAdmin, state refs should be different instances
     */
    fc.assert(
      fc.property(
        fc.constant(null), // no input needed
        () => {
          const instance1 = useAdmin()
          const instance2 = useAdmin()
          
          // Refs should be different instances
          expect(instance1.stats).not.toBe(instance2.stats)
          expect(instance1.recentOrders).not.toBe(instance2.recentOrders)
          
          // Modifying one shouldn't affect the other
          instance1.stats.value.totalUsers = 100
          expect(instance2.stats.value.totalUsers).not.toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 14: 50-Session Stability
describe('Property 14: 50-Session Stability', () => {
  it('should maintain stability over 50 navigations', async () => {
    /**
     * Feature: admin-memory-optimization, Property 14: 50-Session Stability
     * For any 50 random navigations, memory < 50MB, subscriptions = 0, intervals = 0
     */
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...adminRoutes), { minLength: 50, maxLength: 50 }),
        async (routes) => {
          const memoryBefore = getMemoryUsage()
          
          // Navigate 50 times
          for (const route of routes) {
            await router.push(route)
          }
          
          const memoryAfter = getMemoryUsage()
          const growth = memoryAfter - memoryBefore
          
          // Memory growth < 50MB
          expect(growth).toBeLessThan(50 * 1024 * 1024)
          
          // Zero active subscriptions
          expect(supabase.getChannels()).toHaveLength(0)
          
          // Zero active intervals (check via performance monitoring)
          const activeIntervals = getActiveIntervalCount()
          expect(activeIntervals).toBe(0)
        }
      ),
      { numRuns: 10 } // Fewer runs due to test duration
    )
  })
})
```

### Testing Utilities

```typescript
// Memory measurement
function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

// Active interval tracking
let intervalCount = 0
const originalSetInterval = window.setInterval
const originalClearInterval = window.clearInterval

window.setInterval = ((...args) => {
  intervalCount++
  return originalSetInterval(...args)
}) as typeof setInterval

window.clearInterval = ((id) => {
  intervalCount--
  return originalClearInterval(id)
}) as typeof clearInterval

function getActiveIntervalCount(): number {
  return intervalCount
}

// Admin routes list
const adminRoutes = [
  '/admin/dashboard',
  '/admin/orders',
  '/admin/customers',
  '/admin/providers',
  // ... all 72 routes
]

// Views with subscriptions
const viewsWithSubscriptions = [
  AdminOrdersView,
  AdminTopupRequestsView,
  AdminDriverTrackingView,
  AdminLiveMapView,
  AdminPerformanceView,
  AdminSystemHealthView,
  AdminVerificationQueueView
]
```

### Test Execution

```bash
# Run all tests
npm test

# Run property tests only
npm test -- --grep "Property"

# Run with coverage
npm test -- --coverage

# Run 50-session stability test
npm test -- --grep "50-Session Stability"
```

### Continuous Integration

```yaml
# .github/workflows/memory-tests.yml
name: Memory Leak Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - name: Check memory stability
        run: npm test -- --grep "50-Session Stability"
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Create useAdminCleanup composable
- Refactor useAdmin.ts for state isolation
- Optimize AdminLayout.vue
- Implement router guards with session caching
- **Impact**: 60% of memory leaks fixed

### Phase 2: High-Traffic Routes (Week 2)
- Fix AdminDashboardView
- Fix AdminOrdersView (3 realtime channels)
- Fix AdminCustomersView
- Fix AdminProvidersView
- **Impact**: 25% of memory leaks fixed

### Phase 3: Financial Routes (Week 3)
- Fix AdminTopupRequestsView (realtime)
- Fix 6 other financial views
- Ensure sensitive data clearing
- **Impact**: 10% of memory leaks fixed

### Phase 4: Service Management (Week 4)
- Fix AdminDriverTrackingView (realtime + polling)
- Fix 11 other service views
- **Impact**: 3% of memory leaks fixed

### Phase 5: Lower Priority (Week 5)
- Fix 10 marketing & support views
- Fix 5 analytics & reports views
- Fix 13 system settings views
- **Impact**: 2% of memory leaks fixed

## Performance Targets

### Before Optimization
- Memory growth: 5-10MB per transition
- Active subscriptions after 50 sessions: 250-500
- Active intervals: 200+
- Session checks: 3,600
- localStorage access: High

### After Optimization
- Memory growth: < 1MB per transition
- Active subscriptions after 50 sessions: 0
- Active intervals: 0
- Session checks: ~50
- localStorage access: Minimal

### Success Metrics
- Route transition: < 100ms
- Memory baseline: < 50MB
- Memory after 50 sessions: < 100MB
- No memory leaks detected
- No console warnings
- 50-session stability: ACHIEVED
