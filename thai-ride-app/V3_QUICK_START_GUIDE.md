# Multi-Role Ride Booking V3 - Quick Start Guide

## 🚀 Getting Started

### For Customers (ลูกค้า)

#### 1. Book a Ride
```
Navigate to: /customer/ride-booking-v3

Steps:
1. Select pickup location
2. Select destination
3. Choose vehicle type (car/motorcycle/van)
4. View fare estimation
5. Apply promo code (optional)
6. Confirm booking
```

#### 2. Track Your Ride
```
Navigate to: /customer/ride-tracking-v3/:rideId

Features:
- Real-time status updates
- Provider location on map
- Provider info (name, photo, plate)
- ETA display
- Cancel button (with refund policy)
```

#### 3. Cancellation Policy
- **Before matched**: Full refund (100%)
- **After matched**: 50% cancellation fee
- **After picked up**: No refund

---

### For Providers (คนขับ)

#### 1. View Available Rides
```
Navigate to: /provider/available-rides-v3

Features:
- List of pending rides sorted by distance
- Pickup/destination addresses
- Estimated fare
- Distance from your location
- Accept button (race-safe)
```

#### 2. Accept a Ride
```
Click "Accept" button

What happens:
- Ride is locked to you (other providers cannot accept)
- Your status changes to "busy"
- Customer is notified
- You see customer info
```

#### 3. Manage Active Ride
```
Navigate to: /provider/active-ride-v3

Status Flow:
matched → arriving → picked_up → in_progress → completed

Features:
- Update status buttons
- Customer info display
- Navigation to pickup/destination
- Fare adjustment option
- Cancel button (with penalty)
- GPS tracking (auto-updates every 5 seconds)
```

#### 4. Cancellation Penalty
- Each cancellation is logged
- High cancellation rate may affect your account
- Admin can view your cancellation history

---

### For Admins (ผู้ดูแลระบบ)

#### 1. Monitor All Rides
```
Navigate to: /admin/rides-v3

Features:
- Real-time ride list
- Stats cards (total active, pending, matched, in-progress)
- Filter by status
- Search by tracking ID
- Click to view details
```

#### 2. View Ride Details
```
Navigate to: /admin/rides/:id

Information:
- Full ride details (customer, provider, payment)
- Complete audit trail timeline
- Wallet hold status
- Route visualization
- Cancel button (full refund)
```

#### 3. Track Provider Cancellations
```
Navigate to: /admin/provider-cancellations-v3

Features:
- Provider list with cancellation stats
- Cancellation rate calculation
- Detailed cancellation history per provider
- Filter and search functionality
```

#### 4. Admin Actions
- Cancel any ride with full refund
- View complete audit trail
- Monitor provider performance
- Track financial transactions

---

## 🔧 Technical Details

### Database Functions

#### create_ride_atomic()
```sql
-- Creates ride with wallet hold
SELECT create_ride_atomic(
  p_user_id := 'user-uuid',
  p_pickup_lat := 13.7563,
  p_pickup_lng := 100.5018,
  p_pickup_address := 'Bangkok',
  p_destination_lat := 13.7563,
  p_destination_lng := 100.5018,
  p_destination_address := 'Sukhumvit',
  p_vehicle_type := 'car',
  p_estimated_fare := 150.00
);
```

#### accept_ride_atomic()
```sql
-- Race-safe ride acceptance
SELECT accept_ride_atomic(
  p_ride_id := 'ride-uuid',
  p_provider_id := 'provider-uuid'
);
```

#### complete_ride_atomic()
```sql
-- Complete ride with payment settlement
SELECT complete_ride_atomic(
  p_ride_id := 'ride-uuid',
  p_actual_fare := 150.00  -- Optional: defaults to estimated_fare
);
```

#### cancel_ride_atomic()
```sql
-- Cancel ride with refund
SELECT cancel_ride_atomic(
  p_ride_id := 'ride-uuid',
  p_cancelled_by := 'user-uuid',
  p_cancelled_by_role := 'customer',  -- or 'provider' or 'admin'
  p_cancel_reason := 'Changed plans'
);
```

### Composables

#### Customer
```typescript
import { useRideBookingV3 } from '@/composables/useRideBookingV3'

const {
  createRide,
  cancelRide,
  subscribeToRideUpdates
} = useRideBookingV3()

// Create ride
await createRide({
  pickup_lat: 13.7563,
  pickup_lng: 100.5018,
  pickup_address: 'Bangkok',
  destination_lat: 13.7563,
  destination_lng: 100.5018,
  destination_address: 'Sukhumvit',
  vehicle_type: 'car',
  estimated_fare: 150
})

// Subscribe to updates
await subscribeToRideUpdates(rideId)
```

#### Provider
```typescript
import { useProviderDashboardV3 } from '@/composables/useProviderDashboardV3'

const {
  acceptRide,
  updateRideStatus,
  completeRide,
  updateLocation,
  subscribeToNewRides
} = useProviderDashboardV3()

// Accept ride
await acceptRide(rideId)

// Update status
await updateRideStatus(rideId, 'arriving')

// Complete ride
await completeRide(rideId, 150) // Optional fare adjustment

// Subscribe to new rides
await subscribeToNewRides()
```

