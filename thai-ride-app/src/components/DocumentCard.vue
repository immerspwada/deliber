<script setup lang="ts">
/**
 * Feature: F207 - Document Card
 * Display document status for verification
 */
defineProps<{
  title: string
  type: 'id_card' | 'driver_license' | 'vehicle_registration' | 'insurance' | 'other'
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'not_uploaded'
  expiryDate?: string
  uploadedAt?: string
  rejectionReason?: string
  onUpload?: () => void
  onView?: () => void
}>()

const statusConfig = {
  pending: { label: 'รอตรวจสอบ', color: '#f59e0b', bg: '#fef3c7' },
  approved: { label: 'อนุมัติแล้ว', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'ไม่ผ่าน', color: '#ef4444', bg: '#fee2e2' },
  expired: { label: 'หมดอายุ', color: '#6b6b6b', bg: '#f6f6f6' },
  not_uploaded: { label: 'ยังไม่อัพโหลด', color: '#6b6b6b', bg: '#f6f6f6' }
}

const typeIcons = {
  id_card: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>',
  driver_license: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
  vehicle_registration: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  insurance: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  other: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>'
}
</script>

<template>
  <div class="document-card" :class="status">
    <div class="doc-icon" v-html="typeIcons[type]" />
    <div class="doc-info">
      <h4 class="doc-title">{{ title }}</h4>
      <span class="doc-status" :style="{ color: statusConfig[status].color, background: statusConfig[status].bg }">
        {{ statusConfig[status].label }}
      </span>
      <p v-if="expiryDate" class="doc-expiry">หมดอายุ: {{ expiryDate }}</p>
      <p v-if="rejectionReason && status === 'rejected'" class="doc-reason">{{ rejectionReason }}</p>
    </div>
    <div class="doc-actions">
      <button v-if="onView && status !== 'not_uploaded'" type="button" class="action-btn" @click="onView">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button v-if="onUpload" type="button" class="action-btn primary" @click="onUpload">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.document-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.document-card.rejected { border-color: #fee2e2; background: #fffbfb; }
.document-card.expired { border-color: #f6f6f6; background: #fafafa; }
.doc-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 10px; color: #000; }
.doc-info { flex: 1; }
.doc-title { font-size: 14px; font-weight: 600; color: #000; margin: 0 0 6px; }
.doc-status { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 10px; }
.doc-expiry { font-size: 12px; color: #6b6b6b; margin: 6px 0 0; }
.doc-reason { font-size: 12px; color: #ef4444; margin: 6px 0 0; }
.doc-actions { display: flex; gap: 8px; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border: none; border-radius: 8px; cursor: pointer; color: #000; }
.action-btn:hover { background: #e5e5e5; }
.action-btn.primary { background: #000; color: #fff; }
.action-btn.primary:hover { background: #333; }
</style>
