<script setup lang="ts">
/**
 * Feature: F196 - User Card
 * Display user info card for admin
 */

interface Props {
  id: string
  name: string
  phone: string
  email?: string
  avatar?: string
  status: 'active' | 'suspended' | 'pending'
  totalRides?: number
  joinDate: string
}

defineProps<Props>()

const emit = defineEmits<{
  view: [id: string]
  edit: [id: string]
  suspend: [id: string]
}>()

const statusConfig = {
  active: { label: 'ใช้งาน', color: '#2e7d32', bg: '#e8f5e9' },
  suspended: { label: 'ระงับ', color: '#e11900', bg: '#ffebee' },
  pending: { label: 'รอยืนยัน', color: '#ef6c00', bg: '#fff3e0' }
}
</script>

<template>
  <div class="user-card">
    <div class="user-avatar">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    
    <div class="user-info">
      <div class="user-header">
        <h4 class="user-name">{{ name }}</h4>
        <span class="user-status" :style="{ color: statusConfig[status].color, background: statusConfig[status].bg }">
          {{ statusConfig[status].label }}
        </span>
      </div>
      <p class="user-phone">{{ phone }}</p>
      <p v-if="email" class="user-email">{{ email }}</p>
      <div class="user-meta">
        <span v-if="totalRides !== undefined">{{ totalRides }} เที่ยว</span>
        <span>สมาชิกตั้งแต่ {{ joinDate }}</span>
      </div>
    </div>
    
    <div class="user-actions">
      <button type="button" class="action-btn" @click="emit('view', id)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button type="button" class="action-btn" @click="emit('edit', id)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  transition: border-color 0.2s;
}

.user-card:hover {
  border-color: #000;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.user-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.user-phone {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.user-email {
  font-size: 12px;
  color: #999;
  margin: 2px 0 0;
}

.user-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: #999;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  color: #6b6b6b;
  cursor: pointer;
}

.action-btn:hover {
  background: #000;
  color: #fff;
}
</style>