<!--
  Feature: F58 - Ride Status Tracker Component
  
  แสดงสถานะการเดินทางแบบ Timeline
  - แสดงขั้นตอนการเดินทาง
  - Highlight ขั้นตอนปัจจุบัน
  - แสดงเวลาแต่ละขั้นตอน
-->
<template>
  <div class="status-tracker">
    <div 
      v-for="(step, index) in steps" 
      :key="step.status"
      class="step"
      :class="{ 
        completed: isCompleted(step.status),
        current: isCurrent(step.status),
        upcoming: isUpcoming(step.status)
      }"
    >
      <!-- Step Icon -->
      <div class="step-icon">
        <svg v-if="isCompleted(step.status)" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <div v-else-if="isCurrent(step.status)" class="pulse-dot"></div>
        <div v-else class="empty-dot"></div>
      </div>

      <!-- Step Line -->
      <div v-if="index < steps.length - 1" class="step-line" :class="{ filled: isCompleted(step.status) }"></div>

      <!-- Step Content -->
      <div class="step-content">
        <div class="step-title">{{ step.label }}</div>
        <div class="step-description" v-if="step.description">{{ step.description }}</div>
        <div class="step-time" v-if="getStepTime(step.status)">
          {{ formatTime(getStepTime(step.status)!) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type RideStatus = 'pending' | 'matched' | 'arriving' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

interface Step {
  status: RideStatus
  label: string
  description?: string
}

interface Props {
  currentStatus: RideStatus
  matchedAt?: Date | string
  arrivingAt?: Date | string
  arrivedAt?: Date | string
  startedAt?: Date | string
  completedAt?: Date | string
}

const props = defineProps<Props>()

const steps: Step[] = [
  { status: 'pending', label: 'กำลังหาคนขับ', description: 'รอคนขับรับงาน' },
  { status: 'matched', label: 'คนขับรับงานแล้ว', description: 'กำลังเดินทางมารับ' },
  { status: 'arrived', label: 'คนขับถึงแล้ว', description: 'รอรับผู้โดยสาร' },
  { status: 'in_progress', label: 'กำลังเดินทาง', description: 'มุ่งหน้าสู่จุดหมาย' },
  { status: 'completed', label: 'ถึงจุดหมายแล้ว', description: 'เดินทางเสร็จสิ้น' }
]

const statusOrder: RideStatus[] = ['pending', 'matched', 'arriving', 'arrived', 'in_progress', 'completed']

const currentIndex = computed(() => {
  return statusOrder.indexOf(props.currentStatus)
})

const isCompleted = (status: RideStatus): boolean => {
  const stepIndex = statusOrder.indexOf(status)
  return stepIndex < currentIndex.value
}

const isCurrent = (status: RideStatus): boolean => {
  return status === props.currentStatus
}

const isUpcoming = (status: RideStatus): boolean => {
  const stepIndex = statusOrder.indexOf(status)
  return stepIndex > currentIndex.value
}

const getStepTime = (status: RideStatus): Date | null => {
  switch (status) {
    case 'matched':
      return props.matchedAt ? new Date(props.matchedAt) : null
    case 'arriving':
      return props.arrivingAt ? new Date(props.arrivingAt) : null
    case 'arrived':
      return props.arrivedAt ? new Date(props.arrivedAt) : null
    case 'in_progress':
      return props.startedAt ? new Date(props.startedAt) : null
    case 'completed':
      return props.completedAt ? new Date(props.completedAt) : null
    default:
      return null
  }
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.status-tracker {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.step {
  display: flex;
  position: relative;
  padding-bottom: 24px;
}

.step:last-child {
  padding-bottom: 0;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}

.step.completed .step-icon {
  background: #000000;
  color: #ffffff;
}

.step.current .step-icon {
  background: #000000;
}

.step.upcoming .step-icon {
  background: #e5e5e5;
}

.pulse-dot {
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.empty-dot {
  width: 8px;
  height: 8px;
  background: #cccccc;
  border-radius: 50%;
}

.step-line {
  position: absolute;
  left: 15px;
  top: 32px;
  width: 2px;
  height: calc(100% - 32px);
  background: #e5e5e5;
}

.step-line.filled {
  background: #000000;
}

.step-content {
  margin-left: 12px;
  padding-top: 4px;
}

.step-title {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
}

.step.upcoming .step-title {
  color: #cccccc;
}

.step-description {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 2px;
}

.step.upcoming .step-description {
  color: #cccccc;
}

.step-time {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 4px;
}

.step.current .step-title {
  color: #000000;
}

.step.current .step-description {
  color: #6b6b6b;
}
</style>
