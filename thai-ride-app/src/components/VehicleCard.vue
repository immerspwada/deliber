<script setup lang="ts">
/**
 * Feature: F206 - Vehicle Card
 * Display vehicle information for providers
 */
defineProps<{
  plateNumber: string
  brand: string
  model: string
  color: string
  year?: number
  type: 'car' | 'motorcycle' | 'van'
  isVerified?: boolean
  onEdit?: () => void
}>()
</script>

<template>
  <div class="vehicle-card">
    <div class="vehicle-icon">
      <svg v-if="type === 'car'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
      </svg>
      <svg v-else-if="type === 'motorcycle'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h6l4-7h4"/>
      </svg>
      <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="8" width="18" height="10" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
      </svg>
    </div>
    <div class="vehicle-info">
      <div class="vehicle-header">
        <span class="plate-number">{{ plateNumber }}</span>
        <span v-if="isVerified" class="verified-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          ยืนยันแล้ว
        </span>
      </div>
      <p class="vehicle-model">{{ brand }} {{ model }} <span v-if="year">({{ year }})</span></p>
      <div class="vehicle-color">
        <span class="color-dot" :style="{ background: color === 'white' ? '#f0f0f0' : color }" />
        <span class="color-name">{{ color }}</span>
      </div>
    </div>
    <button v-if="onEdit" type="button" class="edit-btn" @click="onEdit">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.vehicle-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.vehicle-icon { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 12px; color: #000; }
.vehicle-info { flex: 1; }
.vehicle-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.plate-number { font-size: 16px; font-weight: 700; color: #000; }
.verified-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #276ef1; background: #e8f0fe; padding: 2px 8px; border-radius: 10px; }
.vehicle-model { font-size: 14px; color: #6b6b6b; margin: 0 0 4px; }
.vehicle-color { display: flex; align-items: center; gap: 6px; }
.color-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #e5e5e5; }
.color-name { font-size: 12px; color: #6b6b6b; text-transform: capitalize; }
.edit-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border: none; border-radius: 10px; cursor: pointer; color: #000; }
.edit-btn:hover { background: #e5e5e5; }
</style>
