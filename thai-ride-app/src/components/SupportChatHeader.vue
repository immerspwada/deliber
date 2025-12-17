<script setup lang="ts">
/**
 * Feature: F222 - Support Chat Header
 * Header for support chat screen
 */
defineProps<{
  ticketId?: string
  status?: 'open' | 'pending' | 'resolved' | 'closed'
  agentName?: string
  agentAvatar?: string
  onBack?: () => void
  onClose?: () => void
}>()

const statusConfig = {
  open: { label: 'เปิด', color: '#10b981' },
  pending: { label: 'รอดำเนินการ', color: '#f59e0b' },
  resolved: { label: 'แก้ไขแล้ว', color: '#276ef1' },
  closed: { label: 'ปิด', color: '#6b6b6b' }
}
</script>

<template>
  <div class="support-chat-header">
    <button v-if="onBack" type="button" class="back-btn" @click="onBack">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <div class="header-info">
      <div v-if="agentName" class="agent-info">
        <div class="agent-avatar">
          <img v-if="agentAvatar" :src="agentAvatar" :alt="agentName" />
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="agent-details">
          <span class="agent-name">{{ agentName }}</span>
          <span class="agent-role">ทีมสนับสนุน</span>
        </div>
      </div>
      <div v-else class="ticket-info">
        <span class="ticket-title">ศูนย์ช่วยเหลือ</span>
        <span v-if="ticketId" class="ticket-id">#{{ ticketId }}</span>
      </div>
    </div>
    <div class="header-actions">
      <span v-if="status" class="status-badge" :style="{ color: statusConfig[status].color }">
        {{ statusConfig[status].label }}
      </span>
      <button v-if="onClose" type="button" class="close-btn" @click="onClose">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.support-chat-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e5e5e5; }
.back-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 10px; cursor: pointer; color: #000; }
.back-btn:hover { background: #f6f6f6; }
.header-info { flex: 1; }
.agent-info { display: flex; align-items: center; gap: 12px; }
.agent-avatar { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 50%; overflow: hidden; color: #6b6b6b; }
.agent-avatar img { width: 100%; height: 100%; object-fit: cover; }
.agent-details { display: flex; flex-direction: column; }
.agent-name { font-size: 15px; font-weight: 600; color: #000; }
.agent-role { font-size: 12px; color: #6b6b6b; }
.ticket-info { display: flex; flex-direction: column; }
.ticket-title { font-size: 16px; font-weight: 600; color: #000; }
.ticket-id { font-size: 12px; color: #6b6b6b; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.status-badge { font-size: 12px; font-weight: 500; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 8px; cursor: pointer; color: #6b6b6b; }
.close-btn:hover { background: #f6f6f6; color: #000; }
</style>
