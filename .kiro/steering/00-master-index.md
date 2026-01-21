# Thai Ride App - Master Steering Index

## 📋 Document Hierarchy

```
00-master-index.md          ← คุณอยู่ที่นี่ (Entry Point)
├── 01-core-principles.md   ← หลักการพื้นฐานที่ต้องปฏิบัติตามเสมอ
├── 02-architecture.md      ← System Design & Architecture
├── 03-development.md       ← Development Guidelines & Patterns
├── 04-security.md          ← Security & Production Rules
├── 05-ui-design.md         ← UI/UX Design System (MUNEEF)
└── 06-operations.md        ← Operations & Deployment

Legacy Files (Deprecated - ใช้ไฟล์ใหม่แทน):
├── admin-rules.md          → ย้ายไป 01, 03, 04
├── database-features.md    → ย้ายไป 02, 03
├── production-environment.md → ย้ายไป 04, 06
├── system-architecture.md  → ย้ายไป 02
├── thai-language.md        → ย้ายไป 01
├── total-role-coverage.md  → ย้ายไป 01, 03
└── ui-design.md            → ย้ายไป 05
```

---

## 🎯 Quick Reference - Decision Matrix

### เมื่อต้องตัดสินใจ ให้ใช้ลำดับความสำคัญนี้:

| Priority | Category       | Rule                                               |
| :------- | :------------- | :------------------------------------------------- |
| **P0**   | Security       | ห้ามละเมิด RLS, ห้าม expose secrets                |
| **P1**   | Data Integrity | ห้ามใช้ mock data, ต้อง query จาก DB จริง          |
| **P2**   | Cross-Role     | ทุกฟีเจอร์ต้องครอบคลุม Customer + Provider + Admin |
| **P3**   | Production     | ทุกอย่างต้อง production-ready                      |
| **P4**   | UX             | ใช้ MUNEEF Design System                           |
| **P5**   | Performance    | Optimize ตาม guidelines                            |

---

## 🚨 Critical Rules (ต้องจำ)

### 1. Three-Role Mandate

```
ทุกฟีเจอร์ต้องทำครบ 3 ฝ่าย:
├── Customer: สร้าง/ติดตาม/ยกเลิก
├── Provider: รับงาน/อัพเดท/จบงาน
└── Admin: ดู/จัดการ/override ทั้งหมด
```

### 2. No Mock Data Policy

```
❌ ห้าม: hardcoded arrays, fake users, demo data
✅ ต้อง: query จาก Supabase, แสดง empty state ถ้าไม่มีข้อมูล
```

### 3. Migration Auto-Execute

```
เมื่อสร้าง migration → ต้อง execute ทันทีผ่าน MCP Supabase
ห้ามสร้างแล้วไม่ run
```

### 4. Thai Language Response

```
ตอบกลับเป็นภาษาไทยเสมอ (ยกเว้น code, technical terms)
```

---

## 🔄 Standard Workflows

### Workflow A: สร้างฟีเจอร์ใหม่

```
1. ออกแบบ Role-Based Matrix
2. สร้าง Migration + RLS
3. Execute Migration ผ่าน MCP
4. สร้าง Composable
5. สร้าง Views (Customer → Provider → Admin)
6. เพิ่ม Realtime + Notifications
7. ทดสอบทุก Role
```

### Workflow B: แก้ไข Bug

```
1. ระบุ Root Cause
2. ตรวจสอบ Impact ทุก Role
3. แก้ไข + ทดสอบ
4. Verify ไม่กระทบ Role อื่น
```

### Workflow C: Database Change

```
1. สร้าง Migration file
2. Execute ผ่าน MCP ทันที
3. ตรวจสอบ RLS policies
4. อัพเดท Composables ที่เกี่ยวข้อง
```

---

## 📁 File Locations Quick Reference

| Category          | Location                                      |
| :---------------- | :-------------------------------------------- |
| Migrations        | `supabase/migrations/*.sql`                   |
| Composables       | `src/composables/*.ts`                        |
| Customer Views    | `src/views/*.vue`, `src/views/customer/*.vue` |
| Provider Views    | `src/views/provider/*.vue`                    |
| Admin Views       | `src/admin/views/*.vue`                       |
| Admin Composables | `src/admin/composables/*.ts`                  |
| Components        | `src/components/**/*.vue`                     |

---

## 🏷️ Feature ID System

| Prefix    | Range         | Category                               |
| :-------- | :------------ | :------------------------------------- |
| F01-F10   | Core          | Auth, Ride, Delivery, Shopping, Wallet |
| F11-F26   | Extended      | History, Chat, Safety, Admin           |
| F27-F50   | Provider      | Earnings, Performance, Incentives      |
| F51-F100  | UI Components | Buttons, Cards, Modals                 |
| F156-F170 | Services      | Queue, Moving, Laundry, Loyalty        |
| F172-F201 | Performance   | Optimization, Caching                  |
| F202-F251 | Advanced      | Feature Flags, A/B Testing, Analytics  |

---

## ⚡ Quick Commands

### MCP Supabase

```typescript
// Activate
kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// Execute SQL
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { sql: "..." },
});
```

### CLI Fallback

```bash
cd thai-ride-app && npx supabase db push --linked
```

---

## 📊 System Stats

- **Routes**: 197 (Public: 8, Customer: 42, Provider: 24, Admin: 123)
- **Features**: 200+ (F01-F251+)
- **Tables**: 100+
- **Components**: 150+
- **Composables**: 100+
- **Services**: 6 (Ride, Delivery, Shopping, Queue, Moving, Laundry)

---

**Last Updated**: December 29, 2024
**Version**: 2.0.0 (Professional Edition)
