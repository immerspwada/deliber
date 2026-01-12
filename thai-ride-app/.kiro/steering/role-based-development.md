---
inclusion: always
---

# 🎭 Role-Based Development

## ⚠️ MANDATORY: ทุกคำสั่งต้องพิจารณา Role

| Role     | Path          | Layout         | Data Access         |
| -------- | ------------- | -------------- | ------------------- |
| Customer | `/customer/*` | AppShell       | Own data only       |
| Provider | `/provider/*` | ProviderLayout | Own jobs + earnings |
| Admin    | `/admin/*`    | AdminLayout    | Full access         |

## Quick Checklist

ก่อนเขียนโค้ด ถามตัวเอง:

1. ✅ Customer ได้รับผลกระทบอย่างไร?
2. ✅ Provider ได้รับผลกระทบอย่างไร?
3. ✅ Admin ต้องจัดการอะไรเพิ่ม?

## RLS Policy Template

```sql
-- ทุก table ใหม่ต้องมี policies ครบ 3 roles

-- Customer: เห็นเฉพาะข้อมูลตัวเอง
CREATE POLICY "customer_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Provider: เห็นงานที่ได้รับมอบหมาย
CREATE POLICY "provider_assigned" ON table_name
  FOR SELECT USING (auth.uid() = provider_id);

-- Admin: เห็นทุกอย่าง
CREATE POLICY "admin_full" ON table_name
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

## Route Meta

```typescript
// ✅ ทุก route ต้องมี meta
{
  path: '/customer/ride',
  meta: {
    requiresAuth: true,
    allowedRoles: ['customer'],
  },
},
{
  path: '/provider/jobs',
  meta: {
    requiresAuth: true,
    allowedRoles: ['provider'],
  },
},
{
  path: '/admin/users',
  meta: {
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
}
```

## Role Check Composable

```typescript
// composables/useRoleAccess.ts
export function useRoleAccess() {
  const authStore = useAuthStore();

  const isCustomer = computed(() => authStore.role === "customer");
  const isProvider = computed(() => authStore.role === "provider");
  const isAdmin = computed(() => authStore.role === "admin");

  function requireRole(roles: string[]): boolean {
    if (!roles.includes(authStore.role)) {
      router.push("/unauthorized");
      return false;
    }
    return true;
  }

  return { isCustomer, isProvider, isAdmin, requireRole };
}
```

## Component by Role

```vue
<template>
  <!-- ✅ Conditional rendering by role -->
  <CustomerDashboard v-if="isCustomer" />
  <ProviderDashboard v-else-if="isProvider" />
  <AdminDashboard v-else-if="isAdmin" />
</template>
```

## API Authorization

```typescript
// Edge Function
export async function handler(req: Request): Promise<Response> {
  const { user, role } = await getAuthContext(req);

  // Check role
  if (!["admin", "provider"].includes(role)) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Process request...
}
```

## Feature Impact Template

เมื่อเพิ่มฟีเจอร์ใหม่ ต้องระบุ:

| Role        | Impact   | Action       |
| ----------- | -------- | ------------ |
| 👤 Customer | [อธิบาย] | [ต้องทำอะไร] |
| 🚗 Provider | [อธิบาย] | [ต้องทำอะไร] |
| 👑 Admin    | [อธิบาย] | [ต้องทำอะไร] |
