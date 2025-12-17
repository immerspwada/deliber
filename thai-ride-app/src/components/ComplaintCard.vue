<script setup lang="ts">
/**
 * Feature: F235 - Complaint Card
 * Display complaint/report card
 */
defineProps<{
  complaintId: string
  type: 'driver' | 'passenger' | 'service' | 'payment' | 'other'
  subject: string
  description?: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  createdAt: string
  onView?: () => void
}>()

const typeLabels = { driver: 'คนขับ', passenger: 'ผู้โดยสาร', service: 'บริการ', payment: 'การชำระเงิน', other: 'อื่นๆ' }
const statusConfig = {
  open: { label: 'เปิด', color: '#f59e0b' },
  investigating: { label: 'กำลังตรวจสอบ', color: '#276ef1' },
  resolved: { label: 'แก้ไขแล้ว', color: '#10b981' },
  closed: { label: 'ปิด', color: '#6b6b6b' }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
</script>

<template>
  <div class="complaint-card" @click="onView">
    <div class="complaint-header">
      <span class="complaint-type">{{ typeLabels[type] }}</span>
      <span class="complaint-status" :style="{ color: statusConfig[status].color }">{{ statusConfig[status].label }}</span>
    </div>
    <h4 class="complaint-subject">{{ subject }}</h4>
    <p v-if="description" class="complaint-desc">{{ description }}</p>
    <div class="complaint-footer">
      <span class="complaint-id">#{{ complaintId }}</span>
      <span class="complaint-date">{{ formatDate(createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.complaint-card { padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; cursor: pointer; transition: all 0.2s; }
.complaint-card:hover { border-color: #000; }
.complaint-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.complaint-type { font-size: 11px; font-weight: 500; color: #6b6b6b; background: #f6f6f6; padding: 4px 10px; border-radius: 10px; }
.complaint-status { font-size: 12px; font-weight: 500; }
.complaint-subject { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 6px; }
.complaint-desc { font-size: 13px; color: #6b6b6b; margin: 0 0 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.complaint-footer { display: flex; justify-content: space-between; font-size: 12px; color: #6b6b6b; }
</style>
