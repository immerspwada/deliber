<script setup lang="ts">
/**
 * Current Job Card V2 - Provider Current Job Display
 * MUNEEF Design System Compliant
 * Thai Ride App - Current Job Card Component
 */

import type { Job } from '../../../types/provider'
import StatusBadge from '../shared/StatusBadge.vue'

interface Props {
  job: Job
}

defineProps<Props>()

const emit = defineEmits<{
  navigate: []
  'update-status': [status: Job['status']]
}>()

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getServiceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    ride: 'รถรับส่ง',
    delivery: 'จัดส่ง',
    shopping: 'ซื้อของ',
    moving: 'ขนย้าย',
    laundry: 'ซักผ้า'
  }
  return labels[serviceType] || serviceType
}

function getNextStatus(currentStatus: Job['status']): Job['status'] | null {
  const statusFlow: Record<Job['status'], Job['status'] | null> = {
    pending: 'accepted',
    accepted: 'arriving',
    arriving: 'arrived',
    arrived: 'picked_up',
    picked_up: 'in_progress',
    in_progress: 'completed',
    completed: null,
    cancelled: null,
  }
  return statusFlow[currentStatus] || null
}

function getNextStatusLabel(currentStatus: Job['status']): string {
  const labels: Record<Job['status'], string> = {
    accepted: 'กำลังไป',
    arriving: 'ถึงแล้ว',
    arrived: 'รับแล้ว',
    picked_up: 'เริ่มงาน',
    in_progress: 'เสร็จสิ้น',
  }
  return labels[currentStatus] || 'ดำเนินการต่อ'
}
</script>

<template>
  <div class="current-job-card">
    <div class="job-header">
      <div class="service-info">
        <div class="service-badge">
          {{ getServiceTypeLabel(job.service_type) }}
        </div>
        <StatusBadge :status="job.status" size="sm" animated />
      </div>
      <div class="earnings">
        <span class="earnings-label">รายได้</span>
        <span class="earnings-amount">{{ formatCurrency(job.estimated_earnings) }}</span>
      </div>
    </div>
    
    <div class="customer-info">
      <div class="customer-avatar">
        {{ job.customer_name.charAt(0) }}
      </div>
      <div class="customer-details">
        <h4 class="customer-name">{{ job.customer_name }}</h4>
        <div class="customer-meta">
          <span class="phone">{{ job.customer_phone }}</span>
          <div v-if="job.customer_rating" class="rating">
            <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ job.customer_rating.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="locations">
      <div class="location-item pickup">
        <div class="location-dot pickup-dot" />
        <div class="location-details">
          <span class="location-label">จุดรับ</span>
          <p class="location-address">{{ job.pickup_address }}</p>
          <p v-if="job.pickup_instructions" class="location-instructions">
            {{ job.pickup_instructions }}
          </p>
        </div>
      </div>
      
      <div v-if="job.dropoff_address" class="location-item dropoff">
        <div class="location-dot dropoff-dot" />
        <div class="location-details">
          <span class="location-label">จุดส่ง</span>
          <p class="location-address">{{ job.dropoff_address }}</p>
          <p v-if="job.dropoff_instructions" class="location-instructions">
            {{ job.dropoff_instructions }}
          </p>
        </div>
      </div>
    </div>
    
    <div class="job-meta">
      <div class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span>{{ job.estimated_distance.toFixed(1) }} กม.</span>
      </div>
      
      <div class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>{{ job.estimated_duration }} นาที</span>
      </div>
    </div>
    
    <div class="job-actions">
      <button @click="emit('navigate')" class="action-button secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <path d="M10 17l5-5-5-5"/>
          <path d="M15 12H3"/>
        </svg>
        รายละเอียด
      </button>
      
      <button 
        v-if="getNextStatus(job.status)"
        @click="emit('update-status', getNextStatus(job.status)!)"
        class="action-button primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        {{ getNextStatusLabel(job.status) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.current-job-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid #00a86b;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.job-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.service-badge {
  padding: 0.25rem 0.75rem;
  background: #e8f5ef;
  color: #00a86b;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.earnings {
  text-align: right;
}

.earnings-label {
  display: block;
  font-size: 0.75rem;
  color: #666666;
  margin-bottom: 0.125rem;
}

.earnings-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #00a86b;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.75rem;
}

.customer-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: #00a86b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.customer-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.25rem 0;
}

.customer-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.phone {
  font-size: 0.875rem;
  color: #666666;
}

.rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #f59e0b;
}

.star-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.locations {
  margin-bottom: 1rem;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.location-item:last-child {
  margin-bottom: 0;
}

.location-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.pickup-dot {
  background: #00a86b;
}

.dropoff-dot {
  background: #e11900;
}

.location-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.location-address {
  font-size: 0.875rem;
  color: #1a1a1a;
  margin: 0.125rem 0 0 0;
  line-height: 1.4;
}

.location-instructions {
  font-size: 0.75rem;
  color: #666666;
  margin: 0.25rem 0 0 0;
  font-style: italic;
}

.job-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #666666;
}

.meta-icon {
  width: 1rem;
  height: 1rem;
}

.job-actions {
  display: flex;
  gap: 0.75rem;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-button svg {
  width: 1rem;
  height: 1rem;
}

.action-button.secondary {
  background: #f6f6f6;
  color: #666666;
}

.action-button.secondary:hover {
  background: #e8e8e8;
}

.action-button.primary {
  background: #00a86b;
  color: white;
}

.action-button.primary:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.action-button:active {
  transform: scale(0.98);
}

/* Responsive Design */
@media (max-width: 480px) {
  .current-job-card {
    padding: 1rem;
  }
  
  .job-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  
  .earnings {
    text-align: left;
  }
  
  .customer-info {
    padding: 0.5rem;
  }
  
  .customer-avatar {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }
  
  .job-actions {
    flex-direction: column;
  }
}
</style>