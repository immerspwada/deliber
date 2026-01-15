# Provider Job Detail - Quick Reference

## File Structure

```
src/
├── views/provider/
│   ├── ProviderJobDetailView.vue          # Main component
│   └── ProviderJobDetailViewEnhanced.vue  # Alternative version
├── composables/
│   ├── useJobStatusFlow.ts                # Status mapping
│   ├── useProviderJobDetail.ts            # Job management
│   ├── useETA.ts                          # ETA calculation
│   ├── useNavigation.ts                   # Maps integration
│   ├── useRoleAccess.ts                   # Access control
│   └── useErrorHandler.ts                 # Error handling
├── components/provider/
│   └── PhotoEvidence.vue                  # Photo upload
├── types/
│   ├── ride-requests.ts                   # Type definitions
│   └── ride.ts                            # Ride types
└── utils/
    └── errorHandler.ts                    # Error utilities

supabase/
├── migrations/
│   ├── 263_add_accepted_at_to_ride_requests.sql
│   ├── 248_ride_evidence_photos.sql
│   ├── 267_provider_production_rls_policies.sql
│   └── 266_customer_ride_production_rls.sql
```

## Status Flow

```
matched → pickup → in_progress → completed
   ↓        ↓           ↓            ↓
  ✅       📍          🛣️           🎉
```

**Database Status Values**:

- `matched`, `accepted`, `confirmed` → UI: "รับงานแล้ว"
- `pickup`, `arrived`, `at_pickup` → UI: "ถึงจุดรับแล้ว"
- `in_progress`, `picked_up`, `started` → UI: "กำลังเดินทาง"
- `completed`, `finished`, `done` → UI: "เสร็จสิ้น"
- `cancelled` → UI: "ยกเลิก"

## Key Composables

### useJobStatusFlow

```typescript
const {
  STATUS_FLOW, // Array of status steps
  currentStatusIndex, // Current position (0-3)
  currentStep, // Current step object
  nextStep, // Next step object
  nextDbStatus, // Next database status value
  canProgress, // Can move to next step
  isCompleted, // Is job completed
  isCancelled, // Is job cancelled
  debugInfo, // Debug information
} = useJobStatusFlow(jobStatus);
```

### useProviderJobDetail

```typescript
const {
  job, // Job details
  loading, // Loading state
  updating, // Updating state
  error, // Error message
  canUpdate, // Can update status
  isJobCompleted, // Is completed
  isJobCancelled, // Is cancelled
  showPickupPhoto, // Show pickup photo section
  showDropoffPhoto, // Show dropoff photo section
  loadJob, // Load job by ID
  updateStatus, // Update to next status
  cancelJob, // Cancel job
  handlePhotoUploaded, // Handle photo upload
  clearCache, // Clear cache
} = useProviderJobDetail();
```

### useETA

```typescript
const {
  eta, // ETA result object
  loading, // Loading state
  error, // Error message
  arrivalTime, // Formatted arrival time
  calculateETA, // Calculate ETA
  startTracking, // Start location tracking
  updateETA, // Manual ETA update
  stopTracking, // Stop tracking
  formatMinutes, // Format minutes to string
  formatDistance, // Format km to string
} = useETA();
```

### useNavigation

```typescript
const {
  isIOS, // Is iOS device
  isAndroid, // Is Android device
  navigate, // Open navigation app
  openGoogleMaps, // Open Google Maps
  openWaze, // Open Waze
  openAppleMaps, // Open Apple Maps
  showNavigationOptions, // Show app selection
  calculateDistance, // Calculate distance
  isValidCoordinate, // Validate coordinates
} = useNavigation();
```

## Database Schema

### ride_requests Table

**Status Columns**:

```sql
status VARCHAR -- pending, matched, pickup, in_progress, completed, cancelled
```

**Timestamp Columns**:

```sql
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
accepted_at TIMESTAMPTZ
arrived_at TIMESTAMPTZ
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
```

**Photo Columns**:

```sql
pickup_photo TEXT
dropoff_photo TEXT
pickup_photo_at TIMESTAMPTZ
dropoff_photo_at TIMESTAMPTZ
```

**Cancellation Columns**:

```sql
cancellation_reason TEXT
cancelled_by VARCHAR (customer, provider, system)
```

## RLS Policies

### Provider Access

- ✅ Can view rides assigned to them
- ✅ Can view pending rides (job pool)
- ✅ Can update their assigned rides
- ❌ Cannot modify customer info
- ❌ Cannot change provider_id

### Customer Access

