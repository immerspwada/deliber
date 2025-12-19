<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Admin Provider Cancellations
 * Task 7.5: AdminProviderCancellationsViewV3.vue
 * 
 * Provider cancellation history and penalty tracking
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminRideMonitoring } from '../composables/useAdminRideMonitoring'
import { supabase } from '../lib/supabase'

const {
  isLoading,
  error,
  getProviderCancellations
} = useAdminRideMonitoring()

interface Provider {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  vehicle_plate_number: string
  total_cancellations: number
  cancellation_rate: number
}

interface CancellationLog {
  id: string
  provider_id: string
  ride_id: string
  reason: string
  cancelled_at: string
  provider_name: string
  tracking_id?: string
}

const providers = ref<Provider[]>([])
const selectedProviderId = ref<string | null>(null)
const cancellations = ref<CancellationLog[]>([])
const searchQuery = ref('')

const filteredProviders = computed(() => {
  if (!searchQuery.value) return providers.value
  
  const query = searchQuery.value.toLowerCase()
  return providers.value.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(query) ||
    p.phone_number.includes(query) ||
    p.vehicle_plate_number.toLowerCase().includes(query)
  )
})

const selectedProvider = computed(() => {
  if (!selectedProviderId.value) return null
  return providers.value.find(p => p.id === selectedProviderId.value)
})

const loadProviders = async () => {
  isLoading.value = true
  try {
    // Get all providers with cancellation stats
    const { data, error: queryError } = await supabase
      .from('service_providers')
      .select(`
        id,
        first_name,
        last_name,
        phone_number,
        vehicle_plate_number
      `)
      .eq('status', 'active')
      .order('first_name')

    if (queryError) throw queryError

    // Get cancellation counts for each provider
    const providersWithStats = await Promise.all(
      (data || []).map(async (provider) => {
        const { count: totalCancellations } = await supabase
          .from('provider_cancellation_log')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', provider.id)

        const { count: totalRides } = await supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', provider.id)
          .in('status', ['completed', 'cancelled'])

        const cancellationRate = totalRides && totalRides > 0
          ? ((totalCancellations || 0) / totalRides) * 100
          : 0

        return {
          ...provider,
          total_cancellations: totalCancellations || 0,
          cancellation_rate: cancellationRate
        }
      })
    )

    // Sort by cancellation count (highest first)
    providers.value = providersWithStats.sort((a, b) => 
      b.total_cancellations - a.total_cancellations
    )
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
  } finally {
    isLoading.value = false
  }
}

const loadCancellations = async (providerId: string) => {
  selectedProviderId.value = providerId
  cancellations.value = await getProviderCancellations(providerId)
}

