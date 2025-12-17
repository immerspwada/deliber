<script setup lang="ts">
/**
 * Feature: F397 - Calendar
 * Calendar component
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: Date
  events?: Array<{ date: string; title: string; color?: string }>
}>(), {
  events: () => []
})

const emit = defineEmits<{ (e: 'update:modelValue', date: Date): void; (e: 'select', date: Date): void }>()

const currentDate = ref(new Date())
const viewDate = ref(new Date())

const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())

const days = computed(() => {
  const firstDay = new Date(year.value, month.value, 1).getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const result: Array<{ date: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; events: typeof props.events }> = []
  
  const prevMonthDays = new Date(year.value, month.value, 0).getDate()
  for (let i = firstDay - 1; i >= 0; i--) {
    result.push({ date: prevMonthDays - i, isCurrentMonth: false, isToday: false, isSelected: false, events: [] })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const isToday = i === currentDate.value.getDate() && month.value === currentDate.value.getMonth() && year.value === currentDate.value.getFullYear()
    const isSelected = props.modelValue && i === props.modelValue.getDate() && month.value === props.modelValue.getMonth() && year.value === props.modelValue.getFullYear()
    result.push({ date: i, isCurrentMonth: true, isToday, isSelected: !!isSelected, events: props.events.filter(e => e.date === dateStr) })
  }
  
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    result.push({ date: i, isCurrentMonth: false, isToday: false, isSelected: false, events: [] })
  }
  
  return result
})

const prevMonth = () => { viewDate.value = new Date(year.value, month.value - 1, 1) }
const nextMonth = () => { viewDate.value = new Date(year.value, month.value + 1, 1) }
const selectDate = (day: typeof days.value[0]) => {
  if (!day.isCurrentMonth) return
  const date = new Date(year.value, month.value, day.date)
  emit('update:modelValue', date)
  emit('select', date)
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button type="button" class="nav-btn" @click="prevMonth">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="month-year">{{ monthNames[month] }} {{ year + 543 }}</span>
      <button type="button" class="nav-btn" @click="nextMonth">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <div class="calendar-days">
      <div v-for="d in dayNames" :key="d" class="day-name">{{ d }}</div>
    </div>
    <div class="calendar-grid">
      <div v-for="(day, i) in days" :key="i" class="day-cell" :class="{ 'other-month': !day.isCurrentMonth, today: day.isToday, selected: day.isSelected }" @click="selectDate(day)">
        <span class="day-num">{{ day.date }}</span>
        <div v-if="day.events.length" class="day-events">
          <span v-for="(ev, j) in day.events.slice(0, 2)" :key="j" class="event-dot" :style="{ background: ev.color || '#276EF1' }"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; }
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.nav-btn { background: none; border: none; padding: 4px; cursor: pointer; color: #6b6b6b; }
.month-year { font-size: 16px; font-weight: 600; color: #000; }
.calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 8px; }
.day-name { text-align: center; font-size: 12px; color: #6b6b6b; padding: 8px 0; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.day-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; }
.day-cell:hover { background: #f6f6f6; }
.day-cell.other-month { opacity: 0.3; }
.day-cell.today .day-num { background: #f6f6f6; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.day-cell.selected .day-num { background: #000; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.day-num { font-size: 14px; color: #000; }
.day-events { display: flex; gap: 2px; margin-top: 2px; }
.event-dot { width: 4px; height: 4px; border-radius: 50%; }
</style>
