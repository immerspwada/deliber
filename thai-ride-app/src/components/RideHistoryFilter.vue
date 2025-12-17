<script setup lang="ts">
/**
 * Feature: F302 - Ride History Filter
 * Filter options for ride history
 */
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'close': []
  'apply': [filters: { dateRange: string; status: string; type: string }]
}>()

const dateRange = ref('all')
const status = ref('all')
const rideType = ref('all')

const dateOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'today', label: 'วันนี้' },
  { value: 'week', label: '7 วันที่ผ่านมา' },
  { value: 'month', label: '30 วันที่ผ่านมา' }
]

const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' }
]

const typeOptions = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'ride', label: 'เรียกรถ' },
  { value: 'delivery', label: 'ส่งของ' },
  { value: 'shopping', label: 'ซื้อของ' }
]

const apply = () => {
  emit('apply', { dateRange: dateRange.value, status: status.value, type: rideType.value })
}

const reset = () => {
  dateRange.value = 'all'
  status.value = 'all'
  rideType.value = 'all'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="filter-overlay" @click="emit('close')">
        <div class="filter-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="title">กรองประวัติ</h3>
          
          <div class="filter-group">
            <label>ช่วงเวลา</label>
            <div class="options">
              <button
                v-for="opt in dateOptions"
                :key="opt.value"
                type="button"
                class="option"
                :class="{ active: dateRange === opt.value }"
                @click="dateRange = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
          
          <div class="filter-group">
            <label>สถานะ</label>
            <div class="options">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                type="button"
                class="option"
                :class="{ active: status === opt.value }"
                @click="status = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
          
          <div class="filter-group">
            <label>ประเภท</label>
            <div class="options">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                type="button"
                class="option"
                :class="{ active: rideType === opt.value }"
                @click="rideType = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
          
          <div class="actions">
            <button type="button" class="btn-reset" @click="reset">รีเซ็ต</button>
            <button type="button" class="btn-apply" @click="apply">ใช้ตัวกรอง</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.filter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.filter-sheet {
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

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  margin-bottom: 10px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option {
  padding: 8px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

.option.active {
  background: #000;
  color: #fff;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-reset, .btn-apply {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-reset {
  background: #f6f6f6;
  color: #000;
  border: none;
}

.btn-apply {
  background: #000;
  color: #fff;
  border: none;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .filter-sheet,
.slide-leave-to .filter-sheet {
  transform: translateY(100%);
}
</style>
