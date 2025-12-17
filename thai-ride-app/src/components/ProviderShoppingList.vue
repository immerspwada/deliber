<script setup lang="ts">
/**
 * Feature: F343 - Provider Shopping List
 * Shopping list for provider to manage items
 */
import { computed } from 'vue'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  note?: string
  status: 'pending' | 'found' | 'not_found' | 'substituted'
  substitute?: string
  actualPrice?: number
}

const props = defineProps<{
  items: ShoppingItem[]
  editable?: boolean
}>()

const emit = defineEmits<{
  'updateStatus': [id: string, status: ShoppingItem['status']]
  'setSubstitute': [id: string, substitute: string]
  'setPrice': [id: string, price: number]
}>()

const completedCount = computed(() => 
  props.items.filter(i => i.status !== 'pending').length
)

const statusOptions = [
  { value: 'found', label: 'พบ', class: 'found' },
  { value: 'not_found', label: 'ไม่พบ', class: 'not-found' },
  { value: 'substituted', label: 'ทดแทน', class: 'substituted' }
]
</script>

<template>
  <div class="shopping-list">
    <div class="list-header">
      <h3 class="list-title">รายการสินค้า</h3>
      <span class="list-progress">{{ completedCount }}/{{ items.length }}</span>
    </div>
    
    <div class="items-list">
      <div 
        v-for="item in items" 
        :key="item.id"
        class="item-card"
        :class="item.status"
      >
        <div class="item-main">
          <div class="item-qty">{{ item.quantity }}x</div>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.note" class="item-note">{{ item.note }}</span>
            <span v-if="item.substitute" class="item-substitute">
              ทดแทน: {{ item.substitute }}
            </span>
          </div>
        </div>
        
        <div v-if="editable && item.status === 'pending'" class="item-actions">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="status-btn"
            :class="opt.class"
            @click="emit('updateStatus', item.id, opt.value as ShoppingItem['status'])"
          >
            {{ opt.label }}
          </button>
        </div>
        
        <div v-else class="item-status" :class="item.status">
          <span v-if="item.status === 'found'">พบแล้ว</span>
          <span v-else-if="item.status === 'not_found'">ไม่พบ</span>
          <span v-else-if="item.status === 'substituted'">ทดแทน</span>
          <span v-else>รอดำเนินการ</span>
        </div>
        
        <div v-if="item.actualPrice" class="item-price">
          ฿{{ item.actualPrice.toFixed(0) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shopping-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.list-progress {
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
}

.items-list {
  padding: 8px 16px;
}

.item-card {
  padding: 12px 0;
  border-bottom: 1px solid #e5e5e5;
}

.item-card:last-child {
  border-bottom: none;
}

.item-card.not_found {
  opacity: 0.5;
}

.item-main {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.item-qty {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  min-width: 32px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: #000;
  display: block;
}

.item-note {
  font-size: 13px;
  color: #6b6b6b;
  display: block;
}

.item-substitute {
  font-size: 13px;
  color: #276ef1;
  display: block;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.status-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.status-btn.found {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-btn.not-found {
  background: #ffeae6;
  color: #e11900;
}

.status-btn.substituted {
  background: #e3f2fd;
  color: #276ef1;
}

.item-status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.item-status.found {
  background: #e8f5e9;
  color: #2e7d32;
}

.item-status.not_found {
  background: #ffeae6;
  color: #e11900;
}

.item-status.substituted {
  background: #e3f2fd;
  color: #276ef1;
}

.item-status.pending {
  background: #f6f6f6;
  color: #6b6b6b;
}

.item-price {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin-top: 8px;
}
</style>
