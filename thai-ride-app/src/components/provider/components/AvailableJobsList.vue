<script setup lang="ts">
/**
 * Available Jobs List V2 - Provider Available Jobs Display
 * MUNEEF Design System Compliant
 * Thai Ride App - Available Jobs List Component
 */

import type { Job } from '../../../types/provider'
import LoadingSpinner from '../shared/LoadingSpinner.vue'

interface Props {
  jobs: Job[]
  loading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  accept: [jobId: string]
  refresh: []
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

function getServiceTypeColor(serviceType: string): string {
  const colors: Record<string, string> = {
    ride: '#3b82f6',
    delivery: '#00a86b',
    shopping: '#f59e0b',
    moving: '#8b5cf6',
    laundry: '#06b6d4'
  }
  return colors[serviceType] || '#666666'
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const created = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'เพิ่งเข้ามา'
  if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} วันที่แล้ว`
}
</script>

<template>
  <div class="available-jobs-list">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner size="md" text="กำลังโหลดงาน..." />
    </div>
    
    <!-- Empty State -->
    <div v-else-if="jobs.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
          <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <h3 class="empty-title">ยังไม่มีงานใหม่</h3>
      <p class="empty-message">เราจะแจ้งเตือนคุณทันทีเมื่อมีงานใหม่ที่เหมาะสมกับคุณ</p>
      <button @click="emit('refresh')" class="refresh-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        รีเฟรช
      </button>
    </div>
    
    <!-- Jobs List -->
    <div v-else class="jobs-grid">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="job-card"
      >
        <div class="job-header">
          <div 
            class="service-badge"
            :style="{ 
              backgroundColor: getServiceTypeColor(job.service_type) + '20',
              color: getServiceTypeColor(job.service_type)
            }"
          >
            {{ getServiceTypeLabel(job.service_type) }}
          </div>
          <div class="job-earnings">
            <span class="earnings-amount">{{ formatCurrency(job.estimated_earnings) }}</span>
          </div>
        </div>
        
        <div class="customer-info">
          <div class="customer-avatar">
            {{ job.customer_name.charAt(0) }}
          </div>
          <div class="customer-details">
            <span class="customer-name">{{ job.customer_name }}</span>
            <div class="customer-rating" v-if="job.customer_rating">
              <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>{{ job.customer_rating.toFixed(1) }}</span>
            </div>
          </div>
        </div>
        
        <div class="locations">
          <div class="location-item">
            <div class="location-dot pickup" />
            <span class="location-text">{{ job.pickup_address }}</span>
          </div>
          <div v-if="job.dropoff_address" class="location-item">
            <div class="location-dot dropoff" />
            <span class="location-text">{{ job.dropoff_address }}</span>
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
          
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>{{ formatTimeAgo(job.created_at) }}</span>
          </div>
        </div>
        
        <button 
          @click="emit('accept', job.id)"
          class="accept-button"
          :disabled="loading"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          รับงาน
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.available-jobs-list {
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #999999;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
}

.empty-message {
  color: #666666;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.refresh-button:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.refresh-button svg {
  width: 1rem;
  height: 1rem;
}

/* Jobs Grid */
.jobs-grid {
  display: grid;
  gap: 1rem;
}

.job-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #00a86b;
}

.job-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.service-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
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
}

.customer-avatar {
  width: 2rem;
  height: 2rem;
  background: #00a86b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.customer-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
}

.customer-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #f59e0b;
  margin-top: 0.125rem;
}

.star-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.locations {
  margin-bottom: 1rem;
}

.location-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.location-item:last-child {
  margin-bottom: 0;
}

.location-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00a86b;
}

.location-dot.dropoff {
  background: #e11900;
}

.location-text {
  font-size: 0.875rem;
  color: #666666;
  line-height: 1.4;
}

.job-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #666666;
}

.meta-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.accept-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.accept-button:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
}

.accept-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.accept-button svg {
  width: 1rem;
  height: 1rem;
}

/* Responsive Design */
@media (max-width: 480px) {
  .job-card {
    padding: 1rem;
  }
  
  .job-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .job-meta {
    gap: 0.75rem;
  }
  
  .meta-item {
    font-size: 0.6875rem;
  }
}

@media (min-width: 768px) {
  .jobs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>