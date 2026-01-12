---
inclusion: always
---

# Thai Ride App - Project Standards

## Tech Stack (2026)

| Layer    | Technology                                               |
| -------- | -------------------------------------------------------- |
| Frontend | Vue 3.5+, TypeScript 5.9+, Pinia 2.2+, Vue Router 4.5+   |
| Styling  | Tailwind CSS 4, PostCSS                                  |
| Backend  | Supabase (PostgreSQL 16, Auth, Edge Functions, Realtime) |
| Maps     | Leaflet 1.9+, Google Maps API                            |
| PWA      | vite-plugin-pwa 0.21+, Workbox 7+                        |
| Testing  | Vitest 2+, Vue Test Utils, fast-check                    |
| Build    | Vite 6+, esbuild                                         |

## TypeScript Standards

```typescript
// ✅ REQUIRED
- strict: true ใน tsconfig.json
- noUncheckedIndexedAccess: true
- exactOptionalPropertyTypes: true

// ✅ DO
const result: Result<User> = await fetchUser(id);
function calculate(input: unknown): number { ... }

// ❌ DON'T
const data: any = response;  // ห้ามใช้ any
function process(x) { ... }  // ต้องมี types
```

## File Structure

```
src/
├── components/     # Reusable UI (PascalCase.vue)
├── composables/    # Vue hooks (use*.ts)
├── services/       # Business logic (*Service.ts)
├── stores/         # Pinia stores (use*Store.ts)
├── types/          # TypeScript types (*.d.ts)
├── utils/          # Pure functions (camelCase.ts)
├── views/          # Page components (*View.vue)
├── admin/          # Admin module
├── customer/       # Customer module
└── provider/       # Provider module
```

## Naming Conventions

| Type           | Pattern            | Example              |
| -------------- | ------------------ | -------------------- |
| Component      | PascalCase         | `RideCard.vue`       |
| Composable     | use + PascalCase   | `useRideTracking.ts` |
| Store          | use + Name + Store | `useRideStore.ts`    |
| Service        | Name + Service     | `rideService.ts`     |
| Type/Interface | PascalCase         | `RideRequest`        |
| Constant       | SCREAMING_SNAKE    | `MAX_RETRY_COUNT`    |
| Function       | camelCase          | `calculateFare()`    |

## Import Order

```typescript
// 1. Vue/Framework
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

// 2. External libraries
import { z } from "zod";

// 3. Internal modules (@/)
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/types";

// 4. Relative imports
import RideCard from "./RideCard.vue";
```

## Code Quality Gates

```bash
# Pre-commit (ต้องผ่านทุกข้อ)
npm run lint          # 0 errors, 0 warnings
npm run type-check    # No TypeScript errors
npm run test -- --run # All tests pass
```
