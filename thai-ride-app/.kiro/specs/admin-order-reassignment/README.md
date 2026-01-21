# Admin Order Reassignment System

## Overview

This feature allows admin users to reassign orders from one provider (rider) to another through the admin panel at `http://localhost:5173/admin/orders`. The system includes full audit trail tracking and validation to ensure data integrity.

## Features

### 1. Order Reassignment

- **Reassign Button**: Available for orders that have a provider assigned and are not completed/cancelled
- **Provider Selection**: Shows list of available, approved providers
- **Online Status**: Filters providers by online/offline status
- **Search**: Search providers by name, phone, or vehicle plate
- **Validation**: Prevents reassignment to same provider or unapproved providers

### 2. Audit Trail

- **Complete History**: Tracks all reassignments with timestamps
- **Admin Attribution**: Records which admin performed the reassignment
- **Reason Tracking**: Captures reason and notes for each reassignment
- **Historical View**: View reassignment history per order or provider

### 3. Provider Information

- **Real-time Status**: Shows online/offline status
- **Rating Display**: Shows provider rating and total jobs
- **Vehicle Details**: Displays vehicle type and plate number
- **Location Data**: Shows last known location (if available)

## Database Schema

### order_reassignments Table

```sql
CREATE TABLE order_reassignments (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  old_provider_id UUID,
  new_provider_id UUID NOT NULL,
  reassigned_by UUID NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RPC Functions

### 1. reassign_order()

Reassigns an order to a different provider with validation.

**Parameters:**

- `p_order_id` (UUID): Order ID to reassign
- `p_order_type` (VARCHAR): Type of order (ride, delivery, shopping, etc.)
- `p_new_provider_id` (UUID): New provider ID
- `p_reason` (TEXT, optional): Reason for reassignment
- `p_notes` (TEXT, optional): Additional notes

**Returns:** JSON with success status and details

**Validations:**

- Admin role verification
- Provider exists and is approved
- Order exists and is not completed/cancelled
- Not already assigned to the same provider

### 2. get_reassignment_history()

Retrieves reassignment history with provider and admin names.

**Parameters:**

- `p_order_id` (UUID, optional): Filter by order
- `p_provider_id` (UUID, optional): Filter by provider
- `p_limit` (INTEGER): Number of records to return
- `p_offset` (INTEGER): Pagination offset

**Returns:** Table of reassignment records with names

### 3. get_available_providers()

Gets list of approved providers available for reassignment.

**Parameters:**

- `p_service_type` (VARCHAR, optional): Filter by service type
- `p_limit` (INTEGER): Number of records to return

**Returns:** Table of provider details with status and location

## Usage

### Admin Panel

1. **Navigate to Orders Page**

   ```
   http://localhost:5173/admin/orders
   ```

2. **Find Order to Reassign**
   - Use filters to find the order
   - Order must have a provider assigned
   - Order must not be completed or cancelled

3. **Click Reassignment Button**
   - Orange circular arrow icon in action buttons
   - Opens reassignment modal

4. **Select New Provider**
   - Search or filter providers
   - Toggle "Show Online Only" for active providers
   - Click on provider card to select

5. **Add Reason (Optional)**
   - Select from predefined reasons
   - Add custom notes if needed

6. **Confirm Reassignment**
   - Click "ยืนยันการย้ายงาน" button
   - System validates and updates order
   - Success message displayed

### Composable Usage

```typescript
import { useOrderReassignment } from "@/admin/composables/useOrderReassignment";

const {
  isLoading,
  error,
  availableProviders,
  onlineProviders,
  offlineProviders,
  topRatedProviders,
  getAvailableProviders,
  reassignOrder,
  getReassignmentHistory,
} = useOrderReassignment();

// Get available providers
await getAvailableProviders("ride");

// Reassign order
const result = await reassignOrder(
  "order-id",
  "ride",
  "new-provider-id",
  "provider_unavailable",
  "Provider requested change",
);

if (result.success) {
  console.log("Reassignment successful");
}

// Get history
const history = await getReassignmentHistory("order-id");
```

## Security

### RLS Policies

- Only admins can view and create reassignments
- All functions verify admin role before execution
- Audit trail is immutable (no updates/deletes)

### Validation

- Provider must be approved
- Order must be in valid status
- Cannot reassign to same provider
- Admin authentication required

## Testing

### Unit Tests

```bash
npm run test src/tests/admin-order-reassignment.unit.test.ts
```

### Manual Testing Checklist

- [ ] Reassign button appears for valid orders
- [ ] Reassign button hidden for completed/cancelled orders
- [ ] Provider list loads correctly
- [ ] Online/offline filter works
- [ ] Search functionality works
- [ ] Cannot select current provider
- [ ] Validation errors display correctly
- [ ] Success message shows after reassignment
- [ ] Order updates in real-time
- [ ] Audit trail records correctly

## Production Deployment

### Step 1: Apply Migration

```bash
# Production database
npx supabase db push --linked

# Or via SQL editor in Supabase Dashboard
# Copy contents of supabase/migrations/306_admin_order_reassignment_system.sql
```

### Step 2: Verify Functions

```sql
-- Test reassign_order function
SELECT reassign_order(
  'test-order-id'::UUID,
  'ride',
  'test-provider-id'::UUID,
  'testing',
  'Test reassignment'
);

-- Test get_available_providers
SELECT * FROM get_available_providers('ride', 10);

-- Test get_reassignment_history
SELECT * FROM get_reassignment_history(NULL, NULL, 10, 0);
```

### Step 3: Deploy Frontend

```bash
# Build and deploy
npm run build
# Deploy to Vercel/hosting platform
```

### Step 4: Verify in Production

1. Login as admin
2. Navigate to orders page
3. Test reassignment on a test order
4. Verify audit trail is recorded
5. Check order updates correctly

## Troubleshooting

### Common Issues

**Issue: "Only admins can reassign orders"**

- Solution: Verify user has admin role in profiles table

**Issue: "Provider not found"**

- Solution: Check provider exists in providers_v2 table

**Issue: "Provider is not approved"**

- Solution: Approve provider in admin panel first

**Issue: "Cannot reassign completed orders"**

- Solution: Only orders in pending/matched/in_progress can be reassigned

**Issue: Reassignment button not showing**

- Solution: Check order has provider_id and status is not completed/cancelled

## Future Enhancements

1. **Bulk Reassignment**: Reassign multiple orders at once
2. **Auto-Reassignment**: Automatically reassign if provider is offline for X minutes
3. **Provider Notifications**: Notify old and new providers of reassignment
4. **Customer Notifications**: Notify customer of provider change
5. **Reassignment Analytics**: Dashboard showing reassignment patterns
6. **Rollback Feature**: Ability to undo recent reassignments
7. **Provider Preferences**: Consider provider preferences when suggesting reassignments

## Related Files

- Migration: `supabase/migrations/306_admin_order_reassignment_system.sql`
- Composable: `src/admin/composables/useOrderReassignment.ts`
- Component: `src/admin/components/OrderReassignmentModal.vue`
- View: `src/admin/views/OrdersView.vue`
- Tests: `src/tests/admin-order-reassignment.unit.test.ts`

## Support

For issues or questions:

1. Check this documentation
2. Review test cases for examples
3. Check migration SQL for database schema
4. Review composable for API usage
