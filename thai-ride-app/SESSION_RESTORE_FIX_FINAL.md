# Session Restore Fix - Final Solution

## 🎯 **ปัญหาที่แก้ไข**

**ปัญหา:** เมื่อรีเฟรชหน้า `/customer` ระบบส่งกลับไปที่ `/login` ทุกครั้ง

**สาเหตุหลัก:**

1. Router guard ตรวจสอบ authentication ก่อนที่ auth store จะ restore session เสร็จ
2. Supabase session restore ใช้เวลานานกว่าที่ router guard รอ
3. การตรวจสอบ `isAuthenticated` เข้มงวดเกินไป

## 🔧 **การแก้ไขที่ทำ**

### **1. ปรับปรุง Router Guard Logic**

```typescript
// เพิ่มการ force initialization
if (!authStore.user && !authStore.session && !authStore.isDemoMode) {
  console.log("[Router] Auth not initialized, forcing initialization...");
  await authStore.initialize();
}

// ปรับปรุงการรอ auth initialization
const isReady =
  !authStore.loading ||
  authStore.session ||
  authStore.isDemoMode ||
  authStore.user;
```

### **2. เพิ่มการตรวจสอบ Authentication แบบครอบคลุม**

```typescript
// ตรวจสอบหลายเงื่อนไข
const hasValidSession = !!authStore.session;
const hasUser = !!authStore.user;
const isDemoMode = authStore.isDemoMode;

// Fallback: ตรวจสอบ Supabase token ใน localStorage
const hasSupabaseToken = (() => {
  const keys = Object.keys(localStorage);
  return keys.some((key) => {
    if (key.includes("supabase") || key.includes("sb-")) {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        return !!(parsed.access_token || parsed.session?.access_token);
      }
    }
    return false;
  });
})();

// ถือว่า authenticated ถ้ามีเงื่อนไขใดเงื่อนไขหนึ่งเป็นจริง
const isUserAuthenticated =
  hasValidSession || hasUser || isDemoMode || hasSupabaseToken;
```

### **3. เพิ่ม Debug Logs**

```typescript
console.log("[Router] Auth check details:", {
  hasValidSession,
  hasUser,
  isDemoMode,
  isAuthenticatedComputed,
  hasSupabaseToken,
  route: to.path,
});
```

### **4. ปรับปรุง Auth Store Initialization**

```typescript
// เพิ่ม debug logs และ error handling
console.log("[Auth] Starting initialization...");
console.log("[Auth] Getting session from Supabase...");
console.log("[Auth] Session result:", { hasSession: !!result?.data?.session });
```

## 🧪 **วิธีทดสอบ**

### **ขั้นตอนที่ 1: ทดสอบพื้นฐาน**

1. เปิด `http://localhost:5173/login`
2. ล็อกอินเข้าระบบ
3. ไปที่ `http://localhost:5173/customer`
4. กด **F5** รีเฟรช
5. **ตรวจสอบ:** ควรอยู่ที่ `/customer` ไม่ใช่ `/login`

### **ขั้นตอนที่ 2: Debug ใน Console**

เปิด Browser Console (F12) และวางโค้ดนี้:

```javascript
// Quick debug
console.log("🔍 Session Debug");
console.log("URL:", window.location.href);
console.log(
  "localStorage keys:",
  Object.keys(localStorage).filter((k) => k.includes("supabase"))
);

// ตรวจสอบ Supabase session
if (window.supabase) {
  window.supabase.auth.getSession().then(({ data, error }) => {
    console.log("Supabase session:", {
      hasSession: !!data.session,
      userId: data.session?.user?.id,
      error: error?.message,
    });
  });
}
```

### **ขั้นตอนที่ 3: ทดสอบหลายครั้ง**

1. รีเฟรชหลายๆ ครั้ง (5-10 ครั้ง)
2. ลองเปิดหน้าใหม่ในแท็บใหม่
3. ลองปิดเบราว์เซอร์แล้วเปิดใหม่

## 📊 **ผลลัพธ์ที่คาดหวัง**

### **✅ สิ่งที่ควรเห็น:**

- หลังรีเฟรช: อยู่ที่ `/customer` ไม่ถูกส่งไปที่ `/login`
- Console logs: แสดงข้อมูล auth state อย่างละเอียด
- Loading เร็วขึ้น: UI แสดงข้อมูล user ทันที
- ไม่มี error: Console ไม่มี error เกี่ยวกับ auth

### **❌ หากยังมีปัญหา:**

ดู console logs และหาข้อความเหล่านี้:

```
[Router] Route requires authentication, redirecting to login
[Auth] No valid session found
[Router] Auth check details: {hasSupabaseToken: false}
```

## 🔍 **การ Debug เพิ่มเติม**

### **ตรวจสอบ localStorage:**

```javascript
// ดู Supabase tokens
Object.keys(localStorage)
  .filter((key) => key.includes("supabase") || key.includes("sb-"))
  .forEach((key) => {
    console.log(key, localStorage.getItem(key));
  });
```

### **ตรวจสอบ sessionStorage:**

```javascript
// ดู demo mode
console.log("Demo mode:", sessionStorage.getItem("demo_mode"));
console.log("Demo user:", sessionStorage.getItem("demo_user"));
```

### **ตรวจสอบ Supabase session:**

```javascript
// ตรวจสอบ session ปัจจุบัน
supabase.auth.getSession().then(({ data, error }) => {
  console.log("Current session:", data.session);
  console.log("Session error:", error);
});
```

## 🚀 **การปรับปรุงเพิ่มเติม**

หากปัญหายังคงอยู่ สามารถเพิ่มการแก้ไขเหล่านี้:

### **1. เพิ่ม Session Persistence**

```typescript
// ใน auth store
const persistSession = () => {
  if (session.value) {
    sessionStorage.setItem(
      "auth_backup",
      JSON.stringify({
        user: user.value,
        session: session.value,
        timestamp: Date.now(),
      })
    );
  }
};
```

### **2. เพิ่ม Retry Logic**

```typescript
// ใน router guard
let retryCount = 0;
const maxRetries = 3;

const checkAuthWithRetry = async () => {
  if (retryCount < maxRetries && !authStore.isAuthenticated) {
    retryCount++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await authStore.initialize();
    return checkAuthWithRetry();
  }
  return authStore.isAuthenticated;
};
```

### **3. เพิ่ม Fallback Route**

```typescript
// หากทุกอย่างล้มเหลว ให้ไปหน้า loading
if (!isUserAuthenticated && to.path !== "/loading") {
  return next("/loading");
}
```

## ✅ **สรุป**

การแก้ไขนี้ควรแก้ปัญหา session restore ได้ โดย:

1. **รอ auth initialization ให้เสร็จ** ก่อนตรวจสอบ authentication
2. **ตรวจสอบหลายเงื่อนไข** ไม่พึ่งแค่ `isAuthenticated` เพียงอย่างเดียว
3. **เพิ่ม fallback** ด้วยการตรวจสอบ localStorage tokens
4. **เพิ่ม debug logs** เพื่อติดตามปัญหา

หากยังมีปัญหา กรุณาส่ง console logs มาให้ดูเพื่อวิเคราะห์เพิ่มเติม 🔍
