<script setup lang="ts">
/**
 * Feature: F163 - Provider Stats Card
 * Display provider statistics summary
 */

interface Props {
  totalTrips: number
  totalEarnings: number
  rating: number
  acceptanceRate: number
  completionRate: number
  onlineHours: number
  period?: string
}

withDefaults(defineProps<Props>(), {
  period: 'วันนี้'
})
</script>

<template>
  <div class="provider-stats-card">
    <div class="stats-header">
      <h3 class="stats-title">สรุปผลงาน</h3>
      <span class="stats-period">{{ period }}</span>
    </div>
    
    <div class="main-stats">
      <div class="stat-item primary">
        <span class="stat-value">฿{{ totalEarnings.toLocaleString() }}</span>
        <span class="stat-label">รายได้</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalTrips }}</span>
        <span class="stat-label">เที่ยว</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ onlineHours }}h</span>
        <span class="stat-label">ออนไลน์</span>
      </div>
    </div>
    
    <div class="performance-stats">
      <div class="perf-item">
        <div class="perf-header">
          <span class="perf-label">คะแนน</span>
          <span class="perf-value">{{ rating.toFixed(1) }}</span>
        </div>
        <div class="perf-bar">
          <div class="perf-fill" :style="{ width: `${rating / 5 * 100}%` }"></div>
        </div>
      </div>
</template>

      <div class="perf-item">
        <div class="perf-header">
          <span class="perf-label">อัตราการรับงาน</span>
          <span class="perf-value">{{ acceptanceRate }}%</span>
        </div>
        <div class="perf-bar">
          <div class="perf-fill" :style="{ width: `${acceptanceRate}%` }"></div>
        </div>
      </div>
      
      <div class="perf-item">
        <div class="perf-header">
          <span class="perf-label">อัตราการทำสำเร็จ</span>
          <span class="perf-value">{{ completionRate }}%</span>
        </div>
        <div class="perf-bar">
          <div class="perf-fill" :style="{ width: `${completionRate}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-stats-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.stats-period {
  font-size: 12px;
  color: #6b6b6b;
  padding: 4px 10px;
  background: #f6f6f6;
  border-radius: 12px;
}

.main-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px;
  background: #f6f6f6;
  border-radius: 10px;
}

.stat-item.primary {
  background: #000;
}

.stat-item.primary .stat-value,
.stat-item.primary .stat-label {
  color: #fff;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.stat-label {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}

.performance-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.perf-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.perf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perf-label {
  font-size: 13px;
  color: #6b6b6b;
}

.perf-value {
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.perf-bar {
  height: 6px;
  background: #e5e5e5;
  border-radius: 3px;
  overflow: hidden;
}

.perf-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
  transition: width 0.3s;
}
</style>