<script setup lang="ts">
/**
 * Component: RideSchedulePicker
 * เลือกเวลาจองล่วงหน้า
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  scheduledTime?: string | null
}>()

const emit = defineEmits<{
  'update:scheduledTime': [time: string | null]
}>()

const isExpanded = ref(false)
const selectedDate = ref('')
const selectedTime = ref('')

// Generate available dates (today + 7 days)
const availableDates = computed(() => {
  const dates = []
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    
    dates.push({
      value: date.toISOString().split('T')[0],
      label: i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`,
      isToday: i === 0
    })
  }
  
  return dates
})

// Generate available times (every 30 minutes)
const availableTimes = computed(() => {
  const times = []
  const now = new Date()
  const isToday = selectedDate.value === availableDates.value[0]?.value
  
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      // Skip past times for today
      if (isToday) {
        const timeDate = new Date()
        timeDate.setHours(hour, minute, 0, 0)
        // Add 30 minutes buffer
        if (timeDate.getTime() < now.getTime() + 30 * 60 * 1000) {
          continue
        }
      }
      
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      times.push({
        value: timeStr,
        label: timeStr
      })
    }
  }
  
  return times
})

function handleSchedule(): void {
  if (selectedDate.value && selectedTime.value) {
    const dateTime = `${selectedDate.value}T${selectedTime.value}:00`
    emit('update:scheduledTime', dateTime)
    isExpanded.value = false
  }
}

function handleClear(): void {
  selectedDate.value = ''
  selectedTime.value = ''
  emit('update:scheduledTime', null)
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  let dateStr = ''
  if (date.toDateString() === today.toDateString()) {
    dateStr = 'วันนี้'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dateStr = 'พรุ่งนี้'
  } else {
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    dateStr = `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`
  }
  
  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} เวลา ${timeStr}`
}
</script>

<template>
  <div class="schedule-section">
    <!-- Scheduled Display -->
    <div v-if="scheduledTime" class="scheduled-display">
      <div class="schedule-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        <div class="schedule-details">
          <span class="schedule-label">จองล่วงหน้า</span>
          <span class="schedule-time">{{ formatScheduledTime(scheduledTime) }}</span>
        </div>
      </div>
      <button class="clear-btn" @click="handleClear" aria-label="ยกเลิกการจองล่วงหน้า">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Schedule Toggle -->
    <button 
      v-else-if="!isExpanded" 
      class="schedule-toggle"
      @click="isExpanded = true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <span>จองล่วงหน้า</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>

    <!-- Schedule Picker -->
    <Transition name="expand">
      <div v-if="isExpanded && !scheduledTime" class="schedule-picker">
        <div class="picker-header">
          <span>เลือกวันและเวลา</span>
          <button class="close-btn" @click="isExpanded = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Date Selection -->
        <div class="date-section">
          <label class="picker-label">วัน</label>
          <div class="date-chips">
            <button
              v-for="date in availableDates"
              :key="date.value"
              class="date-chip"
              :class="{ selected: selectedDate === date.value }"
              @click="selectedDate = date.value"
            >
              {{ date.label }}
            </button>
          </div>
        </div>

        <!-- Time Selection -->
        <div v-if="selectedDate" class="time-section">
          <label class="picker-label">เวลา</label>
          <div class="time-grid">
            <button
              v-for="time in availableTimes"
              :key="time.value"
              class="time-chip"
              :class="{ selected: selectedTime === time.value }"
              @click="selectedTime = time.value"
            >
              {{ time.label }}
            </button>
          </div>
        </div>

        <!-- Confirm Button -->
        <button 
          class="confirm-btn"
          :disabled="!selectedDate || !selectedTime"
          @click="handleSchedule"
        >
          ยืนยันเวลา
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.schedule-section {
  margin-bottom: 16px;
}

/* Scheduled Display */
.scheduled-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 1px solid #2196f3;
  border-radius: 12px;
}

.schedule-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.schedule-info svg {
  color: #1976d2;
}

.schedule-details {
  display: flex;
  flex-direction: column;
}

.schedule-label {
  font-size: 11px;
  color: #666;
}

.schedule-time {
  font-size: 14px;
  font-weight: 600;
  color: #1976d2;
}

.clear-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(25, 118, 210, 0.1);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976d2;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:active {
  background: rgba(25, 118, 210, 0.2);
  transform: scale(0.95);
}

/* Schedule Toggle */
.schedule-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.schedule-toggle:active {
  background: #e8e8e8;
}

.schedule-toggle svg:first-child {
  color: #1976d2;
}

.schedule-toggle span {
  flex: 1;
  text-align: left;
}

/* Schedule Picker */
.schedule-picker {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.picker-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

/* Date Section */
.date-section {
  margin-bottom: 16px;
}

.date-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-chip {
  padding: 8px 14px;
  background: #f5f5f5;
  border: 1px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.date-chip:active {
  transform: scale(0.98);
}

.date-chip.selected {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
  font-weight: 500;
}

/* Time Section */
.time-section {
  margin-bottom: 16px;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.time-chip {
  padding: 10px 8px;
  background: #f5f5f5;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 13px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.time-chip:active {
  transform: scale(0.98);
}

.time-chip.selected {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
  font-weight: 500;
}

/* Confirm Button */
.confirm-btn {
  width: 100%;
  padding: 14px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.confirm-btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Expand animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
