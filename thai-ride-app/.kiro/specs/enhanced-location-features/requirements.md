# Requirements Document

## Introduction

ปรับปรุงระบบเลือกสถานที่ให้ใช้งานง่ายและแม่นยำมากขึ้น ประกอบด้วย 3 ฟีเจอร์หลัก:

1. Address Autocomplete ด้วย Google Places API
2. Recent Pickup History - บันทึกและแสดงจุดรับที่ใช้บ่อย
3. Saved Locations Management - จัดการสถานที่บันทึก

## Glossary

- **Place_Search_Service**: บริการค้นหาสถานที่ที่รวม Google Places API และ fallback
- **Recent_Places_Store**: ที่เก็บข้อมูลสถานที่ที่ใช้ล่าสุดใน local storage และ database
- **Saved_Places_Manager**: ระบบจัดการสถานที่บันทึก (บ้าน, ที่ทำงาน, โปรด)
- **Customer**: ผู้ใช้งานที่เรียกใช้บริการ
- **Autocomplete_Result**: ผลลัพธ์จากการค้นหาแบบ autocomplete

## Requirements

### Requirement 1: Google Places Autocomplete

**User Story:** As a customer, I want to search for places with autocomplete suggestions, so that I can quickly find accurate addresses.

#### Acceptance Criteria

1. WHEN a customer types at least 2 characters in the search input, THE Place_Search_Service SHALL display autocomplete suggestions within 300ms
2. WHEN autocomplete suggestions are displayed, THE Place_Search_Service SHALL show place name, address, and distance from current location
3. WHEN a customer selects an autocomplete suggestion, THE Place_Search_Service SHALL retrieve full place details including coordinates
4. IF Google Places API is unavailable, THEN THE Place_Search_Service SHALL fallback to Nominatim/OpenStreetMap search
5. WHEN searching for places, THE Place_Search_Service SHALL prioritize results near the customer's current location
6. THE Place_Search_Service SHALL cache recent search results for 5 minutes to reduce API calls

### Requirement 2: Recent Pickup History

**User Story:** As a customer, I want to see my recent pickup locations, so that I can quickly select frequently used places.

#### Acceptance Criteria

1. WHEN a customer completes a ride, THE Recent_Places_Store SHALL save the pickup location to history
2. WHEN displaying recent places, THE Recent_Places_Store SHALL show the 10 most recent unique locations
3. WHEN a customer is logged in, THE Recent_Places_Store SHALL sync recent places with the database
4. WHILE a customer is offline, THE Recent_Places_Store SHALL store recent places in local storage
5. WHEN a customer logs in on a new device, THE Recent_Places_Store SHALL restore recent places from the database
6. THE Recent_Places_Store SHALL deduplicate locations within 100 meters radius
7. WHEN displaying recent places, THE Recent_Places_Store SHALL show place name, address, and last used date

### Requirement 3: Saved Locations Management

**User Story:** As a customer, I want to manage my saved locations (home, work, favorites), so that I can quickly access frequently used places.

#### Acceptance Criteria

1. WHEN a customer saves a location as "home" or "work", THE Saved_Places_Manager SHALL store it with the special type
2. WHEN a customer saves a location as "favorite", THE Saved_Places_Manager SHALL allow adding a custom name
3. THE Saved_Places_Manager SHALL allow a maximum of 1 home, 1 work, and 10 favorite locations per customer
4. WHEN a customer edits a saved location, THE Saved_Places_Manager SHALL update the address and coordinates
5. WHEN a customer deletes a saved location, THE Saved_Places_Manager SHALL remove it from the database
6. WHEN displaying saved locations, THE Saved_Places_Manager SHALL show icon, name, and address
7. THE Saved_Places_Manager SHALL sync saved locations across all customer devices
8. WHEN a customer long-presses a saved location, THE Saved_Places_Manager SHALL show edit/delete options

### Requirement 4: Place Search Integration

**User Story:** As a customer, I want a unified search experience that combines all place sources, so that I can find any location easily.

#### Acceptance Criteria

1. WHEN searching for places, THE Place_Search_Service SHALL search across Google Places, saved locations, and recent places
2. WHEN displaying search results, THE Place_Search_Service SHALL group results by source (saved, recent, search)
3. WHEN a saved location matches the search query, THE Place_Search_Service SHALL display it at the top of results
4. THE Place_Search_Service SHALL highlight matching text in search results
5. WHEN no results are found, THE Place_Search_Service SHALL suggest using the map picker

### Requirement 5: Data Persistence and Sync

**User Story:** As a customer, I want my location data to be saved and synced, so that I don't lose my preferences.

#### Acceptance Criteria

1. WHEN a customer saves or updates a location, THE System SHALL persist changes to Supabase database
2. WHEN a customer opens the app, THE System SHALL load saved and recent places from cache first, then sync with database
3. IF database sync fails, THEN THE System SHALL retry with exponential backoff up to 3 times
4. WHEN syncing data, THE System SHALL use optimistic updates for better UX
5. THE System SHALL store location data encrypted in local storage for offline access
