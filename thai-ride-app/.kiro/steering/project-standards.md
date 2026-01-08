---
inclusion: always
---

# Thai Ride App - Project Standards

## Tech Stack

- **Frontend**: Vue 3.5+ (Composition API), TypeScript 5.9+, Pinia, Vue Router 4
- **Styling**: Tailwind CSS 4, PostCSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Maps**: Leaflet, Google Maps API
- **PWA**: vite-plugin-pwa, Service Workers
- **Testing**: Vitest, Vue Test Utils

## Code Standards

### TypeScript

- ใช้ strict mode เสมอ
- ห้ามใช้ `any` - ใช้ `unknown` แทนถ้าจำเป็น
- ทุก function ต้องมี return type
- ใช้ interface สำหรับ object shapes, type สำหรับ unions/primitives

### Vue Components

- ใช้ `<script setup lang="ts">` เสมอ
- Props ต้อง define ด้วย `defineProps<T>()`
- Emits ต้อง define ด้วย `defineEmits<T>()`
- ใช้ composables สำหรับ reusable logic

### Naming Conventions

- Components: PascalCase (e.g., `RideCard.vue`)
- Composables: camelCase with `use` prefix (e.g., `useRideTracking.ts`)
- Stores: camelCase with `use` prefix + `Store` suffix (e.g., `useRideStore.ts`)
- Types: PascalCase (e.g., `RideRequest`, `UserProfile`)

### File Structure

```
src/
├── components/     # Reusable UI components
├── composables/    # Vue composables (hooks)
├── services/       # API/business logic services
├── stores/         # Pinia stores
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── views/          # Page components
└── router/         # Vue Router config
```

## Supabase Guidelines

- ใช้ Row Level Security (RLS) ทุก table
- Edge Functions สำหรับ sensitive operations
- ใช้ Realtime subscriptions สำหรับ live updates
- Migrations ต้อง reversible

## Security Rules

- ห้าม hardcode secrets/API keys
- ใช้ environment variables เสมอ
- Validate ทุก user input
- Sanitize data ก่อน render
