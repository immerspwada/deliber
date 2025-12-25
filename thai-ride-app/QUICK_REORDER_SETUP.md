# Quick Reorder System - Setup Guide

## 🚨 Error: Function Not Found

If you see this error:

```
PGRST202: Searched for the function public.get_reorderable_items
```

It means the Quick Reorder migration hasn't been applied to your database yet.

## ✅ Solution: Run Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `scripts/run-quick-reorder-migration.sql`
4. Copy all the SQL content
5. Paste into SQL Editor
6. Click **Run**

### Option 2: Supabase CLI

```bash
cd thai-ride-app
supabase db push
```

This will apply all pending migrations including `170_quick_reorder_system.sql`.

## 📋 What Gets Created

### Tables

- `reorder_analytics` - Track reorder behavior

### Columns Added

All service tables get these columns:

- `is_reorder` - Boolean flag
- `original_request_id` - Reference to original order
- `reorder_count` - How many times reordered

### Functions Created

- `get_reorderable_items(user_id, limit)` - Get list of reorderable items
- `quick_reorder_ride(ride_id, method)` - Reorder a ride
- `quick_reorder_delivery(delivery_id, method)` - Reorder a delivery

### RLS Policies

- Customers can read/create their own reorder analytics
- Admin has full access

## 🧪 Test After Migration

Run this in SQL Editor to verify:

```sql
-- Test get_reorderable_items function
SELECT * FROM get_reorderable_items(
  auth.uid(),
  5
);

-- Should return empty array if no completed orders
-- Or list of reorderable items if you have completed orders
```

## 🔍 Verify Installation

```sql
-- Check if columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ride_requests'
AND column_name IN ('is_reorder', 'original_request_id', 'reorder_count');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%reorder%';

-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'reorder_analytics';
```

## 📝 Feature Details

### F254: Quick Reorder System

**Customer Side:**

- See "สั่งซ้ำ" button on completed orders
- One-click reorder with same details
- Track reorder history

**Provider Side:**

- No changes needed
- Reordered requests appear as new pending jobs

**Admin Side:**

- View reorder analytics
- Track which services get reordered most
- Analyze reorder patterns

## 🎯 Usage in Code

```typescript
import { useQuickReorder } from "@/composables/useQuickReorder";

const { reorderableItems, fetchReorderableItems, quickReorder } =
  useQuickReorder();

// Fetch reorderable items
await fetchReorderableItems(5);

// Quick reorder
const newRideId = await quickReorder(item, "quick_button");
```

## 🐛 Troubleshooting

### Error: "function does not exist"

- Run the migration script above
- Verify functions were created with the verification query

### Error: "column does not exist"

- Run the migration script
- Check if columns were added with the verification query

### No reorderable items showing

- Make sure you have completed orders in the last 30 days
- Check if `completed_at` is set on your orders
- Verify RLS policies allow reading your own orders

## 📊 Database Schema

```sql
-- Reorder Analytics Table
CREATE TABLE reorder_analytics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  service_type TEXT,
  original_request_id UUID,
  reorder_request_id UUID,
  reorder_method TEXT,
  time_since_original INTERVAL,
  created_at TIMESTAMPTZ
);
```

## 🔐 Security

- All functions use `SECURITY DEFINER` for consistent permissions
- RLS policies ensure users only see their own data
- Admin has full access for analytics
- Functions validate user ownership before reordering

## 📈 Analytics Tracking

Every reorder is tracked with:

- Original request ID
- New request ID
- Reorder method (quick_button, history, suggestion)
- Time since original order
- Service type

This data helps understand:

- Which services are most reordered
- How quickly users reorder
- Which reorder methods are most popular
