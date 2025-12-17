<script setup lang="ts">
/**
 * Feature: F338 - Order Filter Sheet
 * Bottom sheet for filtering order history
 */
import { ref, computed } from 'vue'

interface FilterOptions {
  type: 'all' | 'delivery' | 'shopping'
  status: 'all' | 'completed' | 'cancelled'
  dateRange: 'all' | 'week' | 'month' | 'custom'
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  filters: FilterOptions
}>(), {
  filters: () => ({ type: 'all', status: 'all', dateRange: 'all' })
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'apply': [filters: FilterOptions]
  'reset': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const localFilters = ref<FilterOptions>({ ...props.filters })

const typeOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'delivery', label: 'ส่งของ' },
  { value: 'shopping', label: 'ซื้อของ' }
]

const statusOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'completed', label: 'สำเร็จ' },
  { value: 'cancelled', label: 'ยกเลิก' }
]

const dateOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'week', label: '7 วันที่ผ่านมา' },
  { value: 'month', label: '30 วันที่ผ่านมา' }
]

const handleApply = () => {
  emit('apply', localFilters.value)
  isOpen.value = false
}

const handleReset = () => {
  localFilters.value = { type: 'all', status: 'all', dateRange: 'all' }
  emit('reset')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen" class="sheet-overlay" @click.self="isOpen = false">
        <div class="sheet-content">
          <div class="sheet-handle" />
          
          <div class="sheet-header">
            <h2 class="sheet-title">กรองประวัติ</h2>
            <button type="button" class="reset-btn" @click="handleReset">รีเซ็ต</button>
          </div>

          <div class="sheet-body">
            <div class="filter-section">
              <h3 class="section-title">ประเภท</h3>
              <div class="options-row">
                <button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  type="button"
                  class="option-btn"
                  :class="{ active: localFilters.type === opt.value }"
                  @click="localFilters.type = opt.value as FilterOptions['type']"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="filter-section">
              <h3 class="section-title">สถานะ</h3>
              <div class="options-row">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  type="button"
                  class="option-btn"
                  :class="{ active: localFilters.status === opt.value }"
                  @click="localFilters.status = opt.value as FilterOptions['status']"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="filter-section">
              <h3 class="section-title">ช่วงเวลา</h3>
              <div class="options-row">
                <button
                  v-for="opt in dateOptions"
                  :key="opt.value"
                  type="button"
                  class="option-btn"
                  :class="{ active: localFilters.dateRange === opt.value }"
                  @click="localFilters.dateRange = opt.value as FilterOptions['dateRange']"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="sheet-footer">
            <button type="button" class="apply-btn" @click="handleApply">
              ใช้ตัวกรอง
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 80vh;
  overflow: hidden;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 8px auto;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 16px;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.reset-btn {
  font-size: 14px;
  color: #6b6b6b;
  background: none;
  border: none;
  cursor: pointer;
}

.sheet-body {
  padding: 0 16px;
}

.filter-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0 0 12px;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-btn {
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background: #e5e5e5;
}

.option-btn.active {
  background: #000;
  color: #fff;
}

.sheet-footer {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.apply-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s;
}

.sheet-enter-active .sheet-content,
.sheet-leave-active .sheet-content {
  transition: transform 0.3s;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-content,
.sheet-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
