<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRideHistory } from '../composables/useRideHistory'
import { useHistoryAnalytics } from '../composables/useHistoryAnalytics'
import { useHistoryCache } from '../composables/useHistoryCache'
import { useServiceRatings } from '../composables/useServiceRatings'
import PullToRefresh from '../components/PullToRefresh.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import DeliveryRatingModal from '../components/delivery/DeliveryRatingModal.vue'
import ShoppingRatingModal from '../components/shopping/ShoppingRatingModal.vue'
import QuickRatingModal from '../components/customer/QuickRatingModal.vue'
import VectorIcons from '../components/icons/VectorIcons.vue'

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

// Smart Analytics
const { stats, insights } = useHistoryAnalytics(history)

// Smart Caching
const { getCached, setCache, isOnline } = useHistoryCache()

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

// UI State
const showInsights = ref(false)
const showAdvancedFilters = ref(false)
const showFavorites = ref(false)
const searchQuery = ref('')

// Advanced filters
const dateRangeStart = ref<Date | null>(null)
const dateRangeEnd = ref<Date | null>(null)
const fareMin = ref<number | null>(null)
const fareMax = ref<number | null>(null)

const filters: { id: ServiceType; label: string; icon: string }[] = [
  { id: 'all', label: 'ทั้งหมด', icon: 'grid' },
  { id: 'ride', label: 'เรียกรถ', icon: 'car' },
  { id: 'delivery', label: 'ส่งของ', icon: 'package' },
  { id: 'shopping', label: 'ซื้อของ', icon: 'cart' },
  { id: 'queue', label: 'จองคิว', icon: 'clipboard' },
  { id: 'moving', label: 'ขนย้าย', icon: 'truck' },
  { id: 'laundry', label: 'ซักรีด', icon: 'washing' }
]

// Smart filtering with search
const filteredHistory = computed(() => {
  let result = history.value
  
  // Filter by service type
  if (activeFilter.value !== 'all') {
    result = result.filter(item => item.type === activeFilter.value)
  }
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      item.tracking_id.toLowerCase().includes(query) ||
      item.from.toLowerCase().includes(query) ||
      item.to.toLowerCase().includes(query) ||
      item.driver_name?.toLowerCase().includes(query) ||
      item.typeName.toLowerCase().includes(query)
    )
  }
  
  // Date range filter
  if (dateRangeStart.value || dateRangeEnd.value) {
    result = result.filter(item => {
      const itemDate = new Date(item.created_at || 0)
      if (dateRangeStart.value && itemDate < dateRangeStart.value) return false
      if (dateRangeEnd.value && itemDate > dateRangeEnd.value) return false
      return true
    })
  }
  
  // Fare range filter
  if (fareMin.value !== null || fareMax.value !== null) {
    result = result.filter(item => {
      if (fareMin.value !== null && item.fare < fareMin.value) return false
      if (fareMax.value !== null && item.fare > fareMax.value) return false
      return true
    })
  }
  
  return result
})

// Favorite destinations
const favoriteDestinations = computed(() => {
  const destinations = new Map<string, number>()
  history.value.forEach(item => {
    const count = destinations.get(item.to) || 0
    destinations.set(item.to, count + 1)
  })
  return Array.from(destinations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([destination, count]) => ({ destination, count }))
})

const frequentRoutes = computed(() => {
  const routes = new Map<string, number>()
  history.value.forEach(item => {
    const route = `${item.from} → ${item.to}`
    const count = routes.get(route) || 0
    routes.set(route, count + 1)
  })
  return Array.from(routes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }))
})

const changeFilter = async (filter: ServiceType) => {
  activeFilter.value = filter
  
  // Try cache first (with error handling)
  try {
    const cached = await getCached(filter)
    if (cached && cached.length > 0) {
      history.value = cached
      console.log('✅ Loaded from cache')
      return
    }
  } catch (error) {
    console.warn('Cache read failed, fetching fresh data:', error)
  }
  
  // Fetch from API
  await fetchHistory(filter)
  
  // Try to cache (with error handling)
  try {
    await setCache(history.value, filter)
    console.log('✅ Fetched and cached')
  } catch (error) {
    console.warn('Cache write failed:', error)
  }
}

