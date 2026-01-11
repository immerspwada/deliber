<script setup lang="ts">
/**
 * Earnings Card V2 - Provider Earnings Display
 * MUNEEF Design System Compliant
 * Thai Ride App - Earnings Card Component
 */

import type { Earnings } from '../../../types/provider'

interface Props {
  earnings: Earnings
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="earnings-card" @click="emit('click')">
    <div class="card-header">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20m8-9H4"/>
        </svg>
      </div>
      <h3 class="title">รายได้วันนี้</h3>
    </div>
    
    <div class="earnings-amount">
      <span class="amount">{{ formatCurrency(earnings.today) }}</span>
      <span class="jobs-count">{{ earnings.today_jobs }} งาน</span>
    </div>
    
    <div class="earnings-stats">
      <div class="stat-item">
        <span class="stat-label">สัปดาห์นี้</span>
        <span class="stat-value">{{ formatCurrency(earnings.this_week) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">เดือนนี้</span>
        <span class="stat-value">{{ formatCurrency(earnings.this_month) }}</span>
      </div>
    </div>
    
    <div class="card-footer">
      <span class="average">เฉลี่ย {{ formatCurrency(earnings.average_per_job) }}/งาน</span>
      <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.earnings-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.earnings-card:hover {
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
  background: linear-gradient(135deg, #00a86b, #008f5b);
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

.earnings-amount {
  margin-bottom: 1rem;
}

.amount {
  display: block;
  font-size: 1.875rem;
  font-weight: 700;
  color: #00a86b;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.jobs-count {
  font-size: 0.875rem;
  color: #666666;
}

.earnings-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #666666;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.average {
  font-size: 0.75rem;
  color: #666666;
}

.arrow-icon {
  width: 1rem;
  height: 1rem;
  color: #999999;
  transition: transform 0.2s ease;
}

.earnings-card:hover .arrow-icon {
  transform: translateX(2px);
}

/* Responsive Design */
@media (max-width: 480px) {
  .earnings-card {
    padding: 1rem;
  }
  
  .amount {
    font-size: 1.5rem;
  }
  
  .earnings-stats {
    padding: 0.5rem;
  }
  
  .stat-value {
    font-size: 0.8125rem;
  }
}
</style>