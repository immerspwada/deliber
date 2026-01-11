<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRideHistory } from '../composables/useRideHistory'
import { useServiceRatings } from '../composables/useServiceRatings'
import PullToRefresh from '../components/PullToRefresh.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import DeliveryRatingModal from '../components/delivery/DeliveryRatingModal.vue'
import ShoppingRatingModal from '../components/shopping/ShoppingRatingModal.vue'
import QuickRatingModal from '../components/customer/QuickRatingModal.vue'

const router = useRouter()
const { 
  history, 
  loading, 
  fetchHistory, 
  rebookRide,
  unratedRidesCount,
  fetchUnratedRides,
  fetchUnratedOrdersDetails,
  submitRating,
  skipRating
} = useRideHistory()
useServiceRatings()

// Rating modal state
const showDeliveryRating = ref(false)
const showShoppingRating = ref(false)
const selectedItem = ref<any>(null)

// Quick rating modal state
const showQuickRating = ref(false)
const unratedOrders = ref<any[]>([])

const openRatingModal = (item: any) => {
  selectedItem.value = item
  if (item.type === 'delivery') {
    showDeliveryRating.value = true
  } else if (item.type === 'shopping') {
    showShoppingRating.value = true
  }
}

const handleRatingSubmit = async (success: boolean) => {
  showDeliveryRating.value = false
  showShoppingRating.value = false
  if (success) {
    await fetchHistory(activeFilter.value)
    await fetchUnratedRides()
  }
  selectedItem.value = null
}

// Quick rating handlers
const handleQuickRate = async (orderId: string, orderType: string, rating: number, comment: string) => {
  await submitRating(orderId, orderType as any, rating, comment)
  await fetchHistory(activeFilter.value)
}

const handleQuickSkip = async (orderId: string, orderType: string) => {
  await skipRating(orderId, orderType)
}

const handleQuickRatingClose = () => {
  showQuickRating.value = false
}

// Check for unrated orders on mount
const checkUnratedOrders = async () => {
  await fetchUnratedRides()
  if (unratedRidesCount.value > 0) {
    const orders = await fetchUnratedOrdersDetails()
    if (orders.length > 0) {
      unratedOrders.value = orders
      setTimeout(() => {
        showQuickRating.value = true
      }, 500)
    }
  }
}

type ServiceType = 'all' | 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
const activeFilter = ref<ServiceType>('all')
const isRefreshing = ref(false)

const filters: { id: ServiceType; label: string; icon: string }[] = [
  { id: 'all', label: 'ทั้งหมด', icon: 'grid' },
  { id: 'ride', label: 'เรียกรถ', icon: 'car' },
  { id: 'delivery', label: 'ส่งของ', icon: 'package' },
  { id: 'shopping', label: 'ซื้อของ', icon: 'cart' },
  { id: 'queue', label: 'จองคิว', icon: 'clipboard' },
  { id: 'moving', label: 'ขนย้าย', icon: 'truck' },
  { id: 'laundry', label: 'ซักรีด', icon: 'washing' }
]

const filteredHistory = computed(() => {
  if (activeFilter.value === 'all') return history.value
  return history.value.filter(item => item.type === activeFilter.value)
})

// Stats
const stats = computed(() => {
  const completed = history.value.filter(h => h.status === 'completed').length
  const totalSpent = history.value
    .filter(h => h.status === 'completed')
    .reduce((sum, h) => sum + h.fare, 0)
  return { completed, totalSpent }
})

const changeFilter = async (filter: ServiceType) => {
  activeFilter.value = filter
  await fetchHistory(filter)
}

const getStatusText = (status: string) => {
  return status === 'completed' ? 'สำเร็จ' : 'ยกเลิก'
}

const handleRebook = (item: any) => {
  const data = rebookRide(item)
  router.push({ path: '/services', query: { destination: data.to } })
}

const viewReceipt = (id: string) => {
  router.push(`/receipt/${id}`)
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await fetchHistory(activeFilter.value)
  isRefreshing.value = false
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await fetchHistory()
  await checkUnratedOrders()
})
</script>

