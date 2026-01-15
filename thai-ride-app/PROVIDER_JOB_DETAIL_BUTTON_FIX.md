# 🔧 Provider Job Detail - ปุ่มขั้นตอนต่อไปไม่แสดง

## 🐛 ปัญหา

ในหน้า `/provider/job/:id` ไม่มีปุ่มให้กดเพื่อไปขั้นตอนต่อไป (เช่น "ถึงจุดรับแล้ว", "รับลูกค้าแล้ว")

## 🔍 สาเหตุที่เป็นไปได้

### 1. Status Mismatch

```typescript
// STATUS_FLOW ใน component
const STATUS_FLOW = [
  { key: "matched", label: "รับงานแล้ว", icon: "✅" },
  { key: "pickup", label: "ถึงจุดรับแล้ว", icon: "📍" },
  { key: "in_progress", label: "กำลังเดินทาง", icon: "🛣️" },
  { key: "completed", label: "เสร็จสิ้น", icon: "🎉" },
];

// ถ้า job.status จาก database ไม่ตรงกับ key ใน STATUS_FLOW
// เช่น database มี 'accepted' แต่ STATUS_FLOW ใช้ 'matched'
// จะทำให้ currentStatusIndex = -1 และ nextStatus = null
```

### 2. Condition Logic

```vue
<!-- ปุ่มจะแสดงเมื่อ -->
<button v-if="canUpdateStatus" <!-- ต้องเป็น true -->
  class="status-btn"
  @click="updateStatus"
>
  {{ nextStatus?.action }}
</button>

<!-- canUpdateStatus คำนวณจาก -->
const canUpdateStatus = computed(() => { return nextStatus.value !== null &&
!updating.value })

<!-- nextStatus คำนวณจาก -->
const nextStatus = computed(() => { const idx = currentStatusIndex.value if (idx
< 0 || idx >= STATUS_FLOW.length - 1) return null return STATUS_FLOW[idx + 1] })
```

### 3. CSS Hidden

```css
.action-buttons {
  position: fixed;
  bottom: 0;
  /* อาจถูกบัง element อื่น หรือ z-index ต่ำเกินไป */
}
```

## ✅ วิธีแก้ไข

### Quick Fix 1: เพิ่ม Debug Console

เพิ่มใน `ProviderJobDetailView.vue`:

```vue
<script setup lang="ts">
// ... existing code ...

// เพิ่ม watch เพื่อ debug
watch(
  [job, currentStatusIndex, nextStatus, canUpdateStatus],
  ([j, idx, next, can]) => {
    console.log("🔍 Debug Status Button:", {
      jobStatus: j?.status,
      currentStatusIndex: idx,
      nextStatus: next,
      canUpdateStatus: can,
      statusFlow: STATUS_FLOW,
    });
  },
  { immediate: true }
);
</script>
```

### Quick Fix 2: แก้ไข Status Mapping

ถ้า database ใช้ status ต่างจาก STATUS_FLOW:

```typescript
// เพิ่ม status mapping
const STATUS_MAP: Record<string, string> = {
  accepted: "matched", // map database status to flow status
  arriving: "pickup",
  picked_up: "in_progress",
  // ... other mappings
};

// ใช้ใน computed
const currentStatusIndex = computed(() => {
  if (!job.value) return -1;
  const mappedStatus = STATUS_MAP[job.value.status] || job.value.status;
  return STATUS_FLOW.findIndex((s) => s.key === mappedStatus);
});
```

### Quick Fix 3: เพิ่ม Fallback Button

เพิ่มปุ่ม fallback ที่แสดงเสมอเพื่อ debug:

```vue
<!-- เพิ่มหลัง action-buttons -->
<div
  class="debug-info"
  style="position: fixed; bottom: 100px; left: 0; right: 0; background: rgba(255,0,0,0.1); padding: 10px; text-align: center; z-index: 9999;"
>
  <p style="margin: 0; font-size: 12px;">
    Status: {{ job?.status }} | 
    Index: {{ currentStatusIndex }} | 
    Next: {{ nextStatus?.key || 'null' }} | 
    Can Update: {{ canUpdateStatus }}
  </p>
  <button 
    v-if="job && !isCompleted && !isCancelled"
    @click="forceUpdateStatus"
    style="margin-top: 8px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 8px;"
  >
    🔧 Force Update Status (Debug)
  </button>
</div>

<script setup lang="ts">
// เพิ่ม function
function forceUpdateStatus() {
  console.log("Force update from:", job.value?.status);
  console.log("Current index:", currentStatusIndex.value);
  console.log("Next status:", nextStatus.value);

  if (nextStatus.value) {
    updateStatus();
  } else {
    alert(
      `Cannot update: currentIndex=${currentStatusIndex.value}, nextStatus=${nextStatus.value}`
    );
  }
}
</script>
```

