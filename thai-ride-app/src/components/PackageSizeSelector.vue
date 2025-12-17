<script setup lang="ts">
/**
 * Feature: F322 - Package Size Selector
 * Component for selecting package size
 */
interface PackageSize {
  id: string
  name: string
  dimensions: string
  example: string
  icon: 'small' | 'medium' | 'large' | 'xlarge'
}

const props = withDefaults(defineProps<{
  modelValue?: string
  sizes?: PackageSize[]
}>(), {
  sizes: () => [
    { id: 'small', name: 'เล็ก', dimensions: 'ไม่เกิน 20x20x10 ซม.', example: 'เอกสาร, โทรศัพท์', icon: 'small' },
    { id: 'medium', name: 'กลาง', dimensions: 'ไม่เกิน 40x30x20 ซม.', example: 'กล่องรองเท้า, หนังสือ', icon: 'medium' },
    { id: 'large', name: 'ใหญ่', dimensions: 'ไม่เกิน 60x40x40 ซม.', example: 'กล่องพัสดุ, เครื่องใช้ไฟฟ้า', icon: 'large' },
    { id: 'xlarge', name: 'ใหญ่พิเศษ', dimensions: 'เกิน 60x40x40 ซม.', example: 'เฟอร์นิเจอร์, จักรยาน', icon: 'xlarge' }
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectSize = (size: PackageSize) => {
  emit('update:modelValue', size.id)
}
</script>

<template>
  <div class="size-selector">
    <h3 class="section-title">ขนาดพัสดุ</h3>
    
    <div class="sizes-grid">
      <button
        v-for="size in sizes"
        :key="size.id"
        type="button"
        class="size-card"
        :class="{ active: modelValue === size.id }"
        @click="selectSize(size)"
      >
        <div class="size-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
          </svg>
        </div>
        <span class="size-name">{{ size.name }}</span>
        <span class="size-dims">{{ size.dimensions }}</span>
        <span class="size-example">{{ size.example }}</span>
        <div v-if="modelValue === size.id" class="check-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.size-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.sizes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.size-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  position: relative;
  transition: all 0.2s;
}

.size-card:hover {
  border-color: #000;
}

.size-card.active {
  border-color: #000;
  background: #f6f6f6;
}

.size-icon {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  margin-bottom: 8px;
}

.size-card.active .size-icon {
  background: #fff;
}

.size-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.size-dims {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}

.size-example {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 4px;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #000;
}
</style>
