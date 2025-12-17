<script setup lang="ts">
/**
 * Feature: F339 - Order Empty State
 * Empty state for order history
 */
const props = withDefaults(defineProps<{
  type?: 'no-orders' | 'no-results' | 'error'
  message?: string
}>(), {
  type: 'no-orders'
})

const emit = defineEmits<{
  'action': []
}>()

const content = {
  'no-orders': {
    title: 'ยังไม่มีประวัติ',
    description: 'เริ่มใช้บริการส่งของหรือซื้อของเลย',
    actionLabel: 'เริ่มใช้บริการ'
  },
  'no-results': {
    title: 'ไม่พบผลลัพธ์',
    description: 'ลองเปลี่ยนตัวกรองหรือคำค้นหา',
    actionLabel: 'ล้างตัวกรอง'
  },
  'error': {
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
    actionLabel: 'ลองใหม่'
  }
}
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg v-if="type === 'no-orders'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M16 16h6v-6h-6zM2 16h6v-6H2zM9 10h6V4H9z"/>
        <path d="M12 22v-6"/>
      </svg>
      <svg v-else-if="type === 'no-results'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    </div>
    
    <h3 class="empty-title">{{ message || content[type].title }}</h3>
    <p class="empty-desc">{{ content[type].description }}</p>
    
    <button type="button" class="action-btn" @click="emit('action')">
      {{ content[type].actionLabel }}
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
  width: 96px;
  height: 96px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b6b6b;
  margin-bottom: 24px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 24px;
}

.action-btn {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn:hover {
  background: #333;
}
</style>