- ✅ Can view their own rides
- ✅ Can view assigned provider info
- ✅ Can cancel pending rides
- ❌ Cannot view other customers' rides

### Admin Access

- ✅ Full access to all rides
- ✅ Can view all provider data
- ✅ Can view all customer data

## Common Issues & Fixes

### Issue: "Access Denied" Error

**Cause**: Provider not in providers_v2 table or status not approved  
**Fix**: Check provider registration status in admin panel

### Issue: Status Won't Update

**Cause**: Invalid status transition or job already completed  
**Fix**: Check current status, verify job not completed/cancelled

### Issue: Photo Upload Fails

**Cause**: File too large (>5MB) or wrong format  
**Fix**: Use JPEG/PNG/WebP, keep under 5MB

### Issue: ETA Not Updating

**Cause**: Location permission denied or GPS disabled  
**Fix**: Enable location services, grant permission

### Issue: Realtime Updates Not Working

**Cause**: Subscription not established or network issue  
**Fix**: Check network, reload page, check browser console

## Testing Checklist

- [ ] Load job detail page
- [ ] Verify job info displays correctly
- [ ] Click status update button
- [ ] Verify status changes in real-time
- [ ] Take photo evidence
- [ ] Verify photo uploads to storage
- [ ] Test chat functionality
- [ ] Test navigation integration
- [ ] Test on slow network (DevTools throttle)
- [ ] Test on offline mode
- [ ] Test access denial (wrong provider)
- [ ] Test completed job (no update button)
- [ ] Test cancelled job (no update button)

## Performance Tips

1. **Lazy Load Photos**: Use `loading="lazy"` on images
2. **Debounce Location Updates**: Don't update ETA on every GPS ping
3. **Cache Job Data**: Use 5-minute cache to reduce queries
4. **Optimize Realtime**: Only subscribe to relevant fields
5. **Compress Photos**: Resize before upload

## Security Checklist

- ✅ RLS policies enabled on ride_requests
- ✅ Provider ownership verified before update
- ✅ Input validation with Zod schemas
- ✅ File upload validation (type, size)
- ✅ Coordinates validated (-90 to 90, -180 to 180)
- ⚠️ No rate limiting on status updates
- ⚠️ No audit logging for changes
- ⚠️ No CSRF protection

## Deployment Checklist

- [ ] Run all migrations (263, 248, 267, 266)
- [ ] Verify RLS policies active
- [ ] Test with staging data
- [ ] Load test status updates
- [ ] Monitor error logs
- [ ] Check realtime subscriptions
- [ ] Test with real providers
- [ ] Verify photo storage working
- [ ] Test navigation integration
- [ ] Check ETA accuracy

## Useful SQL Queries

### Check Provider Access

```sql
SELECT id, user_id, status FROM providers_v2
WHERE user_id = 'user-id' AND status IN ('approved', 'active');
```

### Check Job Status

```sql
SELECT id, status, provider_id, created_at, updated_at
FROM ride_requests
WHERE id = 'job-id';
```

### Check Photo Evidence

```sql
SELECT id, pickup_photo, dropoff_photo, pickup_photo_at, dropoff_photo_at
FROM ride_requests
WHERE id = 'job-id';
```

### Check Realtime Subscriptions

```sql
SELECT * FROM pg_stat_replication;
```

### Check RLS Policies

```sql
SELECT * FROM pg_policies
WHERE tablename = 'ride_requests'
ORDER BY policyname;
```

## Debug Mode

Enable debug panel in development:

```typescript
const isDevelopment = computed(() => import.meta.env.DEV);
// Shows status flow debug info
```

Check browser console for logs:

```
[JobDetail] Component mounted
[JobDetail] Checking access...
[JobDetail] Status Debug: {...}
[JobDetail] Updating status: {...}
```

## Related Documentation

- [PROVIDER_JOB_DETAIL_ENGINEERING_ANALYSIS.md](./PROVIDER_JOB_DETAIL_ENGINEERING_ANALYSIS.md) - Full analysis
- [PROVIDER_PRODUCTION_READY.md](./PROVIDER_PRODUCTION_READY.md) - Provider system overview
- [PROVIDER_SYSTEM_IMPLEMENTATION.md](./PROVIDER_SYSTEM_IMPLEMENTATION.md) - Implementation details
- [REALTIME_TRACKING_FEATURES.md](./REALTIME_TRACKING_FEATURES.md) - Realtime features
- [RIDE_SYSTEM_ARCHITECTURE.md](./RIDE_SYSTEM_ARCHITECTURE.md) - Ride system overview

---

**Last Updated**: 2026-01-14  
**Version**: 1.0
