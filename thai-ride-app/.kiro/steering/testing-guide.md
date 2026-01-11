---
inclusion: always
---

# Testing Standards

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

## Component Testing

```typescript
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import RideCard from "@/components/RideCard.vue";

describe("RideCard", () => {
  it("renders ride info correctly", () => {
    const wrapper = mount(RideCard, {
      props: {
        ride: {
          id: "1",
          pickup: "สยาม",
          dropoff: "อโศก",
          price: 150,
        },
      },
    });

    expect(wrapper.text()).toContain("สยาม");
    expect(wrapper.text()).toContain("150");
  });

  it("emits select event on click", async () => {
    const wrapper = mount(RideCard, {
      props: { ride: mockRide },
    });

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
  });
});
```

## Composable Testing

```typescript
import { describe, it, expect } from "vitest";
import { useRideCalculator } from "@/composables/useRideCalculator";

describe("useRideCalculator", () => {
  it("calculates fare correctly", () => {
    const { calculateFare } = useRideCalculator();

    const fare = calculateFare({
      distance: 10, // km
      duration: 20, // minutes
    });

    expect(fare).toBeGreaterThan(0);
    expect(fare).toBe(150); // base + distance + time
  });
});
```

## Mocking Supabase

```typescript
import { vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: mockData,
              error: null,
            })
          ),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockUser },
          error: null,
        })
      ),
    },
  },
}));
```

## Test Commands

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# Coverage
npm run test -- --coverage
```
