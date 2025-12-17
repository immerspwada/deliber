<script setup lang="ts">
/**
 * Feature: F211 - Ride Request List
 * List of ride requests for provider
 */
interface RideRequest {
  id: string
  pickup: string
  dropoff: string
  distance: number
  estimatedFare: number
  passengerName: string
  passengerRating?: number
  vehicleType: string
  createdAt: string
}

defineProps<{
  requests: RideRequest[]
  loading?: boolean
}>()

const emit = defineEmits<{
  accept: [id: string]
  decline: [id: string]
  viewDetails: [id: string]
}>()

const formatTime = (date: string) => {
  const d = new Date(date)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="ride-request-list">
    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <span>กำลังค้นหางาน...</span>
    </div>

    <div v-else-if="requests.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/>
      </svg>
      <p>ไม่มีงานใหม่ในขณะนี้</p>
    </div>

    <div v-else class="requests">
      <div v-for="req in requests" :key="req.id" class="request-card" @click="emit('viewDetails', req.id)">
        <div class="request-header">
          <span class="request-time">{{ formatTime(req.createdAt) }}</span>
          <span class="request-fare">฿{{ req.estimatedFare.toLocaleString() }}</span>
        </div>

        <div class="request-route">
          <div class="route-point pickup">
            <span class="point-dot" />
            <span class="point-text">{{ req.pickup }}</span>
          </div>
          <div class="route-line" />
          <div class="route-point dropoff">
            <span class="point-dot" />
            <span class="point-text">{{ req.dropoff }}</span>
          </div>
        </div>

        <div class="request-info">
          <span class="info-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {{ req.passengerName }}
          </span>
          <span class="info-item">{{ req.distance.toFixed(1) }} กม.</span>
          <span class="info-item">{{ req.vehicleType }}</span>
        </div>

        <div class="request-actions">
          <button type="button" class="btn-decline" @click.stop="emit('decline', req.id)">ปฏิเสธ</button>
          <button type="button" class="btn-accept" @click.stop="emit('accept', req.id)">รับงาน</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ride-request-list { display: flex; flex-direction: column; gap: 12px; }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; color: #6b6b6b; gap: 12px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.requests { display: flex; flex-direction: column; gap: 12px; }
.request-card { background: #fff; border-radius: 16px; padding: 16px; border: 1px solid #e5e5e5; cursor: pointer; transition: all 0.2s; }
.request-card:hover { border-color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.request-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.request-time { font-size: 12px; color: #6b6b6b; }
.request-fare { font-size: 18px; font-weight: 700; color: #000; }
.request-route { margin-bottom: 12px; }
.route-point { display: flex; align-items: center; gap: 10px; }
.point-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pickup .point-dot { background: #10b981; }
.dropoff .point-dot { background: #ef4444; }
.point-text { font-size: 14px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.route-line { width: 2px; height: 16px; background: #e5e5e5; margin-left: 4px; }
.request-info { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.info-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #6b6b6b; }
.request-actions { display: flex; gap: 12px; }
.btn-decline, .btn-accept { flex: 1; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-decline { background: #f6f6f6; color: #000; border: none; }
.btn-decline:hover { background: #e5e5e5; }
.btn-accept { background: #000; color: #fff; border: none; }
.btn-accept:hover { background: #333; }
</style>
