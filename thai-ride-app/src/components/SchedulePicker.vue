<script setup lang="ts">
/**
 * Feature: F304 - Schedule Picker
 * Date and time picker for scheduled rides
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  minDate?: Date
}>()

const emit = defineEmits<{
  'close': []
  'confirm': [datetime: Date]
}>()

const selectedDate = ref(new Date())
const selectedHour = ref(new Date().getHours())
const selectedMinute = ref(Math.ceil(new Date().getMinutes() / 15) * 15)

const dates = computed(() => {
  const result = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    result.push(date)
  }
  return result
})

const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = [0, 15, 30, 45]

const formatDate = (date: Date) => {
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'วันนี้'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'พรุ่งนี้'
  return date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}

const confirm = () => {
  const datetime = new Date(selectedDate.value)
  datetime.setHours(selectedHour.value, selectedMinute.value, 0, 0)
  emit('confirm', datetime)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="picker-overlay" @click="emit('close')">
        <div class="picker-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="title">เลือกวันและเวลา</h3>
          
          <div class="date-section">
            <label>วันที่</label>
            <div class="date-scroll">
              <button
                v-for="date in dates"
                :key="date.toISOString()"
                type="button"
                class="date-btn"
                :class="{ active: date.toDateString() === selectedDate.toDateString() }"
                @click="selectedDate = date"
              >
                {{ formatDate(date) }}
              </button>
            </div>
          </div>
          
          <div class="time-section">
            <label>เวลา</label>
            <div class="time-pickers">
              <select v-model="selectedHour" class="time-select">
                <option v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}</option>
              </select>
              <span class="time-sep">:</span>
              <select v-model="selectedMinute" class="time-select">
                <option v-for="m in minutes" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
              </select>
            </div>
          </div>
          
          <button type="button" class="btn-confirm" @click="confirm">
            ยืนยัน
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.picker-sheet {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
}

.date-section, .time-section {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  margin-bottom: 10px;
}

.date-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.date-btn {
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.date-btn.active {
  background: #000;
  color: #fff;
}

.time-pickers {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-select {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  appearance: none;
  background: #fff;
}

.time-sep {
  font-size: 24px;
  font-weight: 600;
}

.btn-confirm {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .picker-sheet,
.slide-leave-to .picker-sheet {
  transform: translateY(100%);
}
</style>
