<script setup lang="ts">
/**
 * Feature: F214 - Trip Action Buttons
 * Action buttons for provider during trip
 */
defineProps<{
  status: 'pending' | 'accepted' | 'arrived' | 'picked_up' | 'in_progress' | 'completed'
  loading?: boolean
}>()

const emit = defineEmits<{
  accept: []
  arrived: []
  startTrip: []
  completeTrip: []
  cancel: []
  emergency: []
}>()

const statusActions = {
  pending: { label: 'รับงาน', action: 'accept', color: '#000' },
  accepted: { label: 'ถึงจุดรับแล้ว', action: 'arrived', color: '#000' },
  arrived: { label: 'เริ่มเดินทาง', action: 'startTrip', color: '#000' },
  picked_up: { label: 'เริ่มเดินทาง', action: 'startTrip', color: '#000' },
  in_progress: { label: 'ถึงจุดหมายแล้ว', action: 'completeTrip', color: '#10b981' },
  completed: { label: 'เสร็จสิ้น', action: '', color: '#6b6b6b' }
}
</script>

<template>
  <div class="trip-action-buttons">
    <button v-if="status !== 'completed'" type="button" class="btn-secondary" :disabled="loading" @click="emit('cancel')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      ยกเลิก
    </button>

    <button
      type="button" class="btn-primary" :style="{ background: statusActions[status].color }"
      :disabled="loading || status === 'completed'"
      @click="emit(statusActions[status].action as any)"
    >
      <span v-if="loading" class="spinner" />
      <template v-else>
        <svg v-if="status === 'pending'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else-if="status === 'accepted'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <svg v-else-if="status === 'arrived' || status === 'picked_up'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <svg v-else-if="status === 'in_progress'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        {{ statusActions[status].label }}
      </template>
    </button>

    <button type="button" class="btn-emergency" @click="emit('emergency')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.trip-action-buttons { display: flex; gap: 12px; padding: 16px; background: #fff; border-top: 1px solid #e5e5e5; }
.btn-primary, .btn-secondary { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #000; color: #fff; border: none; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #000; border: 1px solid #e5e5e5; }
.btn-secondary:hover:not(:disabled) { background: #f6f6f6; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-emergency { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #ef4444; border: none; border-radius: 12px; cursor: pointer; flex-shrink: 0; }
.btn-emergency:hover { background: #fecaca; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
