<script setup lang="ts">
/**
 * Feature: F354 - Provider Schedule Card
 * Working schedule card for providers
 */
interface Schedule {
  day: string
  enabled: boolean
  startTime: string
  endTime: string
}

const props = defineProps<{ schedules: Schedule[]; loading?: boolean }>()
const emit = defineEmits<{ (e: 'update', schedules: Schedule[]): void }>()

const dayNames: Record<string, string> = {
  monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ',
  thursday: 'พฤหัสบดี', friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์'
}

const toggleDay = (index: number) => {
  const updated = [...props.schedules]
  const item = updated[index]
  if (item) {
    item.enabled = !item.enabled
    emit('update', updated)
  }
}

const updateTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
  const updated = [...props.schedules]
  const item = updated[index]
  if (item) {
    item[field] = value
    emit('update', updated)
  }
}
</script>

<template>
  <div class="provider-schedule-card">
    <div class="card-header">
      <h3 class="card-title">ตารางเวลาทำงาน</h3>
      <span class="card-hint">เลือกวันและเวลาที่ต้องการรับงาน</span>
    </div>

    <div class="schedule-list">
      <div v-for="(schedule, index) in schedules" :key="schedule.day" class="schedule-item" :class="{ disabled: !schedule.enabled }">
        <label class="day-toggle">
          <input type="checkbox" :checked="schedule.enabled" @change="toggleDay(index)" />
          <span class="day-name">{{ dayNames[schedule.day] || schedule.day }}</span>
        </label>
        
        <div v-if="schedule.enabled" class="time-inputs">
          <input type="time" :value="schedule.startTime" class="time-input" @input="updateTime(index, 'startTime', ($event.target as HTMLInputElement).value)" />
          <span class="time-separator">-</span>
          <input type="time" :value="schedule.endTime" class="time-input" @input="updateTime(index, 'endTime', ($event.target as HTMLInputElement).value)" />
        </div>
        <span v-else class="off-label">หยุด</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-schedule-card { background: #fff; border-radius: 12px; padding: 16px; }
.card-header { margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 4px; }
.card-hint { font-size: 13px; color: #6b6b6b; }
.schedule-list { display: flex; flex-direction: column; gap: 12px; }
.schedule-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f6f6f6; border-radius: 8px; transition: opacity 0.2s; }
.schedule-item.disabled { opacity: 0.6; }
.day-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.day-toggle input { width: 18px; height: 18px; accent-color: #000; }
.day-name { font-size: 14px; font-weight: 500; color: #000; }
.time-inputs { display: flex; align-items: center; gap: 8px; }
.time-input { padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 13px; background: #fff; }
.time-separator { color: #6b6b6b; }
.off-label { font-size: 13px; color: #6b6b6b; }
</style>
