# 🐛 Shopping Service Fee Shows ฿0 Bug

**Date**: 2026-01-27  
**Status**: 🚨 CRITICAL BUG  
**Priority**: 🔥 HIGH - Data Integrity Issue

---

## 🔍 Problem Report

**User Report**: งาน SHP-20260127-474014 แสดงค่าบริการ ฿0 แต่ในฐานข้อมูลเป็น ฿57

---

## 📊 Database Investigation

### Query Result

```sql
SELECT id, tracking_id, status, service_fee, store_name, store_address,
       delivery_address, items, created_at
FROM shopping_requests
WHERE tracking_id = 'SHP-20260127-474014';
```

**Result**:

```json
{
  "id": "c443459f-621f-4705-9985-b9a4a76e1793",
  "tracking_id": "SHP-20260127-474014",
  "status": "pending",
  "service_fee": "57.00",  ← ✅ Database has correct value
  "store_name": null,      ← ⚠️ Missing store name
  "store_address": "ชุมชนหลังด่าน, สุไหงโก-ลก...",
  "delivery_address": "บ้าน",  ← ⚠️ Incomplete address
  "items": [],             ← 🚨 CRITICAL: Empty items array!
  "created_at": "2026-01-27 07:09:25",
  "user_id": "bc1a3546-ee13-47d6-804a-6be9055509b4"
}
```

---

## 🚨 Issues Found

### Issue 1: Frontend Display Bug (Critical)

**Problem**: UI shows ฿0 but database has ฿57  
**Cause**: Frontend might be reading wrong field or not handling DECIMAL type correctly  
**Impact**: Provider sees wrong fee, might reject job

### Issue 2: Empty Items Array (Critical)

**Problem**: `items: []` - No shopping items!  
**Cause**: Customer didn't add any items OR frontend didn't save items  
**Impact**: Provider doesn't know what to buy

### Issue 3: Missing Store Name (High)

**Problem**: `store_name: null`  
**Cause**: Customer didn't select store OR frontend didn't save store name  
**Impact**: Provider doesn't know which store to go to

### Issue 4: Incomplete Delivery Address (Medium)

**Problem**: `delivery_address: "บ้าน"` (just "home")  
**Cause**: Customer used saved place but full address not saved  
**Impact**: Provider might not find delivery location

---

## 🔬 Root Cause Analysis

### 1. Frontend Display Issue

**Possible causes**:

#### A. Wrong Field Name

```typescript
// ❌ BAD - Reading wrong field
const fee = order.estimated_fee; // Shopping uses service_fee!

// ✅ GOOD
const fee = order.service_fee;
```

#### B. Type Conversion Issue

```typescript
// ❌ BAD - DECIMAL becomes string, shows as 0
const fee = Number(order.service_fee); // "57.00" → 57 ✅
const fee = parseInt(order.service_fee); // "57.00" → 57 ✅
const fee = order.service_fee; // "57.00" string ❌ might display as 0

// ✅ GOOD
const fee = parseFloat(order.service_fee) || 0;
```

#### C. Null/Undefined Handling

```typescript
// ❌ BAD
const fee = order.service_fee ?? 0; // If null, shows 0

// ✅ GOOD - Check if actually 0 or just missing
const fee = order.service_fee ? parseFloat(order.service_fee) : null;
```

### 2. Empty Items Array

**This is the REAL problem** - Customer created order without items!

**Possible causes**:

- Frontend validation not working
- Customer bypassed validation
- Items not saved to database
- Race condition in form submission

---

## 🔍 Let's Check the Shopping View Code

Need to check:

1. `src/views/ShoppingView.vue` - Order submission
2. `src/composables/useShopping.ts` - Shopping logic
3. How `service_fee` is calculated and displayed

---

## 🎯 Expected vs Actual

### Expected Behavior:

```json
{
  "service_fee": "57.00",
  "store_name": "7-Eleven สาขา...",
  "store_address": "ชุมชนหลังด่าน...",
  "delivery_address": "123 ถนน... ตำบล... อำเภอ... จังหวัด...",
  "items": [
    {
      "name": "น้ำดื่ม",
      "quantity": 2,
      "price": 10,
      "notes": ""
    }
  ]
}
```

### Actual Behavior:

```json
{
  "service_fee": "57.00",  ← ✅ Correct in DB
  "store_name": null,      ← ❌ Missing
  "store_address": "...",  ← ✅ Has address
  "delivery_address": "บ้าน",  ← ⚠️ Too short
  "items": []              ← 🚨 EMPTY!
}
```

---

## 🔧 Investigation Steps

### Step 1: Check Frontend Display

Need to check where ฿0 is displayed:

- Provider Home
- Provider Orders page
- Tracking page
- Admin page

### Step 2: Check Shopping Submission

Need to verify:

- Items validation before submit
- Store name saved correctly
- Service fee calculation
- Address validation

### Step 3: Check Database Constraints

```sql
-- Check if items can be empty
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'shopping_requests'
AND column_name IN ('items', 'service_fee', 'store_name');
```

