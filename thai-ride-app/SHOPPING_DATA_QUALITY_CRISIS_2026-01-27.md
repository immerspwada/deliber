# 🚨 CRITICAL: Shopping Data Quality Crisis

**Date**: 2026-01-27  
**Status**: 🔥 PRODUCTION ISSUE  
**Priority**: 🚨 URGENT - Immediate Action Required

---

## 📊 Data Quality Audit Results

### Database Statistics (12 Total Orders)

```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN jsonb_array_length(items) = 0 THEN 1 END) as empty_items,
  COUNT(CASE WHEN store_name IS NULL THEN 1 END) as null_store,
  COUNT(CASE WHEN service_fee = 0 THEN 1 END) as zero_fee,
  COUNT(CASE WHEN LENGTH(delivery_address) < 10 THEN 1 END) as short_address
FROM shopping_requests;
```

**Results**:
| Metric | Count | Percentage | Severity |
|--------|-------|------------|----------|
| **Total Orders** | 12 | 100% | - |
| **Empty Items** | 7 | **58%** | 🔥 CRITICAL |
| **Null Store Name** | 4 | **33%** | 🔥 HIGH |
| **Zero Service Fee** | 0 | 0% | ✅ OK |
| **Short Address** | 5 | **42%** | ⚠️ MEDIUM |

---

## 🚨 Critical Issues

### Issue 1: Empty Items Array (58% of orders!)

**Problem**: 7 out of 12 orders have NO shopping items  
**Impact**: Provider doesn't know what to buy  
**Example**: Order SHP-20260127-474014 has `items: []`

**Why This Happens**:

1. Frontend validation not working
2. Customer can submit without adding items
3. No database constraint preventing empty arrays

**Fix Required**:

```typescript
// Frontend validation
if (items.value.length === 0) {
  showError('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ')
  return
}

// Database constraint
ALTER TABLE shopping_requests
ADD CONSTRAINT check_items_not_empty
CHECK (jsonb_array_length(items) > 0);
```

---

### Issue 2: Missing Store Name (33% of orders)

**Problem**: 4 out of 12 orders have `store_name: null`  
**Impact**: Provider doesn't know which store to go to  
**Example**: Order SHP-20260127-474014 has no store name

**Why This Happens**:

1. Store name field is optional in form
2. Customer can skip store selection
3. No database NOT NULL constraint

**Fix Required**:

```typescript
// Frontend validation
if (!storeName.value?.trim()) {
  showError('กรุณาระบุชื่อร้านค้า')
  return
}

// Database constraint
ALTER TABLE shopping_requests
ALTER COLUMN store_name SET NOT NULL;
```

---

### Issue 3: Incomplete Delivery Address (42% of orders)

**Problem**: 5 out of 12 orders have very short addresses  
**Impact**: Provider might not find delivery location  
**Example**: Order SHP-20260127-474014 has `delivery_address: "บ้าน"` (just "home")

**Why This Happens**:

1. Customer uses saved place with nickname only
2. Full address not expanded before saving
3. No minimum length validation

**Fix Required**:

```typescript
// Frontend validation
if (!deliveryAddress.value?.trim() || deliveryAddress.value.length < 10) {
  showError('กรุณาระบุที่อยู่จัดส่งแบบเต็ม')
  return
}

// Database constraint
ALTER TABLE shopping_requests
ADD CONSTRAINT check_address_length
CHECK (LENGTH(delivery_address) >= 10);
```

---

### Issue 4: Display Shows ฿0 (UI Bug)

**Problem**: UI shows ฿0 but database has correct value (฿57)  
**Impact**: Provider sees wrong fee, might reject job  
**Root Cause**: Frontend reading wrong field or type conversion issue

**Database Value**: ✅ Correct

```json
{
  "service_fee": "57.00" // DECIMAL type, stored as string
}
```

**Frontend Display**: ❌ Shows ฿0

**Possible Causes**:

```typescript
// ❌ Wrong field name
const fee = order.estimated_fee; // Shopping uses service_fee!

// ❌ Type conversion issue
const fee = order.service_fee; // "57.00" string might display as 0

// ✅ Correct way
const fee = parseFloat(order.service_fee) || 0;
```

---

## 🔧 Immediate Actions Required

