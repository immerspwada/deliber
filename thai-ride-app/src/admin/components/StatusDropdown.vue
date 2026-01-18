<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderStatus } from '../types'

interface Props {
  currentStatus: OrderStatus
  orderId: string
  serviceType: string
  disabled?: boolean
}

interface Emits {
  (e: 'update', newStatus: OrderStatus): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(false)
const isUpdating = ref(false)

const statusOptions: Array<{ value: OrderStatus; label: string; color: string }> = [
  { value: 'pending', label: 'รอรับ', color: '#F59E0B' },
  { value: 'matched', label: 'จับคู่แล้ว', color: '#3B82F6' },
  { value: 'in_progress', label: 'กำลังดำเนินการ', color: '#8B5CF6' },
  { value: 'completed', label: 'เสร็จสิ้น', color: '#10B981' },
  { value: 'cancelled', label: 'ยกเลิก', color: '#EF4444' },
]

const currentOption = computed(() => 
  statusOptions.find(opt => opt.value === props.currentStatus) || statusOptions[0]
)

const availableOptions = computed(() => 
  statusOptions.filter(opt => opt.value !== props.currentStatus)
)

function toggleDropdown(event: Event) {
  event.stopPropagation()
  if (!props.disabled && !isUpdating.value) {
    isOpen.value = !isOpen.value
  }
}

function closeDropdown() {
  isOpen.value = false
}

async function selectStatus(newStatus: OrderStatus, event: Event) {
  event.stopPropagation()
  
  if (newStatus === props.currentStatus || isUpdating.value) return
  
  isUpdating.value = true
  isOpen.value = false
  
  try {
    emit('update', newStatus)
  } finally {
    // Keep updating state until parent confirms
    setTimeout(() => {
      isUpdating.value = false
    }, 1000)
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.status-dropdown')) {
    closeDropdown()
  }
}

// Add/remove click listener
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="status-dropdown" :class="{ disabled: disabled || isUpdating }">
    <button
      class="status-button"
      :style="{
        color: currentOption.color,
        background: currentOption.color + '20',
        borderColor: currentOption.color + '40',
      }"
      :disabled="disabled || isUpdating"
      @click="toggleDropdown"
    >
      <span class="status-label">{{ currentOption.label }}</span>
      <svg 
        v-if="!isUpdating"
        class="dropdown-icon" 
        :class="{ open: isOpen }"
        width="12" 
        height="12" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <svg 
        v-else
        class="spinner-icon"
        width="12" 
        height="12" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    </button>

    <transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <button
          v-for="option in availableOptions"
          :key="option.value"
          class="dropdown-item"
          :style="{
            color: option.color,
          }"
          @click="selectStatus(option.value, $event)"
        >
          <span class="status-dot" :style="{ background: option.color }"></span>
          <span class="status-text">{{ option.label }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.status-dropdown {
  position: relative;
  display: inline-block;
}

.status-dropdown.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  white-space: nowrap;
}

.status-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-button:disabled {
  cursor: not-allowed;
}

.status-label {
  line-height: 1;
}

.dropdown-icon {
  transition: transform 0.2s;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.spinner-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  font-weight: 500;
}

.dropdown-item:hover {
  background: #f9fafb;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  line-height: 1;
}

/* Transition animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
