# Composables Documentation

## Overview

Composables are reusable Vue 3 composition functions that encapsulate and reuse stateful logic. This project follows Vue 3 best practices for composable design.

## Naming Convention

All composables follow the `use*` naming pattern (e.g., `useAutoCleanup`, `useRideTracking`).

## Recent Updates

**2026-01-22**: Updated `useAutoCleanup` to use modern `.substring()` method instead of deprecated `.substr()` for ID generation.

## Core Composables

### useAutoCleanup

**Location**: `src/composables/useAutoCleanup.ts`

**Purpose**: Automatic resource cleanup to prevent memory leaks and improve performance.

**Key Features**:

- 11 specialized cleanup methods for different resource types
- Automatic cleanup on component unmount
- Manual cleanup support
- Development mode logging
- Type-safe cleanup tracking

**Usage**:

```typescript
import { useAutoCleanup } from '@/composables/useAutoCleanup'

export default {
  setup() {
    const {
      addSubscriptionCleanup,
      addTimerCleanup,
      addEventListenerCleanup,
      cleanup
    } = useAutoCleanup()

    // Supabase subscription
    const subscription = supabase
      .channel('rides')
      .on('postgres_changes', { ... }, handler)
      .subscribe()

    addSubscriptionCleanup(subscription, 'Ride updates subscription')

    // Timer
    const timerId = setInterval(() => {
      console.log('Polling...')
    }, 5000)

    addTimerCleanup(timerId, 'interval', 'Polling timer')

    // Event listener
    const handleResize = () => console.log('Resized')
    window.addEventListener('resize', handleResize)

    addEventListenerCleanup(window, 'resize', handleResize, 'Window resize')

    // Manual cleanup (optional)
    onBeforeRouteLeave(() => {
      cleanup()
    })
  }
}
```

**Specialized Cleanup Methods**:

1. **addSubscriptionCleanup** - Supabase realtime subscriptions
2. **addTimerCleanup** - setTimeout/setInterval
3. **addEventListenerCleanup** - DOM event listeners
4. **addAbortControllerCleanup** - AbortController for fetch requests
5. **addRefCleanup** - Reset reactive refs
6. **addPromiseCleanup** - Cancelable promises
7. **addWebSocketCleanup** - WebSocket connections
8. **addMediaStreamCleanup** - Camera/microphone streams
9. **addIntersectionObserverCleanup** - IntersectionObserver
10. **addMutationObserverCleanup** - MutationObserver
11. **addResizeObserverCleanup** - ResizeObserver

**Helper Functions**:

```typescript
// Cleanup-aware timer
import { useCleanupTimer } from "@/composables/useAutoCleanup";

const { setTimeout, setInterval } = useCleanupTimer();

setTimeout(() => console.log("Done"), 1000, "My timeout");
setInterval(() => console.log("Tick"), 1000, "My interval");

// Cleanup-aware event listener
import { useCleanupEventListener } from "@/composables/useAutoCleanup";

const { addEventListener } = useCleanupEventListener();

addEventListener(window, "scroll", handleScroll, false, "Scroll handler");

// Cleanup-aware subscription
import { useCleanupSubscription } from "@/composables/useAutoCleanup";

const { subscribe } = useCleanupSubscription();

const sub = supabase.channel("updates").subscribe();
subscribe(sub, "Updates channel");
```

**Advanced Usage**:

```typescript
const { addCleanup, cleanupByType, cleanupNow, getCleanupInfo, isDestroyed } =
  useAutoCleanup();

// Custom cleanup
const cleanupId = addCleanup(
  () => myCustomCleanup(),
  "custom",
  "My custom resource",
);

// Cleanup specific type
cleanupByType("timer"); // Clean all timers

// Manual cleanup by ID
cleanupNow(cleanupId);

// Get cleanup info
const info = getCleanupInfo();
console.log(`Total cleanups: ${info.total}`);
console.log(`By type:`, info.byType);

// Check if destroyed
if (isDestroyed.value) {
  console.log("Component already destroyed");
}
```

**Development Mode Logging**:

In development mode, all cleanup operations are logged:

