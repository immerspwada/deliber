# 🔗 URL Tracking System - Complete Guide

## 🎯 ปัญหาที่แก้ไข

**ปัญหาเดิม**: หน้าเปลี่ยนแต่ URL ไม่เปลี่ยน ทำให้ยากต่อการ:

- Debug และระบุปัญหา
- Share URL ที่แสดงสถานะเฉพาะ
- ติดตาม user journey
- Bookmark หน้าที่สถานะเฉพาะ

**วิธีแก้**: เพิ่ม query parameters ใน URL เพื่อแสดงสถานะปัจจุบันแบบละเอียด

## 📊 URL Structure

### Provider Job Detail

```
/provider/job/[id]?status=accepted&step=1-accepted&timestamp=1234567890
/provider/job/[id]?status=arrived&step=2-arrived&timestamp=1234567890
/provider/job/[id]?status=in_progress&step=3-in-progress&timestamp=1234567890
/provider/job/[id]?status=completed&step=4-completed&timestamp=1234567890
```

### Customer Ride

```
/customer/ride?status=selecting_pickup&step=1-pickup&timestamp=1234567890
/customer/ride?status=selecting_dropoff&step=2-dropoff&timestamp=1234567890
/customer/ride?status=confirming&step=3-confirm&timestamp=1234567890
/customer/ride?status=searching&step=4-searching&timestamp=1234567890
/customer/ride?status=matched&step=5-matched&timestamp=1234567890
/customer/ride?status=in_progress&step=6-in-progress&timestamp=1234567890
/customer/ride?status=completed&step=7-completed&timestamp=1234567890
```

### Admin Operations

```
/admin/users/[id]?status=viewing&step=1-view&timestamp=1234567890
/admin/users/[id]?status=editing&step=2-edit&action=update_profile&timestamp=1234567890
/admin/providers/[id]?status=approving&step=3-approve&timestamp=1234567890
```

## 🔧 การใช้งาน

### 1. Import Composable

```typescript
import { useURLTracking } from "@/composables/useURLTracking";

const { updateStatus, updateAction, getCurrentTracking } = useURLTracking();
```

### 2. Update URL เมื่อสถานะเปลี่ยน

```typescript
// Provider Job Detail
async function updateJobStatus(newStatus: string) {
  // Update database
  await supabase.from("ride_requests").update({ status: newStatus });

  // Update URL
  updateStatus(newStatus, "provider_job");

  console.log("URL updated:", window.location.href);
  // Output: /provider/job/xxx?status=arrived&step=2-arrived&timestamp=1234567890
}
```

### 3. Track User Actions

```typescript
// Track specific actions
function handleAcceptJob() {
  updateAction("accepting_job");
  // URL: ?action=accepting_job&timestamp=xxx

  await acceptJob();

  updateStatus("accepted", "provider_job");
  // URL: ?status=accepted&step=1-accepted&timestamp=xxx
}
```

### 4. Read Current Tracking Info

```typescript
const tracking = getCurrentTracking();
console.log(tracking);
// {
//   status: 'accepted',
//   step: '1-accepted',
//   action: 'accepting_job',
//   timestamp: '1234567890'
// }
```

## 📋 Status Mapping

### Provider Job Status Flow

| Database Status | URL Step        | Display Name  | Description            |
| --------------- | --------------- | ------------- | ---------------------- |
| `pending`       | `0-pending`     | รอดำเนินการ   | งานยังไม่มีคนรับ       |
| `offered`       | `1-offered`     | เสนองาน       | เสนองานให้ provider    |
| `accepted`      | `1-accepted`    | รับงานแล้ว    | Provider รับงานแล้ว    |
| `matched`       | `1-matched`     | จับคู่แล้ว    | จับคู่สำเร็จ           |
| `arrived`       | `2-arrived`     | ถึงจุดรับแล้ว | Provider ถึงจุดรับแล้ว |
| `pickup`        | `2-pickup`      | จุดรับ        | อยู่ที่จุดรับ          |
| `in_progress`   | `3-in-progress` | กำลังเดินทาง  | กำลังเดินทางไปส่ง      |
| `picked_up`     | `3-picked-up`   | รับลูกค้าแล้ว | รับลูกค้าแล้ว          |
| `completed`     | `4-completed`   | เสร็จสิ้น     | ส่งลูกค้าถึงแล้ว       |
| `cancelled`     | `cancelled`     | ยกเลิก        | งานถูกยกเลิก           |

