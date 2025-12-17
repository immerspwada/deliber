<!--
  Feature: F48 - Fare Estimate Display Component
  
  แสดงราคาประมาณการสำหรับการเดินทาง
  - แสดง breakdown ค่าใช้จ่าย
  - แสดง surge indicator
  - เปรียบเทียบ ride types
-->
<template>
  <div class="fare-estimate-card">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-loader"></div>
      <span>กำลังคำนวณราคา...</span>
    </div>

    <!-- Estimate Display -->
    <div v-else-if="estimate" class="estimate-content">
      <!-- Main Price -->
      <div class="main-price">
        <div class="price-label">ราคาประมาณ</div>
        <div class="price-value">
          <span class="currency">฿</span>
          <span class="amount">{{ estimate.breakdown.total }}</span>
        </div>
        <div class="price-range">
          {{ formatPriceRange(estimate.priceRange) }}
        </div>
      </div>

      <!-- Surge Indicator -->
      <div v-if="estimate.isSurge" class="surge-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span>{{ estimate.surgeMultiplier }}x</span>
      </div>

      <!-- Trip Info -->
      <div class="trip-info">
        <div class="info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>{{ estimate.estimatedTime }} นาที</span>
        </div>
        <div class="info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{{ estimate.distance }} กม.</span>
        </div>
      </div>

      <!-- Breakdown Toggle -->
      <button 
        v-if="showBreakdownToggle"
        class="breakdown-toggle"
        @click="isBreakdownOpen = !isBreakdownOpen"
      >
        <span>รายละเอียดค่าโดยสาร</span>
        <svg 
          width="20" height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
          :class="{ rotated: isBreakdownOpen }"
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      <!-- Breakdown Details -->
      <transition name="slide">
        <div v-if="isBreakdownOpen" class="breakdown-details">
          <div class="breakdown-row">
            <span>ค่าโดยสารพื้นฐาน</span>
            <span>฿{{ estimate.breakdown.baseFare }}</span>
          </div>
          <div class="breakdown-row">
            <span>ค่าระยะทาง ({{ estimate.distance }} กม.)</span>
            <span>฿{{ estimate.breakdown.distanceFare }}</span>
          </div>
          <div class="breakdown-row">
            <span>ค่าเวลา ({{ estimate.estimatedTime }} นาที)</span>
            <span>฿{{ estimate.breakdown.timeFare }}</span>
          </div>
          <div v-if="estimate.breakdown.surgeFare > 0" class="breakdown-row surge">
            <span>ค่าช่วงเวลาเร่งด่วน</span>
            <span>+฿{{ estimate.breakdown.surgeFare }}</span>
          </div>
          <div v-if="estimate.breakdown.discount > 0" class="breakdown-row discount">
            <span>ส่วนลด</span>
            <span>-฿{{ estimate.breakdown.discount }}</span>
          </div>
          <div class="breakdown-row total">
            <span>รวมทั้งหมด</span>
            <span>฿{{ estimate.breakdown.total }}</span>
          </div>
        </div>
      </transition>
    </div>

    <!-- No Estimate -->
    <div v-else class="no-estimate">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>เลือกจุดรับและจุดหมายเพื่อดูราคา</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FareEstimate } from '../composables/useFareEstimator'

interface Props {
  estimate: FareEstimate | null
  loading?: boolean
  showBreakdownToggle?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showBreakdownToggle: true
})

const isBreakdownOpen = ref(false)

const formatPriceRange = (range: { min: number; max: number }): string => {
  return `฿${range.min} - ฿${range.max}`
}
</script>

<style scoped>
.fare-estimate-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.skeleton-loader {
  width: 120px;
  height: 32px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.loading-state span {
  color: #6b6b6b;
  font-size: 14px;
}

.estimate-content {
  position: relative;
}

.main-price {
  text-align: center;
  margin-bottom: 16px;
}

.price-label {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.price-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  color: #000000;
}

.amount {
  font-size: 40px;
  font-weight: 700;
  color: #000000;
}

.price-range {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 4px;
}

.surge-badge {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffc043;
  color: #000000;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.trip-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b6b6b;
  font-size: 14px;
}

.info-item svg {
  color: #000000;
}

.breakdown-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 14px;
  color: #000000;
  cursor: pointer;
}

.breakdown-toggle svg {
  transition: transform 0.2s ease;
}

.breakdown-toggle svg.rotated {
  transform: rotate(180deg);
}

.breakdown-details {
  padding-top: 8px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #6b6b6b;
}

.breakdown-row.surge {
  color: #f57c00;
}

.breakdown-row.discount {
  color: #22c55e;
}

.breakdown-row.total {
  border-top: 1px solid #e5e5e5;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  color: #000000;
}

.no-estimate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #6b6b6b;
  text-align: center;
}

.no-estimate svg {
  opacity: 0.5;
}

.no-estimate span {
  font-size: 14px;
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
