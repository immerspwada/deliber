<template>
  <div class="error-state" role="alert" aria-live="assertive">
    <div class="error-content">
      <div class="error-icon" aria-hidden="true">
        <svg class="w-16 h-16 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 :class="typography.h3" class="error-title">
        {{ title }}
      </h3>
      
      <p :class="typography.body" class="error-message">
        {{ message }}
      </p>
      
      <div v-if="details" class="error-details">
        <button
          type="button"
          class="details-toggle"
          :aria-expanded="showDetails"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด' }}
        </button>
        
        <transition name="slide">
          <pre v-if="showDetails" class="details-content">{{ details }}</pre>
        </transition>
      </div>
      
      <div class="error-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="$emit('retry')"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ลองใหม่
        </button>
        
        <button
          v-if="showSupport"
          type="button"
          class="btn btn-secondary"
          @click="$emit('support')"
        >
          ติดต่อฝ่ายสนับสนุน
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { typography } from '@/admin/styles/design-tokens'

interface Props {
  title?: string
  message: string
  details?: string
  showSupport?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'เกิดข้อผิดพลาด',
  showSupport: false
})

defineEmits<{
  retry: []
  support: []
}>()

const showDetails = ref(false)
</script>

<style scoped>
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 28rem;
}

.error-icon {
  margin-bottom: 1rem;
}

.error-title {
  color: #7f1d1d;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #374151;
  margin-bottom: 1.5rem;
}

.error-details {
  width: 100%;
  margin-bottom: 1.5rem;
}

.details-toggle {
  font-size: 0.875rem;
  color: #3b82f6;
  text-decoration: underline;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 0.25rem;
}

.details-toggle:hover {
  color: #2563eb;
}

.details-toggle:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  ring-offset: 2px;
}

.details-content {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  text-align: left;
  font-size: 0.75rem;
  color: #4b5563;
  overflow: auto;
  max-height: 12rem;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

@media (min-width: 640px) {
  .error-actions {
    flex-direction: row;
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.btn:focus {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-primary:active {
  transform: scale(0.95);
}

.btn-primary:focus {
  ring-color: #3b82f6;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-secondary:active {
  transform: scale(0.95);
}

.btn-secondary:focus {
  ring-color: #6b7280;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