### 1. Add Frontend Validation (HIGH PRIORITY)

**File**: `src/views/ShoppingView.vue`

```typescript
// Before submit
const validateShoppingOrder = () => {
  const errors = [];

  // Check items
  if (items.value.length === 0) {
    errors.push("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ");
  }

  // Check store name
  if (!storeName.value?.trim()) {
    errors.push("ต้องระบุชื่อร้านค้า");
  }

  // Check delivery address
  if (!deliveryAddress.value?.trim() || deliveryAddress.value.length < 10) {
    errors.push("ต้องระบุที่อยู่จัดส่งแบบเต็ม (อย่างน้อย 10 ตัวอักษร)");
  }

  // Check service fee
  if (!serviceFee.value || serviceFee.value <= 0) {
    errors.push("ค่าบริการต้องมากกว่า 0");
  }

  if (errors.length > 0) {
    showError(errors.join("\n"));
    return false;
  }

  return true;
};

// In submit function
async function submitOrder() {
  if (!validateShoppingOrder()) {
    return;
  }

  // Continue with submission...
}
```

---

### 2. Add Database Constraints (HIGH PRIORITY)

```sql
-- Prevent empty items array
ALTER TABLE shopping_requests
ADD CONSTRAINT check_items_not_empty
CHECK (jsonb_array_length(items) > 0);

-- Prevent null store_name
ALTER TABLE shopping_requests
ALTER COLUMN store_name SET NOT NULL;

-- Prevent short delivery address
ALTER TABLE shopping_requests
ADD CONSTRAINT check_address_length
CHECK (LENGTH(delivery_address) >= 10);

-- Prevent zero or negative service_fee
ALTER TABLE shopping_requests
ADD CONSTRAINT check_service_fee_positive
CHECK (service_fee > 0);
```

---

### 3. Fix Display Bug (HIGH PRIORITY)

**Check all locations that display Shopping orders**:

#### A. Provider Home (`src/views/provider/ProviderHome.vue`)

```typescript
// Line ~350 in loadActiveJob()
if (jobType === "shopping") {
  activeJob.value = {
    id: data.id,
    tracking_id: data.tracking_id,
    status: data.status as RideStatus,
    pickup_address: data.store_name || data.store_address || "ร้านค้า",
    destination_address: data.delivery_address || "ที่อยู่จัดส่ง",
    estimated_fare: parseFloat(data.service_fee) || 0, // ← FIX: Use service_fee
    customer_name: profile?.name || "ลูกค้า",
    created_at: data.created_at,
  };
}
```

#### B. Provider Orders (`src/views/provider/ProviderOrdersNew.vue`)

```typescript
// Check how Shopping orders are processed
// Should use service_fee not estimated_fee
const processedOrder = {
  ...order,
  fare: parseFloat(order.service_fee) || 0, // ← FIX
};
```

---

### 4. Clean Up Bad Data (MEDIUM PRIORITY)

```sql
-- Find all bad orders
SELECT
  tracking_id,
  CASE
    WHEN jsonb_array_length(items) = 0 THEN 'Empty items'
    WHEN store_name IS NULL THEN 'No store'
    WHEN LENGTH(delivery_address) < 10 THEN 'Short address'
    ELSE 'OK'
  END as issue
FROM shopping_requests
WHERE
  jsonb_array_length(items) = 0
  OR store_name IS NULL
  OR LENGTH(delivery_address) < 10;

-- Option 1: Cancel bad orders
UPDATE shopping_requests
SET status = 'cancelled'
WHERE jsonb_array_length(items) = 0;

-- Option 2: Contact customers to fix
-- (Manual process - send notification)
```

---

## 📋 Testing Checklist

### Before Deployment:

- [ ] Frontend validation prevents empty items
- [ ] Frontend validation requires store name
- [ ] Frontend validation requires full address
- [ ] Frontend validation requires positive service fee
- [ ] Database constraints added
- [ ] Display shows correct service fee (not ฿0)
- [ ] Test with valid order - should succeed
- [ ] Test with empty items - should fail
- [ ] Test with no store - should fail
- [ ] Test with short address - should fail

### After Deployment:

- [ ] Monitor new orders for data quality
- [ ] Check error logs for validation failures
- [ ] Verify no more empty items orders
- [ ] Verify all orders have store names
- [ ] Verify all orders have full addresses
- [ ] Verify service fee displays correctly

---

## 🎯 Success Metrics

### Current State (Bad):

- 58% orders have empty items
- 33% orders missing store name
- 42% orders have incomplete address
- UI shows ฿0 instead of actual fee

### Target State (Good):

- 0% orders with empty items
- 0% orders missing store name
- 0% orders with incomplete address
- UI shows correct fee 100% of time

---

## 💡 Prevention Strategy

### 1. Multi-Layer Validation

```
Layer 1: Frontend (User Experience)
├─ Real-time validation as user types
├─ Disable submit button until valid
└─ Clear error messages

Layer 2: Frontend Submit (Safety Net)
├─ Final validation before API call
├─ Show summary of what will be submitted
└─ Require confirmation

Layer 3: Database (Last Defense)
├─ NOT NULL constraints
├─ CHECK constraints
└─ Triggers for complex validation

Layer 4: Backend API (Optional)
├─ Edge function validation
├─ Zod schema validation
└─ Return clear error messages
```

### 2. User Education

```typescript
// Add helpful hints in UI
<div class="hint">
  💡 เคล็ดลับ: ระบุชื่อร้านและที่อยู่ให้ชัดเจน
  เพื่อให้ไรเดอร์หาได้ง่าย
</div>

// Show example
<div class="example">
  ตัวอย่าง: 7-Eleven สาขาถนนสุขุมวิท ซอย 21
</div>
```

### 3. Data Quality Monitoring

```sql
-- Daily data quality check
CREATE OR REPLACE FUNCTION check_shopping_data_quality()
RETURNS TABLE (
  metric TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Empty Items' as metric,
    COUNT(*) FILTER (WHERE jsonb_array_length(items) = 0),
    ROUND(COUNT(*) FILTER (WHERE jsonb_array_length(items) = 0) * 100.0 / COUNT(*), 2)
  FROM shopping_requests
  WHERE created_at >= CURRENT_DATE

  UNION ALL

  SELECT
    'Null Store',
    COUNT(*) FILTER (WHERE store_name IS NULL),
    ROUND(COUNT(*) FILTER (WHERE store_name IS NULL) * 100.0 / COUNT(*), 2)
  FROM shopping_requests
  WHERE created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Run daily
SELECT * FROM check_shopping_data_quality();
```

---

## 🚀 Implementation Plan

### Phase 1: Immediate (Today)

1. ✅ Document issues (this file)
2. ⏳ Add frontend validation
3. ⏳ Fix display bug (service_fee)
4. ⏳ Test thoroughly

### Phase 2: Short-term (This Week)

1. ⏳ Add database constraints
2. ⏳ Clean up bad data
3. ⏳ Deploy to production
4. ⏳ Monitor for 24 hours

### Phase 3: Long-term (This Month)

1. ⏳ Add backend validation
2. ⏳ Improve UX with hints
3. ⏳ Add data quality monitoring
4. ⏳ Create admin dashboard for data quality

---

## 📞 Impact Assessment

### Customer Impact:

- ❌ Bad experience - orders incomplete
- ❌ Confusion - what did I order?
- ❌ Frustration - provider can't fulfill

### Provider Impact:

- ❌ Can't fulfill orders (no items list)
- ❌ Don't know where to go (no store)
- ❌ Can't find delivery location (short address)
- ❌ See wrong fee (฿0 display bug)

### Business Impact:

- ❌ Order cancellations
- ❌ Provider complaints
- ❌ Customer complaints
- ❌ Revenue loss
- ❌ Reputation damage

---

## 🎯 Conclusion

**Severity**: 🔥 CRITICAL  
**Affected Orders**: 7 out of 12 (58%)  
**Root Cause**: Missing validation + No database constraints  
**Fix Time**: 2-4 hours  
**Priority**: URGENT - Fix today

**Next Steps**:

1. Add frontend validation immediately
2. Fix display bug (service_fee)
3. Test thoroughly
4. Deploy ASAP
5. Add database constraints
6. Monitor data quality

---

**Created**: 2026-01-27 15:30 UTC  
**Status**: 🚨 URGENT ACTION REQUIRED  
**Owner**: Development Team