```
[AutoCleanup] Added subscription cleanup: Ride updates subscription
[AutoCleanup] Added timer cleanup: Polling timer
[AutoCleanup] Component unmounting, starting cleanup...
[AutoCleanup] Running 5 cleanup functions
[AutoCleanup] ✓ Cleaned subscription: Ride updates subscription
[AutoCleanup] ✓ Cleaned timer: Polling timer
[AutoCleanup] All cleanup functions executed
```

**Best Practices**:

1. ✅ Always add cleanup for subscriptions, timers, and event listeners
2. ✅ Use descriptive names for cleanup functions
3. ✅ Cleanup is automatic on unmount, but you can cleanup manually if needed
4. ✅ Use specialized methods instead of generic `addCleanup` when possible
5. ✅ Check `isDestroyed` before performing operations after unmount

**Common Patterns**:

```typescript
// Pattern 1: Realtime subscription
const { addSubscriptionCleanup } = useAutoCleanup()

const channel = supabase
  .channel(`ride:${rideId}`)
  .on('postgres_changes', { ... }, handleUpdate)
  .subscribe()

addSubscriptionCleanup(channel, `Ride ${rideId} updates`)

// Pattern 2: Polling with cleanup
const { addTimerCleanup } = useAutoCleanup()

const pollInterval = setInterval(async () => {
  await fetchLatestData()
}, 5000)

addTimerCleanup(pollInterval, 'interval', 'Data polling')

// Pattern 3: Observer cleanup
const { addIntersectionObserverCleanup } = useAutoCleanup()

const observer = new IntersectionObserver(handleIntersection)
observer.observe(element)

addIntersectionObserverCleanup(observer, 'Element visibility observer')

// Pattern 4: Multiple cleanups
const {
  addSubscriptionCleanup,
  addTimerCleanup,
  addEventListenerCleanup
} = useAutoCleanup()

// All will be cleaned up automatically on unmount
addSubscriptionCleanup(subscription1, 'Subscription 1')
addSubscriptionCleanup(subscription2, 'Subscription 2')
addTimerCleanup(timer1, 'timeout', 'Timer 1')
addTimerCleanup(timer2, 'interval', 'Timer 2')
addEventListenerCleanup(window, 'resize', handler1, 'Resize handler')
addEventListenerCleanup(document, 'click', handler2, 'Click handler')
```

## Admin Composables

Admin-specific composables are located in `src/admin/composables/`.

### useAdminAuth

Authentication and authorization for admin panel.

### useAdminRBAC

Role-based access control for admin features.

### useFinancialSettings

Manage financial settings (commission, topup, payment).

See `docs/admin-views-architecture.md` for detailed admin composables documentation.

## Testing Composables

```typescript
import { describe, it, expect } from "vitest";
import { useAutoCleanup } from "@/composables/useAutoCleanup";

describe("useAutoCleanup", () => {
  it("should add and execute cleanup functions", () => {
    const { addCleanup, cleanup } = useAutoCleanup();

    let cleaned = false;
    addCleanup(
      () => {
        cleaned = true;
      },
      "custom",
      "Test cleanup",
    );

    cleanup();

    expect(cleaned).toBe(true);
  });

  it("should cleanup by type", () => {
    const { addCleanup, cleanupByType } = useAutoCleanup();

    let timerCleaned = false;
    let listenerCleaned = false;

    addCleanup(() => {
      timerCleaned = true;
    }, "timer");
    addCleanup(() => {
      listenerCleaned = true;
    }, "listener");

    cleanupByType("timer");

    expect(timerCleaned).toBe(true);
    expect(listenerCleaned).toBe(false);
  });
});
```

## Best Practices

1. **Always cleanup resources**: Use `useAutoCleanup` for any resource that needs cleanup
2. **Descriptive names**: Provide clear descriptions for cleanup functions
3. **Type-specific methods**: Use specialized cleanup methods when available
4. **Test cleanup**: Write tests to ensure cleanup functions are called
5. **Development logging**: Check console logs in dev mode to verify cleanup

## Related Documentation

- [Vue 3 Composition API](https://vuejs.org/guide/reusability/composables.html)
- [Admin Views Architecture](./admin-views-architecture.md)
- [Testing Guide](../.kiro/steering/testing-guide.md)
- [Project Standards](../.kiro/steering/project-standards.md)
