<script setup lang="ts">
/**
 * Performance Card V2 - Provider Performance Metrics
 * MUNEEF Design System Compliant
 * Thai Ride App - Performance Card Component
 */

import type { PerformanceMetrics } from '../../../types/provider'

interface Props {
  metrics: PerformanceMetrics
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#00a86b'
  if (rating >= 4.0) return '#f59e0b'
  return '#e11900'
}

function getPercentageColor(percentage: number): string {
  if (percentage >= 90) return '#00a86b'
  if (percentage >= 80) return '#f59e0b'
  return '#e11900'
}
</script>

<template>
  <div class="performance-card" @click="emit('click')">
    <div class="card-header">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </div>
      <h3 class="title">ประสิทธิภาพ</h3>
    </div>
    
    <div class="rating-section">
      <div class="rating-display">
        <span class="rating-value" :style="{ color: getRatingColor(metrics.rating) }">
          {{ metrics.rating > 0 ? metrics.rating.toFixed(2) : 'ยังไม่มี' }}
        </span>
        <div v-if="metrics.rating > 0" class="stars">
          <svg
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ filled: i <= Math.floor(metrics.rating) }"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
      </div>
      <span class="rating-count">{{ metrics.total_ratings }} คะแนน</span>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-item">
        <span class="metric-label">รับงาน</span>
        <span 
          class="metric-value" 
          :style="{ color: getPercentageColor(metrics.acceptance_rate) }"
        >
          {{ metrics.acceptance_rate.toFixed(0) }}%
        </span>
      </div>
      
      <div class="metric-item">
        <span class="metric-label">สำเร็จ</span>
        <span 
          class="metric-value" 
          :style="{ color: getPercentageColor(metrics.completion_rate) }"
        >
          {{ metrics.completion_rate.toFixed(0) }}%
        </span>
      </div>
      
      <div class="metric-item">
        <span class="metric-label">ตรงเวลา</span>
        <span 
          class="metric-value" 
          :style="{ color: getPercentageColor(metrics.on_time_rate) }"
        >
          {{ metrics.on_time_rate.toFixed(0) }}%
        </span>
      </div>
      
      <div class="metric-item">
        <span class="metric-label">ยกเลิก</span>
        <span 
          class="metric-value" 
          :style="{ color: getPercentageColor(100 - metrics.cancellation_rate) }"
        >
          {{ metrics.cancellation_rate.toFixed(0) }}%
        </span>
      </div>
    </div>
    
    <div class="card-footer">
      <span class="online-hours">ออนไลน์ {{ metrics.online_hours_today.toFixed(1) }} ชม.</span>
      <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.performance-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.performance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.icon {
  width: 2rem;
  height: 2rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon svg {
  width: 1.125rem;
  height: 1.125rem;
}

.title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666666;
  margin: 0;
}

.rating-section {
  text-align: center;
  margin-bottom: 1rem;
}

.rating-display {
  margin-bottom: 0.25rem;
}

.rating-value {
  display: block;
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 0.125rem;
}

.star {
  width: 0.875rem;
  height: 0.875rem;
  color: #e5e7eb;
  transition: color 0.2s ease;
}

.star.filled {
  color: #f59e0b;
}

.rating-count {
  font-size: 0.75rem;
  color: #666666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.metric-label {
  font-size: 0.75rem;
  color: #666666;
  margin-bottom: 0.25rem;
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.online-hours {
  font-size: 0.75rem;
  color: #666666;
}

.arrow-icon {
  width: 1rem;
  height: 1rem;
  color: #999999;
  transition: transform 0.2s ease;
}

.performance-card:hover .arrow-icon {
  transform: translateX(2px);
}

/* Responsive Design */
@media (max-width: 480px) {
  .performance-card {
    padding: 1rem;
  }
  
  .rating-value {
    font-size: 1.5rem;
  }
  
  .metrics-grid {
    gap: 0.5rem;
  }
  
  .metric-item {
    padding: 0.375rem;
  }
  
  .metric-value {
    font-size: 0.875rem;
  }
}
</style>