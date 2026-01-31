# 🎯 Promo System Unification - Complete Solution

**Date**: 2026-01-31  
**Status**: ✅ Solution Ready  
**Priority**: 🔥 CRITICAL - Data Consistency Issue

---

## 🔍 Problem Analysis

### Current State

**Two Separate Promotion Systems:**

1. **Admin System** (`promo_codes` table)
   - 15 total promos, 14 active
   - Managed via `src/admin/views/PromosView.vue`
   - Composable: `src/admin/composables/useAdminPromos.ts`
   - Schema: `code`, `discount_type`, `discount_value`, `service_types[]`, `category`, `valid_from`, `valid_until`

2. **Customer System** (`service_promotions` table)
   - 5 total promos, 5 active
   - Displayed in `src/views/CustomerServicesView.vue`
   - Composable: `src/composables/useServicePromotions.ts`
   - Schema: `service_id`, `title`, `discount_type`, `discount_value`, `start_date`, `end_date`

### The Problem

❌ **Admin creates promos in `promo_codes`** → Customer doesn't see them (queries `service_promotions`)  
❌ **Two different schemas** → Cannot sync easily  
❌ **Duplicate data management** → Maintenance nightmare

---

## ✅ Solution: Unify to `promo_codes`

### Why `promo_codes` is the Source of Truth

1. ✅ **More comprehensive schema**
   - Usage tracking (`used_count`, `usage_limit`, `per_user_limit`)
   - Campaign management (`campaign_id`, `created_by`)
   - User targeting (`user_type`, `min_rides`)
   - Multiple service types (`service_types[]` array)

2. ✅ **Already has business logic**
   - `validate_promo_code()` function
   - `use_promo_code()` function
   - Usage tracking in `user_promo_usage` table

3. ✅ **Admin actively manages it**
   - 15 active promos vs 5 in service_promotions
   - Full CRUD operations
   - Audit logging

4. ✅ **Better for scaling**
   - Can target specific user types
   - Can set minimum ride requirements
   - Can create campaigns

---

## 🔧 Implementation Plan

### Phase 1: Create Bridge RPC Function ✅

Create a new RPC function that transforms `promo_codes` data to match customer UI expectations:

```sql
CREATE OR REPLACE FUNCTION get_service_promotions_from_codes(
  p_service_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  service_id TEXT,
  title TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  min_order_amount NUMERIC,
  max_discount NUMERIC,
  promo_code TEXT,
  image_url TEXT,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    -- Map first service_type to service_id for compatibility
    CASE
      WHEN pc.service_types IS NOT NULL AND array_length(pc.service_types, 1) > 0
      THEN pc.service_types[1]
      ELSE 'all'
    END::TEXT as service_id,
    -- Use code as title if no description
    COALESCE(pc.description, pc.code) as title,
    pc.description,
    pc.discount_type,
    pc.discount_value,
    pc.min_order_amount,
    pc.max_discount,
    pc.code as promo_code,
    NULL::TEXT as image_url, -- promo_codes doesn't have images yet
    pc.valid_until as end_date
  FROM promo_codes pc
  WHERE pc.is_active = true
    AND pc.valid_from <= NOW()
    AND (pc.valid_until IS NULL OR pc.valid_until >= NOW())
    AND (pc.usage_limit IS NULL OR pc.used_count < pc.usage_limit)
    AND (
      p_service_id IS NULL
      OR p_service_id = 'all'
      OR pc.service_types IS NULL
      OR p_service_id = ANY(pc.service_types)
    )
  ORDER BY pc.valid_until ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_service_promotions_from_codes TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_promotions_from_codes TO anon;
```

### Phase 2: Update Customer Composable ✅

Update `src/composables/useServicePromotions.ts` to use the new function:

```typescript
async function fetchPromotions(serviceId?: string) {
  loading.value = true;
  error.value = null;

  try {
    // Use new unified RPC function
    const { data, error: fetchError } = await supabase.rpc(
      "get_service_promotions_from_codes",
      {
        p_service_id: serviceId || null,
      },
    );

    if (fetchError) {
      console.error("[ServicePromotions] RPC error:", fetchError);
      throw fetchError;
    }

    promotions.value = (data || []) as ServicePromotion[];
  } catch (err) {
    console.error("Error fetching promotions:", err);
    error.value = "ไม่สามารถโหลดโปรโมชั่นได้";
    promotions.value = [];
  } finally {
    loading.value = false;
  }
}
```

### Phase 3: Deprecate `service_promotions` Table (Future)

After verifying the new system works:

