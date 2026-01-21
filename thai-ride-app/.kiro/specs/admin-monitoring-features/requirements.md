# Requirements Document

## Introduction

ระบบ Admin Monitoring Features สำหรับ Thai Ride App ประกอบด้วย 2 ฟีเจอร์หลัก:

1. **Cron Job Monitoring Dashboard** - แสดงสถานะและประวัติการทำงานของ pg_cron jobs
2. **Provider Location Heatmap** - แสดง heatmap ตำแหน่ง provider แบบ real-time

ฟีเจอร์เหล่านี้ช่วยให้ Admin สามารถติดตามสุขภาพของระบบและวิเคราะห์การกระจายตัวของ provider ได้อย่างมีประสิทธิภาพ

## Glossary

- **Admin_Dashboard**: หน้าจอ Admin สำหรับจัดการและติดตามระบบ
- **Cron_Job**: งานที่ถูกตั้งเวลาให้ทำงานอัตโนมัติผ่าน pg_cron extension
- **Heatmap**: แผนที่แสดงความหนาแน่นของข้อมูลด้วยสี
- **Provider**: ผู้ให้บริการในระบบ (driver, rider, shopper, mover)
- **Location_History**: ประวัติตำแหน่งของ provider ที่บันทึกไว้
- **Job_Run_Details**: รายละเอียดการทำงานของ cron job แต่ละครั้ง

## Requirements

### Requirement 1: Cron Job Status Overview

**User Story:** As an admin, I want to see the status of all scheduled cron jobs, so that I can monitor system health and ensure automated tasks are running correctly.

#### Acceptance Criteria

1. WHEN an admin visits the Cron Job Monitoring page THEN THE Admin_Dashboard SHALL display a list of all registered cron jobs with their current status
2. THE Admin_Dashboard SHALL show job name, schedule (cron expression), last run time, next run time, and status (active/inactive) for each cron job
3. WHEN a cron job is currently running THEN THE Admin_Dashboard SHALL display a visual indicator showing the job is in progress
4. THE Admin_Dashboard SHALL display the total count of active jobs, failed jobs in last 24 hours, and successful jobs in last 24 hours

### Requirement 2: Cron Job Execution History

**User Story:** As an admin, I want to view the execution history of cron jobs, so that I can troubleshoot issues and verify job completion.

#### Acceptance Criteria

1. WHEN an admin selects a cron job THEN THE Admin_Dashboard SHALL display the last 50 execution records for that job
2. THE Admin_Dashboard SHALL show execution start time, end time, duration, status (success/failed), and return value for each execution
3. IF a cron job execution failed THEN THE Admin_Dashboard SHALL display the error message associated with that failure
4. WHEN viewing execution history THEN THE Admin_Dashboard SHALL allow filtering by date range and status

### Requirement 3: Manual Cron Job Trigger

**User Story:** As an admin, I want to manually trigger a cron job, so that I can run maintenance tasks on demand without waiting for the scheduled time.

#### Acceptance Criteria

1. WHEN an admin clicks the "Run Now" button for a cron job THEN THE Admin_Dashboard SHALL execute that job immediately
2. WHEN a manual job execution completes THEN THE Admin_Dashboard SHALL display the result (success/failure) with execution details
3. THE Admin_Dashboard SHALL prevent multiple simultaneous manual executions of the same job

### Requirement 4: Provider Location Heatmap Display

**User Story:** As an admin, I want to see a heatmap of provider locations, so that I can understand the geographic distribution of available providers.

#### Acceptance Criteria

1. WHEN an admin visits the Provider Heatmap page THEN THE Admin_Dashboard SHALL display a map with heatmap overlay showing provider density
2. THE Admin_Dashboard SHALL use color intensity to represent provider concentration (red = high, yellow = medium, green = low)
3. THE Admin_Dashboard SHALL update the heatmap in real-time as provider locations change
4. WHEN hovering over a heatmap area THEN THE Admin_Dashboard SHALL display the count of providers in that area

### Requirement 5: Provider Location Filtering

**User Story:** As an admin, I want to filter the provider heatmap by various criteria, so that I can analyze specific segments of providers.

#### Acceptance Criteria

1. WHEN an admin selects a provider type filter THEN THE Admin_Dashboard SHALL display only providers of that type on the heatmap
2. WHEN an admin selects an online status filter THEN THE Admin_Dashboard SHALL display only providers matching that status
3. WHEN an admin selects a time range filter THEN THE Admin_Dashboard SHALL display provider locations from that time period
4. THE Admin_Dashboard SHALL allow combining multiple filters simultaneously

### Requirement 6: Provider Density Statistics

**User Story:** As an admin, I want to see statistics about provider distribution, so that I can identify areas with low coverage.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display total provider count, online count, and available count alongside the heatmap
2. THE Admin_Dashboard SHALL identify and highlight areas with low provider coverage (below threshold)
3. WHEN an admin clicks on a low-coverage area THEN THE Admin_Dashboard SHALL display details about that area including historical coverage data
4. THE Admin_Dashboard SHALL display a list of top 5 high-density areas and top 5 low-density areas

### Requirement 7: Heatmap Time-lapse View

**User Story:** As an admin, I want to view provider distribution changes over time, so that I can identify patterns and optimize provider allocation.

#### Acceptance Criteria

1. WHEN an admin enables time-lapse mode THEN THE Admin_Dashboard SHALL animate the heatmap showing changes over the selected time period
2. THE Admin_Dashboard SHALL allow selecting time-lapse duration (1 hour, 6 hours, 24 hours)
3. THE Admin_Dashboard SHALL provide play, pause, and speed controls for the time-lapse animation
4. WHEN time-lapse is playing THEN THE Admin_Dashboard SHALL display the current timestamp being shown
