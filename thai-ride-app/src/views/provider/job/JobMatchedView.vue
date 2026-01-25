<!--
  JobMatchedView - ขั้นตอน: รับงานแล้ว กำลังไปจุดรับ
  URL: /provider/job/:id/matched
  
  Redesigned: Modern, clean, and user-friendly interface
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
const serviceTypeLabel = computed(() => {
  const types: Record<string, string> = {
    'ride': '🚗 รับส่งผู้โดยสาร',
    'delivery': '📦 ส่งของ',
    'shopping': '🛒 ช้อปปิ้ง',
    'moving': '🚚 ขนของ'
  }
  return types[props.job.service_type] || props.job.service_type
})

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
    <!-- Header - Enhanced with gradient -->
    <header class="step-header">
      <button class="btn-back" type="button" aria-label="กลับหน้างาน" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-content">
        <div class="header-top">
          <span class="step-badge">ขั้นตอน 1/4</span>
          <span class="service-type">{{ serviceTypeLabel }}</span>
        </div>
        <h1>กำลังไปรับลูกค้า</h1>
      </div>
    </header>

    <!-- Main Content - Improved spacing and hierarchy -->
    <main class="step-content">
      <!-- Hero Section: Fare Card - Most Important -->
      <section class="fare-hero" aria-label="ค่าโดยสาร">
        <div class="fare-content">
          <div class="fare-icon">💰</div>
          <div class="fare-details">
            <span class="fare-label">รายได้ที่คุณจะได้รับ</span>
            <div class="fare-amount-wrapper">
              <span class="fare-currency">฿</span>
              <span class="fare-amount">{{ job.fare.toLocaleString() }}</span>
            </div>
          </div>
        </div>
        <div class="fare-shine"></div>
      </section>

      <!-- Customer Card - Enhanced design -->
      <section class="customer-card" aria-label="ข้อมูลลูกค้า">
        <div class="customer-main">
          <div class="customer-avatar">
            <img 
              v-if="customer?.avatar_url" 
              :src="customer.avatar_url" 
              :alt="`รูปโปรไฟล์ของ ${customer?.name || 'ลูกค้า'}`"
              loading="lazy"
            />
            <span v-else class="avatar-placeholder">{{ customer?.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="customer-info">
            <h2>{{ customer?.name || 'ลูกค้า' }}</h2>
            <p v-if="customer?.phone" class="customer-phone">{{ customer.phone }}</p>
          </div>
        </div>
        <div class="customer-actions">
          <button 
            class="action-btn action-call" 
            type="button" 
            aria-label="โทรหาลูกค้า" 
            title="โทรหาลูกค้า"
            @click="emit('call')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span class="action-label">โทร</span>
          </button>
          <button 
            class="action-btn action-chat" 
            type="button" 
            aria-label="แชทกับลูกค้า" 
            title="แชทกับลูกค้า"
            @click="emit('chat')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span class="action-label">แชท</span>
          </button>
        </div>
      </section>

      <!-- Locations Section - Better visual separation -->
      <div class="locations-section">
        <!-- Pickup Location - Primary -->
        <section class="location-card pickup-card" aria-label="จุดรับลูกค้า">
          <div class="location-header">
            <div class="location-icon-wrapper pickup-icon">
              <span class="location-icon">📍</span>
            </div>
            <div class="location-info">
              <span class="location-label">จุดรับลูกค้า</span>
              <p class="location-address">{{ job.pickup_address }}</p>
            </div>
          </div>
          <button 
            class="nav-btn" 
            type="button" 
            aria-label="เปิดแผนที่นำทาง"
            @click="openNavigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span>เปิดแผนที่นำทาง</span>
          </button>
        </section>

        <!-- Route Indicator -->
        <div class="route-indicator" aria-hidden="true">
          <div class="route-line"></div>
          <div class="route-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <!-- Dropoff Preview - Secondary -->
        <section class="location-card dropoff-card" aria-label="จุดหมายปลายทาง">
          <div class="location-header">
            <div class="location-icon-wrapper dropoff-icon">
              <span class="location-icon">🏁</span>
            </div>
            <div class="location-info">
              <span class="location-label">จุดหมายปลายทาง</span>
              <p class="location-address">{{ job.dropoff_address }}</p>
            </div>
          </div>
          <div class="preview-badge">
            <span>ดูรายละเอียดหลังรับลูกค้า</span>
          </div>
        </section>
      </div>

      <!-- Notes Section - If exists -->
      <section v-if="job.notes" class="notes-card" aria-label="หมายเหตุจากลูกค้า">
        <div class="notes-header">
          <span class="notes-icon">📝</span>
          <h3>หมายเหตุจากลูกค้า</h3>
        </div>
        <p class="notes-content">{{ job.notes }}</p>
      </section>
    </main>

    <!-- Action Bar - Enhanced with better hierarchy -->
    <footer class="action-bar">
      <button 
        class="btn-cancel" 
        type="button" 
        aria-label="ยกเลิกงาน"
        :disabled="updating" 
        @click="emit('cancel')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        <span>ยกเลิก</span>
      </button>
      <button 
        class="btn-primary" 
        type="button" 
        aria-label="ยืนยันว่าถึงจุดรับแล้ว"
        :disabled="updating" 
        @click="emit('update-status')"
      >
        <span v-if="updating" class="spinner" aria-hidden="true"></span>
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>ถึงจุดรับแล้ว</span>
        </template>
      </button>
    </footer>
  </div>
</template>

<style scoped>
/* ===== Base Styles ===== */
.step-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 50%, #F8FAFC 100%);
  display: flex;
  flex-direction: column;
  position: relative;
}

.step-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: radial-gradient(ellipse at top, rgba(0, 168, 107, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

/* ===== Header - Enhanced ===== */
.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #00A86B 0%, #00C77F 50%, #00A86B 100%);
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 168, 107, 0.25);
  position: relative;
  overflow: hidden;
  z-index: 10;
}

.step-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50% { transform: translate(-20%, -20%); opacity: 0.8; }
}

