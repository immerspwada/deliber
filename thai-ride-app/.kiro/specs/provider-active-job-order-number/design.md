# Provider Active Job Card - Order Number Display Design

## Architecture Overview

### Component Structure

```
ProviderHomeNew.vue
├── Active Job Card
│   ├── Job Header
│   │   ├── Job Status Badge
│   │   ├── Order Number Badge (NEW)
│   │   └── Job Fare
│   ├── Job Route
│   └── Job Footer
```

## Design Decisions

### 1. Order Number Format

**Decision:** ใช้ 8 ตัวอักษรแรกของ UUID พร้อม prefix "#"

**Rationale:**

- UUID มีความยาว 36 ตัวอักษร (รวม dash) ซึ่งยาวเกินไปสำหรับ UI
- 8 ตัวอักษรแรกให้ uniqueness เพียงพอสำหรับการอ้างอิง (16^8 = 4.3 billion combinations)
- Prefix "#" ทำให้รู้ทันทีว่าเป็นหมายเลขออเดอร์
- ไม่ต้องเพิ่ม sequence ใน database (ใช้ UUID ที่มีอยู่)

**Format Example:**

```
UUID: 550e8400-e29b-41d4-a716-446655440000
Display: #550E8400
```

**Alternative Considered:**

- Hash UUID เป็นตัวเลข 6 หลัก → ปฏิเสธเพราะ collision risk สูงกว่า
- ใช้ running number → ปฏิเสธเพราะต้องเพิ่ม sequence ใน database

### 2. UI Placement

**Decision:** แสดงระหว่าง Job Status Badge และ Job Fare

**Layout:**

```
┌─────────────────────────────────────┐
│ [กำลังไปรับ] #550E8400    ฿150     │
│ ────────────────────────────────── │
│ รับ: ถนนสุขุมวิท...                │
│ ส่ง: ถนนพระราม 4...                │
└─────────────────────────────────────┘
```

**Rationale:**

- อยู่ใน visual hierarchy ที่เหมาะสม (ไม่โดดเด่นเกินไป แต่เห็นได้ชัด)
- ไม่รบกวน information หลัก (status และ fare)
- มีพื้นที่เพียงพอสำหรับ touch target

**Alternative Considered:**

- แสดงใน job-footer → ปฏิเสธเพราะไม่เห็นชัดเจนพอ
- แสดงเป็น overlay บน card → ปฏิเสธเพราะรบกวน visual

### 3. Copy Interaction

**Decision:** แตะที่หมายเลขเพื่อคัดลอก พร้อม visual feedback

**Interaction Flow:**

1. User แตะที่หมายเลขออเดอร์
2. Background color เปลี่ยนเป็น green (200ms)
3. คัดลอกหมายเลขไปยัง clipboard
4. แสดง toast "คัดลอกหมายเลขออเดอร์แล้ว"
5. Background กลับเป็นสีเดิม (300ms fade)

**Rationale:**

- ไม่ต้องมีปุ่มแยก (save space)
- Visual feedback ชัดเจน
- Toast confirmation ให้ความมั่นใจว่าคัดลอกสำเร็จ

## Component Design

### 1. Order Number Badge Component

**Props:**

```typescript
interface OrderNumberBadgeProps {
  orderId: string; // Full UUID
  copyable?: boolean; // Default: true
  format?: "short" | "full"; // Default: 'short'
}
```

**Emits:**

```typescript
interface OrderNumberBadgeEmits {
  (e: "copy", orderId: string): void;
}
```

**Computed:**

```typescript
const displayNumber = computed(() => {
  if (props.format === "full") return props.orderId;
  return "#" + props.orderId.substring(0, 8).toUpperCase();
});
```

### 2. Composable: useOrderNumber

**Purpose:** จัดการ logic เกี่ยวกับหมายเลขออเดอร์

