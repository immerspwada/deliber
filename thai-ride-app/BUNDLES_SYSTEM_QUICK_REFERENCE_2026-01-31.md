# 🎁 Bundles System - Quick Reference

**Date**: 2026-01-31  
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### Customer View

```
URL: http://localhost:5173/customer/bundles
Component: src/views/BundlesView.vue
```

### Admin View

```
URL: http://localhost:5173/admin/service-bundles
Component: src/admin/views/ServiceBundlesView.vue
```

---

## 📊 Database Quick Access

### View Templates

```sql
SELECT * FROM bundle_templates WHERE is_active = true;
```

### View Customer Bundles

```sql
SELECT * FROM service_bundles WHERE status = 'active';
```

### Check RLS Policies

```sql
SELECT * FROM pg_policies
WHERE tablename IN ('bundle_templates', 'service_bundles');
```

---

## 🔌 API Methods

### Admin API (useAdminAPI.ts)

```typescript
// Get all templates
const templates = await api.getBundleTemplates();

// Get customer bundles
const result = await api.getServiceBundles(
  { status: "active" },
  { page: 1, limit: 20 },
);

// Get statistics
const stats = await api.getServiceBundlesStats();
```

### Direct Supabase Queries

```typescript
// Customer: Fetch active templates
const { data } = await supabase
  .from("bundle_templates")
  .select("*")
  .eq("is_active", true)
  .order("display_order");

// Admin: Create template
const { error } = await supabase.from("bundle_templates").insert({
  name: "New Bundle",
  name_th: "แพ็คเกจใหม่",
  service_types: ["ride", "delivery"],
  discount_percentage: 15,
  is_active: true,
});

// Admin: Update template
const { error } = await supabase
  .from("bundle_templates")
  .update({ discount_percentage: 20 })
  .eq("id", templateId);

// Admin: Toggle status
const { error } = await supabase
  .from("bundle_templates")
  .update({ is_active: !currentStatus })
  .eq("id", templateId);
```

---

## 🎨 Service Type Mapping

```typescript
const serviceNames = {
  ride: "เรียกรถ",
  delivery: "ส่งของ",
  shopping: "ซื้อของ",
  queue: "จองคิว",
  moving: "ขนย้าย",
  laundry: "ซักรีด",
};

const serviceIcons = {
  ride: "🚗",
  delivery: "📦",
  shopping: "🛒",
  queue: "⏰",
  moving: "🚚",
  laundry: "👕",
};
```

---

## 🔧 Common Tasks

### Add New Service Type

1. **Update Database**:

```sql
-- Add to service_types enum if needed
ALTER TYPE service_type ADD VALUE 'new_service';
```

2. **Update Frontend**:

```typescript
// In BundlesView.vue and ServiceBundlesView.vue
const serviceNames = {
  // ... existing
  new_service: "ชื่อบริการใหม่",
};
```

### Change Discount Range

```typescript
// In ServiceBundlesView.vue modal
<input
  v-model.number="formData.discount_percentage"
  type="number"
  min="0"
  max="50"  // Change this value
  required
/>
```

### Add New Bundle Template

```sql
INSERT INTO bundle_templates (
  name,
  name_th,
  description,
  description_th,
  service_types,
  discount_percentage,
  display_order,
  is_popular,
  is_active
) VALUES (
  'New Bundle',
  'แพ็คเกจใหม่',
  'Description',
  'คำอธิบาย',
  ARRAY['ride', 'delivery'],
  15,
  5,
  false,
  true
);
```

---

## 🐛 Troubleshooting

### Templates Not Showing

**Check**:

1. Are templates active? `is_active = true`
2. RLS policies correct?
3. User authenticated?
4. Console errors?

**Fix**:

```sql
-- Activate all templates
UPDATE bundle_templates SET is_active = true;

-- Check RLS
SELECT * FROM pg_policies WHERE tablename = 'bundle_templates';
```

### Admin Can't Create Templates

**Check**:

1. User has admin role?
2. RLS policies allow insert?
3. Form validation passing?

**Fix**:

```sql
-- Grant permissions
GRANT ALL ON bundle_templates TO authenticated;

-- Check admin role
SELECT role FROM users WHERE id = auth.uid();
```

### Statistics Not Loading

**Check**:

1. RPC function exists?
2. Function has correct permissions?
3. Network errors?

