# Admin Dashboard V2 - Quick Start Guide

## 🚀 เริ่มต้นใช้งาน

### 1. Run Database Migration

```bash
cd thai-ride-app
npx supabase migration up
```

หรือถ้าใช้ Supabase CLI:

```bash
supabase db push
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access Admin Dashboard

เปิดเบราว์เซอร์ไปที่:

```
http://localhost:5173/admin/login
```

### 4. Login with Demo Credentials

```
Email: admin@demo.com
Password: admin1234
```

---

## 📋 Features Available

### ✅ Phase 1 (Complete)

- **Login System**
  - Email/password authentication
  - Demo mode support
  - Rate limiting (5 attempts, 1-min lockout)
  - Session management (8-hour TTL)

- **Dashboard**
  - Overview stats (orders, revenue, users, providers)
  - Recent orders table
  - Pending providers list
  - Quick actions

- **Navigation**
  - Sidebar with module menu
  - Breadcrumbs
  - User menu
  - Logout

- **RBAC System**
  - 5 roles: super_admin, admin, manager, support, viewer
  - Module-level permissions
  - Action-level permissions

### 🔄 Phase 2-5 (Planned)

- User Management (Customers, Providers)
- Order Management
- Finance Management
- Marketing Tools
- Support System
- Analytics Dashboard
- Settings & Configuration

---

## 🎨 UI Components Available

### Layout Components
- `AdminShell` - Main layout wrapper
- `AdminSidebar` - Navigation sidebar
- `AdminHeader` - Top header
- `AdminToasts` - Toast notifications

### Common Components
- `AdminTable` - Data table with sorting, filtering, pagination
- `AdminCard` - Card wrapper
- `AdminModal` - Modal dialog
- `AdminButton` - Button with variants
- `AdminBadge` - Status badges
- `AdminInput` - Form input
- `AdminSelect` - Form select

### Usage Example

```vue
<script setup lang="ts">
import { AdminTable, AdminCard, AdminButton } from '@/admin'

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' }
]

const data = [
  { id: 1, name: 'John Doe', status: 'active' },
  { id: 2, name: 'Jane Smith', status: 'pending' }
]
</script>

<template>
  <AdminCard title="Users">
    <AdminTable
      :columns="columns"
      :data="data"
      searchable
      @row-click="handleRowClick"
    >
      <template #cell-status="{ value }">
        <AdminBadge :variant="value === 'active' ? 'success' : 'warning'">
          {{ value }}
        </AdminBadge>
      </template>
    </AdminTable>
  </AdminCard>
</template>
```

---

## 🔐 Creating Admin Users

### Development (Demo Mode)

Use demo credentials:
- Email: `admin@demo.com`
- Password: `admin1234`

### Production (Real Users)

#### Option 1: Update Existing User

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

#### Option 2: Create New Admin User

```sql
-- 1. Create auth user in Supabase Dashboard
-- 2. Update role in users table
UPDATE users
SET role = 'admin'
WHERE email = 'new-admin@example.com';
```

#### Option 3: Using Supabase Dashboard

1. Go to Authentication > Users
2. Create new user
3. Go to Table Editor > users
4. Find the user and set `role = 'admin'`

---

## 🛠️ Development Workflow

### Adding New Module

1. Create module directory:
```bash
mkdir -p src/admin/modules/your-module
```

2. Create view:
```vue
<!-- src/admin/modules/your-module/YourModuleView.vue -->
<script setup lang="ts">
import { AdminCard } from '@/admin'
</script>

<template>
  <AdminCard title="Your Module">
    <!-- Your content -->
  </AdminCard>
</template>
```

3. Add route:
```typescript
// src/admin/router.ts
{
  path: 'your-module',
  name: 'AdminYourModule',
  component: () => import('./modules/your-module/YourModuleView.vue'),
  meta: { module: 'your-module' }
}
```

4. Add to sidebar:
```typescript
// src/admin/components/layout/AdminSidebar.vue
{
  name: 'Your Module',
  icon: '📦',
  path: '/admin/your-module',
  module: 'your-module'
}
```

---

## 🔍 Troubleshooting

### Login Issues

**Problem**: Cannot login with demo credentials

**Solution**:
1. Check if you're on `/admin/login` (not `/admin/login-v2`)
2. Clear browser cache and localStorage
3. Check browser console for errors

---

**Problem**: "Session expired" immediately after login

**Solution**:
1. Check system time (session uses timestamps)
2. Clear localStorage
3. Try incognito mode

---

### Navigation Issues

**Problem**: Sidebar not showing

**Solution**:
1. Check if you're logged in
2. Check browser console for errors
3. Verify `AdminShell` is rendering

---

**Problem**: Routes not working

**Solution**:
1. Check if admin routes are imported in main router
2. Verify route names don't conflict
3. Check navigation guards

---

### Permission Issues

**Problem**: Cannot access certain modules

**Solution**:
1. Check user role in database
2. Verify permissions in `admin_permissions` table
3. Check `hasPermission()` logic in store

---

## 📊 Monitoring

### Check Active Sessions

```sql
SELECT 
  s.id,
  u.email,
  u.role,
  s.login_time,
  s.expires_at,
  s.last_activity,
  s.is_demo
FROM admin_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.expires_at > NOW()
ORDER BY s.login_time DESC;
```

### Check Audit Log

```sql
SELECT 
  al.action,
  al.entity_type,
  al.entity_id,
  u.email as admin_email,
  al.created_at
FROM admin_audit_log al
JOIN users u ON u.id = al.admin_id
ORDER BY al.created_at DESC
LIMIT 50;
```

### Clean Expired Sessions

```sql
SELECT clean_expired_admin_sessions();
```

---

## 🎯 Next Steps

1. **Explore Dashboard**: ดูข้อมูลภาพรวม
2. **Check Sidebar**: ดู modules ที่มี
3. **Try Components**: ทดสอบ UI components
4. **Read Architecture**: อ่าน `ADMIN_ARCHITECTURE.md`
5. **Plan Phase 2**: วางแผน modules ที่จะพัฒนาต่อ

---

## 📚 Documentation

- **Architecture**: `src/admin/ADMIN_ARCHITECTURE.md`
- **Implementation Summary**: `ADMIN_V2_IMPLEMENTATION_SUMMARY.md`
- **Types**: `src/admin/types/`
- **Components**: `src/admin/components/`

---

## 💡 Tips

1. **Use Demo Mode**: ใช้ demo mode สำหรับ development
2. **Check Permissions**: ตรวจสอบ permissions ก่อนเพิ่มฟีเจอร์
3. **Follow Patterns**: ใช้ patterns เดียวกันกับ existing code
4. **Test Thoroughly**: ทดสอบทุก role level
5. **Document Changes**: เขียน documentation สำหรับฟีเจอร์ใหม่

---

**Happy Coding! 🚀**
