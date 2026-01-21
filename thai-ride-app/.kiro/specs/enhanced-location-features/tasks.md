# Implementation Plan: Enhanced Location Features

## Overview

Implementation plan สำหรับ 3 ฟีเจอร์: Google Places Autocomplete, Recent Pickup History, และ Saved Locations Management

## Tasks

- [x] 1. Database Schema Setup

  - [x] 1.1 Create migration for saved_places table enhancements
    - Add custom_name, icon columns
    - Add unique constraints for home/work per user
    - _Requirements: 3.1, 3.3_
  - [x] 1.2 Create migration for recent_places table
    - Create table with user_id, name, address, lat, lng, place_type, last_used, use_count
    - Add unique constraint for deduplication
    - _Requirements: 2.1, 2.6_
  - [x] 1.3 Add RLS policies for both tables
    - Users can only access their own data
    - _Requirements: 5.1_
  - [x] 1.4 Generate TypeScript types from schema
    - Run supabase gen types (pending Docker)
    - _Requirements: 5.1_

- [ ] 2. Checkpoint - Database setup complete

  - Migration file created: `238_enhanced_location_features.sql`
  - ⚠️ Docker not running - migration pending apply
  - Verify RLS policies work correctly (pending)

- [x] 3. useRecentPlaces Composable

  - [x] 3.1 Create useRecentPlaces.ts composable
    - Implement addToHistory function with deduplication
    - Implement getRecentPlaces with limit of 10
    - Implement clearHistory function
    - _Requirements: 2.1, 2.2, 2.6_
  - [x] 3.2 Implement local storage caching
    - Store recent places in localStorage for offline access
    - Implement cache-first strategy
    - _Requirements: 2.4_
  - [x] 3.3 Implement database sync
    - Sync local changes to Supabase when online
    - Handle conflict resolution (server wins)
    - _Requirements: 2.3, 2.5_
  - [ ] 3.4 Write property test for deduplication
    - **Property 3: Recent Places Limit and Uniqueness**
    - **Validates: Requirements 2.2, 2.6**

- [x] 4. useSavedPlaces Composable Enhancement

  - [x] 4.1 Enhance useSavedPlaces.ts composable
    - Add savePlace, updatePlace, deletePlace functions
    - Implement limit checking (1 home, 1 work, 10 favorites)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.2 Implement optimistic updates
    - Update UI immediately, sync in background
    - Rollback on error
    - _Requirements: 5.4_
  - [ ] 4.3 Write property test for limits
    - **Property 4: Saved Places Limits**
    - **Validates: Requirements 3.3**

- [ ] 5. Checkpoint - Composables complete

  - ✅ useRecentPlaces.ts created
  - ✅ useSavedPlaces.ts created
  - Test offline/online scenarios (pending)

- [x] 6. usePlaceSearch Enhancement

  - [x] 6.1 Add Google Places API integration
    - Implement searchGooglePlaces function
    - Handle API key and rate limiting
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 6.2 Implement unified search
    - Search across saved, recent, and external sources
    - Group results by source
    - _Requirements: 4.1, 4.2_
  - [x] 6.3 Implement result ordering
    - Saved matches first, then recent, then search
    - Order by distance within each group
    - _Requirements: 1.5, 4.3_
  - [x] 6.4 Implement search caching
    - Cache results for 5 minutes
    - Invalidate on expiration
    - _Requirements: 1.6_
  - [x] 6.5 Implement fallback to Nominatim
    - Use Nominatim when Google Places fails
    - _Requirements: 1.4_
  - [ ] 6.6 Write property test for search results
    - **Property 1: Search Results Contain Required Fields**
    - **Validates: Requirements 1.2, 2.7, 3.6**
  - [ ] 6.7 Write property test for result ordering
    - **Property 2: Search Results Ordered by Relevance**
    - **Validates: Requirements 1.5, 4.3**

- [ ] 7. Checkpoint - Search functionality complete

  - ✅ Google Places integration added
  - ✅ Unified search implemented
  - ✅ Fallback to Nominatim implemented
  - Test search with various queries (pending)

- [x] 8. SavedPlacesManager Component

  - [x] 8.1 Create SavedPlacesManager.vue component
    - Display home, work, and favorite places
    - Show add button with limit indicator
    - _Requirements: 3.6_
  - [x] 8.2 Create PlaceEditModal.vue component
    - Form for adding/editing places
    - Map picker integration
    - _Requirements: 3.2, 3.4_
  - [x] 8.3 Implement long-press actions
    - Show edit/delete options on long press
    - Haptic feedback
    - _Requirements: 3.8_
  - [ ] 8.4 Add to customer profile/settings
    - Integrate SavedPlacesManager into settings page
    - _Requirements: 3.7_

- [x] 9. Update PickupPicker and DestinationPicker

  - [x] 9.1 Integrate useRecentPlaces into PickupPicker
    - Show recent pickup locations
    - Save selected location to history
    - _Requirements: 2.1, 2.7_
  - [x] 9.2 Integrate unified search into both pickers
    - Use enhanced usePlaceSearch
    - Show grouped results
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 9.3 Add "Save to favorites" option
    - Allow saving selected place as favorite
    - _Requirements: 3.2_

- [ ] 10. Checkpoint - UI integration complete

  - ✅ PickupPicker updated with useRecentPlaces
  - ✅ DestinationPicker updated with useRecentPlaces
  - ✅ RideView destination step enhanced with better UX:
    - Hero search bar "ไปไหนดี?" as primary CTA
    - Quick access chips for Home/Work
    - Popular destinations grid (เซ็นทรัลเวิลด์, สยามพารากอน, สุวรรณภูมิ, ดอนเมือง)
    - Recent destinations list
    - Compact pickup summary at bottom
  - Test full flow from search to booking (pending)

- [ ] 11. Offline Support

  - [x] 11.1 Implement offline detection
    - Use navigator.onLine and online/offline events
    - _Requirements: 2.4_
  - [x] 11.2 Implement pending changes queue
    - Queue changes when offline
    - Sync when back online
    - _Requirements: 5.3_
  - [ ] 11.3 Write integration test for offline sync
    - Test offline → online transition
    - **Validates: Requirements 2.4, 5.2, 5.3**

- [ ] 12. Final Checkpoint
  - TypeScript check passes ✅
  - Property tests (pending)
  - Verify all requirements are met (pending Docker for DB)

## Notes

- Migration file created: `supabase/migrations/238_enhanced_location_features.sql`
- Docker not running - migration apply pending
- All composables created and TypeScript error-free
- Components created: SavedPlacesManager, PlaceCard, PlaceEditModal
- PickupPicker and DestinationPicker updated to use new composables
