<script setup lang="ts">
/**
 * Feature: F184 - Online Hours Card
 * Display provider online hours summary
 */

interface Props {
  todayHours: number
  weeklyHours: number
  weeklyGoal?: number
  isOnline?: boolean
}

withDefaults(defineProps<Props>(), {
  weeklyGoal: 40,
  isOnline: false
})

const formatHours = (hours: number) => {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}ชม. ${m}น.` : `${h}ชม.`
}

const getProgress = (current: number, goal: number) => {
  return Math.min((current / goal) * 100, 100)
}
</script>

<template>
  <div class="online-hours-card">
    <div class="card-header">
      <h3 class="card-title">ชั่วโมงออนไลน์</h3>
      <span class="status-badge" :class="{ online: isOnline }">
        {{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}
      </span>
    </div>
    
    <div class="hours-grid">
      <div class="hours-item">
        <span class="hours-value">{{ formatHours(todayHours) }}</span>
        <span class="hours-label">วันนี้</span>
      </div>
      <div class="hours-divider"></div>
      <div class="hours-item">
        <span class="hours-value">{{ formatHours(weeklyHours) }}</span>
        <span class="hours-label">สัปดาห์นี้</span>
      </div>
    </div>
    
    <div class="progress-section">
      <div class="progress-header">
        <span class="progress-label">เป้าหมายรายสัปดาห์</span>
        <span class="progress-value">{{ formatHours(weeklyHours) }} / {{ weeklyGoal }}ชม.</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${getProgress(weeklyHours, weeklyGoal)}%` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.online-hours-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  background: #f6f6f6;
  color: #6b6b6b;
  border-radius: 12px;
}

.status-badge.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.hours-grid {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.hours-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hours-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.hours-label {
  font-size: 12px;
  color: #6b6b6b;
}

.hours-divider {
  width: 1px;
  height: 40px;
  background: #e5e5e5;
}

.progress-section {
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 12px;
  color: #6b6b6b;
}

.progress-value {
  font-size: 12px;
  font-weight: 600;
  color: #000;
}

.progress-bar {
  height: 8px;
  background: #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #000;
  border-radius: 4px;
  transition: width 0.3s;
}
</style>