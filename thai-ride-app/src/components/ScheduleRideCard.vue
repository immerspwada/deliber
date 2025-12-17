<script setup lang="ts">
/**
 * Feature: F137 - Schedule Ride Card
 * Display scheduled ride info
 */

interface Props {
  id: string
  pickup: string
  destination: string
  scheduledAt: string
  vehicleType?: string
  estimatedPrice?: number
  status: 'scheduled' | 'confirmed' | 'cancelled'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [id: string]
  cancel: [id: string]
  view: [id: string]
}>()

const formatDateTime = (date: string) => {
  const d = new Date(date)
  return {
    date: d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
}

const statusConfig = {
  scheduled: { label: 'รอดำเนินการ', class: 'pending' },
  confirmed: { label: 'ยืนยันแล้ว', class: 'confirmed' },
  cancelled: { label: 'ยกเลิก', class: 'cancelled' }
}
</script>

<template>
  <div class="schedule-card" :class="status" @click="emit('view', id)">
    <div class="card-time">
      <div class="time-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div class="time-info">
        <span class="time-date">{{ formatDateTime(scheduledAt).date }}</span>
        <span class="time-value">{{ formatDateTime(scheduledAt).time }}</span>
      </div>
      <span class="status-badge" :class="statusConfig[status].class">
        {{ statusConfig[status].label }}
      </span>
    </div>

    <div class="card-route">
      <div class="route-point">
        <div class="point-dot pickup" />
        <span>{{ pickup }}</span>
      </div>
      <div class="route-point">
        <div class="point-dot destination" />
        <span>{{ destination }}</span>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="footer-info">
        <span v-if="vehicleType" class="vehicle-type">{{ vehicleType }}</span>
        <span v-if="estimatedPrice" class="price">~฿{{ estimatedPrice.toLocaleString() }}</span>
      </div>
      <div v-if="status !== 'cancelled'" class="footer-actions">
        <button type="button" class="action-btn" @click.stop="emit('edit', id)">แก้ไข</button>
        <button type="button" class="action-btn danger" @click.stop="emit('cancel', id)">ยกเลิก</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.schedule-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.schedule-card.cancelled {
  opacity: 0.6;
}

.card-time {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.time-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #000;
}

.time-info {
  flex: 1;
}

.time-date {
  font-size: 13px;
  color: #6b6b6b;
  display: block;
}

.time-value {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.status-badge.pending { background: #fff3e0; color: #ef6c00; }
.status-badge.confirmed { background: #e8f5e9; color: #2e7d32; }
.status-badge.cancelled { background: #f5f5f5; color: #6b6b6b; }

.card-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #000;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.pickup { background: #000; }
.point-dot.destination { border: 2px solid #6b6b6b; }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vehicle-type {
  font-size: 13px;
  color: #6b6b6b;
}

.price {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn:hover { background: #e5e5e5; }
.action-btn.danger { color: #c62828; }
.action-btn.danger:hover { background: #ffebee; }
</style>
