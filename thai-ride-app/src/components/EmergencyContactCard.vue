<script setup lang="ts">
/**
 * Feature: F136 - Emergency Contact Card
 * Display and manage emergency contact
 */

interface Props {
  name: string
  phone: string
  relationship?: string
  isPrimary?: boolean
}

withDefaults(defineProps<Props>(), {
  isPrimary: false
})

const emit = defineEmits<{
  call: []
  edit: []
  delete: []
  setPrimary: []
}>()
</script>

<template>
  <div class="contact-card" :class="{ primary: isPrimary }">
    <div class="contact-avatar">
      <span>{{ name[0] }}</span>
    </div>
    
    <div class="contact-info">
      <div class="contact-header">
        <span class="contact-name">{{ name }}</span>
        <span v-if="isPrimary" class="primary-badge">หลัก</span>
      </div>
      <span class="contact-phone">{{ phone }}</span>
      <span v-if="relationship" class="contact-relation">{{ relationship }}</span>
    </div>
    
    <div class="contact-actions">
      <button type="button" class="action-btn call" @click="emit('call')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>

      <button type="button" class="action-btn" @click="emit('edit')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button type="button" class="action-btn delete" @click="emit('delete')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 2px solid transparent;
}

.contact-card.primary {
  border-color: #000;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 600;
  color: #000;
  flex-shrink: 0;
}

.contact-card.primary .contact-avatar {
  background: #000;
  color: #fff;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.contact-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.primary-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  background: #000;
  color: #fff;
  border-radius: 4px;
  text-transform: uppercase;
}

.contact-phone {
  font-size: 14px;
  color: #6b6b6b;
  display: block;
}

.contact-relation {
  font-size: 12px;
  color: #999;
  display: block;
  margin-top: 2px;
}

.contact-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
  color: #000;
}

.action-btn.call {
  background: #e8f5e9;
  color: #2e7d32;
}

.action-btn.call:hover {
  background: #c8e6c9;
}

.action-btn.delete:hover {
  background: #ffebee;
  color: #c62828;
}
</style>