### Customer Ride Status Flow

| Status              | URL Step        | Display Name | Description      |
| ------------------- | --------------- | ------------ | ---------------- |
| `selecting_pickup`  | `1-pickup`      | เลือกจุดรับ  | กำลังเลือกจุดรับ |
| `selecting_dropoff` | `2-dropoff`     | เลือกจุดส่ง  | กำลังเลือกจุดส่ง |
| `confirming`        | `3-confirm`     | ยืนยัน       | ยืนยันการจอง     |
| `searching`         | `4-searching`   | กำลังหาคนขับ | กำลังหาคนขับ     |
| `matched`           | `5-matched`     | จับคู่แล้ว   | จับคู่คนขับแล้ว  |
| `in_progress`       | `6-in-progress` | กำลังเดินทาง | กำลังเดินทาง     |
| `completed`         | `7-completed`   | เสร็จสิ้น    | เดินทางเสร็จสิ้น |
| `cancelled`         | `cancelled`     | ยกเลิก       | ยกเลิกการจอง     |

## 🎨 UI Integration

### แสดง Breadcrumb จาก URL

```vue
<template>
  <div class="breadcrumb">
    <span>{{ getStepName(currentStep) }}</span>
    <span class="timestamp">{{ formatTimestamp(currentTimestamp) }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useURLTracking } from "@/composables/useURLTracking";

const { getCurrentTracking, getStepName } = useURLTracking();

const tracking = computed(() => getCurrentTracking());
const currentStep = computed(() => tracking.value.step || "");
const currentTimestamp = computed(() => tracking.value.timestamp || "");

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  const date = new Date(parseInt(ts));
  return date.toLocaleTimeString("th-TH");
}
</script>
```

### Debug Panel

```vue
<template>
  <div v-if="isDev" class="debug-panel">
    <details>
      <summary>🔍 URL Tracking Debug</summary>
      <pre>{{ JSON.stringify(getCurrentTracking(), null, 2) }}</pre>
      <div class="debug-info">
        <p><strong>Current URL:</strong> {{ currentURL }}</p>
        <p><strong>Status:</strong> {{ tracking.status }}</p>
        <p>
          <strong>Step:</strong> {{ tracking.step }} ({{
            getStepName(tracking.step || "")
          }})
        </p>
        <p><strong>Action:</strong> {{ tracking.action || "none" }}</p>
        <p><strong>Time:</strong> {{ formatTime(tracking.timestamp) }}</p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useURLTracking } from "@/composables/useURLTracking";

const route = useRoute();
const { getCurrentTracking, getStepName } = useURLTracking();

const isDev = computed(() => import.meta.env.DEV);
const tracking = computed(() => getCurrentTracking());
const currentURL = computed(() => window.location.href);

function formatTime(ts: string | undefined): string {
  if (!ts) return "N/A";
  return new Date(parseInt(ts)).toLocaleString("th-TH");
}
</script>

<style scoped>
.debug-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #fef3c7;
  border: 2px dashed #f59e0b;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  max-width: 400px;
  z-index: 9999;
}

.debug-panel summary {
  cursor: pointer;
  font-weight: 600;
  color: #92400e;
}

.debug-panel pre {
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
}

.debug-info p {
  margin: 4px 0;
  color: #78350f;
}
</style>
```

## 🔍 Debugging Benefits

### 1. Console Logs มี Context

```typescript
console.log("[URLTracking] Updated:", {
  context: "provider_job",
  params: { status: "accepted" },
  newQuery: { status: "accepted", step: "1-accepted", timestamp: "1234567890" },
  fullURL:
    "/provider/job/xxx?status=accepted&step=1-accepted&timestamp=1234567890",
});
```

### 2. Error Reports มี URL

```typescript
Sentry.captureException(error, {
  extra: {
    url: window.location.href,
    tracking: getCurrentTracking(),
    step: tracking.step,
    status: tracking.status,
  },
});
```

### 3. Analytics Tracking

