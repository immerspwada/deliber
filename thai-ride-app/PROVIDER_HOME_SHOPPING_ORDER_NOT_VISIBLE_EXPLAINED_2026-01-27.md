# 🔍 Provider Home - Shopping Order Not Visible (Explained)

**Date**: 2026-01-27  
**Issue**: Provider ไม่เห็นงาน SHP-20260127-350085 ในหน้า Provider Home  
**Status**: ✅ Working as Designed (Not a Bug)

---

## 🎯 สรุปปัญหา

User รายงานว่า Provider ไม่เห็นงาน Shopping หมายเลข **SHP-20260127-350085** ในหน้า Provider Home

---

## 🔍 การตรวจสอบ Database

### Order Details

```sql
SELECT id, tracking_id, status, provider_id, user_id, store_name, items, service_fee
FROM shopping_requests
WHERE tracking_id = 'SHP-20260127-350085'
```

**ผลลัพธ์:**

```json
{
  "id": "2f35bf57-0c7c-4a99-a27d-2926595b9dcd",
  "tracking_id": "SHP-20260127-350085",
  "status": "pending",
  "provider_id": null,
  "user_id": "bc1a3546-ee13-47d6-804a-6be9055509b4",
  "store_name": null,
  "items": [],
  "service_fee": "57.00",
  "created_at": "2026-01-27 08:01:18.564884+00"
}
```

### 🚨 Key Findings

1. **status**: `pending` - ยังไม่ได้มอบหมายให้ Provider
2. **provider_id**: `null` - ยังไม่มี Provider รับงาน
3. **items**: `[]` - ไม่มีรายการสินค้า (Data Quality Issue)
4. **store_name**: `null` - ไม่มีชื่อร้าน

---

## ✅ Provider Home Logic Analysis

### 1. Active Job Display (`loadActiveJob()`)

```typescript
// ดึงเฉพาะงานที่มี provider_id และกำลังทำงาน
supabase
  .from("shopping_requests")
  .select("...")
  .eq("provider_id", provId) // ✅ ต้องมี provider_id
  .in("status", ["matched", "shopping", "delivering"]); // ✅ ไม่รวม 'pending'
```

**เหตุผล:**

- งาน `pending` = ยังไม่ได้รับงาน
- งานที่แสดงใน "Active Job Card" ต้องเป็นงานที่ Provider รับแล้ว

### 2. Available Orders Count (`loadAvailableOrders()`)

```typescript
// นับงาน pending ทั้งหมด (รวม shopping)
supabase
  .from("shopping_requests")
  .select("id", { count: "exact", head: true })
  .eq("status", "pending"); // ✅ รวมงานนี้
```

**ผลลัพธ์:**

- งาน SHP-20260127-350085 **จะถูกนับ** ในตัวเลข "งานที่พร้อมรับ"

### 3. Realtime Subscription

```typescript
// ฟังการเปลี่ยนแปลงของ shopping_requests
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'shopping_requests',
  filter: 'status=eq.pending'
}, (payload) => {
  console.log('[ProviderHome] 🛒 New shopping order received:', payload.new)
  loadAvailableOrders()  // ✅ อัพเดทตัวนับ
})
```

---

## 📊 Where This Order Appears

### ✅ จะแสดงใน:

1. **หน้า "งานที่พร้อมรับ"** (`/provider/orders`)
   - แสดงงาน `pending` ทั้งหมด
   - Provider สามารถรับงานได้

2. **ตัวนับ "งานที่พร้อมรับ"** (Provider Home)
   - แสดงจำนวนงาน `pending` ทั้งหมด
   - รวมงาน Shopping นี้

### ❌ จะไม่แสดงใน:

1. **"งานที่กำลังทำ" (Active Job Card)** (Provider Home)
   - เพราะ `provider_id = null`
   - เพราะ `status = 'pending'` (ยังไม่ได้รับงาน)

---