const handleExport = () => {
  // Export filtered history to CSV
  const csvContent = [
    // Header
    ['รหัส', 'ประเภท', 'จาก', 'ถึง', 'วันที่', 'เวลา', 'ราคา', 'สถานะ', 'ไรเดอร์'].join(','),
    // Data rows
    ...filteredHistory.value.map(item => [
      item.tracking_id,
      item.typeName,
      item.from,
      item.to,
      item.date,
      item.time,
      item.fare,
      getStatusText(item.status),
      item.driver_name || '-'
    ].join(','))
  ].join('\n')
  
  // Create download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `history_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const clearAdvancedFilters = () => {
  dateRangeStart.value = null
  dateRangeEnd.value = null
  fareMin.value = null
  fareMax.value = null
  searchQuery.value = ''
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await fetchHistory(activeFilter.value)
  
  // Try to cache (with error handling)
  try {
    await setCache(history.value, activeFilter.value)
  } catch (error) {
    console.warn('Cache write failed during refresh:', error)
  }
  
  isRefreshing.value = false
}

const getStatusText = (status: string) => {
  return status === 'completed' ? 'สำเร็จ' : 'ยกเลิก'
}

const getServiceIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'ride': 'car',
    'delivery': 'package',
    'shopping': 'shopping-cart',
    'queue': 'clipboard',
    'moving': 'truck',
    'laundry': 'washing-machine'
  }
  return iconMap[type] || 'car'
}

const handleRebook = (item: any) => {
  const data = rebookRide(item)
  router.push({ path: '/services', query: { destination: data.to } })
}

const viewReceipt = (id: string) => {
  router.push(`/receipt/${id}`)
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  // Try cache first (with error handling)
  try {
    const cached = await getCached('all')
    if (cached && cached.length > 0) {
      history.value = cached
      console.log('✅ Loaded from cache')
    }
  } catch (error) {
    console.warn('Cache read failed on mount:', error)
  }
  
  // Fetch fresh data
  await fetchHistory()
  
  // Try to cache (with error handling)
  try {
    await setCache(history.value, 'all')
  } catch (error) {
    console.warn('Cache write failed on mount:', error)
  }
  
  await checkUnratedOrders()
})
</script>

