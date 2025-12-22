<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'
import type { Provider, ProviderStatus } from '../types'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const pendingProviders = ref<Provider[]>([])
const isLoading = ref(false)
const selectedProvider = ref<Provider | null>(null)
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject'>('approve')
const actionReason = ref('')

async function loadQueue() {
  isLoading.value = true
  pendingProviders.value = await api.getVerificationQueue()
  isLoading.value = false
}

function openActionModal(provider: Provider, action: 'approve' | 'reject') {
  selectedProvider.value = provider
  actionType.value = action
  actionReason.value = ''
  showActionModal.value = true
}

async function executeAction() {
  if (!selectedProvider.value) return
  const statusMap: Record<string, ProviderStatus> = { approve: 'approved', reject: 'rejected' }
  const success = await api.updateProviderStatus(selectedProvider.value.id, statusMap[actionType.value], actionReason.value)
  if (success) {
    uiStore.showSuccess(actionType.value === 'approve' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธเรียบร้อย')
    showActionModal.value = false
    loadQueue()
  } else {
    uiStore.showError('เกิดข้อผิดพลาด')
  }
}

function getTypeLabel(type: string) {
  return { driver: 'คนขับรถ', rider: 'ไรเดอร์', shopper: 'นักช้อป', mover: 'ขนย้าย', laundry: 'ซักผ้า' }[type] || type
}

function getTimeSince(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} วันที่แล้ว`
  if (hours > 0) return `${hours} ชม.ที่แล้ว`
  return 'เมื่อสักครู่'
}

onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Users' }, { label: 'รอตรวจสอบ' }]); loadQueue() })
</script>

<template>
  <div class="verification-view">
    <div class="page-header">
      <div class="header-left"><h1 class="page-title">รอตรวจสอบ</h1><span class="total-count">{{ pendingProviders.length }} คน</span></div>
      <button class="refresh-btn" @click="loadQueue" :disabled="isLoading"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg></button>
    </div>

    <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 5" :key="i" /></div>

    <div v-else-if="pendingProviders.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h3>ไม่มีรายการรอตรวจสอบ</h3>
      <p>ผู้ให้บริการทั้งหมดได้รับการตรวจสอบแล้ว</p>
    </div>

    <div v-else class="queue-list">
      <div v-for="provider in pendingProviders" :key="provider.id" class="queue-card">
        <div class="card-left">
          <div class="avatar">{{ (provider.first_name || 'P').charAt(0) }}</div>
          <div class="info">
            <div class="name">{{ provider.first_name }} {{ provider.last_name }}</div>
            <div class="meta"><span class="type-badge">{{ getTypeLabel(provider.provider_type) }}</span><span class="time">{{ getTimeSince(provider.created_at) }}</span></div>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-success" @click="openActionModal(provider, 'approve')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>อนุมัติ</button>
          <button class="btn btn-danger" @click="openActionModal(provider, 'reject')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>ปฏิเสธ</button>
        </div>
      </div>
    </div>

    <div v-if="showActionModal" class="modal-overlay" @click.self="showActionModal = false">
      <div class="modal">
        <div class="modal-header"><h2>{{ actionType === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ' }}ผู้ให้บริการ</h2><button class="close-btn" @click="showActionModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <p v-if="actionType === 'approve'">ยืนยันอนุมัติ {{ selectedProvider?.first_name }} {{ selectedProvider?.last_name }}?</p>
          <div v-else class="form-group"><label>เหตุผล</label><textarea v-model="actionReason" rows="3" placeholder="ระบุเหตุผล..."></textarea></div>
          <div class="modal-actions"><button class="btn btn-secondary" @click="showActionModal = false">ยกเลิก</button><button :class="['btn', actionType === 'approve' ? 'btn-success' : 'btn-danger']" @click="executeAction">ยืนยัน</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verification-view { max-width: 900px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #FEF3C7; color: #92400E; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.loading-state { display: flex; flex-direction: column; gap: 16px; }
.skeleton { height: 88px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; background: #fff; border-radius: 16px; text-align: center; }
.empty-state svg { color: #10B981; margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0; }
.empty-state p { font-size: 14px; color: #6B7280; margin: 0; }
.queue-list { display: flex; flex-direction: column; gap: 16px; }
.queue-card { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: #fff; border-radius: 16px; }
.card-left { display: flex; align-items: center; gap: 16px; }
.avatar { width: 48px; height: 48px; background: #F59E0B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; }
.info .name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.info .meta { display: flex; align-items: center; gap: 12px; }
.type-badge { padding: 4px 10px; background: #EEF2FF; color: #4F46E5; border-radius: 16px; font-size: 12px; font-weight: 500; }
.time { font-size: 13px; color: #6B7280; }
.card-actions { display: flex; gap: 8px; }
.btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-success { background: #10B981; color: #fff; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group textarea { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; resize: vertical; }
</style>
