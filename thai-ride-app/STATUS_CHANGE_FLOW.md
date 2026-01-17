# Status Change Flow - Multi-Role Impact

## Overview
เมื่อ Admin เปลี่ยนสถานะออเดอร์ ระบบจะส่งผลกระทบและแจ้งเตือนไปยังทั้ง 3 roles

## Flow Diagram

```
Admin เปลี่ยนสถานะ
        ↓
┌───────────────────────────────────────┐
│  1. Update Order Status in Database   │
│     - orders.status = new_status      │
│     - orders.updated_at = now()       │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  2. Notify Customer                   │
│     - Create notification record      │
│     - Push notification (if enabled)  │
│     - Real-time update via Supabase   │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  3. Notify Provider                   │
│     - Create notification record      │
│     - Push notification (if enabled)  │
│     - Real-time update via Supabase   │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  4. Log Activity for Admin            │
│     - Record who changed what         │
│     - Track old → new status          │
│     - Audit trail                     │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  5. Real-time Broadcast               │
│     - Supabase Realtime triggers      │
│     - All subscribed clients update   │
│     - Customer app updates            │
│     - Provider app updates            │
│     - Admin dashboard updates         │
└───────────────────────────────────────┘
```

## Implementation Details

### 1. Database Update
```typescript
await supabase
  .from('orders')
  .update({ 
    status: newStatus,
    updated_at: new Date().toISOString()
  })
  .eq('id', order.id)
```

### 2. Customer Notification
```typescript
await supabase.from('notifications').insert({
  user_id: order.customer_id,
  title: 'สถานะออเดอร์เปลี่ยนแปลง',
  message: `ออเดอร์ ${order.tracking_id} เปลี่ยนสถานะเป็น "${newStatus}"`,
  type: 'order_status',
  reference_id: order.id,
  reference_type: 'order'
})
```

### 3. Provider Notification
```typescript
await supabase.from('notifications').insert({
  user_id: order.provider_id,
  title: 'สถานะงานเปลี่ยนแปลง',
  message: `งาน ${order.tracking_id} เปลี่ยนสถานะเป็น "${newStatus}"`,
  type: 'order_status',
  reference_id: order.id,
  reference_type: 'order'
})
```

### 4. Activity Log
```typescript
await supabase.from('activity_logs').insert({
  user_id: admin_user_id,
  action: 'order_status_changed',
  entity_type: 'order',
  entity_id: order.id,
  details: {
    tracking_id: order.tracking_id,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: 'admin'
  }
})
```

### 5. Real-time Update
Supabase Realtime automatically broadcasts changes to all subscribed clients:

**Customer App:**
```typescript
supabase
  .channel('customer-orders')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `customer_id=eq.${userId}`
  }, (payload) => {
    // Update UI with new status
    updateOrderStatus(payload.new)
  })
  .subscribe()
```

**Provider App:**
```typescript
supabase
  .channel('provider-orders')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `provider_id=eq.${userId}`
  }, (payload) => {
    // Update UI with new status
    updateOrderStatus(payload.new)
  })
  .subscribe()
```

**Admin Dashboard:**
```typescript
// Auto-refresh every 30 seconds
// Plus manual refresh button
// Plus real-time subscription (optional)
```

## Status Transitions

### Valid Transitions
```
pending → matched → in_progress → completed
pending → cancelled
matched → cancelled
in_progress → cancelled
```

### Status Meanings

| Status | Thai | Customer View | Provider View | Admin Action |
|--------|------|---------------|---------------|--------------|
| `pending` | รอรับ | รอผู้ให้บริการ | มีงานใหม่ | จับคู่ provider |
| `matched` | จับคู่แล้ว | พบผู้ให้บริการแล้ว | รับงานแล้ว | รอเริ่มงาน |
| `in_progress` | กำลังดำเนินการ | กำลังดำเนินการ | กำลังทำงาน | ติดตามความคืบหน้า |
| `completed` | เสร็จสิ้น | เสร็จสิ้น | เสร็จสิ้น | ปิดงาน |
| `cancelled` | ยกเลิก | ยกเลิกแล้ว | ยกเลิกแล้ว | จัดการคืนเงิน |

## Error Handling

### Rollback Strategy
```typescript
// Store old status
const oldStatus = order.status

// Optimistic update
order.status = newStatus

try {
  // Update database
  await updateDatabase()
} catch (error) {
  // Rollback on error
  order.status = oldStatus
  alert('เกิดข้อผิดพลาด')
}
```

### Notification Failures
- Notifications are "best effort"
- If notification fails, order status still updates
- Error is logged but doesn't block the main flow
- User can check notifications later

## Testing Checklist

### Admin Side
- [ ] เปลี่ยนสถานะจาก dropdown
- [ ] เห็นการเปลี่ยนแปลงทันที (optimistic update)
- [ ] Confirmation dialog แสดงถูกต้อง
- [ ] Activity log บันทึกถูกต้อง

### Customer Side
- [ ] ได้รับ notification
- [ ] Order status อัพเดทใน app
- [ ] Order history แสดงสถานะใหม่
- [ ] Real-time update ทำงาน

### Provider Side
- [ ] ได้รับ notification
- [ ] Job status อัพเดทใน app
- [ ] Job list แสดงสถานะใหม่
- [ ] Real-time update ทำงาน

## Database Schema Requirements

### Tables Needed
```sql
-- orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
```

## Performance Considerations

1. **Optimistic Updates**: UI updates immediately for better UX
2. **Async Notifications**: Don't block main flow
3. **Batch Operations**: If changing multiple orders, batch the updates
4. **Real-time Throttling**: Limit update frequency to prevent spam
5. **Caching**: Cache user preferences for notifications

## Security

1. **RLS Policies**: Ensure proper row-level security
2. **Admin Verification**: Verify admin role before allowing status change
3. **Audit Trail**: All changes are logged with admin user ID
4. **Rate Limiting**: Prevent abuse of status changes

---

**Last Updated**: 2026-01-17
**Version**: 1.0