const formatDateTime = (date: string) => {
  const d = new Date(date)
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCancellationRateColor = (rate: number) => {
  if (rate >= 20) return '#E53935' // Red - High
  if (rate >= 10) return '#F5A623' // Orange - Medium
  return '#00A86B' // Green - Low
}

onMounted(async () => {
  await loadProviders()
})
</script>

<template>
  <div class="admin-cancellations-page">
    <!-- Header -->
    <div class="header">
      <h1>ประวัติการยกเลิกของคนขับ</h1>
      <button class="refresh-btn" @click="loadProviders" :disabled="isLoading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาคนขับ (ชื่อ, เบอร์โทร, ทะเบียนรถ)..."
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && providers.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Content -->
    <div v-else class="content-grid">
      <!-- Providers List -->
      <div class="providers-section">
        <h2>คนขับทั้งหมด ({{ filteredProviders.length }})</h2>
        
        <div v-if="filteredProviders.length === 0" class="empty-state">
          <p>ไม่พบคนขับ</p>
        </div>

        <div v-else class="providers-list">
          <div
            v-for="provider in filteredProviders"
            :key="provider.id"
            :class="['provider-card', { active: selectedProviderId === provider.id }]"
            @click="loadCancellations(provider.id)"
          >
            <div class="provider-info">
              <div class="provider-name">
                {{ provider.first_name }} {{ provider.last_name }}
              </div>
              <div class="provider-meta">
                <span>{{ provider.phone_number }}</span>
                <span>•</span>
                <span>{{ provider.vehicle_plate_number }}</span>
              </div>
            </div>

            <div class="provider-stats">
              <div class="stat-badge cancellations">
                {{ provider.total_cancellations }} ครั้ง
              </div>
              <div
                class="stat-badge rate"
                :style="{ background: getCancellationRateColor(provider.cancellation_rate) }"
              >
                {{ provider.cancellation_rate.toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cancellations Detail -->
      <div class="cancellations-section">
        <div v-if="!selectedProvider" class="empty-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>เลือกคนขับ</h3>
          <p>เลือกคนขับจากรายการเพื่อดูประวัติการยกเลิก</p>
        </div>

        <div v-else>
          <!-- Provider Header -->
          <div class="detail-header">
            <div class="provider-detail-info">
              <h2>{{ selectedProvider.first_name }} {{ selectedProvider.last_name }}</h2>
              <div class="provider-detail-meta">
                <span>{{ selectedProvider.phone_number }}</span>
                <span>•</span>
                <span>{{ selectedProvider.vehicle_plate_number }}</span>
              </div>
            </div>
            <div class="provider-detail-stats">
              <div class="stat-item">
                <span class="stat-value">{{ selectedProvider.total_cancellations }}</span>
                <span class="stat-label">ยกเลิกทั้งหมด</span>
              </div>
              <div class="stat-item">
                <span
                  class="stat-value"
                  :style="{ color: getCancellationRateColor(selectedProvider.cancellation_rate) }"
                >
                  {{ selectedProvider.cancellation_rate.toFixed(1) }}%
                </span>
                <span class="stat-label">อัตราการยกเลิก</span>
              </div>
            </div>
          </div>

          <!-- Cancellations List -->
          <div class="cancellations-list">
            <h3>ประวัติการยกเลิก</h3>

            <div v-if="cancellations.length === 0" class="empty-state">
              <p>ไม่มีประวัติการยกเลิก</p>
            </div>

            <div v-else class="cancellation-items">
              <div
                v-for="cancellation in cancellations"
                :key="cancellation.id"
                class="cancellation-card"
              >
                <div class="cancellation-header">
                  <div class="tracking-id">{{ cancellation.tracking_id || cancellation.ride_id }}</div>
                  <div class="cancellation-time">{{ formatDateTime(cancellation.cancelled_at) }}</div>
                </div>
                <div class="cancellation-reason">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span>{{ cancellation.reason }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-cancellations-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.refresh-btn {
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #F8F8F8;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 20px;
  height: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  margin-bottom: 24px;
}

.search-bar svg {
  width: 20px;
  height: 20px;
  color: #999;
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.providers-section h2,
.cancellations-list h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.provider-card:hover {
  border-color: #00A86B;
}

.provider-card.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.provider-meta {
  font-size: 13px;
  color: #666;
  display: flex;
  gap: 8px;
}

.provider-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.stat-badge.cancellations {
  background: #F8F8F8;
  color: #666;
}

.stat-badge.rate {
  color: #fff;
}

.cancellations-section {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 20px;
  min-height: 400px;
}

.empty-detail,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: #666;
}

.empty-detail svg {
  width: 64px;
  height: 64px;
  color: #CCC;
}

.empty-detail h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.empty-detail p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.detail-header {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #E8E8E8;
}

.provider-detail-info h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.provider-detail-meta {
  font-size: 14px;
  color: #666;
  display: flex;
  gap: 8px;
}

.provider-detail-stats {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.cancellation-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cancellation-card {
  background: #F8F8F8;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  padding: 16px;
}

.cancellation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tracking-id {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  font-family: monospace;
}

.cancellation-time {
  font-size: 13px;
  color: #999;
}

.cancellation-reason {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.5;
}

.cancellation-reason svg {
  width: 16px;
  height: 16px;
  color: #666;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
