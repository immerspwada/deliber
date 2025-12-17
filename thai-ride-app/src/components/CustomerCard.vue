<script setup lang="ts">
/**
 * Feature: F213 - Customer Card
 * Display customer info for provider during trip
 */
defineProps<{
  name: string
  phone?: string
  rating?: number
  totalRides?: number
  note?: string
  onCall?: () => void
  onMessage?: () => void
}>()
</script>

<template>
  <div class="customer-card">
    <div class="customer-avatar">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    <div class="customer-info">
      <h4 class="customer-name">{{ name }}</h4>
      <div class="customer-meta">
        <span v-if="rating" class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {{ rating.toFixed(1) }}
        </span>
        <span v-if="totalRides" class="meta-item">{{ totalRides }} เที่ยว</span>
      </div>
      <p v-if="note" class="customer-note">{{ note }}</p>
    </div>
    <div class="customer-actions">
      <button v-if="onCall" type="button" class="action-btn" @click="onCall">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>
      <button v-if="onMessage" type="button" class="action-btn" @click="onMessage">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.customer-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.customer-avatar { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 50%; color: #6b6b6b; }
.customer-info { flex: 1; min-width: 0; }
.customer-name { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 4px; }
.customer-meta { display: flex; gap: 12px; }
.meta-item { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #6b6b6b; }
.customer-note { font-size: 12px; color: #6b6b6b; margin: 6px 0 0; padding: 6px 10px; background: #f6f6f6; border-radius: 6px; }
.customer-actions { display: flex; gap: 8px; }
.action-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #000; color: #fff; border: none; border-radius: 50%; cursor: pointer; }
.action-btn:hover { background: #333; }
</style>
