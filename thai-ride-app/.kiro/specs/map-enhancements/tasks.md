# Implementation Tasks

## Task 1: Add Notes Column to ride_requests

**Requirements:** REQ-1 (Customer Notes for Ride Requests)

**Acceptance Criteria:**

- Notes column added to ride_requests table
- Max length constraint of 500 characters
- RLS policies allow customer to write, provider to read

### Subtasks:

- [ ] Create migration file `248_ride_request_notes.sql`
- [ ] Add `notes` column with TEXT type
- [ ] Add CHECK constraint for max 500 characters
- [ ] Update TypeScript types in `src/types/database.ts`
- [ ] Apply migration with `supabase db push`

---

## Task 2: Create NotesInput Component

**Requirements:** REQ-1 (Customer Notes for Ride Requests)

**Acceptance Criteria:**

- Component accepts v-model for notes text
- Shows character count (current/max)
- Validates max length with warning
- Sanitizes input for XSS prevention

### Subtasks:

- [ ] Create `src/components/ride/NotesInput.vue`
- [ ] Implement character counter UI
- [ ] Add input validation and truncation warning
- [ ] Integrate with `RideViewRefactored.vue` booking flow
- [ ] Display notes in `ProviderJobDetailView.vue`

---

## Task 3: Create TileCacheManager Service

**Requirements:** REQ-3 (Offline Map Cache), REQ-4 (Cache Management)

**Acceptance Criteria:**

- IndexedDB storage for map tiles
- LRU eviction when cache exceeds 100MB
- TTL of 7 days for cached tiles
- Methods: put, get, has, getStats, clear, pruneExpired

### Subtasks:

- [ ] Create `src/services/tileCacheManager.ts`
- [ ] Implement IndexedDB wrapper with idb library
- [ ] Add LRU eviction logic
- [ ] Add TTL expiration check
- [ ] Add cache statistics methods
- [ ] Create TypeScript types in `src/types/map.ts`

---

## Task 4: Create TilePreloader Service

**Requirements:** REQ-2 (Map Tile Preloading), REQ-5 (Performance)

**Acceptance Criteria:**

- Preload tiles for user's current location
- Support zoom levels 12-16
- Limit to 50 tiles per session
- Background loading without blocking UI
- Store preloaded tiles in cache

### Subtasks:

- [ ] Create `src/services/mapTilePreloader.ts`
- [ ] Implement tile coordinate calculation
- [ ] Add background preloading with Web Worker or requestIdleCallback
- [ ] Integrate with TileCacheManager
- [ ] Add progress tracking

---

## Task 5: Create CachedTileLayer for Leaflet

**Requirements:** REQ-2, REQ-3 (Map Preloading & Offline Cache)

**Acceptance Criteria:**

- Custom Leaflet TileLayer that checks cache first
- Falls back to network if not cached
- Stores fetched tiles in cache
- Supports offline mode toggle

### Subtasks:

- [ ] Create `src/lib/CachedTileLayer.ts`
- [ ] Extend L.TileLayer with cache integration
- [ ] Override createTile method
- [ ] Add offline mode indicator
- [ ] Update `JobHeatMap.vue` to use CachedTileLayer
- [ ] Update `RideTrackingMap.vue` to use CachedTileLayer

---

## Task 6: Update Service Worker for Tile Caching

**Requirements:** REQ-3 (Offline Map Cache)

**Acceptance Criteria:**

- Service Worker intercepts tile requests
- Serves from IndexedDB cache when offline
- Caches new tiles on fetch

### Subtasks:

- [ ] Update `public/sw.js` or Workbox config
- [ ] Add tile URL pattern matching
- [ ] Implement cache-first strategy for tiles
- [ ] Add offline detection and fallback

---

## Task 7: Create MapCacheSettings Component

**Requirements:** REQ-4 (Cache Management)

**Acceptance Criteria:**

- Display current cache size
- Clear cache button
- Download offline maps for area
- Show download progress

### Subtasks:

- [ ] Create `src/components/settings/MapCacheSettings.vue`
- [ ] Display cache statistics from TileCacheManager
- [ ] Implement clear cache functionality
- [ ] Create `useOfflineMapDownload` composable
- [ ] Add area selection for offline download
- [ ] Show download progress UI

---

## Task 8: Create useMapTileService Composable

**Requirements:** REQ-2, REQ-3, REQ-5 (All Map Features)

**Acceptance Criteria:**

- Unified interface for tile operations
- Auto-preload on app start
- Expose cache status and offline mode

### Subtasks:

- [ ] Create `src/composables/useMapTileService.ts`
- [ ] Initialize TileCacheManager and TilePreloader
- [ ] Auto-preload tiles on geolocation change
- [ ] Expose reactive cache stats
- [ ] Add offline mode toggle

---

## Task 9: Integration and Testing

**Requirements:** All

**Acceptance Criteria:**

- All map components use cached tiles
- Notes flow works end-to-end
- Offline mode works correctly
- Performance targets met (200ms cached load)

### Subtasks:

- [ ] Integration test for notes in ride booking flow
- [ ] Test offline map viewing
- [ ] Test cache eviction and TTL
- [ ] Performance testing for tile loading
- [ ] Update existing map components to use new services

---

## Implementation Order

1. **Phase 1 - Database** (Task 1)

   - Migration for notes column

2. **Phase 2 - Core Services** (Tasks 3, 4)

   - TileCacheManager
   - TilePreloader

3. **Phase 3 - Leaflet Integration** (Task 5)

   - CachedTileLayer

4. **Phase 4 - UI Components** (Tasks 2, 7)

   - NotesInput
   - MapCacheSettings

5. **Phase 5 - Composables & SW** (Tasks 6, 8)

   - Service Worker update
   - useMapTileService

6. **Phase 6 - Integration** (Task 9)
   - Testing and optimization
