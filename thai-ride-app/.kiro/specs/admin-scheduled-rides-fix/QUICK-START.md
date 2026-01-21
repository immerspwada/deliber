# Admin Scheduled Rides - Quick Start Guide

## 🚀 Access the Route

```
http://localhost:5173/admin/scheduled-rides
```

## 🔑 Authentication Required

- Role: `admin` or `super_admin`
- Test account: `superadmin@gobear.app`

## 📊 What You'll See

### Stats Dashboard

- **Total**: All scheduled rides
- **Upcoming**: Future rides
- **Today**: Rides scheduled for today
- **Assigned**: Rides with assigned providers

### Filters

- **Quick Presets**: Today, Tomorrow, 7 days, 30 days
- **Custom Range**: Pick specific date range

### Ride List

Each row shows:

- 📅 Scheduled time + relative countdown
- 👤 Customer name and phone
- 📍 Pickup → Destination
- 🚗 Ride type (standard, premium, SUV, van)
- 💰 Estimated fare
- 🏷️ Status badge
- 👨‍✈️ Provider info (if assigned)

### Actions

- **Click row**: View full details
- **Refresh button**: Reload data
- **Pagination**: Navigate through pages

## 🎨 Status Colors

- **Pending**: Yellow - รอยืนยัน
- **Confirmed**: Green - ยืนยันแล้ว
- **Assigned**: Blue - มอบหมายแล้ว
- **Cancelled**: Red - ยกเลิก
- **Completed**: Gray - เสร็จสิ้น

## 🔔 Visual Indicators

- **Yellow background**: Upcoming ride
- **Red background**: Ride starting soon (< 1 hour)
- **Orange text**: Time warning
- **Red text**: Urgent time warning

## 📱 Responsive Design

- Desktop: Full table view
- Mobile: Stacked card layout
- Touch-friendly: 44px minimum touch targets

## 🛠️ Technical Details

### RPC Functions Used

```typescript
// Fetch rides
get_all_scheduled_rides_for_admin(p_status, p_limit, p_offset);

// Count rides
count_scheduled_rides_for_admin(p_status);
```

### Composable

```typescript
import { useAdminScheduledRides } from "@/admin/composables/useAdminScheduledRides";

const { loading, scheduledRides, totalCount, fetchScheduledRides, fetchCount } =
  useAdminScheduledRides();
```

### Data Structure

```typescript
interface ScheduledRide {
  id: string;
  tracking_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  scheduled_datetime: string;
  ride_type: string;
  estimated_fare: number;
  notes: string | null;
  reminder_sent: boolean;
  status: string;
  ride_request_id: string | null;
  passenger_count: number;
  special_requests: string | null;
  provider_id: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  provider_rating: number | null;
  created_at: string;
  updated_at: string;
}
```

## 🐛 Troubleshooting

### 404 Error on Functions

**Problem**: `get_scheduled_rides` not found  
**Solution**: ✅ Fixed - Now uses `get_all_scheduled_rides_for_admin`

### Missing Fields

**Problem**: tracking_id, customer_email, provider info missing  
**Solution**: ✅ Fixed - Function now returns all required fields

### Permission Denied

**Problem**: Not authorized to view  
**Solution**: Ensure logged in as admin or super_admin

### Empty List

**Possible causes**:

1. No scheduled rides in database
2. Date filter too restrictive
3. Try "30 days" preset to see all upcoming rides

## 📝 Sample Data

To test with sample data, insert into `scheduled_rides`:

```sql
INSERT INTO scheduled_rides (
  user_id,
  pickup_address,
  pickup_lat,
  pickup_lng,
  destination_address,
  destination_lat,
  destination_lng,
  scheduled_datetime,
  ride_type,
  estimated_fare,
  passenger_count,
  status
) VALUES (
  'YOUR_USER_ID',
  'สยามพารากอน',
  13.7463,
  100.5352,
  'เซ็นทรัลเวิลด์',
  13.7469,
  100.5349,
  NOW() + INTERVAL '2 hours',
  'standard',
  150.00,
  1,
  'pending'
);
```

## ✅ Success Checklist

- [ ] Route loads without errors
- [ ] Stats display correctly
- [ ] Table shows scheduled rides
- [ ] Filters work (date presets)
- [ ] Pagination works
- [ ] Detail modal opens
- [ ] Provider info shows (if assigned)
- [ ] Refresh button works
- [ ] Mobile responsive

---

**Last Updated**: 2026-01-19  
**Status**: ✅ Fully Functional