<template>
  <div class="history-page">
    <PullToRefresh :loading="isRefreshing || loading" @refresh="handleRefresh">
      <!-- Header -->
      <header class="vm-top-bar">
        <div class="vm-top-bar-content">
          <button 
            type="button"
            class="vm-icon-btn" 
            aria-label="กลับ" 
            @click="goBack"
          >
            <VectorIcons name="arrow-left" :size="24" />
          </button>
          <h1 class="vm-title">ประวัติการใช้งาน</h1>
          <div class="vm-top-bar-actions">
            <button 
              type="button"
              class="vm-icon-btn" 
              aria-label="ส่งออกข้อมูล"
              :disabled="history.length === 0"
              @click="handleExport"
            >
              <VectorIcons name="download" :size="20" />
            </button>
            <button 
              type="button"
              class="vm-icon-btn" 
              aria-label="ข้อมูลเชิงลึก"
              @click="showInsights = !showInsights"
            >
              <VectorIcons name="bar-chart" :size="20" />
            </button>
          </div>
        </div>
        
        <!-- Stats Summary -->
        <div class="vm-stats-grid">
          <div class="vm-stat-card">
            <div class="vm-stat-icon">
              <VectorIcons name="check-circle" :size="20" />
            </div>
            <div class="vm-stat-content">
              <span class="vm-stat-value">{{ stats.completedOrders }}</span>
              <span class="vm-stat-label">รายการสำเร็จ</span>
            </div>
          </div>
          <div class="vm-stat-card">
            <div class="vm-stat-icon">
              <VectorIcons name="dollar-sign" :size="20" />
            </div>
            <div class="vm-stat-content">
              <span class="vm-stat-value">฿{{ stats.totalSpent.toLocaleString() }}</span>
              <span class="vm-stat-label">ยอดใช้จ่ายรวม</span>
            </div>
          </div>
        </div>

        <!-- Insights Panel -->
        <div v-if="showInsights && insights.length > 0" class="vm-insights-panel">
          <div 
            v-for="insight in insights" 
            :key="insight.title"
            class="vm-insight-card"
          >
            <div class="vm-insight-icon">
              <VectorIcons 
                :name="insight.icon" 
                :size="18" 
              />
            </div>
            <div class="vm-insight-content">
              <h4 class="vm-insight-title">{{ insight.title }}</h4>
              <p class="vm-insight-message">{{ insight.message }}</p>
            </div>
          </div>
        </div>
      </header>

      <div class="vm-container">
        <!-- Search Bar -->
        <div class="vm-search-section">
          <div class="vm-search-bar">
            <VectorIcons name="search" :size="18" class="vm-search-icon" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="ค้นหารหัส, สถานที่, ไรเดอร์..."
              class="vm-search-input"
              aria-label="ค้นหาประวัติ"
            />
            <button 
              v-if="searchQuery || dateRangeStart || fareMin"
              type="button"
              class="vm-icon-btn vm-icon-btn-sm"
              aria-label="ล้างการค้นหา"
              @click="clearAdvancedFilters"
            >
              <VectorIcons name="x" :size="16" />
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="vm-filter-section">
          <div class="vm-filters-scroll">
            <button
              v-for="filter in filters"
              :key="filter.id"
              type="button"
              :class="['vm-filter-chip', { 'vm-filter-chip-active': activeFilter === filter.id }]"
              @click="changeFilter(filter.id)"
            >
              <span class="vm-filter-label">{{ filter.label }}</span>
              <span v-if="activeFilter === filter.id && filteredHistory.length > 0" class="vm-filter-count">
                {{ filteredHistory.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- Skeleton Loading -->
        <SkeletonLoader v-if="loading && !isRefreshing" type="history" :count="3" />

        <!-- History List -->
        <div v-else class="vm-history-list">
          <!-- Group by date -->
          <template v-if="filteredHistory.length > 0">
            <div
              v-for="item in filteredHistory"
              :key="item.id"
              class="vm-history-card"
              @click="viewReceipt(item.id)"
            >
              <!-- Card Header: Type + Status -->
              <div class="vm-card-header">
                <div class="vm-service-badge">
                  <VectorIcons 
                    :name="getServiceIcon(item.type)" 
                    :size="18" 
                  />
                  <span>{{ item.typeName }}</span>
                </div>
                <span :class="['vm-status-badge', `vm-status-${item.status}`]">
                  {{ getStatusText(item.status) }}
                </span>
              </div>

              <!-- Route Display -->
              <div class="vm-route-section">
                <div class="vm-route-visual">
                  <div class="vm-route-dot vm-route-dot--start"></div>
                  <div class="vm-route-line"></div>
                  <div class="vm-route-dot vm-route-dot--end"></div>
                </div>
                <div class="vm-route-content">
                  <div class="vm-route-item">
                    <span class="vm-route-label">จาก</span>
                    <span class="vm-route-text">{{ item.from }}</span>
                  </div>
                  <div class="vm-route-item">
                    <span class="vm-route-label">ถึง</span>
                    <span class="vm-route-text">{{ item.to }}</span>
                  </div>
                </div>
              </div>

              <!-- Driver Info -->
              <div v-if="item.driver_name" class="vm-driver-section">
                <div class="vm-driver-avatar">
                  <VectorIcons name="user" :size="20" />
                </div>
                <div class="vm-driver-info">
                  <span class="vm-driver-name">{{ item.driver_name }}</span>
                  <span v-if="item.vehicle" class="vm-driver-vehicle">{{ item.vehicle }}</span>
                </div>
                <div v-if="item.rating" class="vm-rating-badge">
                  <VectorIcons name="star" :size="14" />
                  <span>{{ item.rating }}</span>
                </div>
              </div>

              <!-- Card Footer: Meta + Price + Actions -->
              <div class="vm-card-footer">
                <div class="vm-meta-section">
                  <div class="vm-meta-item">
                    <VectorIcons name="calendar" :size="14" />
                    <span>{{ item.date }} • {{ item.time }}</span>
                  </div>
                  <div class="vm-meta-item">
                    <VectorIcons name="hash" :size="12" />
                    <span>{{ item.tracking_id }}</span>
                  </div>
                </div>
                <div class="vm-price-actions">
                  <span class="vm-price">฿{{ item.fare.toLocaleString() }}</span>
                  <div class="vm-action-buttons">
                    <button 
                      v-if="item.status === 'completed'" 
                      type="button"
                      class="vm-icon-btn vm-icon-btn-sm" 
                      aria-label="ดูใบเสร็จ"
                      @click.stop="viewReceipt(item.id)"
                    >
                      <VectorIcons name="file-text" :size="18" />
                    </button>
                    <button 
                      v-if="item.status === 'completed' && !item.rating && (item.type === 'delivery' || item.type === 'shopping')" 
                      type="button"
                      class="vm-btn-secondary vm-btn-sm" 
                      @click.stop="openRatingModal(item)"
                    >
                      ให้คะแนน
                    </button>
                    <button 
                      v-if="item.status === 'completed'" 
                      type="button"
                      class="vm-btn-primary vm-btn-sm" 
                      @click.stop="handleRebook(item)"
                    >
                      จองอีกครั้ง
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-else class="vm-empty-state">
            <div class="vm-empty-icon">
              <VectorIcons name="clipboard-check" :size="64" />
            </div>
            <h3 class="vm-empty-title">ยังไม่มีประวัติการใช้งาน</h3>
            <p class="vm-empty-desc">เมื่อคุณใช้บริการ ประวัติจะแสดงที่นี่</p>
            <button 
              type="button"
              class="vm-btn vm-btn-primary" 
              @click="router.push('/customer')"
            >
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

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
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
  color: #1A1A1A;
}

.icon-btn:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  background: var(--cm-bg-hover);
  color: var(--cm-accent);
}

