<script setup lang="ts">
/**
 * Feature: F320 - Delivery Time Slot
 * Component for selecting delivery time slot
 */
import { ref, computed } from 'vue'

interface TimeSlot {
  id: string
  label: string
  time: string
  available: boolean
  surcharge?: number
}

const props = withDefaults(defineProps<{
  modelValue?: string
  date?: Date
}>(), {
  date: () => new Date()
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'dateChange': [date: Date]
}>()

const selectedDate = ref(0) // 0 = today, 1 = tomorrow, etc.

const dates = computed(() => {
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(props.date)
    d.setDate(d.getDate() + i)
    result.push({
      index: i,
      day: i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : d.toLocaleDateString('th-TH', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('th-TH', { month: 'short' })
    })
  }
  return result
})

const timeSlots: TimeSlot[] = [
  { id: 'asap', label: 'เร็วที่สุด', time: '30-45 นาที', available: true },
  { id: 'morning', label: 'ช่วงเช้า', time: '09:00 - 12:00', available: true },
  { id: 'afternoon', label: 'ช่วงบ่าย', time: '12:00 - 15:00', available: true },
  { id: 'evening', label: 'ช่วงเย็น', time: '15:00 - 18:00', available: true },
  { id: 'night', label: 'ช่วงค่ำ', time: '18:00 - 21:00', available: true, surcharge: 20 }
]

const selectDate = (index: number) => {
  selectedDate.value = index
  const d = new Date(props.date)
  d.setDate(d.getDate() + index)
  emit('dateChange', d)
}

const selectSlot = (slot: TimeSlot) => {
  if (!slot.available) return
  emit('update:modelValue', slot.id)
}
</script>

<template>
  <div class="time-slot-picker">
    <div class="section-header">
      <h3 class="section-title">เลือกวันจัดส่ง</h3>
    </div>

    <div class="date-scroll">
      <button
        v-for="d in dates"
        :key="d.index"
        type="button"
        class="date-btn"
        :class="{ active: selectedDate === d.index }"
        @click="selectDate(d.index)"
      >
        <span class="date-day">{{ d.day }}</span>
        <span class="date-num">{{ d.date }}</span>
        <span class="date-month">{{ d.month }}</span>
      </button>
    </div>

    <div class="section-header">
      <h3 class="section-title">เลือกช่วงเวลา</h3>
    </div>

    <div class="slots-list">
      <button
        v-for="slot in timeSlots"
        :key="slot.id"
        type="button"
        class="slot-btn"
        :class="{ active: modelValue === slot.id, disabled: !slot.available }"
        :disabled="!slot.available"
        @click="selectSlot(slot)"
      >
        <div class="slot-info">
          <span class="slot-label">{{ slot.label }}</span>
          <span class="slot-time">{{ slot.time }}</span>
        </div>
        <div class="slot-extra">
          <span v-if="slot.surcharge" class="slot-surcharge">+฿{{ slot.surcharge }}</span>
          <div class="slot-radio">
            <svg v-if="modelValue === slot.id" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div v-else class="radio-circle" />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.time-slot-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  margin-bottom: -8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.date-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.date-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  min-width: 72px;
  transition: all 0.2s;
}

.date-btn:hover {
  background: #e5e5e5;
}

.date-btn.active {
  background: #000;
  border-color: #000;
}

.date-day {
  font-size: 12px;
  color: #6b6b6b;
}

.date-btn.active .date-day {
  color: rgba(255, 255, 255, 0.7);
}

.date-num {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  line-height: 1.2;
}

.date-btn.active .date-num {
  color: #fff;
}

.date-month {
  font-size: 11px;
  color: #6b6b6b;
}

.date-btn.active .date-month {
  color: rgba(255, 255, 255, 0.7);
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.slot-btn:hover:not(:disabled) {
  border-color: #000;
}

.slot-btn.active {
  border-color: #000;
  background: #f6f6f6;
}

.slot-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slot-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slot-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.slot-time {
  font-size: 13px;
  color: #6b6b6b;
}

.slot-extra {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slot-surcharge {
  font-size: 13px;
  font-weight: 500;
  color: #e11900;
}

.slot-radio {
  color: #000;
}

.radio-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
}
</style>
