<script setup lang="ts">
/**
 * Feature: F143 - Support Ticket Card
 * Display support ticket info
 */

interface Props {
  id: string
  subject: string
  category: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
  lastReplyAt?: string
  hasUnread?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  view: [id: string]
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusConfig = {
  open: { label: 'รอตอบกลับ', class: 'open' },
  in_progress: { label: 'กำลังดำเนินการ', class: 'progress' },
  resolved: { label: 'แก้ไขแล้ว', class: 'resolved' },
  closed: { label: 'ปิดแล้ว', class: 'closed' }
}
</script>

<template>
  <div class="ticket-card" :class="{ unread: hasUnread }" @click="emit('view', id)">
    <div class="ticket-header">
      <span class="ticket-id">#{{ id }}</span>
      <span class="ticket-status" :class="statusConfig[status].class">
        {{ statusConfig[status].label }}
      </span>
    </div>
    
    <h3 class="ticket-subject">{{ subject }}</h3>
    <span class="ticket-category">{{ category }}</span>
    
    <div class="ticket-footer">
      <span class="ticket-date">สร้างเมื่อ {{ formatDate(createdAt) }}</span>
      <span v-if="lastReplyAt" class="ticket-reply">
        ตอบล่าสุด {{ formatDate(lastReplyAt) }}
      </span>
    </div>
    
    <div v-if="hasUnread" class="unread-dot" />
  </div>
</template>


<style scoped>
.ticket-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
  position: relative;
}

.ticket-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.ticket-card.unread {
  border-left: 4px solid #276ef1;
}

.ticket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ticket-id {
  font-size: 12px;
  font-weight: 500;
  color: #6b6b6b;
  font-family: monospace;
}

.ticket-status {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.ticket-status.open { background: #fff3e0; color: #ef6c00; }
.ticket-status.progress { background: #e3f2fd; color: #1565c0; }
.ticket-status.resolved { background: #e8f5e9; color: #2e7d32; }
.ticket-status.closed { background: #f5f5f5; color: #6b6b6b; }

.ticket-subject {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
  line-height: 1.4;
}

.ticket-category {
  font-size: 13px;
  color: #6b6b6b;
  display: block;
  margin-bottom: 12px;
}

.ticket-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 10px;
  height: 10px;
  background: #276ef1;
  border-radius: 50%;
}
</style>