#### Admin
```typescript
import { useAdminRideMonitoring } from '@/composables/useAdminRideMonitoring'

const {
  getRideDetails,
  cancelRide,
  getProviderCancellations,
  subscribeToAllActiveRides
} = useAdminRideMonitoring()

// Get ride details
const details = await getRideDetails(rideId)

// Cancel ride (full refund)
await cancelRide(rideId, 'Admin intervention')

// Get provider cancellations
const cancellations = await getProviderCancellations(providerId)

// Subscribe to all active rides
await subscribeToAllActiveRides()
```

---

## 🎯 Status Flow

### Complete Status Flow
```
pending
  ↓ (provider accepts)
matched
  ↓ (provider updates)
arriving
  ↓ (provider updates)
picked_up
  ↓ (provider updates)
in_progress
  ↓ (provider completes)
completed
```

### Cancellation Points
- **pending**: Can be cancelled by customer (full refund)
- **matched**: Can be cancelled by customer (50% fee) or provider (penalty)
- **arriving**: Can be cancelled by customer (50% fee) or provider (penalty)
- **picked_up**: Can be cancelled by customer (no refund) or provider (penalty)
- **in_progress**: Can be cancelled by customer (no refund) or provider (penalty)

---

## 💰 Financial Flow

### Ride Creation
1. Check wallet balance >= estimated_fare
2. Create wallet hold for estimated_fare
3. Create ride request
4. Balance remains available but held

### Ride Completion
1. Calculate actual fare (or use estimated)
2. Calculate platform fee (20% of fare)
3. Calculate provider earnings (80% of fare)
4. Release wallet hold
5. Deduct fare from customer wallet
6. Add earnings to provider wallet
7. Award loyalty points to customer

### Ride Cancellation
1. Calculate cancellation fee based on status
2. Process refund (100% - cancellation fee)
3. Release wallet hold
4. Log cancellation for audit

---

## 🔐 Security & Access Control

### RLS Policies

#### Customer
- Can SELECT own rides only
- Can INSERT new rides
- Can UPDATE own rides (for cancellation)
- Cannot see other customers' rides

#### Provider
- Can SELECT pending rides (within service area)
- Can SELECT own accepted rides
- Can UPDATE own accepted rides (status changes)
- Cannot see other providers' rides

#### Admin
- Can SELECT all rides
- Can UPDATE all rides
- Can DELETE rides (if needed)
- Full access to all data

---

## 🐛 Error Handling

### Common Errors

#### INSUFFICIENT_BALANCE
```
Error: ไม่มีเงินเพียงพอ
Solution: Top up wallet before booking
```

#### RIDE_ALREADY_ACCEPTED
```
Error: มีคนขับรับงานนี้แล้ว
Solution: Try another ride (handled gracefully in UI)
```

#### INVALID_STATUS_TRANSITION
```
Error: ไม่สามารถเปลี่ยนสถานะได้
Solution: Check current status and follow correct flow
```

#### PROVIDER_NOT_AVAILABLE
```
Error: คนขับไม่ว่าง
Solution: Provider must be 'available' to accept rides
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

#### For Customers
- Total rides booked
- Cancellation rate
- Average fare
- Loyalty points earned

#### For Providers
- Total rides completed
- Acceptance rate
- Cancellation rate
- Average earnings per ride
- Online hours

#### For Platform (Admin)
- Total active rides
- Average matching time
- Platform fee revenue
- Provider earnings
- Customer satisfaction

---

## 🆘 Troubleshooting

### Customer Issues

**Q: Why can't I book a ride?**
A: Check your wallet balance. You need at least the estimated fare.

**Q: Can I cancel after the driver accepted?**
A: Yes, but a 50% cancellation fee applies.

**Q: How do I track my ride?**
A: You'll be automatically redirected to tracking page after booking.

### Provider Issues

**Q: Why can't I accept a ride?**
A: The ride may have been accepted by another provider. Try another ride.

**Q: How do I update my location?**
A: Location updates automatically every 5 seconds when you have an active ride.

**Q: What happens if I cancel?**
A: Each cancellation is logged and may affect your account standing.

### Admin Issues

**Q: How do I cancel a ride?**
A: Go to ride details and click "Cancel" button. Full refund will be processed.

**Q: How do I track provider performance?**
A: Use the Provider Cancellations view to see cancellation rates.

**Q: Can I adjust the fare?**
A: Providers can adjust fare before completing the ride.

---

## 📞 Support

For technical issues or questions:
- Check the main documentation: `MULTI_ROLE_RIDE_BOOKING_V3_COMPLETE.md`
- Review the design document: `.kiro/specs/multi-role-ride-booking/design.md`
- Check the requirements: `.kiro/specs/multi-role-ride-booking/requirements.md`

---

**Version**: 3.0.0  
**Last Updated**: December 19, 2025  
**Status**: Production Ready ✅