.stat-icon.spent {
  background: var(--cm-bg-hover);
  color: var(--cm-text-primary);
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

/* Insights Panel */
.insights-panel {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.insight-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: white;
  border: 1px solid #E5E5E5;
}

.insight-card.warning {
  background: #FFF9F5;
  border-color: #FFE5D9;
}

.insight-card.success {
  background: #F5FFF9;
  border-color: #D9FFE5;
}

.insight-card.info {
  background: #F5F9FF;
  border-color: #D9E5FF;
}

.insight-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.insight-card.warning .insight-icon {
  background: #FFE5D9;
  color: #FF6B35;
}

.insight-card.success .insight-icon {
  background: #D9FFE5;
  color: #00B377;
}

.insight-card.info .insight-icon {
  background: #D9E5FF;
  color: #3B82F6;
}

.insight-content {
  flex: 1;
}

.insight-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.insight-message {
  font-size: 12px;
  color: #6B6B6B;
  line-height: 1.4;
}

/* Content */
.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Search Bar */
.search-section {
  padding: 16px 0 8px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #E5E5E5;
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: var(--cm-accent);
  box-shadow: 0 0 0 3px rgba(0, 179, 119, 0.1);
}

.search-icon {
  color: #9CA3AF;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 8px;
  font-size: 14px;
  color: #1A1A1A;
  background: transparent;
}

.search-input::placeholder {
  color: #9CA3AF;
}

.clear-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 6px;
  color: #6B6B6B;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-btn:active {
  transform: scale(0.9);
  background: #EBEBEB;
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
  background: var(--cm-accent);
  border-color: var(--cm-accent);
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
  background: var(--cm-bg-hover);
  color: var(--cm-text-primary);
}

.status-pill {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.status-pill.completed {
  background: var(--cm-bg-hover);
  color: var(--cm-text-primary);
}

.status-pill.cancelled {
  background: var(--cm-bg-hover);
  color: var(--cm-text-secondary);
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
  background: var(--cm-accent);
}

.route-dot.end {
  background: white;
  border: 2.5px solid var(--cm-text-secondary);
}

.route-line-vertical {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: linear-gradient(180deg, var(--cm-accent) 0%, #E5E5E5 50%, var(--cm-text-secondary) 100%);
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
  background: var(--cm-bg-hover);
  border-radius: 6px;
  color: var(--cm-text-primary);
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
  background: var(--cm-accent);
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
  background: var(--cm-accent);
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
