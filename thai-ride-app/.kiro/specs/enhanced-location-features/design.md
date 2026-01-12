# Design Document: Enhanced Location Features

## Overview

ระบบปรับปรุงการค้นหาและจัดการสถานที่สำหรับแอป Thai Ride ประกอบด้วย:

1. **Place Search Service** - Unified search ที่รวม Google Places, Nominatim, saved places, และ recent places
2. **Recent Places Store** - จัดการประวัติสถานที่ที่ใช้ล่าสุด
3. **Saved Places Manager** - จัดการสถานที่บันทึก (บ้าน, ที่ทำงาน, โปรด)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vue Components                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │PickupPicker │  │DestPicker  │  │SavedPlacesManager   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Composables Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │usePlaceSearch   │  │useRecentPlaces  │  │useSavedPlaces│ │
│  │(unified search) │  │(history mgmt)   │  │(CRUD ops)   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼─────────────────┼──────────┘
            │                    │                 │
            ▼                    ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Google Places│  │ Nominatim   │  │     Supabase        │  │
│  │    API      │  │   (OSM)     │  │  (saved_places)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Local Storage (Cache + Offline)            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. usePlaceSearch Composable (Enhanced)

```typescript
interface PlaceSearchOptions {
  lat?: number;
  lng?: number;
  radius?: number; // meters, default 50000
  types?: string[]; // place types to filter
  language?: string; // default 'th'
}

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number; // meters from current location
  source: "google" | "nominatim" | "saved" | "recent";
  placeType?: string;
  icon?: string;
}

interface UnifiedSearchResult {
  saved: PlaceResult[];
  recent: PlaceResult[];
  search: PlaceResult[];
}

export function usePlaceSearch() {
  const results = ref<PlaceResult[]>([]);
  const groupedResults = ref<UnifiedSearchResult>({
    saved: [],
    recent: [],
    search: [],
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Search with unified results
  async function searchPlaces(
    query: string,
    options?: PlaceSearchOptions
  ): Promise<void>;

  // Get place details by ID
  async function getPlaceDetails(placeId: string): Promise<PlaceResult | null>;

  // Clear results
  function clearResults(): void;

  return {
    results,
    groupedResults,
    loading,
    error,
    searchPlaces,
    getPlaceDetails,
    clearResults,
  };
}
```

### 2. useRecentPlaces Composable

```typescript
interface RecentPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  lastUsed: Date;
  useCount: number;
  type: "pickup" | "destination";
}

export function useRecentPlaces() {
  const recentPickups = ref<RecentPlace[]>([]);
  const recentDestinations = ref<RecentPlace[]>([]);
  const loading = ref(false);

  // Add place to history
  async function addToHistory(
    place: Omit<RecentPlace, "id" | "lastUsed" | "useCount">,
    type: "pickup" | "destination"
  ): Promise<void>;

  // Get recent places (max 10)
  async function getRecentPlaces(
    type: "pickup" | "destination"
  ): Promise<RecentPlace[]>;

  // Clear history
  async function clearHistory(type?: "pickup" | "destination"): Promise<void>;

  // Sync with database
  async function syncWithDatabase(): Promise<void>;

  return {
    recentPickups,
    recentDestinations,
    loading,
    addToHistory,
    getRecentPlaces,
    clearHistory,
    syncWithDatabase,
  };
}
```

### 3. useSavedPlaces Composable (Enhanced)

```typescript
interface SavedPlace {
  id: string;
  userId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeType: "home" | "work" | "other";
  customName?: string; // for 'other' type
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useSavedPlaces() {
  const savedPlaces = ref<SavedPlace[]>([]);
  const homePlace = ref<SavedPlace | null>(null);
  const workPlace = ref<SavedPlace | null>(null);
  const favoritePlaces = ref<SavedPlace[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // CRUD operations
  async function savePlace(
    place: Omit<SavedPlace, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<SavedPlace>;
  async function updatePlace(
    id: string,
    updates: Partial<SavedPlace>
  ): Promise<SavedPlace>;
  async function deletePlace(id: string): Promise<void>;

  // Fetch all saved places
  async function fetchSavedPlaces(): Promise<void>;

  // Check limits
  function canAddFavorite(): boolean; // max 10

  return {
    savedPlaces,
    homePlace,
    workPlace,
    favoritePlaces,
    loading,
    error,
    savePlace,
    updatePlace,
    deletePlace,
    fetchSavedPlaces,
    canAddFavorite,
  };
}
```

