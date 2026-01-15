# Implementation Plan: Admin Monitoring Features

## Overview

Implementation plan สำหรับ Admin Monitoring Features ประกอบด้วย:

1. Cron Job Monitoring Dashboard
2. Provider Location Heatmap

ใช้ TypeScript, Vue 3, Supabase, และ Leaflet.js

## Tasks

- [x] 1. Setup database functions for cron job monitoring

  - [x] 1.1 Create RPC function `get_cron_jobs_with_stats()`
    - Query cron.job table with execution statistics
    - Include last run time, failed/success counts
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 1.2 Create RPC function `get_cron_job_history()`
    - Query cron.job_run_details with filters
    - Support date range and status filtering
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 1.3 Create RPC function `run_cron_job_manually()`
    - Execute job command safely
    - Return success/failure with message
    - _Requirements: 3.1, 3.2_
  - [x] 1.4 Create admin-only RLS policies for cron functions
    - Restrict access to admin role only
    - _Requirements: 1.1_

- [x] 2. Implement Cron Job Monitoring composable

  - [x] 2.1 Create `useCronJobMonitoring.ts` composable
    - Implement loadJobs, loadJobHistory, runJobManually
    - Handle loading and error states
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 2.2 Write property test for cron job statistics accuracy
    - **Property 2: Cron Job Statistics Accuracy**
    - **Validates: Requirements 1.4**
  - [x] 2.3 Write property test for execution history filtering
    - **Property 4: Execution History Filtering**
    - **Validates: Requirements 2.4**

- [x] 3. Create Cron Job Monitoring UI components

  - [x] 3.1 Create `CronJobMonitoringView.vue`
    - Display job list with stats cards
    - Show job details modal
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.2 Create `CronJobHistoryTable.vue` component
    - Display execution history with filters
    - Show error messages for failed jobs
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.3 Add manual run button with loading state
    - Prevent concurrent executions
    - Show result toast
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.4 Write property test for concurrent execution prevention
    - **Property 5: Concurrent Execution Prevention**
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - Cron Job Monitoring

  - Ensure all cron job monitoring tests pass
  - Ask the user if questions arise

- [x] 5. Setup database functions for provider heatmap

  - [x] 5.1 Create RPC function `get_provider_heatmap_data()`
    - Aggregate provider locations by grid
    - Support filtering by type, status, time range
    - _Requirements: 4.1, 5.1, 5.2, 5.3_
  - [x] 5.2 Create RPC function `get_provider_density_areas()`
    - Calculate high/low density areas
    - Return top 5 of each
    - _Requirements: 6.2, 6.4_
  - [x] 5.3 Create RPC function `get_provider_location_timelapse()`
    - Return location snapshots for time-lapse
    - Support 1h, 6h, 24h durations
    - _Requirements: 7.1, 7.2_

- [x] 6. Implement Provider Heatmap composable

  - [x] 6.1 Create `useProviderHeatmap.ts` composable
    - Implement loadProviders, applyFilters
    - Handle realtime updates
    - _Requirements: 4.1, 4.3, 5.1, 5.2, 5.3, 5.4_
  - [x] 6.2 Implement time-lapse functionality
    - Play, pause, speed controls
    - Timestamp display
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 6.3 Write property test for provider filtering
    - **Property 7: Provider Filtering Correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [x] 6.4 Write property test for provider statistics
    - **Property 8: Provider Statistics Accuracy**
    - **Validates: Requirements 6.1**

- [x] 7. Create Provider Heatmap UI components

  - [x] 7.1 Create `ProviderHeatmapView.vue`
    - Integrate Leaflet with heatmap plugin
    - Display stats cards
    - _Requirements: 4.1, 4.2, 6.1_
  - [x] 7.2 Create `HeatmapFilterPanel.vue` component
    - Provider type, status, time range filters
    - Combined filter support
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 7.3 Create `DensityAreasPanel.vue` component
    - Display high/low density area lists
    - Click to show area details
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 7.4 Create `TimeLapseControls.vue` component
    - Play/pause/speed controls
    - Duration selector
    - Current timestamp display
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 7.5 Write property test for heatmap color intensity
    - **Property 6: Heatmap Color Intensity Mapping**
    - **Validates: Requirements 4.2**
  - [x] 7.6 Write property test for density area ranking
    - **Property 10: Density Area Ranking**
    - **Validates: Requirements 6.4**

- [x] 8. Checkpoint - Provider Heatmap

  - Ensure all heatmap tests pass
  - Ask the user if questions arise

- [x] 9. Integration and routing

  - [x] 9.1 Add routes to admin router
    - `/admin/cron-jobs` for Cron Job Monitoring
    - `/admin/provider-heatmap` for Provider Heatmap
    - _Requirements: 1.1, 4.1_
  - [x] 9.2 Add navigation links to admin sidebar
    - Add icons and labels
    - _Requirements: 1.1, 4.1_
  - [x] 9.3 Setup realtime subscriptions for heatmap
    - Subscribe to providers_v2 changes
    - Auto-update heatmap
    - _Requirements: 4.3_

- [x] 10. Final checkpoint
  - Ensure all tests pass
  - Verify admin-only access
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- ใช้ภาษาไทยสำหรับ UI text ทั้งหมด
- ต้องตรวจสอบ admin role ก่อนเข้าถึงทุกหน้า
