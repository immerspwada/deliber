# ✅ แก้ไขปัญหายอดเงินแสดง ฿0.00 ในหน้าจองคิว

**วันที่**: 2026-01-26  
**ปัญหา**: หน้าจองคิวแสดงยอดเงิน ฿0.00 แม้ว่าในฐานข้อมูลมียอดเงิน  
**สาเหตุ**: Vue 3 Reactivity สูญหายจากการ destructure  
**สถานะ**: ✅ แก้ไขแล้ว

---

## 🎯 สรุปปัญหา

### อาการที่พบ

- ✅ หน้า Wallet (`/customer/wallet`) แสดงยอดเงินถูกต้อง: **฿929**
- ❌ หน้าจองคิว (`/customer/queue-booking`) แสดงยอดเงินผิด: **฿0.00**

### สาเหตุ

โค้ดเดิมใช้การ **destructure** ใน composable ซึ่งทำให้ Vue 3 reactivity ขาดหาย:

```typescript
// ❌ โค้ดเดิม (ผิด)
const { balance, formattedBalance } = useWalletBalance();
// balance และ formattedBalance ไม่ update เมื่อข้อมูลเปลี่ยน
```

---

## ✅ วิธีแก้ไข

เปลี่ยนจากการ destructure เป็นการเก็บ composable ทั้งหมด:

```typescript
// ✅ โค้ดใหม่ (ถูกต้อง)
const walletBalance = useWalletBalance();
// walletBalance.balance และ walletBalance.formattedBalance จะ update ตลอด
```

---

## 📝 ไฟล์ที่แก้ไข

1. **`src/composables/useQueueBooking.ts`**
   - เปลี่ยนจาก destructure เป็น return composable ทั้งหมด
   - อัพเดทการใช้งานภายในให้ใช้ `walletBalance.balance.value`

2. **`src/views/QueueBookingView.vue`**
   - อัพเดท template ให้ใช้ `walletBalance.balance.value`
   - อัพเดท template ให้ใช้ `walletBalance.formattedBalance.value`

---

## 🧪 วิธีทดสอบ

### 1. Clear Cache และ Reload

กด `Ctrl+Shift+R` (Windows) หรือ `Cmd+Shift+R` (Mac)

หรือรันใน Console:

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. เข้าหน้าจองคิว

```
http://localhost:5173/customer/queue-booking
```

### 3. ตรวจสอบ Console

เปิด Console (F12) ควรเห็น logs:

```
🚀 [useWalletBalance] Composable initialized
🔍 [useWalletBalance] Fetching wallet balance
📦 [useWalletBalance] Raw wallet_balance from DB: 929.00
✅ [useWalletBalance] Parsed string to number: 929
💰 [useWalletBalance] Final balance value: 929
💰 Balance changed in QueueBookingView: 929
```

### 4. ตรวจสอบหน้าจอ

ควรเห็น:

- ✅ ยอดเงิน: **฿929.00** (ไม่ใช่ ฿0.00)
- ✅ การ์ดสีเขียว (ถ้ายอดเงิน ≥ ฿50)
- ✅ ข้อความ: "ยอดเงินเพียงพอสำหรับการจองคิว"
- ✅ ปุ่มยืนยันใช้งานได้

---

## 🔍 ถ้ายังแสดง ฿0.00 อยู่

### วิธีตรวจสอบ

รัน script นี้ใน Console:

```javascript
// Copy-paste ทั้งหมดลงใน Console
async function checkBalance() {
  console.group("🔍 ตรวจสอบยอดเงิน");

  // 1. ตรวจสอบ Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("1️⃣ User:", user?.email);
  console.log("   User ID:", user?.id);

  // 2. ตรวจสอบ Database
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();
    console.log("2️⃣ Database Balance:", data?.wallet_balance);
  }

  // 3. ตรวจสอบหน้าจอ
  const display = document.querySelector(".wallet-value")?.textContent;
  console.log("3️⃣ Display:", display);

  console.groupEnd();
}

checkBalance();
```

### วิธีแก้เพิ่มเติม

1. **ลอง Login ใหม่**
   - Logout
   - Clear cache
   - Login อีกครั้ง

2. **ลองเบราว์เซอร์อื่น**
   - ทดสอบใน Incognito mode
   - ทดสอบใน Chrome/Firefox/Safari

3. **ตรวจสอบ Network**
   - เปิด DevTools → Network tab
   - Filter: "users"
   - ดู response ว่ามี wallet_balance หรือไม่

---

## 📊 Checklist

- [ ] Clear cache แล้ว
- [ ] Reload หน้าเว็บแล้ว
- [ ] เห็น logs ใน Console
- [ ] ยอดเงินแสดงถูกต้อง (ไม่ใช่ ฿0.00)
- [ ] การ์ดมีสีถูกต้อง (เขียว/แดง)
- [ ] ปุ่มยืนยันทำงานถูกต้อง
- [ ] สามารถจองคิวได้

---

## 💡 สิ่งที่ได้เรียนรู้

### Vue 3 Reactivity

- ❌ **อย่า** destructure composable ที่ซ้อนกัน
- ✅ **ควร** return composable ทั้งหมด
- ✅ **ควร** ใช้ `.value` เมื่อเข้าถึง nested refs

### ตัวอย่าง

```typescript
// ❌ ผิด - Reactivity หาย
const { value } = useComposable();

// ✅ ถูก - Reactivity ยังอยู่
const composable = useComposable();
// ใช้เป็น composable.value
```

---

## 🚀 การ Deploy

### ก่อน Deploy

- [x] แก้โค้ดแล้ว
- [x] เพิ่ม logs สำหรับ debug
- [x] อัพเดท template
- [x] สร้าง documentation
- [ ] ทดสอบใน development
- [ ] ทดสอบใน staging
- [ ] พร้อม deploy production

### คำสั่ง Deploy

```bash
# Build
npm run build

# Deploy
git add .
git commit -m "fix: wallet balance reactivity in queue booking"
git push origin main
```

---

## 📞 ติดต่อ

ถ้ายังมีปัญหา:

1. แชร์ Console logs
2. แชร์ screenshot หน้าจอ
3. แชร์ผลจาก diagnostic script
4. แจ้งเบราว์เซอร์ที่ใช้

---

**สร้างเมื่อ**: 2026-01-26  
**แก้ไขโดย**: Reactivity pattern correction  
**สถานะ**: ✅ พร้อมทดสอบ