### 4. SavedPlacesManager Component

```vue
<template>
  <div class="saved-places-manager">
    <!-- Header -->
    <div class="manager-header">
      <h2>สถานที่บันทึก</h2>
      <button @click="showAddModal = true">+ เพิ่ม</button>
    </div>

    <!-- Home/Work Section -->
    <div class="special-places">
      <PlaceCard
        :place="homePlace"
        type="home"
        @edit="editPlace"
        @delete="deletePlace"
      />
      <PlaceCard
        :place="workPlace"
        type="work"
        @edit="editPlace"
        @delete="deletePlace"
      />
    </div>

    <!-- Favorites Section -->
    <div class="favorites-section">
      <h3>สถานที่โปรด ({{ favoritePlaces.length }}/10)</h3>
      <PlaceCard
        v-for="place in favoritePlaces"
        :key="place.id"
        :place="place"
        type="favorite"
        @edit="editPlace"
        @delete="deletePlace"
      />
    </div>

    <!-- Add/Edit Modal -->
    <PlaceEditModal
      v-if="showEditModal"
      :place="editingPlace"
      @save="handleSave"
      @close="showEditModal = false"
    />
  </div>
</template>
```

## Data Models

### Database Schema (Supabase)

```sql
-- Enhanced saved_places table
CREATE TABLE saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('home', 'work', 'other')),
  custom_name TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_home_per_user UNIQUE (user_id, place_type)
    WHERE place_type = 'home',
  CONSTRAINT unique_work_per_user UNIQUE (user_id, place_type)
    WHERE place_type = 'work'
);

-- Recent places table
CREATE TABLE recent_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('pickup', 'destination')),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for deduplication
  CONSTRAINT unique_recent_place UNIQUE (user_id, lat, lng, place_type)
);

-- Indexes
CREATE INDEX idx_saved_places_user ON saved_places(user_id);
CREATE INDEX idx_saved_places_type ON saved_places(user_id, place_type);
CREATE INDEX idx_recent_places_user ON recent_places(user_id, place_type);
CREATE INDEX idx_recent_places_last_used ON recent_places(user_id, last_used DESC);

-- RLS Policies
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved places" ON saved_places
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recent places" ON recent_places
  FOR ALL USING (auth.uid() = user_id);
```

### Local Storage Schema

