<!--
  JobMatchedView - ขั้นตอน: รับงานแล้ว กำลังไปจุดรับ
  URL: /provider/job/:id/matched
-->
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
  router.push('/provider/orders')
}
</script>

<template>
  <div class="step-view matched-view">
    <!-- Header -->
    <header class="step-header">
      <button class="btn-back" type="button" aria-label="กลับ" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-content">
        <span class="step-badge">ขั้นตอน 1/4</span>
        <h1>กำลังไปรับลูกค้า</h1>
      </div>
    </header>

    <!-- Main Content - Grid Layout -->
    <main class="step-content">
      <!-- Top Section: Customer + Quick Actions -->
      <div class="top-section">
        <!-- Customer Card -->
        <section class="customer-card" aria-label="ข้อมูลลูกค้า">
          <div class="customer-avatar">
            <img v-if="customer?.avatar_url" :src="customer.avatar_url" :alt="customer?.name || 'ลูกค้า'" />
            <span v-else class="avatar-placeholder">{{ customer?.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="customer-info">
            <h3>{{ customer?.name || 'ลูกค้า' }}</h3>
            <p v-if="customer?.phone">{{ customer.phone }}</p>
          </div>
          <div class="customer-actions">
            <button class="action-btn" type="button" aria-label="โทร" title="โทรหาลูกค้า" @click="emit('call')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
            <button class="action-btn" type="button" aria-label="แชท" title="แชทกับลูกค้า" @click="emit('chat')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
        </section>

        <!-- Fare Card - Prominent -->
        <section class="fare-card" aria-label="ค่าโดยสาร">
          <div class="fare-content">
            <span class="fare-label">ค่าโดยสาร</span>
            <span class="fare-amount">฿{{ job.fare.toLocaleString() }}</span>
          </div>
        </section>
      </div>

      <!-- Middle Section: Locations -->
      <div class="locations-section">
        <!-- Pickup Location -->
        <section class="location-card pickup" aria-label="จุดรับ">
          <div class="location-header">
            <div class="location-icon">📍</div>
            <div class="location-info">
              <span class="location-label">จุดรับ</span>
              <p class="location-address">{{ job.pickup_address }}</p>
            </div>
          </div>
          <button class="nav-btn" type="button" aria-label="นำทาง" @click="openNavigation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            นำทาง
          </button>
        </section>

        <!-- Dropoff Preview -->
        <section class="location-card dropoff preview" aria-label="จุดส่ง">
          <div class="location-header">
            <div class="location-icon">🏁</div>
            <div class="location-info">
              <span class="location-label">จุดส่ง</span>
              <p class="location-address">{{ job.dropoff_address }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Bottom Section: Notes (if any) -->
      <section v-if="job.notes" class="notes-card" aria-label="หมายเหตุ">
        <h4>📝 หมายเหตุ</h4>
        <p>{{ job.notes }}</p>
      </section>
    </main>

    <!-- Action Bar -->
    <footer class="action-bar">
      <button class="btn-cancel" type="button" :disabled="updating" @click="emit('cancel')">
        ยกเลิก
      </button>
      <button class="btn-primary" type="button" :disabled="updating" @click="emit('update-status')">
        <span v-if="updating" class="spinner"></span>
        <span v-else>ถึงจุดรับแล้ว</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
/* ===== Base Styles ===== */
.step-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #F8FAFB 0%, #F0F4F8 100%);
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.15);
}

.btn-back {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.btn-back:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.95);
}

.btn-back svg {
  width: 24px;
  height: 24px;
}

.header-content {
  flex: 1;
}

.step-badge {
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 4px;
  backdrop-filter: blur(10px);
  letter-spacing: 0.5px;
}

.step-header h1 {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
}

/* ===== Content ===== */
.step-content {
  flex: 1;
  padding: 12px 12px;
  padding-bottom: 120px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.step-content::-webkit-scrollbar {
  width: 4px;
}

.step-content::-webkit-scrollbar-track {
  background: transparent;
}

.step-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

/* ===== Top Section ===== */
.top-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== Customer Card ===== */
.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.customer-card:active {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.customer-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #E8F5EF 0%, #D1F2E8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.15);
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 22px;
  font-weight: 800;
  color: #00A86B;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h3 {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 2px 0;
  letter-spacing: -0.3px;
}

.customer-info p {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
  font-weight: 500;
}

.customer-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #E8F5EF 0%, #D1F2E8 100%);
  color: #00A86B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 168, 107, 0.1);
}

.action-btn:active {
  background: linear-gradient(135deg, #D1F2E8 0%, #B8EDE0 100%);
  transform: scale(0.92);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== Fare Card ===== */
.fare-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.fare-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.fare-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}

.fare-label {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.85;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.fare-amount {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -1px;
}

/* ===== Locations Section ===== */
.locations-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== Location Card ===== */
.location-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.location-card:active {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.location-card.pickup {
  border-left: 4px solid #00A86B;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%);
}

.location-card.dropoff {
  border-left: 4px solid #9CA3AF;
  opacity: 0.8;
}

.location-card.preview {
  opacity: 0.75;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-icon {
  font-size: 22px;
  flex-shrink: 0;
  margin-top: 1px;
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-label {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.location-address {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 4px 0 0 0;
  line-height: 1.35;
  letter-spacing: -0.2px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
}

.nav-btn:active {
  transform: scale(0.94);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.15);
}

.nav-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Notes Card ===== */
.notes-card {
  padding: 14px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border-radius: 16px;
  border-left: 4px solid #F59E0B;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
}

.notes-card h4 {
  font-size: 13px;
  font-weight: 700;
  color: #92400E;
  margin: 0 0 6px 0;
  letter-spacing: -0.2px;
}

.notes-card p {
  font-size: 13px;
  color: #78350F;
  margin: 0;
  line-height: 1.4;
  font-weight: 500;
}

/* ===== Action Bar ===== */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 10px;
  padding: 12px 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #FFFFFF 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #fff;
  color: #EF4444;
  border: 2px solid #FCA5A5;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  min-height: 52px;
  transition: all 0.2s ease;
  letter-spacing: -0.3px;
}

.btn-cancel:active:not(:disabled) {
  background: #FEF2F2;
  border-color: #EF4444;
  transform: scale(0.96);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  flex: 1.5;
  padding: 14px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
  letter-spacing: -0.3px;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.96);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.15);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Responsive ===== */
@media (min-width: 480px) {
  .step-header {
    padding: 14px 20px;
  }

  .step-header h1 {
    font-size: 18px;
  }

  .step-content {
    padding: 16px 16px;
    padding-bottom: 130px;
    gap: 12px;
  }

  .customer-card {
    padding: 14px;
  }

  .fare-card {
    padding: 16px 20px;
  }

  .location-card {
    padding: 16px;
  }

  .action-bar {
    padding: 14px 16px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
    gap: 12px;
  }

  .btn-cancel, .btn-primary {
    min-height: 56px;
    font-size: 16px;
  }
}
</style>
