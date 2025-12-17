<script setup lang="ts">
/**
 * Feature: F215 - Daily Goal Card
 * Provider daily goal progress
 */
defineProps<{
  currentTrips: number
  goalTrips: number
  currentEarnings: number
  goalEarnings: number
  bonusAmount?: number
}>()

const getProgress = (current: number, goal: number) => Math.min((current / goal) * 100, 100)
</script>

<template>
  <div class="daily-goal-card">
    <div class="goal-header">
      <h3 class="goal-title">เป้าหมายวันนี้</h3>
      <span v-if="bonusAmount && currentTrips >= goalTrips" class="bonus-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        +฿{{ bonusAmount }}
      </span>
    </div>

    <div class="goal-item">
      <div class="goal-info">
        <span class="goal-label">จำนวนเที่ยว</span>
        <span class="goal-value">{{ currentTrips }}/{{ goalTrips }}</span>
      </div>
      <div class="goal-bar">
        <div class="goal-fill" :style="{ width: `${getProgress(currentTrips, goalTrips)}%` }" />
      </div>
    </div>

    <div class="goal-item">
      <div class="goal-info">
        <span class="goal-label">รายได้</span>
        <span class="goal-value">฿{{ currentEarnings.toLocaleString() }}/฿{{ goalEarnings.toLocaleString() }}</span>
      </div>
      <div class="goal-bar">
        <div class="goal-fill" :style="{ width: `${getProgress(currentEarnings, goalEarnings)}%` }" />
      </div>
    </div>

    <p v-if="currentTrips < goalTrips" class="goal-hint">
      อีก {{ goalTrips - currentTrips }} เที่ยว รับโบนัส ฿{{ bonusAmount || 0 }}
    </p>
    <p v-else class="goal-complete">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      ทำเป้าหมายสำเร็จแล้ว!
    </p>
  </div>
</template>

<style scoped>
.daily-goal-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #e5e5e5; }
.goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.goal-title { font-size: 16px; font-weight: 700; color: #000; margin: 0; }
.bonus-badge { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #f59e0b; background: #fef3c7; padding: 4px 10px; border-radius: 12px; }
.goal-item { margin-bottom: 16px; }
.goal-info { display: flex; justify-content: space-between; margin-bottom: 8px; }
.goal-label { font-size: 13px; color: #6b6b6b; }
.goal-value { font-size: 14px; font-weight: 600; color: #000; }
.goal-bar { height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; }
.goal-fill { height: 100%; background: #000; border-radius: 4px; transition: width 0.3s; }
.goal-hint { font-size: 13px; color: #6b6b6b; margin: 0; text-align: center; }
.goal-complete { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: #10b981; margin: 0; }
</style>
