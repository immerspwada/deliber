<script setup lang="ts">
/**
 * Feature: F248 - Contact Info
 * Display contact information
 */
defineProps<{
  phone?: string
  email?: string
  showActions?: boolean
  onCall?: () => void
  onEmail?: () => void
}>()

const maskPhone = (p: string) => p.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
</script>

<template>
  <div class="contact-info">
    <div v-if="phone" class="contact-row">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      <span class="contact-value">{{ maskPhone(phone) }}</span>
      <button v-if="showActions && onCall" type="button" class="contact-action" @click="onCall">โทร</button>
    </div>
    <div v-if="email" class="contact-row">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
      <span class="contact-value">{{ email }}</span>
      <button v-if="showActions && onEmail" type="button" class="contact-action" @click="onEmail">ส่งอีเมล</button>
    </div>
  </div>
</template>

<style scoped>
.contact-info { display: flex; flex-direction: column; gap: 8px; }
.contact-row { display: flex; align-items: center; gap: 10px; }
.contact-row svg { color: #6b6b6b; flex-shrink: 0; }
.contact-value { flex: 1; font-size: 14px; color: #000; }
.contact-action { padding: 4px 12px; background: #f6f6f6; border: none; border-radius: 6px; font-size: 12px; color: #000; cursor: pointer; }
.contact-action:hover { background: #e5e5e5; }
</style>