<template>
  <div class="history-page">
    <PullToRefresh :loading="isRefreshing || loading" @refresh="handleRefresh">
      <!-- Header -->
      <header class="page-header">
        <div class="header-top">
          <button class="back-btn" @click="goBack" aria-label="กลับ">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="page-title">ประวัติการใช้งาน</h1>
          <div class="header-spacer"></div>
        </div>
        
        <!-- Stats Summary -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon completed">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.completed }}</span>
              <span class="stat-label">รายการสำเร็จ</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon spent">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">฿{{ stats.totalSpent.toLocaleString() }}</span>
              <span class="stat-label">ยอดใช้จ่ายรวม</span>
            </div>
          </div>
        </div>
      </header>

      <div class="content-container">
        <!-- Filter Tabs -->
        <div class="filter-section">
          <div class="filters-scroll">
            <button
              v-for="filter in filters"
              :key="filter.id"
              @click="changeFilter(filter.id)"
              :class="['filter-chip', { active: activeFilter === filter.id }]"
            >
              <span class="filter-label">{{ filter.label }}</span>
              <span v-if="activeFilter === filter.id && filteredHistory.length > 0" class="filter-count">
                {{ filteredHistory.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- Skeleton Loading -->
        <SkeletonLoader v-if="loading && !isRefreshing" type="history" :count="3" />

        <!-- History List -->
        <div v-else class="history-list">
          <!-- Group by date -->
          <template v-if="filteredHistory.length > 0">
            <div
              v-for="item in filteredHistory"
              :key="item.id"
              class="history-card"
            >
              <!-- Card Top: Type + Status -->
              <div class="card-top">
                <div class="service-type" :class="item.type">
                  <!-- Icons -->
                  <svg v-if="item.type === 'ride'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
                  </svg>
                  <svg v-else-if="item.type === 'delivery'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                  <svg v-else-if="item.type === 'shopping'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <svg v-else-if="item.type === 'queue'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                  </svg>
                  <svg v-else-if="item.type === 'moving'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M5 11h14l-1.5-4.5A2 2 0 0015.6 5H8.4a2 2 0 00-1.9 1.5L5 11zm0 0v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M3 11h2m14 0h2"/>
                  </svg>
                  <svg v-else-if="item.type === 'laundry'" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm8 4a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"/>
                  </svg>
                  <span>{{ item.typeName }}</span>
                </div>
                <span :class="['status-pill', item.status]">
                  {{ getStatusText(item.status) }}
                </span>
              </div>

              <!-- Route Info -->
              <div class="route-section">
                <div class="route-visual">
                  <div class="route-dot start"></div>
                  <div class="route-line-vertical"></div>
                  <div class="route-dot end"></div>
                </div>
                <div class="route-addresses">
                  <div class="address-item">
                    <span class="address-label">จาก</span>
                    <span class="address-text">{{ item.from }}</span>
                  </div>
                  <div class="address-item">
                    <span class="address-label">ถึง</span>
                    <span class="address-text">{{ item.to }}</span>
                  </div>
                </div>
              </div>

              <!-- Driver Info (if available) -->
              <div v-if="item.driver_name" class="driver-section">
                <div class="driver-avatar">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div class="driver-details">
                  <span class="driver-name">{{ item.driver_name }}</span>
                  <span v-if="item.vehicle" class="driver-vehicle">{{ item.vehicle }}</span>
                </div>
                <div v-if="item.rating" class="driver-rating">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span>{{ item.rating }}</span>
                </div>
              </div>

              <!-- Card Bottom: Meta + Actions -->
              <div class="card-bottom">
                <div class="meta-section">
                  <div class="datetime">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>{{ item.date }} • {{ item.time }}</span>
                  </div>
                  <div class="tracking-code">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                    </svg>
                    <span>{{ item.tracking_id }}</span>
                  </div>
                </div>
                <div class="price-actions">
                  <span class="price">฿{{ item.fare.toLocaleString() }}</span>
                  <div class="action-btns">
                    <button 
                      v-if="item.status === 'completed'" 
                      @click="viewReceipt(item.id)" 
                      class="icon-btn"
                      aria-label="ดูใบเสร็จ"
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </button>
                    <button 
                      v-if="item.status === 'completed' && !item.rating && (item.type === 'delivery' || item.type === 'shopping')" 
                      @click="openRatingModal(item)" 
                      class="text-btn secondary"
                    >
                      ให้คะแนน
                    </button>
                    <button 
                      v-if="item.status === 'completed'" 
                      @click="handleRebook(item)" 
                      class="text-btn primary"
                    >
                      จองอีกครั้ง
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-illustration">
              <svg width="80" height="80" fill="none" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="#F0FDF4" stroke="#00A86B" stroke-width="2" stroke-dasharray="4 4"/>
                <path d="M28 32h24M28 40h16M28 48h20" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
                <circle cx="54" cy="54" r="12" fill="#00A86B"/>
                <path d="M50 54l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="empty-title">ยังไม่มีประวัติการใช้งาน</h3>
            <p class="empty-desc">เมื่อคุณใช้บริการ ประวัติจะแสดงที่นี่</p>
            <button class="empty-cta" @click="router.push('/customer')">
              เริ่มใช้บริการ
            </button>
          </div>
        </div>
      </div>
    </PullToRefresh>

    <!-- Modals -->
    <DeliveryRatingModal
      v-if="selectedItem"
      :show="showDeliveryRating"
      :delivery-id="selectedItem?.id || ''"
      :rider-name="selectedItem?.driver_name || 'ไรเดอร์'"
      :final-price="selectedItem?.fare || 0"
      @close="showDeliveryRating = false"
      @submit="handleRatingSubmit"
    />

    <ShoppingRatingModal
      v-if="selectedItem"
      :show="showShoppingRating"
      :shopping-id="selectedItem?.id || ''"
      :shopper-name="selectedItem?.driver_name || 'ผู้ช่วยซื้อของ'"
      :service-fee="selectedItem?.fare || 0"
      @close="showShoppingRating = false"
      @submit="handleRatingSubmit"
    />

    <QuickRatingModal
      :show="showQuickRating"
      :orders="unratedOrders"
      @close="handleQuickRatingClose"
      @rate="handleQuickRate"
      @skip="handleQuickSkip"
    />
  </div>
</template>


<style scoped>
.history-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FAFAFA 0%, #F5F5F5 100%);
  padding-bottom: 100px;
}

/* Header */
.page-header {
  background: white;
  padding: 16px 16px 20px;
  border-radius: 0 0 24px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.header-spacer {
  width: 44px;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FAFAFA;
  border-radius: 14px;
}

.stat-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-icon.completed {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-icon.spent {
  background: #FEF3C7;
  color: #D97706;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 12px;
  color: #6B6B6B;
}

/* Content */
.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Filters */
.filter-section {
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: transparent;
}

.filters-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.filters-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: white;
  border: 1.5px solid #E5E5E5;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: #4A4A4A;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  min-height: 44px;
}

.filter-chip:active {
  transform: scale(0.96);
}

.filter-chip.active {
  background: #00A86B;
  border-color: #00A86B;
  color: white;
}

.filter-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.history-card:active {
  transform: scale(0.99);
}

/* Card Top */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.service-type {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.service-type.ride {
  background: #E8F5EF;
  color: #00875A;
}

.service-type.delivery {
  background: #FEF3C7;
  color: #92400E;
}

.service-type.shopping {
  background: #DBEAFE;
  color: #1E40AF;
}

.service-type.queue {
  background: #EDE9FE;
  color: #6D28D9;
}

.service-type.moving {
  background: #FFEDD5;
  color: #C2410C;
}

.service-type.laundry {
  background: #E0F2FE;
  color: #0369A1;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.status-pill.completed {
  background: #DCFCE7;
  color: #15803D;
}

.status-pill.cancelled {
  background: #FEE2E2;
  color: #DC2626;
}

/* Route Section */
.route-section {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 12px;
  margin-bottom: 12px;
}

.route-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.route-dot.start {
  background: #00A86B;
}

.route-dot.end {
  background: white;
  border: 2.5px solid #EF4444;
}

.route-line-vertical {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: linear-gradient(180deg, #00A86B 0%, #E5E5E5 50%, #EF4444 100%);
  margin: 4px 0;
}

.route-addresses {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.address-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.address-label {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.address-text {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  line-height: 1.3;
}

/* Driver Section */
.driver-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #F9FAFB;
  border-radius: 10px;
  margin-bottom: 12px;
}

.driver-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  color: #6B7280;
}

.driver-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.driver-vehicle {
  font-size: 12px;
  color: #6B7280;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #FEF3C7;
  border-radius: 6px;
  color: #D97706;
  font-size: 13px;
  font-weight: 600;
}

/* Card Bottom */
.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 12px;
  border-top: 1px solid #F3F4F6;
}

.meta-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.datetime {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;
}

.tracking-code {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9CA3AF;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.price-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.price {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.action-btns {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  color: #4A4A4A;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:active {
  transform: scale(0.92);
  background: #EBEBEB;
}

.text-btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 40px;
  border: none;
}

.text-btn.primary {
  background: #00A86B;
  color: white;
}

.text-btn.primary:active {
  transform: scale(0.96);
  background: #009960;
}

.text-btn.secondary {
  background: #F5F5F5;
  color: #1A1A1A;
  border: 1px solid #E5E5E5;
}

.text-btn.secondary:active {
  transform: scale(0.96);
  background: #EBEBEB;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-illustration {
  margin-bottom: 20px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 24px;
}

.empty-cta {
  padding: 14px 32px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-cta:active {
  transform: scale(0.96);
  background: #009960;
}

/* Responsive */
@media (max-width: 360px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-value {
    font-size: 16px;
  }
}
</style>