.btn-back {
  width: 44px;
  height: 44px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 14px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.btn-back:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-back svg {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.header-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.step-badge {
  font-size: 11px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.25);
  padding: 5px 12px;
  border-radius: 20px;
  display: inline-block;
  backdrop-filter: blur(10px);
  letter-spacing: 0.5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
}

.service-type {
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  padding: 5px 10px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.step-header h1 {
  font-size: 18px;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ===== Content ===== */
.step-content {
  flex: 1;
  padding: 16px 16px;
  padding-bottom: 140px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  scroll-behavior: smooth;
  position: relative;
  z-index: 1;
}

.step-content::-webkit-scrollbar {
  width: 4px;
}

.step-content::-webkit-scrollbar-track {
  background: transparent;
}

.step-content::-webkit-scrollbar-thumb {
  background: rgba(0, 168, 107, 0.2);
  border-radius: 2px;
}

/* ===== Fare Hero - Most Important ===== */
.fare-hero {
  padding: 24px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #00C77F 50%, #00A86B 100%);
  border-radius: 20px;
  box-shadow: 
    0 10px 40px rgba(0, 168, 107, 0.3),
    0 4px 12px rgba(0, 168, 107, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fare-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.fare-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.fare-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.fare-icon {
  font-size: 48px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.fare-details {
  flex: 1;
}

.fare-label {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-bottom: 4px;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.fare-amount-wrapper {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.fare-currency {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.fare-amount {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -1.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  line-height: 1;
}

/* ===== Customer Card - Enhanced ===== */
.customer-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.customer-card:active {
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.customer-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.customer-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #E8F5EF 0%, #D1F2E8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 
    0 4px 12px rgba(0, 168, 107, 0.2),
    0 0 0 1px rgba(0, 168, 107, 0.1);
  position: relative;
}

.customer-avatar::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, #00A86B, #00C77F);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 26px;
  font-weight: 900;
  color: #00A86B;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h2 {
  font-size: 17px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 4px 0;
  letter-spacing: -0.4px;
}

.customer-phone {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.customer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  min-height: 52px;
  padding: 12px 16px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 700;
  font-size: 12px;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-btn:active::before {
  opacity: 1;
}

.action-call {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.action-call:active {
  transform: scale(0.94);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}

.action-chat {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.action-chat:active {
  transform: scale(0.94);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.action-btn svg {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.action-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* ===== Locations Section ===== */
.locations-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeInUp 0.7s ease-out 0.2s both;
}

/* ===== Location Card ===== */
.location-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.location-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  transition: width 0.3s ease;
}

.pickup-card::before {
  background: linear-gradient(180deg, #00A86B 0%, #00C77F 100%);
}

.dropoff-card::before {
  background: linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%);
}

.pickup-card {
  border-left: 4px solid #00A86B;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%);
}

.pickup-card:active {
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.15);
  transform: translateY(-2px);
}

.dropoff-card {
  border-left: 4px solid #9CA3AF;
  opacity: 0.85;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.location-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pickup-icon {
  background: linear-gradient(135deg, #E8F5EF 0%, #D1F2E8 100%);
}

.dropoff-icon {
  background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
}

.location-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-label {
  font-size: 11px;
  font-weight: 800;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display: block;
  margin-bottom: 6px;
}

.location-address {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.4;
  letter-spacing: -0.3px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #00C77F 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  align-self: flex-start;
  box-shadow: 
    0 6px 16px rgba(0, 168, 107, 0.3),
    0 2px 8px rgba(0, 168, 107, 0.2);
  min-height: 48px;
  letter-spacing: -0.2px;
}

.nav-btn:active {
  transform: scale(0.96);
  box-shadow: 
    0 4px 12px rgba(0, 168, 107, 0.25),
    0 1px 4px rgba(0, 168, 107, 0.15);
}

.nav-btn svg {
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* ===== Route Indicator ===== */
.route-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  position: relative;
}

.route-line {
  width: 2px;
  height: 24px;
  background: linear-gradient(180deg, #00A86B 0%, #9CA3AF 100%);
  border-radius: 1px;
  opacity: 0.3;
}

.route-dots {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.dot {
  width: 4px;
  height: 4px;
  background: #9CA3AF;
  border-radius: 50%;
  opacity: 0.5;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.3s;
}

.dot:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.3); }
}

.preview-badge {
  padding: 8px 12px;
  background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
  border-radius: 10px;
  align-self: flex-start;
}

.preview-badge span {
  font-size: 11px;
  font-weight: 700;
  color: #6B7280;
  letter-spacing: 0.2px;
}

/* ===== Notes Card ===== */
.notes-card {
  padding: 16px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border-radius: 18px;
  border-left: 4px solid #F59E0B;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
  animation: fadeInUp 0.8s ease-out 0.3s both;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.notes-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.notes-card h3 {
  font-size: 14px;
  font-weight: 800;
  color: #92400E;
  margin: 0;
  letter-spacing: -0.2px;
}

.notes-content {
  font-size: 14px;
  color: #78350F;
  margin: 0;
  line-height: 1.5;
  font-weight: 600;
  letter-spacing: -0.1px;
}

/* ===== Action Bar - Enhanced ===== */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #FFFFFF 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 -12px 32px rgba(0, 0, 0, 0.1),
    0 -4px 16px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(20px);
  z-index: 20;
}

.btn-cancel {
  flex: 1;
  padding: 16px;
  background: #fff;
  color: #EF4444;
  border: 2px solid #FCA5A5;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  min-height: 56px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
}

.btn-cancel:active:not(:disabled) {
  background: #FEF2F2;
  border-color: #EF4444;
  transform: scale(0.96);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
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
  padding: 16px;
  background: linear-gradient(135deg, #00A86B 0%, #00C77F 50%, #00A86B 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 8px 24px rgba(0, 168, 107, 0.3),
    0 4px 12px rgba(0, 168, 107, 0.2);
  letter-spacing: -0.4px;
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-primary:active:not(:disabled)::before {
  opacity: 1;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.96);
  box-shadow: 
    0 6px 20px rgba(0, 168, 107, 0.25),
    0 2px 8px rgba(0, 168, 107, 0.15);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Responsive ===== */
@media (min-width: 480px) {
  .step-header {
    padding: 16px 24px;
  }

  .step-header h1 {
    font-size: 20px;
  }

  .step-content {
    padding: 20px 20px;
    padding-bottom: 150px;
    gap: 16px;
  }

  .fare-hero {
    padding: 28px 24px;
  }

  .fare-amount {
    font-size: 42px;
  }

  .customer-card {
    padding: 18px;
  }

  .location-card {
    padding: 18px;
  }

  .action-bar {
    padding: 16px 20px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    gap: 14px;
  }

  .btn-cancel, .btn-primary {
    min-height: 60px;
    font-size: 17px;
  }
}

@media (min-width: 768px) {
  .step-content {
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
  }

  .action-bar {
    max-width: 600px;
    margin: 0 auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* ===== Accessibility ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ===== Dark Mode Support (Future) ===== */
@media (prefers-color-scheme: dark) {
  /* Will be implemented when dark mode is added */
}
</style>
