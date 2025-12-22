<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const providers = ref<any[]>([])
const selectedProvider = ref<any | null>(null)
const showDetailModal = ref(false)
let refreshInterval: any = null

async function loadProviders() {
  const data = await api.getActiveProvidersLocations()
  providers.value = data
}

function viewProvider(provider: any) {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getProviderTypeLabel(type: string) {
  return {
    driver: 'คนขับ',
    rider: 'ไรเดอร์',
    shopper: 'ผู้ซื้อ',
    mover: 'ผู้ขนย้าย',
    laundry: 'ซักผ้า'
  }[type] || type
}

function getProviderTypeColor(type: string) {
  return {
    driver: '#3B82F6',
    rider: '#8B5CF6',
    shopper: '#F59E0B',
    mover: '#EF4444',
    laundry: '#6366F1'
  }[type] || '#6B7280'
}

function getJobTypeLabel(type: string) {
  return {
    ride: 'Ride',
    delivery: 'Delivery',
    shopping: 'Shopping',
    queue: 'Queue',
    moving: 'Moving',
    laundry: 'Laundry'
  }[type] || type
}

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Driver Tracking' }])
  loadProviders()
  
  // Auto-refresh every 10 seconds
  refreshInterval = setInterval(loadProviders, 10000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <div class="driver-tracking-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Driver Tracking</h1>
        <span class="total-count">{{ providers.length }} Online</span>
      </div>
      <button class="refresh-btn" @click="loadProviders" title="Refresh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
      </button>
    </div>

    <div class="info-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>แสดงตำแหน่งผู้ให้บริการที่ออนไลน์และมีตำแหน่ง GPS • อัพเดทอัตโนมัติทุก 10 วินาที</span>
    </div>

    <div class="map-container">
      <div class="map-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <p>Map Integration</p>
        <small>แสดงตำแหน่งผู้ให้บริการบนแผนที่</small>
      </div>
    </div>

    <div class="providers-grid">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="provider-card"
        @click="viewProvider(provider)"
      >
        <div class="provider-header">
          <div class="provider-info">
            <div class="provider-name">{{ provider.user_name }}</div>
            <code class="provider-uid">{{ provider.provider_uid }}</code>
          </div>
          <span
            class="provider-type-badge"
            :style="{
              color: getProviderTypeColor(provider.provider_type),
              background: getProviderTypeColor(provider.provider_type) + '20'
            }"
          >
            {{ getProviderTypeLabel(provider.provider_type) }}
          </span>
        </div>

        <div class="provider-details">
          <div class="detail-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>{{ provider.phone_number || '-' }}</span>
          </div>

          <div class="detail-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ provider.current_lat?.toFixed(6) }}, {{ provider.current_lng?.toFixed(6) }}</span>
          </div>

          <div v-if="provider.current_job_id" class="detail-row job-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="job-badge">กำลังทำงาน: {{ getJobTypeLabel(provider.current_job_type) }}</span>
          </div>

          <div class="detail-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="last-update">{{ formatDate(provider.last_location_update) }}</span>
          </div>
        </div>

        <div class="provider-status">
          <div class="status-indicator online"></div>
          <span>Online</span>
        </div>
      </div>
    </div>

    <div v-if="providers.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <p>ไม่มีผู้ให้บริการออนไลน์</p>
    </div>

    <div v-if="showDetailModal && selectedProvider" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดผู้ให้บริการ</h2>
          <button class="close-btn" @click="showDetailModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>ชื่อ</label>
              <span>{{ selectedProvider.user_name }}</span>
            </div>
            <div class="detail-item">
              <label>Provider UID</label>
              <code class="provider-uid">{{ selectedProvider.provider_uid }}</code>
            </div>
            <div class="detail-item">
              <label>ประเภท</label>
              <span>{{ getProviderTypeLabel(selectedProvider.provider_type) }}</span>
            </div>
            <div class="detail-item">
              <label>เบอร์โทร</label>
              <span>{{ selectedProvider.phone_number || '-' }}</span>
            </div>
            <div class="detail-item">
              <label>ตำแหน่ง Latitude</label>
              <span>{{ selectedProvider.current_lat }}</span>
            </div>
            <div class="detail-item">
              <label>ตำแหน่ง Longitude</label>
              <span>{{ selectedProvider.current_lng }}</span>
            </div>
            <div class="detail-item">
              <label>อัพเดทล่าสุด</label>
              <span>{{ formatDate(selectedProvider.last_location_update) }}</span>
            </div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span class="status-online">Online</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.driver-tracking-view { max-width: 1600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; transition: all 0.2s; }
.refresh-btn:hover { background: #F9FAFB; }
.info-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 10px; margin-bottom: 20px; color: #1E40AF; font-size: 14px; }
.map-container { background: #fff; border-radius: 16px; height: 400px; margin-bottom: 24px; overflow: hidden; }
.map-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9CA3AF; }
.map-placeholder p { margin: 12px 0 4px; font-size: 16px; font-weight: 500; }
.map-placeholder small { font-size: 13px; }
.providers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.provider-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
.provider-card:hover { border-color: #00A86B; box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1); }
.provider-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.provider-info { flex: 1; }
.provider-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.provider-uid { font-family: monospace; font-size: 12px; padding: 2px 6px; background: #F3F4F6; border-radius: 4px; }
.provider-type-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.provider-details { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.detail-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6B7280; }
.detail-row svg { flex-shrink: 0; }
.job-info { color: #00A86B; font-weight: 500; }
.job-badge { color: #00A86B; }
.last-update { font-size: 12px; }
.provider-status { display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid #F3F4F6; }
.status-indicator { width: 8px; height: 8px; border-radius: 50%; }
.status-indicator.online { background: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
.provider-status span { font-size: 13px; font-weight: 500; color: #10B981; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; color: #9CA3AF; }
.empty-state svg { margin-bottom: 16px; }
.empty-state p { font-size: 16px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.status-online { color: #10B981; font-weight: 500; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-secondary { background: #F3F4F6; color: #374151; }
</style>