**Fix**:

```sql
-- Verify function
SELECT proname FROM pg_proc
WHERE proname = 'get_service_bundles_stats_for_admin';

-- Grant execute
GRANT EXECUTE ON FUNCTION get_service_bundles_stats_for_admin()
TO authenticated;
```

---

## 📱 Testing Commands

### Quick Test Suite

```bash
# 1. Check database
psql -c "SELECT COUNT(*) FROM bundle_templates;"

# 2. Check RPC functions
psql -c "SELECT proname FROM pg_proc WHERE proname LIKE '%bundle%';"

# 3. Test customer view
curl http://localhost:5173/customer/bundles

# 4. Test admin view (requires auth)
curl http://localhost:5173/admin/service-bundles
```

### Browser Console Tests

```javascript
// Test API methods
const api = useAdminAPI();

// Get templates
const templates = await api.getBundleTemplates();
console.log("Templates:", templates);

// Get stats
const stats = await api.getServiceBundlesStats();
console.log("Stats:", stats);

// Get bundles
const bundles = await api.getServiceBundles({}, { page: 1, limit: 10 });
console.log("Bundles:", bundles);
```

---

## 🎯 Performance Tips

### Optimize Template Loading

```typescript
// Use select to limit columns
const { data } = await supabase
  .from("bundle_templates")
  .select("id, name, name_th, service_types, discount_percentage, is_popular")
  .eq("is_active", true);
```

### Cache Templates

```typescript
// In BundlesView.vue
const templatesCache = ref<any[]>([])
const cacheTime = ref<number>(0)
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function loadTemplates() {
  const now = Date.now()
  if (templatesCache.value.length && now - cacheTime.value < CACHE_DURATION) {
    templates.value = templatesCache.value
    return
  }

  // Fetch from database
  const { data } = await supabase.from('bundle_templates')...
  templatesCache.value = data || []
  cacheTime.value = now
}
```

---

## 🔒 Security Checklist

- [x] RLS enabled on both tables
- [x] Admin routes protected
- [x] Customer routes protected
- [x] RPC functions have proper permissions
- [x] Input validation on forms
- [x] XSS prevention (Vue auto-escapes)
- [x] No sensitive data in client

---

## 📚 Related Files

### Components

- `src/views/BundlesView.vue` - Customer interface
- `src/admin/views/ServiceBundlesView.vue` - Admin interface

### API

- `src/admin/composables/useAdminAPI.ts` (lines 1100-1165)

### Routes

- `src/router/index.ts` - Customer route
- `src/admin/router.ts` - Admin route

### Database

- `supabase/migrations_backup/167_service_bundles.sql`

### Documentation

- `BUNDLES_SYSTEM_COMPLETE_2026-01-31.md`
- `BUNDLES_SYSTEM_TESTING_GUIDE_2026-01-31.md`

---

## 💡 Tips & Tricks

### Bulk Update Templates

```sql
-- Deactivate all
UPDATE bundle_templates SET is_active = false;

-- Activate specific ones
UPDATE bundle_templates
SET is_active = true
WHERE name IN ('Moving + Laundry', 'Complete Service Package');
```

### Reset Display Order

```sql
-- Reset all to sequential order
UPDATE bundle_templates
SET display_order = row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_number
  FROM bundle_templates
) AS numbered
WHERE bundle_templates.id = numbered.id;
```

### Find Popular Bundles

```sql
SELECT name, name_th, discount_percentage
FROM bundle_templates
WHERE is_popular = true
ORDER BY discount_percentage DESC;
```

---

## 🎉 Quick Wins

### Make All Bundles Popular

```sql
UPDATE bundle_templates SET is_popular = true;
```

### Increase All Discounts by 5%

```sql
UPDATE bundle_templates
SET discount_percentage = LEAST(discount_percentage + 5, 50);
```

### Clone a Template

```sql
INSERT INTO bundle_templates (
  name, name_th, description, description_th,
  service_types, discount_percentage, display_order, is_active
)
SELECT
  name || ' (Copy)',
  name_th || ' (สำเนา)',
  description,
  description_th,
  service_types,
  discount_percentage,
  display_order + 1,
  false
FROM bundle_templates
WHERE id = 'template-id-to-clone';
```

---

**Last Updated**: 2026-01-31  
**Quick Access**: Bookmark this page for fast reference!
