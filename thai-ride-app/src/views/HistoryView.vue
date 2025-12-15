<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRideHistory } from '../composables/useRideHistory'

const router = useRouter()
const { history, loading, fetchHistory, rebookRide } = useRideHistory()

type ServiceType = 'all' | 'ride' | 'delivery' | 'shopping'
const activeFilter = ref<ServiceType>('all')

const filters: { id: ServiceType; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'ride', label: 'เรียกรถ' },
  { id: 'delivery', label: 'ส่งของ' },
  { id: 'shopping', label: 'ซื้อของ' }
]

const filteredHistory = computed(() => {
  if (activeFilter.value === 'all') return history.value
  return history.value.filter(item => item.type === activeFilter.value)
})

const changeFilter = async (filter: ServiceType) => {
  activeFilter.value = filter
  await fetchHistory(filter)
}

const getStatusText = (status: string) => {
  return status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'
}

const handleRebook = (item: any) => {
  const data = rebookRide(item)
  router.push({ path: '/services', query: { destination: data.to } })
}

const viewReceipt = (id: string) => {
  router.push(`/receipt/${id}`)
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="history-page">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">ประวัติการใช้งาน</h1>
      </div>

      <!-- Filters -->
      <div class="filters">
        <button
          v-for="filter in filters"
          :key="filter.id"
          @click="changeFilter(filter.id)"
          :class="['filter-btn', { active: activeFilter === filter.id }]"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- History List -->
      <div v-else class="history-list">
        <div
          v-for="item in filteredHistory"
          :key="item.id"
          class="history-card"
        >
          <div class="card-header">
            <div class="service-badge" :class="item.type">
              <svg v-if="item.type === 'ride'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
              <svg v-else-if="item.type === 'delivery'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span>{{ item.typeName }}</span>
            </div>
            <span :class="['status-badge', item.status]">
              {{ getStatusText(item.status) }}
            </span>
          </div>

          <!-- Tracking ID -->
          <div class="tracking-id">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
            </svg>
            <span>{{ item.tracking_id }}</span>
          </div>

          <!-- Driver info -->
          <div v-if="item.driver_name" class="driver-info">
            <div class="driver-avatar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="driver-text">
              <span class="driver-name">{{ item.driver_name }}</span>
              <span v-if="item.driver_tracking_id" class="driver-id">{{ item.driver_tracking_id }}</span>
              <span v-if="item.vehicle" class="driver-vehicle">{{ item.vehicle }}</span>
            </div>
          </div>

          <div class="route-info">
            <div class="route-point">
              <div class="route-dot from"></div>
              <span>{{ item.from }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="route-dot to"></div>
              <span>{{ item.to }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="meta-info">
              <span class="date">{{ item.date }} {{ item.time }}</span>
              <div v-if="item.rating" class="rating">
                <svg v-for="i in 5" :key="i" :class="['star', { filled: i <= item.rating }]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
            </div>
            <div class="fare-action">
              <span class="fare">฿{{ item.fare }}</span>
              <div class="action-buttons">
                <button v-if="item.status === 'completed'" @click="viewReceipt(item.id)" class="receipt-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </button>
                <button v-if="item.status === 'completed'" @click="handleRebook(item)" class="rebook-btn">
                  จองอีกครั้ง
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredHistory.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>ไม่มีประวัติการใช้งาน</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  min-height: 100vh;
  background-color: #F6F6F6;
  padding-bottom: 100px;
}

.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.filters::-webkit-scrollbar { display: none; }

.filter-btn {
  padding: 10px 18px;
  background-color: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-btn:hover { border-color: #000; }
.filter-btn:active { transform: scale(0.97); }

.filter-btn.active {
  background-color: #000;
  border-color: #000;
  color: white;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  color: #6B6B6B;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}

.history-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.service-badge svg {
  width: 18px;
  height: 18px;
}

.status-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 20px;
}

.status-badge.completed {
  background-color: rgba(5, 148, 79, 0.1);
  color: #05944F;
}

.status-badge.cancelled {
  background-color: rgba(225, 25, 0, 0.1);
  color: #E11900;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #F6F6F6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.driver-avatar {
  width: 36px;
  height: 36px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.driver-text {
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 14px;
  font-weight: 500;
}

.driver-vehicle {
  font-size: 12px;
  color: #6B6B6B;
}

.driver-id {
  font-size: 11px;
  color: #6B6B6B;
  font-family: monospace;
}

.tracking-id {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #F6F6F6;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  font-family: monospace;
  color: #6B6B6B;
}

.tracking-id svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.route-info {
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.route-dot.from {
  background-color: #000;
}

.route-dot.to {
  background-color: transparent;
  border: 2px solid #000;
}

.route-line {
  width: 2px;
  height: 12px;
  background-color: #E5E5E5;
  margin-left: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
}

.meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date {
  font-size: 12px;
  color: #6B6B6B;
}

.rating {
  display: flex;
  gap: 2px;
}

.star {
  width: 14px;
  height: 14px;
  color: #E5E5E5;
}

.star.filled {
  color: #F59E0B;
}

.fare-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.fare {
  font-size: 18px;
  font-weight: 700;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.receipt-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.receipt-btn svg {
  width: 18px;
  height: 18px;
}

.rebook-btn {
  padding: 8px 16px;
  background-color: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rebook-btn:hover { opacity: 0.9; }
.rebook-btn:active { transform: scale(0.97); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  color: #6B6B6B;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}
</style>
