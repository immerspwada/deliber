<!--
  JobPickupViewClean - ขั้นตอน: ถึงจุดรับแล้ว รอรับลูกค้า / กำลังซื้อของ (Black/White Theme)
  URL: /provider/job/:id/pickup
  Supports: Ride orders (pickup status) and Shopping orders (shopping status)
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
const isShopping = computed(() => props.job.type === 'shopping')

// Shopping-specific computed
const shoppingItems = computed(() => {
  if (!isShopping.value || !props.job.items) return []
  try {
    return Array.isArray(props.job.items) ? props.job.items : JSON.parse(props.job.items)
  } catch {
    return []
  }
})

function goBack(): void {
  router.push('/provider/orders')
}
</script>

<template>
  <div class="step-view">
    <!-- Header -->
    <header class="step-header">
      <button class="btn-back" type="button" aria-label="กลับ" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-content">
        <span class="step-badge">ขั้นตอน 2/4</span>
        <h1 v-if="isShopping">กำลังซื้อของ</h1>
        <h1 v-else>ถึงจุดรับแล้ว</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="step-content">
      <!-- Status Banner -->
      <div class="status-banner">
        <svg v-if="isShopping" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <svg v-else class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <div class="status-text">
          <h3 v-if="isShopping">กำลังซื้อของ</h3>
          <h3 v-else>รอรับลูกค้า</h3>
          <p v-if="isShopping">ซื้อสินค้าตามรายการที่ลูกค้าต้องการ</p>
          <p v-else>กรุณารอลูกค้าที่จุดรับ</p>
        </div>
      </div>

      <!-- Shopping: Store Location & Items -->
      <template v-if="isShopping">
        <!-- Store Info -->
        <section class="location-card store-card" aria-label="ข้อมูลร้านค้า">
          <div class="store-icon">🏪</div>
          <div class="location-info">
            <span class="location-label">ร้านค้า</span>
            <p class="location-address">{{ job.store_name || job.pickup_address }}</p>
          </div>
        </section>

        <!-- Reference Images -->
        <section v-if="job.reference_images && job.reference_images.length > 0" class="images-card">
          <div class="images-header">
            <div class="images-icon">📸</div>
            <h3>รูปภาพอ้างอิง</h3>
          </div>
          <div class="images-grid">
            <a 
              v-for="(image, index) in job.reference_images" 
              :key="index"
              :href="image"
              target="_blank"
              class="image-item"
            >
              <img :src="image" :alt="`รูปภาพ ${index + 1}`" loading="lazy" />
            </a>
          </div>
        </section>

        <!-- Item List (Text) -->
        <section v-if="job.item_list" class="item-list-card">
          <div class="item-list-header">
            <div class="item-list-icon">📝</div>
            <h3>รายการสินค้า</h3>
          </div>
          <p class="item-list-content">{{ job.item_list }}</p>
        </section>

        <!-- Items List (Structured) -->
        <section v-if="shoppingItems.length > 0" class="items-card">
          <div class="items-header">
            <div class="items-icon">📦</div>
            <h3>รายการสินค้า ({{ shoppingItems.length }} รายการ)</h3>
          </div>
          <div class="items-list">
            <div v-for="(item, index) in shoppingItems" :key="index" class="item-row">
              <span class="item-name">{{ item.name || item.item_name }}</span>
              <span class="item-qty">x{{ item.quantity || 1 }}</span>
            </div>
          </div>
        </section>

        <!-- Budget -->
        <section v-if="job.budget_limit" class="budget-card">
          <div class="budget-icon">💵</div>
          <div class="budget-info">
            <span class="budget-label">งบประมาณ</span>
            <p class="budget-amount">฿{{ job.budget_limit.toFixed(0) }}</p>
          </div>
        </section>

        <!-- Delivery Address Preview -->
        <section class="location-card" aria-label="ที่อยู่จัดส่ง">
          <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          <div class="location-info">
            <span class="location-label">ที่อยู่จัดส่ง</span>
            <p class="location-address">{{ job.dropoff_address }}</p>
          </div>
        </section>
      </template>

      <!-- Ride: Customer & Photo Evidence -->
      <template v-else>
        <!-- Photo Evidence -->
        <section class="photo-section" aria-label="ถ่ายรูปยืนยัน">
          <div class="photo-header">
            <svg class="photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div>
              <h4>ถ่ายรูปยืนยันจุดรับ</h4>
              <p class="photo-hint">ถ่ายรูปลูกค้าหรือสินค้าที่จุดรับ</p>
            </div>
          </div>
          <PhotoEvidence
            type="pickup"
            :ride-id="job.id"
            :existing-photo="job.pickup_photo"
            @uploaded="(url: string) => emit('photo-uploaded', 'pickup', url)"
          />
        </section>

        <!-- Dropoff Preview -->
        <section class="location-card" aria-label="จุดส่ง">
          <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/>
          </svg>
          <div class="location-info">
            <span class="location-label">จุดส่งถัดไป</span>
            <p class="location-address">{{ job.dropoff_address }}</p>
          </div>
        </section>
      </template>

      <!-- Customer Card (Both) -->
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
        <div class="photo-header">
          <svg class="photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <div>
            <h4>ถ่ายรูปยืนยันจุดรับ</h4>
            <p class="photo-hint">ถ่ายรูปลูกค้าหรือสินค้าที่จุดรับ</p>
          </div>
        </div>
        <PhotoEvidence
          type="pickup"
          :ride-id="job.id"
          :existing-photo="job.pickup_photo"
          @uploaded="(url: string) => emit('photo-uploaded', 'pickup', url)"
        />
      </section>

      <!-- Dropoff Preview -->
      <section class="location-card" aria-label="จุดส่ง">
        <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/>
        </svg>
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
        <span v-else-if="isShopping">รับของแล้ว</span>
        <span v-else>รับลูกค้าแล้ว</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
