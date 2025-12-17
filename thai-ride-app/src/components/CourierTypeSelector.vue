<script setup lang="ts">
/**
 * Feature: F321 - Courier Type Selector
 * Component for selecting courier/delivery type
 */
interface CourierType {
  id: string
  name: string
  description: string
  price: number
  eta: string
  maxWeight: string
  icon: 'bike' | 'car' | 'truck'
}

const props = withDefaults(defineProps<{
  modelValue?: string
  types?: CourierType[]
}>(), {
  types: () => [
    { id: 'bike', name: 'มอเตอร์ไซค์', description: 'เหมาะสำหรับพัสดุขนาดเล็ก', price: 35, eta: '30-45 นาที', maxWeight: '5 กก.', icon: 'bike' },
    { id: 'car', name: 'รถยนต์', description: 'เหมาะสำหรับพัสดุขนาดกลาง', price: 80, eta: '45-60 นาที', maxWeight: '20 กก.', icon: 'car' },
    { id: 'truck', name: 'รถกระบะ', description: 'เหมาะสำหรับพัสดุขนาดใหญ่', price: 200, eta: '60-90 นาที', maxWeight: '100 กก.', icon: 'truck' }
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectType = (type: CourierType) => {
  emit('update:modelValue', type.id)
}
</script>

<template>
  <div class="courier-selector">
    <h3 class="section-title">เลือกประเภทการจัดส่ง</h3>
    
    <div class="types-list">
      <button
        v-for="type in types"
        :key="type.id"
        type="button"
        class="type-card"
        :class="{ active: modelValue === type.id }"
        @click="selectType(type)"
      >
        <div class="type-icon">
          <svg v-if="type.icon === 'bike'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
            <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h3"/>
          </svg>
          <svg v-else-if="type.icon === 'car'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 6l2 4h2a2 2 0 012 2v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H8a2 2 0 01-4 0H3a1 1 0 01-1-1v-4a2 2 0 012-2h2l2-4h8z"/>
            <circle cx="6.5" cy="17" r="1.5"/><circle cx="17.5" cy="17" r="1.5"/>
          </svg>
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>

        <div class="type-info">
          <h4 class="type-name">{{ type.name }}</h4>
          <p class="type-desc">{{ type.description }}</p>
          <div class="type-meta">
            <span class="type-weight">สูงสุด {{ type.maxWeight }}</span>
            <span class="type-eta">{{ type.eta }}</span>
          </div>
        </div>
        
        <div class="type-price">
          <span class="price-label">เริ่มต้น</span>
          <span class="price-value">฿{{ type.price }}</span>
        </div>
        
        <div class="select-indicator">
          <svg v-if="modelValue === type.id" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div v-else class="radio-circle" />
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.courier-selector {
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

.types-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.type-card:hover {
  border-color: #000;
}

.type-card.active {
  border-color: #000;
  background: #f6f6f6;
}

.type-icon {
  width: 56px;
  height: 56px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  flex-shrink: 0;
}

.type-card.active .type-icon {
  background: #fff;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 2px;
}

.type-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 4px;
}

.type-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b6b6b;
}

.type-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.price-label {
  font-size: 11px;
  color: #6b6b6b;
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.select-indicator {
  flex-shrink: 0;
  color: #000;
}

.radio-circle {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
}
</style>
