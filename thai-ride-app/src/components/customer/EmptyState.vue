<script setup lang="ts">
/**
 * EmptyState - Contextual Empty State Component
 * 
 * แสดง empty state ที่มีความหมายและมี action ที่เป็นประโยชน์
 * MUNEEF Style: สีเขียว #00A86B, illustrations แทน icons ธรรมดา
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  type?: 'orders' | 'history' | 'places' | 'notifications' | 'search' | 'error' | 'custom'
  title?: string
  description?: string
  actionText?: string
  actionRoute?: string
  showAction?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'custom',
  showAction: true,
  size: 'md'
})

const emit = defineEmits<{
  'action': []
}>()

const { vibrate } = useHapticFeedback()

// Default content based on type
const defaultContent = {
  orders: {
    title: 'ยังไม่มีการเดินทาง',
    description: 'เริ่มเรียกรถเพื่อไปยังจุดหมายของคุณ',
    actionText: 'เรียกรถเลย'
  },
  history: {
    title: 'ยังไม่มีประวัติ',
    description: 'ประวัติการใช้งานจะแสดงที่นี่',
    actionText: 'เริ่มใช้งาน'
  },
  places: {
    title: 'ยังไม่มีสถานที่บันทึก',
    description: 'บันทึกสถานที่ที่ใช้บ่อยเพื่อความสะดวก',
    actionText: 'เพิ่มสถานที่'
  },
  notifications: {
    title: 'ไม่มีการแจ้งเตือน',
    description: 'การแจ้งเตือนใหม่จะแสดงที่นี่',
    actionText: ''
  },
  search: {
    title: 'ไม่พบผลลัพธ์',
    description: 'ลองค้นหาด้วยคำอื่น',
    actionText: 'ล้างการค้นหา'
  },
  error: {
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
    actionText: 'ลองใหม่'
  },
  custom: {
    title: 'ไม่มีข้อมูล',
    description: '',
    actionText: ''
  }
}

const content = {
  title: props.title || defaultContent[props.type].title,
  description: props.description || defaultContent[props.type].description,
  actionText: props.actionText || defaultContent[props.type].actionText
}

const handleAction = () => {
  vibrate('medium')
  emit('action')
}
</script>

<template>
  <div class="empty-state" :class="size">
    <!-- Illustration -->
    <div class="illustration">
      <!-- Orders Empty -->
      <svg v-if="type === 'orders'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <rect x="35" y="45" width="50" height="35" rx="4" fill="#E8E8E8"/>
        <rect x="40" y="50" width="40" height="4" rx="2" fill="#CCCCCC"/>
        <rect x="40" y="58" width="30" height="4" rx="2" fill="#CCCCCC"/>
        <rect x="40" y="66" width="35" height="4" rx="2" fill="#CCCCCC"/>
        <circle cx="85" cy="75" r="15" fill="#00A86B" opacity="0.2"/>
        <path d="M85 68v14M78 75h14" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
      </svg>
      
      <!-- History Empty -->
      <svg v-else-if="type === 'history'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <circle cx="60" cy="60" r="30" stroke="#E8E8E8" stroke-width="4"/>
        <path d="M60 40v20l12 8" stroke="#CCCCCC" stroke-width="3" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="4" fill="#00A86B"/>
      </svg>
      
      <!-- Places Empty -->
      <svg v-else-if="type === 'places'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <path d="M60 30c-13.8 0-25 11.2-25 25 0 17.5 25 35 25 35s25-17.5 25-35c0-13.8-11.2-25-25-25z" fill="#E8E8E8"/>
        <circle cx="60" cy="55" r="10" fill="#CCCCCC"/>
        <circle cx="85" cy="75" r="12" fill="#00A86B" opacity="0.2"/>
        <path d="M85 70v10M80 75h10" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
      </svg>
      
      <!-- Notifications Empty -->
      <svg v-else-if="type === 'notifications'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <path d="M60 35c-11 0-20 9-20 20v15l-5 5v5h50v-5l-5-5V55c0-11-9-20-20-20z" fill="#E8E8E8"/>
        <circle cx="60" cy="90" r="6" fill="#CCCCCC"/>
        <path d="M75 45l10-10" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
        <path d="M80 50l5-5" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
      </svg>
      
      <!-- Search Empty -->
      <svg v-else-if="type === 'search'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <circle cx="55" cy="55" r="20" stroke="#E8E8E8" stroke-width="4"/>
        <path d="M70 70l15 15" stroke="#E8E8E8" stroke-width="4" stroke-linecap="round"/>
        <path d="M45 55h20M55 45v20" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      </svg>
      
      <!-- Error -->
      <svg v-else-if="type === 'error'" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFEBEE"/>
        <circle cx="60" cy="60" r="30" stroke="#E53935" stroke-width="3" opacity="0.3"/>
        <path d="M60 45v20" stroke="#E53935" stroke-width="4" stroke-linecap="round"/>
        <circle cx="60" cy="75" r="3" fill="#E53935"/>
      </svg>
      
      <!-- Custom/Default -->
      <svg v-else viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="50" fill="#F5F5F5"/>
        <rect x="40" y="40" width="40" height="40" rx="4" fill="#E8E8E8"/>
        <path d="M50 60h20M60 50v20" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    
    <!-- Text Content -->
    <div class="text-content">
      <h4 class="empty-title">{{ content.title }}</h4>
      <p v-if="content.description" class="empty-description">{{ content.description }}</p>
    </div>
    
    <!-- Action Button -->
    <button 
      v-if="showAction && content.actionText" 
      class="action-btn"
      @click="handleAction"
    >
      {{ content.actionText }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  text-align: center;
}

.empty-state.sm {
  padding: 20px 16px;
}

.empty-state.lg {
  padding: 48px 32px;
}

.illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 20px;
}

.empty-state.sm .illustration {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
}

.empty-state.lg .illustration {
  width: 160px;
  height: 160px;
  margin-bottom: 24px;
}

.illustration svg {
  width: 100%;
  height: 100%;
}

.text-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.empty-state.sm .empty-title {
  font-size: 15px;
}

.empty-state.lg .empty-title {
  font-size: 20px;
}

.empty-description {
  font-size: 14px;
  color: #666666;
  margin: 0;
  max-width: 280px;
}

.empty-state.sm .empty-description {
  font-size: 13px;
}

.action-btn {
  padding: 14px 28px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.empty-state.sm .action-btn {
  padding: 10px 20px;
  font-size: 14px;
}

.action-btn:hover {
  background: #008F5B;
}

.action-btn:active {
  transform: scale(0.98);
}
</style>
