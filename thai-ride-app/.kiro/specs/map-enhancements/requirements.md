# Requirements Document

## Introduction

ปรับปรุงประสิทธิภาพและความสามารถของระบบแผนที่ ประกอบด้วย 3 ฟีเจอร์หลัก:

1. Notes Column - เพิ่มคอลัมน์ notes ใน ride_requests สำหรับบันทึกข้อความจากลูกค้า
2. Map Preloading - โหลด Leaflet tiles ล่วงหน้าเพื่อให้แผนที่แสดงผลเร็วขึ้น
3. Offline Map Cache - แคช map tiles สำหรับใช้งานแบบออฟไลน์

## Glossary

- **Ride_Request**: คำขอเรียกรถจากลูกค้า
- **Map_Tile_Service**: บริการจัดการ map tiles รวมถึง preloading และ caching
- **Tile_Cache**: ที่เก็บ map tiles ใน IndexedDB สำหรับใช้งานออฟไลน์
- **Customer**: ผู้ใช้งานที่เรียกใช้บริการ
- **Provider**: คนขับที่ให้บริการ
- **Service_Worker**: Web Worker ที่จัดการ offline caching

## Requirements

### Requirement 1: Customer Notes for Ride Requests

**User Story:** As a customer, I want to add notes to my ride request, so that I can provide special instructions to the driver.

#### Acceptance Criteria

1. WHEN a customer creates a ride request, THE System SHALL allow adding optional notes up to 500 characters
2. WHEN a provider views a job, THE System SHALL display the customer notes if provided
3. WHEN notes are provided, THE System SHALL persist them in the ride_requests table
4. IF notes exceed 500 characters, THEN THE System SHALL truncate and show a warning
5. WHEN displaying notes, THE System SHALL sanitize HTML to prevent XSS attacks
6. THE System SHALL allow customers to edit notes before the ride is matched

### Requirement 2: Map Tile Preloading

**User Story:** As a user, I want maps to load faster, so that I can see my location and route without waiting.

#### Acceptance Criteria

1. WHEN the app starts, THE Map_Tile_Service SHALL preload tiles for the user's current location at zoom levels 12-16
2. WHEN a user opens a map view, THE Map_Tile_Service SHALL display cached tiles immediately if available
3. THE Map_Tile_Service SHALL preload tiles in a background thread to avoid blocking the UI
4. WHEN preloading tiles, THE Map_Tile_Service SHALL prioritize the current viewport area
5. THE Map_Tile_Service SHALL limit preloading to 50 tiles per session to conserve bandwidth
6. IF the user's location changes significantly (>1km), THEN THE Map_Tile_Service SHALL preload tiles for the new area
7. WHEN preloading completes, THE Map_Tile_Service SHALL store tiles in IndexedDB cache

### Requirement 3: Offline Map Cache

**User Story:** As a user, I want to view maps even when offline, so that I can navigate without internet connection.

#### Acceptance Criteria

1. WHEN a map tile is loaded, THE Tile_Cache SHALL store it in IndexedDB for offline use
2. WHEN the device is offline, THE Map_Tile_Service SHALL serve tiles from the Tile_Cache
3. THE Tile_Cache SHALL have a maximum size of 100MB to prevent excessive storage use
4. WHEN the cache exceeds 100MB, THE Tile_Cache SHALL remove the oldest tiles using LRU eviction
5. THE Tile_Cache SHALL store tiles with a TTL of 7 days
6. WHEN tiles expire, THE Tile_Cache SHALL refresh them on next online access
7. WHEN offline, THE Map_Tile_Service SHALL display a visual indicator showing offline mode
8. THE Service_Worker SHALL intercept tile requests and serve from cache when offline

### Requirement 4: Cache Management

**User Story:** As a user, I want to manage my map cache, so that I can control storage usage on my device.

#### Acceptance Criteria

1. WHEN a user opens settings, THE System SHALL display current cache size
2. WHEN a user requests to clear cache, THE Tile_Cache SHALL remove all stored tiles
3. THE System SHALL allow users to download map tiles for a specific area for offline use
4. WHEN downloading offline maps, THE System SHALL show download progress
5. IF download fails, THEN THE System SHALL retry up to 3 times with exponential backoff
6. THE System SHALL estimate download size before starting offline map download

### Requirement 5: Performance Optimization

**User Story:** As a user, I want the map to be responsive and smooth, so that I have a good user experience.

#### Acceptance Criteria

1. THE Map_Tile_Service SHALL load visible tiles within 200ms when cached
2. WHEN scrolling the map, THE Map_Tile_Service SHALL prefetch adjacent tiles
3. THE Map_Tile_Service SHALL use WebP format for tiles when supported by the browser
4. WHEN memory usage exceeds 50MB, THE Map_Tile_Service SHALL unload off-screen tiles
5. THE Map_Tile_Service SHALL batch tile requests to reduce HTTP overhead
6. WHEN the app is in background, THE Map_Tile_Service SHALL pause preloading to save battery
