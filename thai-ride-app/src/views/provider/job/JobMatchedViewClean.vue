<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNavigation } from '@/composables/useNavigation'
import type { JobDetail } from '@/types/ride-requests'

interface Props {
  job: JobDetail
  updating: boolean
}

interface Emits {
  (e: 'update-status'): void
  (e: 'cancel'): void
  (e: 'call'): void
  (e: 'chat'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const { navigate } = useNavigation()

const customer = computed(() => props.job.customer)

function openNavigation(): void {
  navigate({
    lat: props.job.pickup_lat,
    lng: props.job.pickup_lng,
    label: props.job.pickup_address || 'จุดรับ'
  })
}

function goBack(): void {
  router.push('/provider')
}
</script>

<template>
  <div class="job-matched-clean">
    <!-- Header -->
    <header class="header">
      <button class="btn-back" type="button" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>กำลังไปรับลูกค้า</h1>
    </header>

    <!-- Content -->
    <main class="content">
      <!-- Fare -->
      <section class="fare-card">
        <span class="fare-label">รายได้ที่คุณจะได้รับ</span>
        <div class="fare-amount">฿{{ job.fare.toLocaleString() }}</div>
      </section>

      <!-- Customer -->
      <section class="customer-card">
        <div class="customer-info">
          <div class="customer-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div class="customer-details">
            <h2>{{ customer?.name || 'ลูกค้า' }}</h2>
            <p v-if="customer?.phone">{{ customer.phone }}</p>
          </div>
        </div>
        <div class="customer-actions">
          <button class="action-btn" type="button" @click="emit('call')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>โทร</span>
          </button>
          <button class="action-btn" type="button" @click="emit('chat')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>แชท</span>
          </button>
        </div>
      </section>

      <!-- Pickup Location -->
      <section class="location-card">
        <div class="location-header">
          <div class="location-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div class="location-info">
            <span class="location-label">จุดรับลูกค้า</span>
            <p class="location-address">{{ job.pickup_address }}</p>
          </div>
        </div>
        <button class="nav-btn" type="button" @click="openNavigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span>เปิดแผนที่นำทาง</span>
        </button>
      </section>

      <!-- Dropoff Location -->
      <section class="location-card dropoff">
        <div class="location-header">
          <div class="location-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <div class="location-info">
            <span class="location-label">จุดหมายปลายทาง</span>
            <p class="location-address">{{ job.dropoff_address }}</p>
          </div>
        </div>
      </section>

      <!-- Notes -->
      <section v-if="job.notes" class="notes-card">
        <div class="notes-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <h3>หมายเหตุจากลูกค้า</h3>
        </div>
        <p class="notes-content">{{ job.notes }}</p>
      </section>
    </main>

    <!-- Action Bar -->
    <footer class="action-bar">
      <button 
        class="btn-cancel" 
        type="button"
        :disabled="updating" 
        @click="emit('cancel')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        <span>ยกเลิก</span>
      </button>
      <button 
        class="btn-primary" 
        type="button"
        :disabled="updating" 
        @click="emit('update-status')"
      >
        <span v-if="updating" class="spinner"></span>
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>ถึงจุดรับแล้ว</span>
        </template>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.job-matched-clean {
  min-height: 100vh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.btn-back {
  width: 44px;
  height: 44px;
  padding: 10px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  color: #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-back:active {
  background: #F5F5F5;
  transform: scale(0.95);
}

.btn-back svg {
  width: 20px;
  height: 20px;
}

.header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0;
  flex: 1;
}

/* Content */
.content {
  flex: 1;
  padding: 16px 20px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

/* Fare Card */
.fare-card {
  padding: 20px;
  background: #000000;
  border-radius: 8px;
  text-align: center;
}

.fare-label {
  font-size: 13px;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8px;
  opacity: 0.9;
}

.fare-amount {
  font-size: 36px;
  font-weight: 700;
  color: #FFFFFF;
}

/* Customer Card */
.customer-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #E5E5E5;
}

.customer-avatar svg {
  width: 24px;
  height: 24px;
  color: #666666;
}

.customer-details {
  flex: 1;
  min-width: 0;
}

.customer-details h2 {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 4px 0;
}

.customer-details p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.customer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  min-height: 48px;
  padding: 12px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
  font-weight: 600;
  font-size: 13px;
}

.action-btn:active {
  background: #1A1A1A;
  transform: scale(0.95);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* Location Card */
.location-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.location-card.dropoff {
  opacity: 0.6;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-icon svg {
  width: 20px;
  height: 20px;
  color: #000000;
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-label {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.location-address {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  line-height: 1.4;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.nav-btn:active {
  background: #1A1A1A;
  transform: scale(0.98);
}

.nav-btn svg {
  width: 18px;
  height: 18px;
}

/* Notes Card */
.notes-card {
  padding: 16px;
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.notes-header svg {
  width: 18px;
  height: 18px;
  color: #000000;
}

.notes-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.notes-content {
  font-size: 14px;
  color: #333333;
  margin: 0;
  line-height: 1.5;
}

/* Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
}

.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #FFFFFF;
  color: #000000;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-cancel:active:not(:disabled) {
  background: #F5F5F5;
  transform: scale(0.98);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel svg {
  width: 18px;
  height: 18px;
}

.btn-primary {
  flex: 2;
  padding: 14px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:active:not(:disabled) {
  background: #1A1A1A;
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
