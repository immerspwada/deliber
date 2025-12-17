<script setup lang="ts">
/**
 * Feature: F334 - Order Action Buttons
 * Action buttons for order management
 */
const props = withDefaults(defineProps<{
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  canCancel?: boolean
  canContact?: boolean
  canTrack?: boolean
  loading?: boolean
}>(), {
  canCancel: true,
  canContact: true,
  canTrack: true,
  loading: false
})

const emit = defineEmits<{
  'cancel': []
  'contact': []
  'track': []
  'help': []
  'reorder': []
}>()
</script>

<template>
  <div class="action-buttons">
    <button 
      v-if="status === 'completed'" 
      type="button" 
      class="action-btn primary"
      @click="emit('reorder')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 1l4 4-4 4"/>
        <path d="M3 11V9a4 4 0 014-4h14"/>
        <path d="M7 23l-4-4 4-4"/>
        <path d="M21 13v2a4 4 0 01-4 4H3"/>
      </svg>
      สั่งอีกครั้ง
    </button>
    
    <button 
      v-if="canTrack && ['confirmed', 'in_progress'].includes(status)" 
      type="button" 
      class="action-btn primary"
      @click="emit('track')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      ติดตามออเดอร์
    </button>
    
    <button 
      v-if="canContact && !['completed', 'cancelled'].includes(status)" 
      type="button" 
      class="action-btn"
      @click="emit('contact')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
      </svg>
      ติดต่อ
    </button>
    
    <button 
      v-if="canCancel && ['pending', 'confirmed'].includes(status)" 
      type="button" 
      class="action-btn danger"
      :disabled="loading"
      @click="emit('cancel')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
      ยกเลิก
    </button>
    
    <button type="button" class="action-btn" @click="emit('help')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <path d="M12 17h.01"/>
      </svg>
      ช่วยเหลือ
    </button>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.primary:hover {
  background: #333;
}

.action-btn.danger {
  color: #e11900;
}

.action-btn.danger:hover {
  background: #ffeae6;
}
</style>