## 🎯 วิธีแก้ปัญหา

### สำหรับ Provider:

1. ไปที่หน้า **"งานที่พร้อมรับ"** (`/provider/orders`)
2. หางาน **SHP-20260127-350085** ในรายการ
3. กดปุ่ม **"รับงาน"**
4. ระบบจะ:
   - Update `provider_id` = Provider ID
   - เปลี่ยน `status` = `'matched'`
5. งานจะแสดงในหน้า Home ที่ **"งานที่กำลังทำ"**

### สำหรับ System:

งานนี้มี **Data Quality Issues**:

- ❌ `items = []` - ไม่มีรายการสินค้า
- ❌ `store_name = null` - ไม่มีชื่อร้าน

**แนะนำ:**

- เพิ่ม validation ตอนสร้างงาน
- ห้ามสร้างงาน Shopping ที่ไม่มี items
- ห้ามสร้างงานที่ไม่มี store_name

---

## 🔄 Order Lifecycle

```
1. Customer สร้างงาน
   ↓
   status: 'pending'
   provider_id: null
   ✅ แสดงใน: Available Orders
   ❌ ไม่แสดงใน: Active Job

2. Provider รับงาน
   ↓
   status: 'matched'
   provider_id: <provider_id>
   ✅ แสดงใน: Active Job
   ❌ ไม่แสดงใน: Available Orders

3. Provider ไปซื้อของ
   ↓
   status: 'shopping'
   ✅ แสดงใน: Active Job

4. Provider จัดส่ง
   ↓
   status: 'delivering'
   ✅ แสดงใน: Active Job

5. เสร็จสิ้น
   ↓
   status: 'completed'
   ❌ ไม่แสดงใน: Active Job
   ✅ แสดงใน: History
```

---

## 📝 Code References

### Provider Home Query Logic

**File**: `src/views/provider/ProviderHome.vue`

**Active Job Query** (lines ~250-280):

```typescript
async function loadActiveJob(provId: string) {
  // Check shopping_requests
  supabase
    .from("shopping_requests")
    .select("...")
    .eq("provider_id", provId) // ✅ Must have provider_id
    .in("status", ["matched", "shopping", "delivering"]) // ✅ Not 'pending'
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}
```

**Available Orders Query** (lines ~450-480):

```typescript
async function loadAvailableOrders() {
  const shoppingResult = await supabase
    .from("shopping_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending"); // ✅ Includes this order
}
```

---

## ✅ Conclusion

**This is NOT a bug** - The system is working as designed:

1. ✅ Order SHP-20260127-350085 exists in database
2. ✅ Order has `status = 'pending'` (not assigned yet)
3. ✅ Order has `provider_id = null` (no provider yet)
4. ✅ Provider Home correctly shows only assigned jobs in "Active Job"
5. ✅ Provider Home correctly counts this order in "Available Orders"
6. ✅ Provider can see and accept this order in `/provider/orders`

**Action Required:**

- Provider needs to go to "งานที่พร้อมรับ" page and accept the order
- After accepting, the order will appear in "งานที่กำลังทำ" on Home page

**Data Quality Issue:**

- Order has empty `items` array
- Order has `null` store_name
- Should add validation to prevent creating orders without required data

---

## 🔗 Related Documentation

- `PROVIDER_HOME_SHOPPING_VISIBILITY_FIX_2026-01-27.md` - Previous shopping visibility fixes
- `PROVIDER_HOME_REALTIME_SHOPPING_FIX_2026-01-27.md` - Realtime subscription for shopping
- `SHOPPING_DATA_QUALITY_CRISIS_2026-01-27.md` - Data quality issues (58% empty items)
- `PROVIDER_HOME_BROWSER_CACHE_SOLUTION_2026-01-27.md` - Browser cache issues

---

**Created**: 2026-01-27  
**Status**: ✅ Explained - Working as Designed  
**Next Action**: Provider needs to accept order from Available Orders page
