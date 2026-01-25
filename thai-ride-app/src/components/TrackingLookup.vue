<script setup lang="ts">
import { ref } from 'vue'
import { useTracking } from '../composables/useTracking'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', result: any): void
}>()

const { loading, lookupByTrackingId, getEntityTypeLabel } = useTracking()

const searchQuery = ref('')
const results = ref<any[]>([])
const searched = ref(false)
const errorMessage = ref('')

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  searched.value = true
  errorMessage.value = ''
  results.value = []
  
  const data = await lookupByTrackingId(searchQuery.value.trim().toUpperCase())
  
  if (data.length === 0) {
    errorMessage.value = 'ไม่พบข้อมูลสำหรับ Tracking ID นี้'
  } else {
    results.value = data
  }
}

const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'completed': 'success',
    'verified': 'success',
    'approved': 'success',
    'resolved': 'success',
    'pending': 'warning',
    'in_progress': 'warning',
    'processing': 'warning',
    'cancelled': 'error',
    'rejected': 'error',
    'failed': 'error'
  }
  return statusMap[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'completed': 'เสร็จสิ้น',
    'verified': 'ยืนยันแล้ว',
    'approved': 'อนุมัติแล้ว',
    'resolved': 'แก้ไขแล้ว',
    'pending': 'รอดำเนินการ',
    'in_progress': 'กำลังดำเนินการ',
    'processing': 'กำลังประมวลผล',
    'cancelled': 'ยกเลิก',
    'rejected': 'ปฏิเสธ',
    'failed': 'ล้มเหลว',
    'open': 'เปิด',
    'closed': 'ปิด'
  }
  return labels[status] || status
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="tracking-lookup-overlay" @click.self="emit('close')">
    <div class="tracking-lookup-modal">
      <div class="modal-header">
        <h2>ค้นหา Tracking ID</h2>
        <button class="close-btn" @click="emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="search-section">
        <div class="search-input-wrapper">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="เช่น RID-20251215-000001"
            @keyup.enter="handleSearch"
          />
        </div>
        <button class="search-btn" :disabled="loading" @click="handleSearch">
          {{ loading ? 'กำลังค้นหา...' : 'ค้นหา' }}
        </button>
      </div>

      <div class="hint-text">
        รูปแบบ: PREFIX-YYYYMMDD-XXXXXX
        <br/>
        เช่น RID (การเดินทาง), DEL (จัดส่ง), PAY (ชำระเงิน), SUP (ตั๋วช่วยเหลือ)
      </div>

      <!-- Results -->
      <div v-if="searched" class="results-section">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="errorMessage" class="error-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>{{ errorMessage }}</p>
        </div>

        <div v-else class="results-list">
          <div
            v-for="result in results"
            :key="result.entity_id"
            class="result-card"
            @click="emit('select', result)"
          >
            <div class="result-header">
              <span class="entity-type">{{ getEntityTypeLabel(result.entity_type) }}</span>
              <span :class="['status-badge', getStatusClass(result.status)]">
                {{ getStatusLabel(result.status) }}
              </span>
            </div>
            <div class="tracking-id-display">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
              </svg>
              {{ result.tracking_id }}
            </div>
            <div class="result-meta">
              <span>สร้างเมื่อ: {{ formatDate(result.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-lookup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.tracking-lookup-modal {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.search-section {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #F6F6F6;
  border-radius: 8px;
}

.search-input-wrapper svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  flex-shrink: 0;
}

.search-input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
  font-family: monospace;
  text-transform: uppercase;
}

.search-btn {
  padding: 12px 20px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.search-btn:disabled {
  background: #CCCCCC;
}

.hint-text {
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 20px;
  line-height: 1.5;
}

.results-section {
  border-top: 1px solid #E5E5E5;
  padding-top: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  color: #6B6B6B;
  text-align: center;
}

.error-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.result-card:hover {
  background: #EEEEEE;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.entity-type {
  font-size: 14px;
  font-weight: 600;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 20px;
}

.status-badge.success {
  background: rgba(5, 148, 79, 0.1);
  color: #05944F;
}

.status-badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
}

.status-badge.error {
  background: rgba(225, 25, 0, 0.1);
  color: #E11900;
}

.status-badge.default {
  background: #E5E5E5;
  color: #6B6B6B;
}

.tracking-id-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 14px;
  margin-bottom: 8px;
}

.tracking-id-display svg {
  width: 16px;
  height: 16px;
  color: #6B6B6B;
}

.result-meta {
  font-size: 12px;
  color: #6B6B6B;
}
</style>