/* Base Layout */
.step-view {
  min-height: 100vh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Header */
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #000000;
  color: #FFFFFF;
  border-bottom: 1px solid #1A1A1A;
}

.btn-back {
  width: 44px;
  height: 44px;
  padding: 10px;
  background: #1A1A1A;
  border: 1px solid #333333;
  border-radius: 8px;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-back:hover {
  background: #333333;
}

.btn-back svg {
  width: 24px;
  height: 24px;
}

.header-content {
  flex: 1;
}

.step-badge {
  font-size: 12px;
  font-weight: 600;
  background: #1A1A1A;
  color: #CCCCCC;
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-block;
  margin-bottom: 4px;
  border: 1px solid #333333;
}

.step-header h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #FFFFFF;
}

/* Main Content */
.step-content {
  flex: 1;
  padding: 16px;
  padding-bottom: 140px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #F5F5F5;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border: 2px solid #000000;
  border-radius: 8px;
}

.status-icon {
  width: 40px;
  height: 40px;
  color: #000000;
  flex-shrink: 0;
}

.status-text h3 {
  font-size: 18px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 4px 0;
}

.status-text p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Customer Card */
.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: #F5F5F5;
  border: 2px solid #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 24px;
  font-weight: 700;
  color: #666666;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 4px 0;
}

.customer-info p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.customer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #FFFFFF;
  color: #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

/* Photo Section */
.photo-section {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.photo-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.photo-icon {
  width: 24px;
  height: 24px;
  color: #000000;
  flex-shrink: 0;
  margin-top: 2px;
}

.photo-section h4 {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 4px 0;
}

.photo-hint {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

/* Location Card */
.location-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
  border-left: 4px solid #666666;
  border-top: 1px solid #E5E5E5;
  border-right: 1px solid #E5E5E5;
  border-bottom: 1px solid #E5E5E5;
}

.location-icon {
  width: 24px;
  height: 24px;
  color: #666666;
  flex-shrink: 0;
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

/* Fare Card */
.fare-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #000000;
  color: #FFFFFF;
  border-radius: 8px;
}

.fare-label {
  font-size: 14px;
  font-weight: 600;
  color: #CCCCCC;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
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

/* Shopping-specific styles */
.store-card {
  background: #FFF3E0;
  border-left-color: #FF9800;
}

.store-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.images-card {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.images-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.images-icon {
  font-size: 20px;
}

.images-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #F5F5F5;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-item:active {
  transform: scale(0.95);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-list-card {
  padding: 16px;
  background: #FFF9E6;
  border: 1px solid #FFE082;
  border-radius: 8px;
}

.item-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.item-list-icon {
  font-size: 20px;
}

.item-list-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.item-list-content {
  font-size: 14px;
  color: #333333;
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.items-card {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.items-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.items-icon {
  font-size: 20px;
}

.items-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #F5F5F5;
  border-radius: 6px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  flex: 1;
}

.item-qty {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-left: 12px;
}

.budget-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #E8F5E9;
  border: 1px solid #C8E6C9;
  border-radius: 8px;
}

.budget-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.budget-info {
  flex: 1;
}

.budget-label {
  font-size: 12px;
  font-weight: 600;
  color: #2E7D32;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.budget-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1B5E20;
  margin: 0;
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
  padding: 16px;
  background: #FFFFFF;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  min-height: 56px;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #F5F5F5;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  flex: 2;
  padding: 16px;
  background: #000000;
  color: #FFFFFF;
  border: 2px solid #000000;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #1A1A1A;
  border-color: #1A1A1A;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #666666;
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
