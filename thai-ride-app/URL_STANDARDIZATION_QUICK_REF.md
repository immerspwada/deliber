# 🔗 URL Standardization - Quick Reference

## 📋 TL;DR

URLs are now **clean and minimal** with a single `step` parameter.

## Before vs After

```diff
- /provider/job/{id}?status=matched&step=1-matched&timestamp=1768468454056
+ /provider/job/{id}?step=matched
```

**Saved:** 60 characters, 2 redundant parameters

## 🎯 URL Format

### Provider Job

```
/provider/job/{id}?step={step}
```

**Valid steps:**

- `pending` - รอดำเนินการ
- `matched` - จับคู่แล้ว
- `pickup` - ถึงจุดรับ
- `in-progress` - กำลังเดินทาง
- `completed` - เสร็จสิ้น
- `cancelled` - ยกเลิก

### Customer Ride

```
/customer/ride/{id}?step={step}
```

**Valid steps:**

- `pickup` - เลือกจุดรับ
- `dropoff` - เลือกจุดส่ง
- `confirm` - ยืนยัน
- `searching` - กำลังหาคนขับ
- `matched` - จับคู่แล้ว
- `in-progress` - กำลังเดินทาง
- `completed` - เสร็จสิ้น
- `cancelled` - ยกเลิก

## 🔧 API Usage

### Update URL

```typescript
import { useURLTracking } from "@/composables/useURLTracking";

const { updateStep } = useURLTracking();

// Update to new step
updateStep("matched", "provider_job");
updateStep("in-progress", "provider_job");
updateStep("completed", "provider_job");
```

### Migrate Old URLs

```typescript
const { migrateOldURL } = useURLTracking();

// Call on mount to auto-migrate old format
onMounted(() => {
  migrateOldURL();
});
```

### Get Current Step

```typescript
const { getCurrentTracking } = useURLTracking();

const { step, action } = getCurrentTracking();
console.log(step); // 'matched'
```

## 🔄 Format Conversion

Database uses **underscore**, URL uses **hyphen**:

```typescript
// Database → URL (automatic)
'in_progress' → 'in-progress'

// Both formats accepted in validation
isValidStep('in-progress', 'provider_job') // ✅ true
isValidStep('in_progress', 'provider_job') // ✅ true
```

## 📊 Analytics Tracking

Analytics are tracked **separately** from URL:

```typescript
// Stored in localStorage (dev) and sent to analytics (prod)
{
  event: 'url_update',
  context: 'provider_job',
  step: 'matched',
  timestamp: 1768468454056,
  path: '/provider/job/xxx'
}

// View history (dev only)
localStorage.getItem('url_tracking_history')
```

## 🧪 Testing

### Test Page

```bash
open test-url-standardization.html
```

### Test Migration

```bash
# Use old URL
http://localhost:5173/provider/job/{id}?status=matched&step=1-matched

# Should auto-redirect to
http://localhost:5173/provider/job/{id}?step=matched
```

### Check Console

```javascript
// Browser console shows migration
[URLTracking] Migrated old URL format to new format
```

## ✅ Benefits

| Feature             | Status |
| ------------------- | ------ |
| Clean URLs          | ✅     |
| Type-safe           | ✅     |
| Backward compatible | ✅     |
| Auto-migration      | ✅     |
| Analytics tracking  | ✅     |
| Format conversion   | ✅     |

## 📚 Full Documentation

- `URL_STANDARDIZATION_COMPLETE.md` - Complete technical docs
- `URL_STANDARDIZATION_SUMMARY.md` - Summary of changes
- `test-url-standardization.html` - Visual test page

## 🚨 Important Notes

1. **Always use hyphen format in URLs** (`in-progress` not `in_progress`)
2. **Database format is auto-converted** (no manual conversion needed)
3. **Old URLs auto-migrate** (backward compatible)
4. **Analytics tracked separately** (not in URL)

## 💡 Common Patterns

### In Components

```vue
<script setup lang="ts">
import { useURLTracking } from "@/composables/useURLTracking";

const { updateStep, migrateOldURL } = useURLTracking();

onMounted(() => {
  // Migrate old URLs
  migrateOldURL();

  // Update URL with current status
  updateStep("matched", "provider_job");
});
</script>
```

### In Composables

```typescript
import { useURLTracking } from "./useURLTracking";

export function useProviderJobDetail() {
  const { updateStep } = useURLTracking();

  async function updateStatus() {
    // ... update database

    // Update URL (convert format)
    const urlStep = newStatus.replace(/_/g, "-");
    updateStep(urlStep, "provider_job");
  }
}
```

## 🎉 Done!

URL standardization is complete and ready to use!