---

## 🚨 Immediate Actions Required

### 1. Fix Frontend Display (High Priority)

Check all places that display Shopping orders:

**Provider Home** (`src/views/provider/ProviderHome.vue`):

```typescript
// Line ~350 - loadActiveJob()
if (jobType === 'shopping') {
  activeJob.value = {
    ...
    estimated_fare: data.service_fee,  // ← Check this line
  }
}
```

**Provider Orders** (`src/views/provider/ProviderOrdersNew.vue`):

```typescript
// Check how Shopping orders are displayed
// Should use service_fee not estimated_fee
```

### 2. Add Items Validation (Critical)

**Shopping View** (`src/views/ShoppingView.vue`):

```typescript
// Before submit
if (items.value.length === 0) {
  showError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
  return;
}

if (!storeName.value) {
  showError("กรุณาระบุชื่อร้านค้า");
  return;
}
```

### 3. Add Database Constraints

```sql
-- Prevent empty items array
ALTER TABLE shopping_requests
ADD CONSTRAINT check_items_not_empty
CHECK (jsonb_array_length(items) > 0);

-- Prevent null store_name
ALTER TABLE shopping_requests
ALTER COLUMN store_name SET NOT NULL;

-- Prevent zero service_fee
ALTER TABLE shopping_requests
ADD CONSTRAINT check_service_fee_positive
CHECK (service_fee > 0);
```

---

## 📝 Testing Checklist

### Test Case 1: Display Service Fee

- [ ] Provider Home shows correct fee (฿57 not ฿0)
- [ ] Provider Orders shows correct fee
- [ ] Tracking page shows correct fee
- [ ] Admin page shows correct fee

### Test Case 2: Items Validation

- [ ] Cannot submit with empty items
- [ ] Cannot submit without store name
- [ ] Cannot submit with incomplete address
- [ ] Shows clear error messages

### Test Case 3: Data Integrity

- [ ] service_fee always > 0
- [ ] items array never empty
- [ ] store_name never null
- [ ] delivery_address has full details

---

## 🎯 Next Steps

1. **Immediate**: Check `src/views/provider/ProviderHome.vue` line ~350
2. **Immediate**: Check `src/views/ShoppingView.vue` validation
3. **High**: Add database constraints
4. **High**: Fix all display locations
5. **Medium**: Add better error messages
6. **Low**: Add data migration to fix existing bad records

---

## 💡 Prevention Strategy

### Frontend Validation

```typescript
// Shopping form validation
const validateShoppingOrder = () => {
  const errors = [];

  if (items.value.length === 0) {
    errors.push("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ");
  }

  if (!storeName.value?.trim()) {
    errors.push("ต้องระบุชื่อร้านค้า");
  }

  if (!deliveryAddress.value?.trim() || deliveryAddress.value === "บ้าน") {
    errors.push("ต้องระบุที่อยู่จัดส่งแบบเต็ม");
  }

  if (serviceFee.value <= 0) {
    errors.push("ค่าบริการต้องมากกว่า 0");
  }

  return errors;
};
```

### Database Constraints

```sql
-- Add all constraints
ALTER TABLE shopping_requests
ADD CONSTRAINT check_items_not_empty
  CHECK (jsonb_array_length(items) > 0),
ADD CONSTRAINT check_service_fee_positive
  CHECK (service_fee > 0),
ALTER COLUMN store_name SET NOT NULL;
```

### Backend Validation

```typescript
// Edge function validation
if (!items || items.length === 0) {
  return Response.json(
    { error: "Items array cannot be empty" },
    { status: 400 },
  );
}
```

---

## 📊 Impact Assessment

| Issue              | Severity | Impact                            | Users Affected |
| ------------------ | -------- | --------------------------------- | -------------- |
| Display shows ฿0   | High     | Provider sees wrong fee           | All providers  |
| Empty items array  | Critical | Provider doesn't know what to buy | This order     |
| Missing store name | High     | Provider doesn't know where to go | This order     |
| Incomplete address | Medium   | Provider might not find location  | This order     |

---

## 🔒 Data Quality Check

Let's check how many orders have similar issues:

```sql
-- Orders with empty items
SELECT COUNT(*) as empty_items_count
FROM shopping_requests
WHERE jsonb_array_length(items) = 0;

-- Orders with null store_name
SELECT COUNT(*) as null_store_count
FROM shopping_requests
WHERE store_name IS NULL;

-- Orders with service_fee = 0
SELECT COUNT(*) as zero_fee_count
FROM shopping_requests
WHERE service_fee = 0;

-- Orders with short delivery address
SELECT COUNT(*) as short_address_count
FROM shopping_requests
WHERE LENGTH(delivery_address) < 10;
```

---

**Status**: 🚨 Bug confirmed - Multiple data quality issues  
**Action Required**: Fix frontend display + Add validation + Add constraints  
**Priority**: HIGH - Affects provider experience and order fulfillment
