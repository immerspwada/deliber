<!--
  JobPickupView - ขั้นตอน: ถึงจุดรับแล้ว รอรับลูกค้า
  URL: /provider/job/:id/pickup
-->
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import type { JobDetail } from '@/types/ride-requests'

const PhotoEvidence = defineAsyncComponent(() => import('@/components/provider/PhotoEvidence.vue'))

interface Props {
  job: JobDetail
  updating: boolean
}

interface Emits {
  (e: 'update-status'): void
  (e: 'cancel'): void
  (e: 'call'): void
  (e: 'chat'): void
  (e: 'photo-uploaded', type: 'pickup' | 'dropoff', url: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const customer = computed(() => props.job.customer)

function goBack(): void {
  router.push('/provider/orders')
}
</script>

<template>
  <div class="step-view pickup-view">
    <!-- Header -->
    <header class="step-header">
      <button class="btn-back" type="button" aria-label="กลับ" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-content">
        <span class="step-badge">ขั้นตอน 2/4</span>
        <h1>ถึงจุดรับแล้ว</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="step-content">
      <!-- Status Banner -->
      <div class="status-banner">
        <span class="status-icon">📍</span>
        <div class="status-text">
          <h3>รอรับลูกค้า</h3>
          <p>กรุณารอลูกค้าที่จุดรับ</p>
        </div>
      </div>

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
          <button class="action-btn" type="button" aria-label="โทร" @click="emit('call')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
          <button class="action-btn" type="button" aria-label="แชท" @click="emit('chat')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Photo Evidence -->
      <section class="photo-section" aria-label="ถ่ายรูปยืนยัน">
        <h4>📸 ถ่ายรูปยืนยันจุดรับ</h4>
        <p class="photo-hint">ถ่ายรูปลูกค้าหรือสินค้าที่จุดรับ</p>
        <PhotoEvidence
          type="pickup"
          :ride-id="job.id"
          :existing-photo="job.pickup_photo"
          @uploaded="(url: string) => emit('photo-uploaded', 'pickup', url)"
        />
      </section>

      <!-- Dropoff Preview -->
      <section class="location-card dropoff" aria-label="จุดส่ง">
        <div class="location-icon">🏁</div>
        <div class="location-info">
          <span class="location-label">จุดส่งถัดไป</span>
          <p class="location-address">{{ job.dropoff_address }}</p>
        </div>
      </section>

      <!-- Fare -->
      <section class="fare-card" aria-label="ค่าโดยสาร">
        <span class="fare-label">ค่าโดยสาร</span>
        <span class="fare-amount">฿{{ job.fare.toLocaleString() }}</span>
      </section>
    </main>

    <!-- Action Bar -->
    <footer class="action-bar">
      <button class="btn-cancel" type="button" :disabled="updating" @click="emit('cancel')">
        ยกเลิก
      </button>
      <button class="btn-primary" type="button" :disabled="updating" @click="emit('update-status')">
        <span v-if="updating" class="spinner"></span>
        <span v-else>รับลูกค้าแล้ว</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.step-view { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }

.step-header {
  display: flex; align-items: center; gap: 12px; padding: 16px 20px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #fff;
}

.btn-back {
  width: 44px; height: 44px; padding: 10px;
  background: rgba(255, 255, 255, 0.2); border: none; border-radius: 12px;
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
}

.btn-back svg { width: 24px; height: 24px; }
.header-content { flex: 1; }

.step-badge {
  font-size: 12px; font-weight: 600; background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px; border-radius: 12px; display: inline-block; margin-bottom: 4px;
}

.step-header h1 { font-size: 18px; font-weight: 700; margin: 0; }

.step-content { flex: 1; padding: 16px; padding-bottom: 140px; display: flex; flex-direction: column; gap: 12px; }

.status-banner {
  display: flex; align-items: center; gap: 16px; padding: 20px;
  background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 16px;
}

.status-icon { font-size: 40px; }
.status-text h3 { font-size: 18px; font-weight: 700; color: #92400E; margin: 0 0 4px 0; }
.status-text p { font-size: 14px; color: #B45309; margin: 0; }

.customer-card {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.customer-avatar {
  width: 56px; height: 56px; border-radius: 50%; overflow: hidden;
  background: #FEF3C7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.customer-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 24px; font-weight: 700; color: #F59E0B; }
.customer-info { flex: 1; min-width: 0; }
.customer-info h3 { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
.customer-info p { font-size: 14px; color: #6B7280; margin: 0; }
.customer-actions { display: flex; gap: 8px; }

.action-btn {
  width: 44px; height: 44px; border: none; border-radius: 12px;
  background: #FEF3C7; color: #F59E0B; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.action-btn svg { width: 20px; height: 20px; }

.photo-section { padding: 16px; background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.photo-section h4 { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
.photo-hint { font-size: 13px; color: #6B7280; margin: 0 0 12px 0; }

.location-card {
  display: flex; align-items: flex-start; gap: 12px; padding: 16px;
  background: #fff; border-radius: 16px; border-left: 4px solid #6B7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.location-icon { font-size: 24px; flex-shrink: 0; }
.location-info { flex: 1; min-width: 0; }
.location-label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; }
.location-address { font-size: 15px; font-weight: 600; color: #111827; margin: 4px 0 0 0; line-height: 1.4; }

.fare-card {
  display: flex; justify-content: space-between; align-items: center; padding: 16px 20px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #fff; border-radius: 16px;
}

.fare-label { font-size: 14px; font-weight: 600; opacity: 0.9; }
.fare-amount { font-size: 24px; font-weight: 700; }

.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 12px;
  padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff; border-top: 1px solid #E5E7EB; box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

.btn-cancel {
  flex: 1; padding: 16px; background: #fff; color: #EF4444;
  border: 2px solid #EF4444; border-radius: 14px;
  font-size: 16px; font-weight: 700; cursor: pointer; min-height: 56px;
}

.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  flex: 2; padding: 16px; background: #F59E0B; color: #fff;
  border: none; border-radius: 14px; font-size: 16px; font-weight: 700;
  cursor: pointer; min-height: 56px; display: flex; align-items: center; justify-content: center; gap: 8px;
}

.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
