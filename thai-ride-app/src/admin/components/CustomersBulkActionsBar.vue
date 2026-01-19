<script setup lang="ts">
/**
 * Customers Bulk Actions Bar Component
 * =====================================
 * แสดงเมื่อมีการเลือกลูกค้าหลายคน
 */
import { ref } from 'vue'
import { useCustomerBulkActions } from '@/admin/composables/useCustomerBulkActions'

const emit = defineEmits<{
  suspend: []
  export: []
  email: []
  push: []
  cancel: []
}>()

const {
  selectedCount,
  hasSelection,
  isProcessing,
  progress,
  currentAction,
  clearSelection
} = useCustomerBulkActions()

function handleCancel() {
  clearSelection()
  emit('cancel')
}
</script>

<template>
  <Transition name="slide-down">
    <div v-if="hasSelection" class="bulk-actions-bar">
      <div class="bulk-info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span class="selected-count">เลือกแล้ว {{ selectedCount }} คน</span>
      </div>

      <div v-if="isProcessing" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-text">{{ currentAction }} {{ progress }}%</span>
      </div>

      <div v-else class="bulk-actions">
        <button 
          @click="emit('suspend')"
          class="bulk-btn suspend"
          aria-label="ระงับลูกค้าที่เลือก"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M4.93 4.93l14.14 14.14"/>
          </svg>
          ระงับ
        </button>

        <button 
          @click="emit('export')"
          class="bulk-btn export"
          aria-label="ส่งออกข้อมูลลูกค้าที่เลือก"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ส่งออก
        </button>

        <button 
          @click="emit('email')"
          class="bulk-btn email"
          aria-label="ส่งอีเมลถึงลูกค้าที่เลือก"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          ส่งอีเมล
        </button>

        <button 
          @click="emit('push')"
          class="bulk-btn push"
          aria-label="ส่งการแจ้งเตือนถึงลูกค้าที่เลือก"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          แจ้งเตือน
        </button>

        <button 
          @click="handleCancel"
          class="bulk-btn cancel"
          aria-label="ยกเลิกการเลือก"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          ยกเลิก
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.bulk-actions-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #00A86B 0%, #008C5A 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
  margin-bottom: 20px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.bulk-info svg {
  flex-shrink: 0;
}

.selected-count {
  font-size: 15px;
  font-weight: 600;
}

.progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(10px);
}

.bulk-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.bulk-btn:active {
  transform: translateY(0);
}

.bulk-btn svg {
  flex-shrink: 0;
}

.bulk-btn.cancel {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.bulk-btn.cancel:hover {
  background: rgba(239, 68, 68, 0.3);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@media (max-width: 768px) {
  .bulk-actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-info {
    justify-content: center;
  }

  .bulk-actions {
    justify-content: center;
  }

  .bulk-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