```typescript
interface LocalStorageSchema {
  // Cache for search results
  place_search_cache: {
    [query: string]: {
      results: PlaceResult[];
      timestamp: number;
      expiresAt: number;
    };
  };

  // Offline recent places
  recent_places_offline: {
    pickups: RecentPlace[];
    destinations: RecentPlace[];
    lastSync: number;
  };

  // Offline saved places
  saved_places_offline: {
    places: SavedPlace[];
    lastSync: number;
    pendingChanges: Array<{
      action: "create" | "update" | "delete";
      data: Partial<SavedPlace>;
      timestamp: number;
    }>;
  };
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Search Results Contain Required Fields

_For any_ search query that returns results, all results SHALL contain id, name, address, lat, lng, and source fields with valid values.

**Validates: Requirements 1.2, 2.7, 3.6**

### Property 2: Search Results Ordered by Relevance

_For any_ search query with current location provided, saved locations matching the query SHALL appear before recent places, and recent places SHALL appear before external search results. Within each group, results SHALL be ordered by distance from current location.

**Validates: Requirements 1.5, 4.3**

### Property 3: Recent Places Limit and Uniqueness

_For any_ user, the recent places list SHALL contain at most 10 unique locations per type (pickup/destination). Locations within 100 meters of each other SHALL be considered duplicates and merged.

**Validates: Requirements 2.2, 2.6**

### Property 4: Saved Places Limits

_For any_ user, there SHALL be at most 1 home location, 1 work location, and 10 favorite locations. Attempting to exceed these limits SHALL fail with an appropriate error.

**Validates: Requirements 3.3**

### Property 5: Data Persistence Round-Trip

_For any_ saved place or recent place, saving to the database and then fetching SHALL return an equivalent object with all fields preserved.

**Validates: Requirements 2.1, 3.1, 3.4, 5.1**

### Property 6: Place Details Completeness

_For any_ place selected from search results, retrieving full details SHALL return valid coordinates (lat between -90 and 90, lng between -180 and 180).

**Validates: Requirements 1.3**

### Property 7: Cache Validity

_For any_ cached search result, the cache SHALL be invalidated after 5 minutes. Subsequent searches with the same query after expiration SHALL fetch fresh results.

**Validates: Requirements 1.6**

## Error Handling

### API Errors

```typescript
// Error types
enum PlaceSearchError {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_LIMIT_EXCEEDED = "API_LIMIT_EXCEEDED",
  INVALID_QUERY = "INVALID_QUERY",
  NO_RESULTS = "NO_RESULTS",
  PERMISSION_DENIED = "PERMISSION_DENIED",
}

// Error handling strategy
async function searchWithFallback(query: string): Promise<PlaceResult[]> {
  try {
    // Try Google Places first
    return await searchGooglePlaces(query);
  } catch (error) {
    console.warn("Google Places failed, falling back to Nominatim", error);

    try {
      // Fallback to Nominatim
      return await searchNominatim(query);
    } catch (fallbackError) {
      // Return cached results if available
      const cached = getCachedResults(query);
      if (cached) return cached;

      throw new AppError(
        "ไม่สามารถค้นหาสถานที่ได้",
        PlaceSearchError.NETWORK_ERROR
      );
    }
  }
}
```

### Offline Handling

```typescript
// Offline-first strategy
async function getRecentPlaces(): Promise<RecentPlace[]> {
  // 1. Return from local storage immediately
  const local = getLocalRecentPlaces();

  // 2. Sync with database in background
  if (navigator.onLine) {
    syncRecentPlaces().catch(console.warn);
  }

  return local;
}
```

## Testing Strategy

### Unit Tests

- Test search result field validation
- Test deduplication logic (100m radius)
- Test limit enforcement (10 recent, 10 favorites)
- Test cache expiration logic
- Test coordinate validation

### Property-Based Tests

Using fast-check library:

```typescript
import fc from "fast-check";

// Property 1: Search results contain required fields
test("search results have required fields", () => {
  fc.assert(
    fc.property(fc.array(placeResultArbitrary), (results) => {
      return results.every(
        (r) =>
          r.id &&
          r.name &&
          r.address &&
          typeof r.lat === "number" &&
          typeof r.lng === "number" &&
          ["google", "nominatim", "saved", "recent"].includes(r.source)
      );
    }),
    { numRuns: 100 }
  );
});

// Property 3: Deduplication within 100m
test("locations within 100m are deduplicated", () => {
  fc.assert(
    fc.property(
      fc.array(locationArbitrary, { minLength: 2, maxLength: 20 }),
      (locations) => {
        const deduplicated = deduplicateLocations(locations, 100);
        // No two locations should be within 100m of each other
        for (let i = 0; i < deduplicated.length; i++) {
          for (let j = i + 1; j < deduplicated.length; j++) {
            const distance = calculateDistance(
              deduplicated[i].lat,
              deduplicated[i].lng,
              deduplicated[j].lat,
              deduplicated[j].lng
            );
            if (distance < 100) return false;
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

- Test Google Places API integration
- Test Nominatim fallback
- Test Supabase CRUD operations
- Test offline/online sync