```typescript
// Google Analytics
gtag("event", "page_view", {
  page_path: window.location.pathname + window.location.search,
  status: tracking.status,
  step: tracking.step,
});

// Custom Analytics
analytics.track("Status Changed", {
  from: oldStatus,
  to: newStatus,
  step: tracking.step,
  timestamp: tracking.timestamp,
  url: window.location.href,
});
```

## 📱 Mobile Deep Linking

```typescript
// Build shareable URL
const shareURL = buildTrackingURL("/provider/job/123", {
  status: "in_progress",
  step: "3-in-progress",
  action: "delivering",
});

// Share via Web Share API
if (navigator.share) {
  await navigator.share({
    title: "งานปัจจุบัน",
    text: "กำลังเดินทางส่งลูกค้า",
    url: shareURL,
  });
}
```

## 🧪 Testing

### Unit Test

```typescript
import { describe, it, expect } from "vitest";
import { useURLTracking } from "@/composables/useURLTracking";

describe("useURLTracking", () => {
  it("should update URL with status", () => {
    const { updateStatus } = useURLTracking();

    updateStatus("accepted", "provider_job");

    expect(window.location.search).toContain("status=accepted");
    expect(window.location.search).toContain("step=1-accepted");
  });

  it("should get step name correctly", () => {
    const { getStepName } = useURLTracking();

    expect(getStepName("1-accepted")).toBe("รับงานแล้ว");
    expect(getStepName("2-arrived")).toBe("ถึงจุดรับแล้ว");
  });
});
```

### E2E Test

```typescript
test("Provider job status flow updates URL", async ({ page }) => {
  await page.goto("/provider/job/123");

  // Check initial URL
  expect(page.url()).toContain("status=accepted");
  expect(page.url()).toContain("step=1-accepted");

  // Click next step button
  await page.click('[data-testid="next-step-button"]');

  // Check URL updated
  await page.waitForURL(/status=arrived/);
  expect(page.url()).toContain("status=arrived");
  expect(page.url()).toContain("step=2-arrived");
});
```

## 🚀 Performance

### URL Update Performance

- ✅ No page reload (uses `router.replace`)
- ✅ Debounced updates (prevents spam)
- ✅ Minimal re-renders (only query changes)
- ✅ No history pollution (uses replace not push)

### Bundle Size

- Composable: ~2KB gzipped
- Zero dependencies
- Tree-shakeable

## 📊 Analytics Integration

### Track User Journey

```typescript
// Track complete journey
const journey = [];

watch(
  () => getCurrentTracking(),
  (tracking) => {
    journey.push({
      status: tracking.status,
      step: tracking.step,
      timestamp: tracking.timestamp,
      url: window.location.href,
    });

    // Send to analytics
    analytics.track("Journey Step", {
      journey_id: rideId,
      step_number: journey.length,
      ...tracking,
    });
  }
);
```

## ✅ Implementation Checklist

- [x] สร้าง `useURLTracking` composable
- [x] เพิ่ม URL tracking ใน `ProviderJobDetailView`
- [ ] เพิ่ม URL tracking ใน `CustomerRideView`
- [ ] เพิ่ม URL tracking ใน `ProviderJobsView`
- [ ] เพิ่ม URL tracking ใน `AdminViews`
- [ ] เพิ่ม Debug Panel component
- [ ] เพิ่ม Breadcrumb component
- [ ] เพิ่ม Analytics integration
- [ ] เพิ่ม Unit tests
- [ ] เพิ่ม E2E tests
- [ ] อัพเดท documentation

## 🎯 Next Steps

1. **เพิ่ม URL tracking ให้ทุกหน้า** - Customer, Provider, Admin
2. **สร้าง Debug Panel component** - แสดง tracking info แบบ real-time
3. **เพิ่ม Analytics** - Track user journey ด้วย URL
4. **สร้าง Shareable URLs** - Share สถานะเฉพาะได้
5. **เพิ่ม Deep Linking** - รองรับ mobile app

## 💡 Best Practices

1. **Always update URL เมื่อสถานะเปลี่ยน**
2. **ใช้ context ที่ถูกต้อง** (provider_job, customer_ride, admin)
3. **เพิ่ม timestamp เสมอ** เพื่อ track เวลา
4. **Log URL changes** ใน console สำหรับ debug
5. **Test URL tracking** ใน E2E tests
