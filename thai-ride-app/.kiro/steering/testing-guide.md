---
inclusion: fileMatch
fileMatchPattern: "**/*.{test,spec}.ts"
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
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "**/*.d.ts"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
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
  const mockRide = {
    id: "1",
    pickup: "สยาม",
    dropoff: "อโศก",
    fare: 150,
    status: "pending",
  };

  it("renders ride info correctly", () => {
    const wrapper = mount(RideCard, {
      props: { ride: mockRide },
    });

    expect(wrapper.text()).toContain("สยาม");
    expect(wrapper.text()).toContain("150");
  });

  it("emits select event on click", async () => {
    const wrapper = mount(RideCard, {
      props: { ride: mockRide },
    });

    await wrapper.find('[data-testid="select-btn"]').trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")![0]).toEqual([mockRide.id]);
  });

  it("shows loading state", () => {
    const wrapper = mount(RideCard, {
      props: { ride: mockRide, loading: true },
    });

    expect(wrapper.find(".animate-pulse").exists()).toBe(true);
  });
});
```

## Composable Testing

```typescript
import { describe, it, expect, vi } from "vitest";
import { useRideCalculator } from "@/composables/useRideCalculator";

describe("useRideCalculator", () => {
  it("calculates fare correctly", () => {
    const { calculateFare } = useRideCalculator();

    const fare = calculateFare({
      distance: 10, // km
      duration: 20, // minutes
      baseFare: 35,
      perKm: 6.5,
      perMinute: 2,
    });

    // 35 + (10 * 6.5) + (20 * 2) = 35 + 65 + 40 = 140
    expect(fare).toBe(140);
  });

  it("applies minimum fare", () => {
    const { calculateFare } = useRideCalculator();

    const fare = calculateFare({
      distance: 0.5,
      duration: 2,
      baseFare: 35,
      perKm: 6.5,
      perMinute: 2,
      minimumFare: 45,
    });

    expect(fare).toBe(45);
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
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
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

## Property-Based Testing (fast-check)

```typescript
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateFare } from "@/utils/fareCalculator";

describe("calculateFare properties", () => {
  it("fare is always positive", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100 }), // distance
        fc.float({ min: 0, max: 120 }), // duration
        (distance, duration) => {
          const fare = calculateFare(distance, duration);
          return fare > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("fare increases with distance", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 50 }),
        fc.float({ min: 0, max: 50 }),
        fc.float({ min: 0, max: 60 }),
        (d1, d2, duration) => {
          const fare1 = calculateFare(d1, duration);
          const fare2 = calculateFare(d1 + d2, duration);
          return fare2 >= fare1;
        }
      )
    );
  });
});
```

## Test Commands

```bash
npm run test              # Run all tests
npm run test -- --run     # Single run (no watch)
npm run test:ui           # With UI
npm run test -- --coverage # With coverage
```

## Test File Structure

```
src/
├── components/
│   ├── RideCard.vue
│   └── __tests__/
│       └── RideCard.test.ts
├── composables/
│   ├── useRide.ts
│   └── __tests__/
│       └── useRide.test.ts
└── utils/
    ├── fareCalculator.ts
    └── __tests__/
        └── fareCalculator.test.ts
```
