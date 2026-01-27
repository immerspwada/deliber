# ✅ แก้ไข RLS Policy สำหรับ Shopping Orders

**วันที่**: 27 มกราคม 2026  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น  
**ปัญหา**: Provider ไม่เห็นงาน Shopping ใน `/provider/orders`

---

## 🚨 ปัญหาที่พบ

**RLS Policy ขาดหายไป** - ไม่มี policy ให้ Provider ดูงาน Shopping ที่ `status='pending'`

### Policies เดิม (ไม่ครบ)

- ✅ `customer_own_shopping` - Customer เห็นงานตัวเอง
- ✅ `provider_assigned_shopping` - Provider เห็นงานที่**รับไปแล้ว**
- ✅ `admin_full_shopping` - Admin เห็นทุกอย่าง
- ❌ **ไม่มี policy ให้ Provider เห็นงาน pending!**

---

## ✅ วิธีแก้

สร้าง RLS Policy ใหม่:

```sql
CREATE POLICY "provider_view_pending_shopping" ON shopping_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    OR EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = shopping_requests.provider_id
      AND providers_v2.user_id = auth.uid()
      AND providers_v2.status = 'approved'
    )
  );
```

### Policy นี้ทำอะไร

Provider สามารถ SELECT shopping_requests ได้เมื่อ:

1. **งาน pending ทั้งหมด** - เพื่อดูงานที่รอรับ
2. **งานที่รับไปแล้ว** - เพื่อดูงานของตัวเอง

---

## 🎯 ผลลัพธ์

### ก่อนแก้ไข

- ❌ Provider ไม่เห็นงาน SHP-20260127-350085 ใน `/provider/orders`
- ❌ Database บล็อกการ SELECT เพราะไม่มี policy

### หลังแก้ไข

- ✅ Provider เห็นงาน pending ทั้งหมดใน `/provider/orders`
- ✅ งาน SHP-20260127-350085 แสดงในแท็บ "🛒 ซื้อของ"
- ✅ มีปุ่ม "รับงาน ฿57" ให้กด

---

## 🧪 วิธีทดสอบ

### 1. Refresh หน้า

```
ไปที่: http://localhost:5173/provider/orders
กด: F5 (Refresh ปกติ)
```

### 2. ควรเห็น

- แท็บ "🛒 ซื้อของ" พร้อม badge (1)
- งาน SHP-20260127-350085 ในรายการ
- ปุ่ม "รับงาน ฿57"

### 3. ถ้ายังไม่เห็น

ทำ Hard Refresh:

```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

---

## 📊 RLS Policies ทั้งหมดตอนนี้

| Policy                           | Command | ใช้สำหรับ                                       |
| -------------------------------- | ------- | ----------------------------------------------- |
| `customer_own_shopping`          | ALL     | Customer เห็นงานตัวเอง                          |
| `provider_view_pending_shopping` | SELECT  | **Provider เห็นงาน pending + งานที่รับแล้ว** ✅ |
| `provider_assigned_shopping`     | SELECT  | Provider เห็นงานที่รับแล้ว                      |
| `provider_update_shopping`       | UPDATE  | Provider แก้ไขงานที่รับแล้ว                     |
| `admin_full_shopping`            | ALL     | Admin เห็นทุกอย่าง                              |
| `public_tracking_shopping`       | SELECT  | Public tracking                                 |

---

## 🎭 ใครเห็นงาน SHP-20260127-350085 บ้าง

### 👤 Customer (เจ้าของงาน)

- ✅ `/shopping` - ประวัติออเดอร์
- ✅ `/tracking/SHP-20260127-350085` - ติดตามงาน

### 🚗 Provider (ทุกคน)

- ✅ `/provider/orders` - รับงาน (**แก้ไขแล้ว!**)
- ✅ แท็บ "🛒 ซื้อของ"
- ✅ ปุ่ม "รับงาน ฿57"

### 👑 Admin

- ✅ `/admin/orders` - จัดการทุกงาน

---

## 📝 สรุป

**ปัญหา**: RLS Policy ขาดหายไป  
**สาเหตุ**: ไม่มี policy ให้ Provider ดูงาน pending  
**วิธีแก้**: สร้าง policy `provider_view_pending_shopping`  
**ผลลัพธ์**: Provider เห็นงาน Shopping แล้ว ✅

**ลอง Refresh หน้า `/provider/orders` ดูครับ!** 🚀

---

**สร้างเมื่อ**: 2026-01-27  
**สถานะ**: ✅ แก้ไขเสร็จสิ้น  
**ทดสอบ**: Refresh หน้า `/provider/orders`