### Quick Fix 4: แก้ไข CSS z-index

```css
.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 100; /* เพิ่ม z-index ให้สูงขึ้น */
  padding: 16px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}
```

## 🧪 วิธีทดสอบ

### 1. เปิด Browser Console

```bash
# เปิด http://localhost:5173/provider/job/:id
# กด F12 เปิด Console
# ดูว่ามี log อะไรออกมา
```

### 2. ตรวจสอบ Database Status

```sql
-- เช็คว่า status ใน database เป็นอะไร
SELECT id, status, created_at
FROM ride_requests
WHERE id = '0a723139-0b79-47eb-9065-a2673f8e847a';
```

### 3. ตรวจสอบ Vue DevTools

```
1. ติดตั้ง Vue DevTools extension
2. เปิดหน้า Provider Job Detail
3. ดู computed properties:
   - currentStatusIndex
   - nextStatus
   - canUpdateStatus
```

## 🎯 Solution แบบถาวร

สร้าง composable ใหม่ที่ handle status flow ได้ดีกว่า:

```typescript
// src/composables/useJobStatusFlow.ts
import { computed, type Ref } from "vue";

export interface StatusStep {
  key: string;
  label: string;
  icon: string;
  action: string;
  dbStatus: string[]; // รองรับหลาย status จาก database
}

const STATUS_FLOW: StatusStep[] = [
  {
    key: "matched",
    label: "รับงานแล้ว",
    icon: "✅",
    action: "กำลังไปรับ",
    dbStatus: ["matched", "accepted", "confirmed"],
  },
  {
    key: "pickup",
    label: "ถึงจุดรับแล้ว",
    icon: "📍",
    action: "ถึงจุดรับแล้ว",
    dbStatus: ["pickup", "arrived", "arriving"],
  },
  {
    key: "in_progress",
    label: "กำลังเดินทาง",
    icon: "🛣️",
    action: "รับลูกค้าแล้ว",
    dbStatus: ["in_progress", "picked_up", "ongoing"],
  },
  {
    key: "completed",
    label: "เสร็จสิ้น",
    icon: "🎉",
    action: "ส่งลูกค้าสำเร็จ",
    dbStatus: ["completed", "finished", "done"],
  },
];

export function useJobStatusFlow(jobStatus: Ref<string | undefined>) {
  const currentStatusIndex = computed(() => {
    if (!jobStatus.value) return -1;

    // หา index จาก dbStatus array
    return STATUS_FLOW.findIndex((step) =>
      step.dbStatus.includes(jobStatus.value!)
    );
  });

  const currentStep = computed(() => {
    const idx = currentStatusIndex.value;
    return idx >= 0 ? STATUS_FLOW[idx] : null;
  });

  const nextStep = computed(() => {
    const idx = currentStatusIndex.value;
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  });

  const canProgress = computed(() => {
    return nextStep.value !== null;
  });

  const isCompleted = computed(() => {
    return (
      jobStatus.value &&
      STATUS_FLOW[STATUS_FLOW.length - 1].dbStatus.includes(jobStatus.value)
    );
  });

  return {
    STATUS_FLOW,
    currentStatusIndex,
    currentStep,
    nextStep,
    canProgress,
    isCompleted,
  };
}
```

## 📝 Checklist การแก้ไข

- [ ] เปิด Console ดู debug log
- [ ] ตรวจสอบ job.status จาก database
- [ ] ตรวจสอบว่า STATUS_FLOW.key ตรงกับ database status หรือไม่
- [ ] เพิ่ม debug button ชั่วคราว
- [ ] ตรวจสอบ CSS z-index
- [ ] ทดสอบกับ job status ต่างๆ
- [ ] ใช้ useJobStatusFlow composable แทน

## 🚀 คำสั่งที่ใช้

```bash
# 1. เปิด dev server
npm run dev

# 2. เปิด browser console
# F12 หรือ Cmd+Option+I (Mac)

# 3. Navigate to job detail
# http://localhost:5173/provider/job/0a723139-0b79-47eb-9065-a2673f8e847a

# 4. ดู console log
# ควรเห็น debug info ของ status
```

---

**หมายเหตุ**: ปัญหานี้มักเกิดจาก status ใน database ไม่ตรงกับ STATUS_FLOW ใน component ให้ตรวจสอบ database ก่อนเป็นอันดับแรก