1. ✅ Keep table for backward compatibility (don't drop yet)
2. ✅ Stop inserting new data into it
3. ✅ Add deprecation notice in migration
4. ✅ Plan removal in future version

---

## 📊 Data Mapping

### Schema Comparison

| Customer UI Expects | `promo_codes` Has      | Mapping                          |
| ------------------- | ---------------------- | -------------------------------- |
| `service_id`        | `service_types[]`      | Use first element or 'all'       |
| `title`             | `code` + `description` | Use description or code          |
| `description`       | `description`          | Direct mapping                   |
| `discount_type`     | `discount_type`        | Direct mapping                   |
| `discount_value`    | `discount_value`       | Direct mapping                   |
| `min_order_amount`  | `min_order_amount`     | Direct mapping                   |
| `max_discount`      | `max_discount`         | Direct mapping                   |
| `promo_code`        | `code`                 | Direct mapping                   |
| `image_url`         | ❌ Not available       | Return NULL (future enhancement) |
| `end_date`          | `valid_until`          | Direct mapping                   |

### Example Data Transformation

**Input** (`promo_codes`):

```json
{
  "id": "1a93f448-1bdc-49f3-8de2-503a38742cef",
  "code": "FIRST50",
  "description": "ส่วนลดสำหรับผู้ใช้ใหม่",
  "discount_type": "fixed",
  "discount_value": 50.0,
  "min_order_amount": 0.0,
  "max_discount": null,
  "service_types": ["ride", "delivery", "shopping"],
  "valid_until": "2026-12-15T04:23:52.275Z"
}
```

**Output** (Customer UI format):

```json
{
  "id": "1a93f448-1bdc-49f3-8de2-503a38742cef",
  "service_id": "ride",
  "title": "ส่วนลดสำหรับผู้ใช้ใหม่",
  "description": "ส่วนลดสำหรับผู้ใช้ใหม่",
  "discount_type": "fixed",
  "discount_value": 50.0,
  "min_order_amount": 0.0,
  "max_discount": null,
  "promo_code": "FIRST50",
  "image_url": null,
  "end_date": "2026-12-15T04:23:52.275Z"
}
```

---

## 🧪 Testing Plan

### 1. Database Function Test

```sql
-- Test: Get all promotions
SELECT * FROM get_service_promotions_from_codes(NULL);

-- Test: Get ride promotions only
SELECT * FROM get_service_promotions_from_codes('ride');

-- Test: Get delivery promotions only
SELECT * FROM get_service_promotions_from_codes('delivery');

-- Test: Verify active promos only
SELECT COUNT(*) FROM get_service_promotions_from_codes(NULL);
-- Should return 14 (active promos from promo_codes)
```

### 2. Frontend Integration Test

```typescript
// Test in browser console
const { fetchPromotions, promotions } = useServicePromotions();

// Fetch all promotions
await fetchPromotions();
console.log("All promotions:", promotions.value);

// Fetch ride promotions
await fetchPromotions("ride");
console.log("Ride promotions:", promotions.value);

// Verify data structure
console.log("First promo:", promotions.value[0]);
// Should have: id, service_id, title, description, discount_type, etc.
```

### 3. UI Display Test

1. ✅ Open `/customer/services`
2. ✅ Scroll to "โปรโมชั่นพิเศษ" section
3. ✅ Verify 14 promotions display (not 5)
4. ✅ Verify each promo shows:
   - Title/Description
   - Discount badge (e.g., "ลด 20%", "ลด ฿50")
   - Time remaining
5. ✅ Click on a promo → Should show details

### 4. Admin-to-Customer Flow Test

1. ✅ Admin creates new promo in `/admin/promos`
2. ✅ Set service type to "ride"
3. ✅ Set active = true
4. ✅ Save promo
5. ✅ Open `/customer/services` in another tab
6. ✅ Refresh page
7. ✅ Verify new promo appears in "โปรโมชั่นพิเศษ" section

---

## 🚀 Deployment Steps

### Step 1: Create Bridge Function

```bash
# Execute SQL on production
```

### Step 2: Update Customer Composable

```bash
# Update src/composables/useServicePromotions.ts
```

### Step 3: Test in Development

```bash
npm run dev
# Open http://localhost:5173/customer/services
# Verify promotions display correctly
```

### Step 4: Deploy to Production

```bash
git add .
git commit -m "fix: unify promo system to use promo_codes as source of truth"
git push origin main
# Vercel auto-deploys
```

### Step 5: Verify in Production

```bash
# Open production URL
# Test admin → customer flow
# Monitor for errors
```

---

## 📈 Benefits

### Immediate Benefits

1. ✅ **Data Consistency**: Admin promos immediately visible to customers
2. ✅ **Single Source of Truth**: No more duplicate data management
3. ✅ **Better Features**: Usage tracking, user targeting, campaigns
4. ✅ **Easier Maintenance**: One table to manage

### Future Enhancements

1. 🔮 **Add `image_url` to `promo_codes`**: Visual promo banners
2. 🔮 **Service-specific targeting**: Better filtering by service type
3. 🔮 **A/B Testing**: Campaign performance tracking
4. 🔮 **Personalized Promos**: Based on user behavior

---

## 🔒 Security Considerations

### RLS Policies

✅ **Current**: `promo_codes` has permissive RLS (allow all)  
✅ **New Function**: Uses `SECURITY DEFINER` - safe for public access  
✅ **Data Exposure**: Only active, valid promos are returned

### Performance

✅ **Indexed**: `promo_codes` has indexes on `is_active`, `valid_from`, `valid_until`  
✅ **Efficient Query**: Uses WHERE filters before returning data  
✅ **Caching**: Customer composable can cache results (5 min TTL)

---

## 📝 Migration Notes

### Backward Compatibility

✅ **Keep `service_promotions` table**: Don't drop yet  
✅ **Keep old RPC function**: `get_service_promotions()` still works  
✅ **Gradual migration**: New function name prevents conflicts

### Rollback Plan

If issues occur:

1. Revert customer composable to use old function
2. Keep both systems running temporarily
3. Investigate and fix issues
4. Re-deploy unified system

---

## ✅ Success Criteria

- [ ] Bridge RPC function created and tested
- [ ] Customer composable updated
- [ ] 14 active promos display on customer services page (not 5)
- [ ] Admin creates promo → Customer sees it immediately
- [ ] No console errors
- [ ] Performance acceptable (< 500ms load time)
- [ ] TypeScript types updated
- [ ] Documentation updated

---

## 🎯 Next Steps

1. ✅ Create bridge RPC function in production
2. ✅ Update customer composable
3. ✅ Test locally
4. ✅ Deploy to production
5. ✅ Verify admin-to-customer flow
6. ✅ Monitor for 24 hours
7. ✅ Mark `service_promotions` as deprecated
8. 🔮 Plan future enhancements (images, better targeting)

---

**Status**: Ready to implement  
**Estimated Time**: 15 minutes  
**Risk Level**: Low (backward compatible)
