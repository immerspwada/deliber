<!--
  Feature: F49 - Ride Type Selector Component
  
  เลือกประเภทรถสำหรับการเดินทาง
  - Standard, Premium, Shared
  - แสดงราคาเปรียบเทียบ
  - แสดง ETA แต่ละประเภท
-->
<template>
  <div class="ride-type-selector">
    <div class="selector-header">
      <h3>เลือกประเภทรถ</h3>
    </div>

    <div class="ride-options">
      <button
        v-for="option in rideOptions"
        :key="option.type"
        class="ride-option"
        :class="{ selected: selectedType === option.type }"
        @click="selectType(option.type)"
      >
        <!-- Vehicle Icon -->
        <div class="option-icon">
          <svg v-if="option.type === 'standard'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
            <circle cx="7.5" cy="17" r="1.5"/>
            <circle cx="16.5" cy="17" r="1.5"/>
            <path d="M5 12h14"/>
          </svg>
          <svg v-else-if="option.type === 'premium'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 17h16v-6l-3-4H7l-3 4v6z"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
            <path d="M4 11h16"/>
            <path d="M12 3l1 4h-2l1-4z"/>
          </svg>
          <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
            <circle cx="7.5" cy="17" r="1.5"/>
            <circle cx="16.5" cy="17" r="1.5"/>
            <path d="M5 12h14"/>
            <path d="M9 8v-2"/>
            <path d="M15 8v-2"/>
          </svg>
        </div>

        <!-- Option Info -->
        <div class="option-info">
          <div class="option-name">{{ option.label }}</div>
          <div class="option-desc">{{ option.description }}</div>
          <div class="option-eta" v-if="option.eta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>{{ option.eta }} นาที</span>
          </div>
        </div>

        <!-- Price -->
        <div class="option-price">
          <div v-if="option.estimate" class="price-amount">
            ฿{{ option.estimate.breakdown.total }}
          </div>
          <div v-else class="price-loading">
            <div class="mini-skeleton"></div>
          </div>
          <div v-if="option.savings" class="savings-badge">
            ประหยัด {{ option.savings }}%
          </div>
        </div>

        <!-- Selected Indicator -->
        <div class="selected-indicator">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      </button>
    </div>

    <!-- Features Comparison -->
    <div v-if="showComparison" class="features-comparison">
      <div class="comparison-header">
        <span>เปรียบเทียบบริการ</span>
        <button class="toggle-btn" @click="isComparisonOpen = !isComparisonOpen">
          <svg 
            width="16" height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
            :class="{ rotated: isComparisonOpen }"
          >
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>
      </div>

      <transition name="slide">
        <div v-if="isComparisonOpen" class="comparison-table">
          <div class="comparison-row header">
            <div class="feature-name"></div>
            <div class="feature-value">มาตรฐาน</div>
            <div class="feature-value">พรีเมียม</div>
            <div class="feature-value">แชร์</div>
          </div>
          <div class="comparison-row">
            <div class="feature-name">ที่นั่ง</div>
            <div class="feature-value">4</div>
            <div class="feature-value">4</div>
            <div class="feature-value">2</div>
          </div>
          <div class="comparison-row">
            <div class="feature-name">รถหรู</div>
            <div class="feature-value">-</div>
            <div class="feature-value">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div class="feature-value">-</div>
          </div>
          <div class="comparison-row">
            <div class="feature-name">น้ำดื่มฟรี</div>
            <div class="feature-value">-</div>
            <div class="feature-value">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div class="feature-value">-</div>
          </div>
          <div class="comparison-row">
            <div class="feature-name">แชร์กับคนอื่น</div>
            <div class="feature-value">-</div>
            <div class="feature-value">-</div>
            <div class="feature-value">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FareEstimate, RideType } from '../composables/useFareEstimator'

interface RideOption {
  type: RideType
  label: string
  description: string
  estimate: FareEstimate | null
  eta: number | null
  savings?: number
}

interface Props {
  estimates: FareEstimate[]
  selectedType?: RideType
  showComparison?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: 'standard',
  showComparison: true
})

const emit = defineEmits<{
  (e: 'select', type: RideType): void
}>()

const isComparisonOpen = ref(false)

const rideOptions = computed<RideOption[]>(() => {
  const standardEstimate = props.estimates.find(e => e.rideType === 'standard')
  const premiumEstimate = props.estimates.find(e => e.rideType === 'premium')
  const sharedEstimate = props.estimates.find(e => e.rideType === 'shared')

  const standardPrice = standardEstimate?.breakdown.total || 0

  return [
    {
      type: 'standard' as RideType,
      label: 'มาตรฐาน',
      description: 'รถยนต์ทั่วไป สะดวกสบาย',
      estimate: standardEstimate || null,
      eta: standardEstimate?.estimatedTime || null
    },
    {
      type: 'premium' as RideType,
      label: 'พรีเมียม',
      description: 'รถหรู บริการพิเศษ',
      estimate: premiumEstimate || null,
      eta: premiumEstimate?.estimatedTime || null
    },
    {
      type: 'shared' as RideType,
      label: 'แชร์',
      description: 'แชร์กับผู้โดยสารอื่น',
      estimate: sharedEstimate || null,
      eta: sharedEstimate ? sharedEstimate.estimatedTime + 5 : null, // Shared takes longer
      savings: standardPrice && sharedEstimate 
        ? Math.round((1 - sharedEstimate.breakdown.total / standardPrice) * 100)
        : undefined
    }
  ]
})

const selectType = (type: RideType) => {
  emit('select', type)
}
</script>

<style scoped>
.ride-type-selector {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.selector-header {
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.selector-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.ride-options {
  display: flex;
  flex-direction: column;
}

.ride-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: none;
  border: none;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
}

.ride-option:last-child {
  border-bottom: none;
}

.ride-option:hover {
  background: #f6f6f6;
}

.ride-option.selected {
  background: #f6f6f6;
}

.option-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 8px;
}

.ride-option.selected .option-icon {
  background: #000000;
}

.ride-option.selected .option-icon svg {
  stroke: #ffffff;
}

.option-info {
  flex: 1;
}

.option-name {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 2px;
}

.option-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.option-eta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b6b6b;
}

.option-price {
  text-align: right;
}

.price-amount {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.price-loading .mini-skeleton {
  width: 50px;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.savings-badge {
  font-size: 11px;
  color: #22c55e;
  font-weight: 500;
  margin-top: 2px;
}

.selected-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ride-option.selected .selected-indicator {
  opacity: 1;
  color: #000000;
}

/* Features Comparison */
.features-comparison {
  border-top: 1px solid #e5e5e5;
  padding: 12px 16px;
}

.comparison-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comparison-header span {
  font-size: 14px;
  color: #6b6b6b;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b6b6b;
}

.toggle-btn svg {
  transition: transform 0.2s ease;
}

.toggle-btn svg.rotated {
  transform: rotate(180deg);
}

.comparison-table {
  margin-top: 12px;
}

.comparison-row {
  display: grid;
  grid-template-columns: 1fr repeat(3, 60px);
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comparison-row.header {
  font-weight: 600;
  font-size: 12px;
  color: #6b6b6b;
}

.comparison-row:last-child {
  border-bottom: none;
}

.feature-name {
  font-size: 13px;
  color: #000000;
}

.feature-value {
  text-align: center;
  font-size: 13px;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
