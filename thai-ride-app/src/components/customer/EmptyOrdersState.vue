<script setup lang="ts">
/**
 * EmptyOrdersState - Empty state สำหรับเมื่อไม่มี active orders
 */
interface Props {
  title?: string
  description?: string
  actionText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'ยังไม่มีรายการ',
  description: 'เริ่มใช้บริการของเราได้เลย',
  actionText: 'เรียกรถ'
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state">
    <!-- Empty Icon -->
    <div class="empty-icon">
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6v6H9z" />
      </svg>
    </div>
    
    <!-- Empty Text -->
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    
    <!-- Action Button -->
    <button
      type="button"
      class="empty-action"
      @click="emit('action')"
    >
      {{ actionText }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  color: #cccccc;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
  max-width: 300px;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 120px;
}

.empty-action:hover {
  background: #008f5b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.empty-action:active {
  transform: scale(0.98);
}

@media (prefers-color-scheme: dark) {
  .empty-title {
    color: #ffffff;
  }
  
  .empty-description {
    color: #cccccc;
  }
  
  .empty-icon {
    color: #666666;
  }
}
</style>
