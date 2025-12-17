<script setup lang="ts">
/**
 * Feature: F333 - Order Contact Card
 * Card showing contact info for order (sender/recipient/driver)
 */
interface Contact {
  name: string
  phone: string
  role: 'sender' | 'recipient' | 'driver' | 'shopper'
  photo?: string
  rating?: number
}

const props = defineProps<{
  contact: Contact
}>()

const emit = defineEmits<{
  'call': []
  'chat': []
}>()

const roleLabels: Record<string, string> = {
  sender: 'ผู้ส่ง',
  recipient: 'ผู้รับ',
  driver: 'คนขับ',
  shopper: 'ผู้ซื้อ'
}
</script>

<template>
  <div class="contact-card">
    <div class="contact-avatar">
      <img v-if="contact.photo" :src="contact.photo" :alt="contact.name" />
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    
    <div class="contact-info">
      <span class="contact-role">{{ roleLabels[contact.role] }}</span>
      <h4 class="contact-name">{{ contact.name }}</h4>
      <div v-if="contact.rating" class="contact-rating">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        {{ contact.rating.toFixed(1) }}
      </div>
    </div>
    
    <div class="contact-actions">
      <button type="button" class="action-btn" @click="emit('chat')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
      <button type="button" class="action-btn primary" @click="emit('call')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
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
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
  flex-shrink: 0;
}

.contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-role {
  font-size: 12px;
  color: #6b6b6b;
}

.contact-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 2px 0 0;
}

.contact-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: #000;
  margin-top: 2px;
}

.contact-rating svg {
  color: #ffc107;
}

.contact-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.primary:hover {
  background: #333;
}
</style>
