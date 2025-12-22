<script setup lang="ts">
/**
 * VerificationQueueCard - Individual Queue Item Card
 */
defineProps<{
  item: any
  loading: boolean
}>()

defineEmits<{
  startVerification: [item: any]
  continueVerification: [item: any]
}>()

const getDocTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    id_card: 'บัตรประชาชน',
    license: 'ใบขับขี่',
    vehicle: 'รูปยานพาหนะ'
  }
  return labels[type] || type
}

const getDocStatus = (docs: any, type: string) => {
  if (!docs) return 'pending'
  return docs[type] || 'pending'
}

const formatTime = (time: string | null) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getProviderName = (provider: any) => {
  if (!provider?.users) return 'ไม่ระบุชื่อ'
  const user = provider.users
  if (user.name) return user.name
  if (user.first_name) return `${user.first_name} ${user.last_name || ''}`.trim()
  if (user.email) return user.email.split('@')[0]
  return 'ไม่ระบุชื่อ'
}
</script>

<template>
  <div class="queue-card">
    <div class="card-header">
      <div class="provider-info">
        <div class="avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="provider-details">
          <h3>{{ getProviderName(item.provider) }}</h3>
          <p class="provider-email">{{ item.provider?.users?.email || '-' }}</p>
          <p class="provider-phone">{{ item.provider?.users?.phone_number || item.provider?.users?.phone || '-' }}</p>
        </div>
      </div>
      <div class="card-meta">
        <span class="queue-position">#{{ item.queue_position }}</span>
        <span :class="['status-badge', item.status]">
          {{ item.status === 'pending' ? 'รอตรวจสอบ' : item.status === 'in_review' ? 'กำลังตรวจ' : 'เสร็จสิ้น' }}
        </span>
      </div>
    </div>

    <div class="card-body">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">ประเภท</span>
          <span class="info-value">{{ item.provider?.provider_type === 'driver' ? 'คนขับรถ' : 'ไรเดอร์' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ยานพาหนะ</span>
          <span class="info-value">{{ item.provider?.vehicle_type }} {{ item.provider?.vehicle_plate }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ส่งเมื่อ</span>
          <span class="info-value">{{ formatTime(item.created_at) }}</span>
        </div>
      </div>

      <!-- Document Status -->
      <div class="documents-status">
        <div 
          v-for="docType in ['id_card', 'license', 'vehicle']" 
          :key="docType"
          :class="['doc-badge', getDocStatus(item.provider?.documents, docType)]"
        >
          <svg v-if="getDocStatus(item.provider?.documents, docType) === 'verified'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ getDocTypeLabel(docType) }}
        </div>
      </div>
    </div>

    <div class="card-footer">
      <button 
        v-if="item.status === 'pending'"
        class="btn-primary"
        @click="$emit('startVerification', item)"
        :disabled="loading"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        เริ่มตรวจสอบ
      </button>
      <button 
        v-if="item.status === 'in_review'"
        class="btn-secondary"
        @click="$emit('continueVerification', item)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        ดำเนินการต่อ
      </button>
    </div>
  </div>
</template>

<style scoped>
.queue-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E8E8E8;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.queue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #F5F5F5;
}

.provider-info {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.provider-details {
  flex: 1;
  min-width: 0;
}

.provider-details h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.provider-details p {
  margin: 2px 0;
  font-size: 13px;
  color: #666;
}

.provider-email {
  color: #00A86B !important;
  font-weight: 500;
}

.provider-phone {
  color: #999 !important;
}

.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.queue-position {
  font-size: 14px;
  font-weight: 600;
  color: #999;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #FFF3CD;
  color: #856404;
}

.status-badge.in_review {
  background: #CCE5FF;
  color: #004085;
}

.status-badge.completed {
  background: #D4EDDA;
  color: #155724;
}

.card-body {
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
}

.documents-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.doc-badge.pending {
  background: #FFF3CD;
  color: #856404;
}

.doc-badge.verified {
  background: #D4EDDA;
  color: #155724;
}

.doc-badge.rejected {
  background: #F8D7DA;
  color: #721C24;
}

.card-footer {
  padding: 16px 20px;
  background: #F9F9F9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #00A86B;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #F5F5F5;
  color: #1A1A1A;
}

.btn-secondary:hover {
  background: #E8E8E8;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 16px;
  }

  .card-meta {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .card-footer {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