```typescript
export function useOrderNumber() {
  function formatOrderNumber(
    uuid: string,
    format: "short" | "full" = "short",
  ): string {
    if (format === "full") return uuid;
    return "#" + uuid.substring(0, 8).toUpperCase();
  }

  function getFullOrderNumber(shortNumber: string): string | null {
    // ใช้สำหรับ search (future feature)
    // ตอนนี้ return null
    return null;
  }

  return {
    formatOrderNumber,
    getFullOrderNumber,
  };
}
```

### 3. Integration with useCopyToClipboard

**Existing Composable:**

```typescript
// src/composables/useCopyToClipboard.ts
export function useCopyToClipboard() {
  async function copy(text: string): Promise<boolean> {
    // Implementation exists
  }

  return { copy };
}
```

**Usage in Component:**

```typescript
const { copy } = useCopyToClipboard();
const { showToast } = useToast();

async function copyOrderNumber() {
  const success = await copy(activeJob.value!.id);
  if (success) {
    showToast({
      message: "คัดลอกหมายเลขออเดอร์แล้ว",
      type: "success",
      duration: 2000,
    });
  } else {
    showToast({
      message: "ไม่สามารถคัดลอกได้",
      type: "error",
      duration: 2000,
    });
  }
}
```

## Styling Design

### CSS Variables

```css
:root {
  --order-number-bg: #f3f4f6;
  --order-number-text: #374151;
  --order-number-bg-hover: #e5e7eb;
  --order-number-bg-active: #d1fae5;
  --order-number-text-active: #065f46;
}
```

### Component Styles

```css
.order-number-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--order-number-bg);
  border-radius: 8px;
  font-family: "SF Mono", "Monaco", "Courier New", monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--order-number-text);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-height: 44px; /* iOS touch target */
  min-width: 44px;
}

.order-number-badge:hover {
  background: var(--order-number-bg-hover);
}

.order-number-badge:active {
  background: var(--order-number-bg-active);
  color: var(--order-number-text-active);
  transform: scale(0.95);
}

.order-number-badge.copied {
  background: var(--order-number-bg-active);
  color: var(--order-number-text-active);
  animation: pulse-success 0.5s ease;
}

@keyframes pulse-success {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.copy-icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.order-number-badge:hover .copy-icon {
  opacity: 1;
}
```

### Responsive Design

```css
/* Mobile (< 640px) */
@media (max-width: 639px) {
  .order-number-badge {
    font-size: 12px;
    padding: 4px 8px;
  }
}

/* Tablet (640px - 1024px) */
@media (min-width: 640px) and (max-width: 1023px) {
  .order-number-badge {
    font-size: 13px;
  }
}

/* Desktop (>= 1024px) */
@media (min-width: 1024px) {
  .order-number-badge {
    font-size: 14px;
    padding: 6px 12px;
  }
}
```

## Accessibility Design

### ARIA Attributes

```html
<button
  class="order-number-badge"
  @click="copyOrderNumber"
  :aria-label="`หมายเลขออเดอร์ ${displayNumber} แตะเพื่อคัดลอก`"
  role="button"
  tabindex="0"
>
  <span aria-hidden="true">{{ displayNumber }}</span>
  <svg class="copy-icon" aria-hidden="true">...</svg>
</button>
```

### Keyboard Support

- **Tab:** Focus ไปที่ order number badge
- **Enter/Space:** คัดลอกหมายเลข
- **Escape:** Remove focus (ถ้ามี focus state)

### Screen Reader

- อ่านว่า "หมายเลขออเดอร์ [number] แตะเพื่อคัดลอก"
- เมื่อคัดลอกสำเร็จ announce "คัดลอกหมายเลขออเดอร์แล้ว"

## Data Flow

### 1. Load Active Job

```typescript
async function loadActiveJob(provId: string) {
  const { data } = await supabase
    .from("ride_requests")
    .select(
      `
      id,              // ← ใช้เป็นหมายเลขออเดอร์
      status,
      pickup_address,
      destination_address,
      estimated_fare,
      created_at,
      user_id
    `,
    )
    .eq("provider_id", provId)
    .in("status", ["matched", "pickup", "in_progress"])
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    activeJob.value = {
      id: data.id, // ← Full UUID
      // ... other fields
    };
  }
}
```

### 2. Display Order Number

