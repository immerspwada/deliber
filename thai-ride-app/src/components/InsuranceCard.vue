<script setup lang="ts">
/**
 * Feature: F140 - Insurance Card
 * Display ride insurance option
 */

interface Props {
  planName: string
  coverage: string
  price: number
  isSelected?: boolean
  features?: string[]
}

withDefaults(defineProps<Props>(), {
  isSelected: false,
  features: () => []
})

const emit = defineEmits<{
  select: []
  viewDetails: []
}>()
</script>

<template>
  <div class="insurance-card" :class="{ selected: isSelected }" @click="emit('select')">
    <div class="card-header">
      <div class="header-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div class="header-content">
        <h3 class="plan-name">{{ planName }}</h3>
        <p class="coverage">คุ้มครองสูงสุด {{ coverage }}</p>
      </div>
      <div class="plan-price">
        <span class="price-amount">+฿{{ price }}</span>
        <span class="price-label">/เที่ยว</span>
      </div>
    </div>
    
    <ul v-if="features.length > 0" class="features-list">
      <li v-for="(feature, i) in features" :key="i" class="feature-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span>{{ feature }}</span>
      </li>
    </ul>

    <div class="card-footer">
      <button type="button" class="details-btn" @click.stop="emit('viewDetails')">
        ดูรายละเอียด
      </button>
      <div class="select-indicator">
        <div class="check-circle" :class="{ checked: isSelected }">
          <svg v-if="isSelected" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insurance-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.insurance-card:hover {
  border-color: #e5e5e5;
}

.insurance-card.selected {
  border-color: #000;
  background: #f9f9f9;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  border-radius: 12px;
  color: #2e7d32;
  flex-shrink: 0;
}

.insurance-card.selected .header-icon {
  background: #000;
  color: #fff;
}

.header-content {
  flex: 1;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.coverage {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.plan-price {
  text-align: right;
}

.price-amount {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  display: block;
}

.price-label {
  font-size: 12px;
  color: #6b6b6b;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #6b6b6b;
}

.feature-item svg {
  color: #2e7d32;
  flex-shrink: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.details-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  text-decoration: underline;
}

.details-btn:hover {
  color: #000;
}

.check-circle {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.check-circle.checked {
  background: #000;
  border-color: #000;
  color: #fff;
}
</style>
