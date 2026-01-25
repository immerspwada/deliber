<template>
  <div v-if="availableJobs.length > 0" class="job-notifications">
    <div class="notification-header">
      <h3 class="text-lg font-semibold text-gray-900">งานใหม่ ({{ availableJobs.length }})</h3>
      <div class="pulse-indicator"></div>
    </div>
    
    <div class="jobs-list">
      <div 
        v-for="job in availableJobs.slice(0, 3)" 
        :key="job.id"
        class="job-card"
        @click="$emit('acceptJob', job)"
      >
        <div class="job-info">
          <div class="job-type">{{ getJobTypeLabel(job.type) }}</div>
          <div class="job-pickup">📍 {{ job.pickup_address }}</div>
          <div v-if="job.destination_address" class="job-destination">
            🏁 {{ job.destination_address }}
          </div>
          <div class="job-details">
            <span class="fare">฿{{ job.estimated_fare }}</span>
            <span v-if="job.distance" class="distance">{{ job.distance.toFixed(1) }} km</span>
          </div>
        </div>
        <button class="accept-btn">รับงาน</button>
      </div>
    </div>
    
    <div v-if="availableJobs.length > 3" class="more-jobs">
      <button class="view-all-btn" @click="$emit('viewAllJobs')">
        ดูงานทั้งหมด ({{ availableJobs.length }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JobRequest } from '../../composables/useProviderJobPool'

defineProps<{
  availableJobs: JobRequest[]
}>()

defineEmits<{
  acceptJob: [job: JobRequest]
  viewAllJobs: []
}>()

function getJobTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ride: '🚗 รับส่ง',
    delivery: '📦 ส่งของ',
    shopping: '🛒 ช้อปปิ้ง',
    moving: '📦 ขนย้าย',
    laundry: '👕 ซักรีด'
  }
  return labels[type] || type
}
</script>

<style scoped>
.job-notifications {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 16px 0;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pulse-indicator {
  width: 12px;
  height: 12px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.job-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.job-info {
  flex: 1;
}

.job-type {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.job-pickup, .job-destination {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.job-details {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.fare {
  font-size: 16px;
  font-weight: 700;
  color: #4ade80;
}

.distance {
  font-size: 12px;
  opacity: 0.8;
}

.accept-btn {
  background: #4ade80;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.accept-btn:hover {
  background: #22c55e;
  transform: scale(1.05);
}

.more-jobs {
  margin-top: 16px;
  text-align: center;
}

.view-all-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>