```vue
<template>
  <div class="job-header">
    <div class="job-status-badge">...</div>

    <!-- NEW: Order Number Badge -->
    <button
      class="order-number-badge"
      @click="copyOrderNumber"
      :class="{ copied: isCopied }"
    >
      {{ formatOrderNumber(activeJob.id) }}
      <svg class="copy-icon">...</svg>
    </button>

    <span class="job-fare">...</span>
  </div>
</template>
```

### 3. Copy Flow

```typescript
const isCopied = ref(false);

async function copyOrderNumber() {
  if (!activeJob.value) return;

  const success = await copy(activeJob.value.id);

  if (success) {
    isCopied.value = true;
    showToast({
      message: "คัดลอกหมายเลขออเดอร์แล้ว",
      type: "success",
    });

    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  }
}
```

## Error Handling

### 1. Clipboard API Not Supported

```typescript
async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      return fallbackCopy(text);
    }
  } catch (error) {
    console.error("Copy failed:", error);
    return false;
  }
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    document.body.removeChild(textarea);
    return false;
  }
}
```

### 2. Missing Order ID

```typescript
async function copyOrderNumber() {
  if (!activeJob.value?.id) {
    showToast({
      message: "ไม่พบหมายเลขออเดอร์",
      type: "error",
    });
    return;
  }

  // ... proceed with copy
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("useOrderNumber", () => {
  it("should format UUID to short format", () => {
    const { formatOrderNumber } = useOrderNumber();
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(formatOrderNumber(uuid)).toBe("#550E8400");
  });

  it("should return full UUID when format is full", () => {
    const { formatOrderNumber } = useOrderNumber();
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(formatOrderNumber(uuid, "full")).toBe(uuid);
  });
});
```

### Integration Tests

```typescript
describe("Active Job Card - Order Number", () => {
  it("should display order number when active job exists", async () => {
    // Setup mock data
    const mockJob = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "matched",
      // ...
    };

    // Render component
    const wrapper = mount(ProviderHomeNew, {
      // ...
    });

    // Assert
    expect(wrapper.find(".order-number-badge").text()).toBe("#550E8400");
  });

  it("should copy order number when clicked", async () => {
    // Test copy functionality
  });
});
```

### E2E Tests

```typescript
test("Provider can copy order number from active job card", async ({
  page,
}) => {
  // Navigate to provider home
  await page.goto("/provider");

  // Wait for active job card
  await page.waitForSelector(".active-job-card");

  // Click order number
  await page.click(".order-number-badge");

  // Verify toast appears
  await expect(page.locator(".toast")).toContainText(
    "คัดลอกหมายเลขออเดอร์แล้ว",
  );

  // Verify clipboard content
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
});
```

## Performance Considerations

### 1. Rendering Performance

- Order number badge เป็น inline element ไม่ส่งผลต่อ layout reflow
- ใช้ CSS transform สำหรับ animation (GPU accelerated)
- ไม่มี heavy computation ใน render cycle

### 2. Memory Usage

- ไม่เก็บ state เพิ่มเติม (ใช้ activeJob.id ที่มีอยู่)
- Toast notification cleanup หลังจาก duration หมด

### 3. Network

- ไม่มี additional API call (ใช้ data ที่ load มาแล้ว)

## Security Considerations

### 1. UUID Exposure

- UUID เป็น public identifier ไม่มี sensitive information
- ไม่สามารถใช้ enumerate orders ได้ (random UUID)
- RLS policies ป้องกันการเข้าถึง order ของคนอื่น

### 2. Clipboard Access

- ใช้ Clipboard API ที่ secure (HTTPS only)
- ไม่ read clipboard (write only)
- User consent implicit (user action triggered)

## Future Enhancements

### Phase 2 (Out of current scope)

1. **QR Code Generation:** สร้าง QR code จากหมายเลขออเดอร์
2. **Order Search:** ค้นหาออเดอร์จากหมายเลข
3. **Share Order:** แชร์หมายเลขออเดอร์ผ่าน social media
4. **Order History:** แสดงประวัติการคัดลอกหมายเลข
