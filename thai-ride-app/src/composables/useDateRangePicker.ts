/**
 * useDateRangePicker - Date Range Selection
 * Feature: F180 - Date Range Picker for Reports
 */

import { ref, computed } from 'vue'

export interface DateRange {
  from: string
  to: string
  label: string
}

export function useDateRangePicker() {
  const selectedRange = ref<DateRange | null>(null)
  const customFrom = ref('')
  const customTo = ref('')

  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const presetRanges = computed<DateRange[]>(() => {
    const t = new Date()
    return [
      { from: formatDate(t), to: formatDate(t), label: 'วันนี้' },
      { from: formatDate(new Date(t.getTime() - 86400000)), to: formatDate(new Date(t.getTime() - 86400000)), label: 'เมื่อวาน' },
      { from: formatDate(new Date(t.getTime() - 7 * 86400000)), to: formatDate(t), label: '7 วันที่ผ่านมา' },
      { from: formatDate(new Date(t.getTime() - 30 * 86400000)), to: formatDate(t), label: '30 วันที่ผ่านมา' },
      { from: formatDate(new Date(t.getFullYear(), t.getMonth(), 1)), to: formatDate(t), label: 'เดือนนี้' },
      { from: formatDate(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: formatDate(new Date(t.getFullYear(), t.getMonth(), 0)), label: 'เดือนที่แล้ว' },
      { from: formatDate(new Date(t.getFullYear(), 0, 1)), to: formatDate(t), label: 'ปีนี้' }
    ]
  })

  const selectPreset = (range: DateRange) => { selectedRange.value = range }
  const selectCustom = () => {
    if (customFrom.value && customTo.value) {
      selectedRange.value = { from: customFrom.value, to: customTo.value, label: 'กำหนดเอง' }
    }
  }
  const clear = () => { selectedRange.value = null; customFrom.value = ''; customTo.value = '' }

  const rangeText = computed(() => {
    if (!selectedRange.value) return 'เลือกช่วงเวลา'
    return selectedRange.value.label
  })

  return { selectedRange, customFrom, customTo, presetRanges, selectPreset, selectCustom, clear, rangeText }
}
