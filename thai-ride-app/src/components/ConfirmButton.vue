<script setup lang="ts">
/**
 * Feature: F256 - Confirm Button
 * Button with confirmation step
 */
import { ref } from 'vue'

defineProps<{
  label: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  disabled?: boolean
}>()

const emit = defineEmits<{
  confirm: []
}>()

const confirming = ref(false)
let timeout: ReturnType<typeof setTimeout>

const handleClick = () => {
  if (confirming.value) {
    emit('confirm')
    confirming.value = false
    clearTimeout(timeout)
  } else {
    confirming.value = true
    timeout = setTimeout(() => { confirming.value = false }, 3000)
  }
}
</script>

<template>
  <button type="button" class="confirm-button" :class="[variant || 'primary', { confirming }]" :disabled="disabled" @click="handleClick">
    {{ confirming ? (confirmLabel || 'ยืนยัน?') : label }}
  </button>
</template>

<style scoped>
.confirm-button { padding: 12px 24px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.confirm-button.primary { background: #000; color: #fff; }
.confirm-button.primary:hover { background: #333; }
.confirm-button.danger { background: #f6f6f6; color: #ef4444; }
.confirm-button.danger:hover { background: #fee2e2; }
.confirm-button.confirming { animation: pulse 0.5s ease-in-out infinite alternate; }
.confirm-button.danger.confirming { background: #ef4444; color: #fff; }
.confirm-button:disabled { opacity: 0.5; cursor: not-allowed; }
@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.02); } }
</style>
