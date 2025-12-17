<script setup lang="ts">
/**
 * Feature: F315 - Shopping List
 * Shopping items list for shopping service
 */
interface ShoppingItem {
  id: string
  name: string
  quantity: number
  note?: string
  estimatedPrice?: number
}

const props = defineProps<{
  items: ShoppingItem[]
  editable?: boolean
}>()

const emit = defineEmits<{
  'add': []
  'remove': [id: string]
  'update': [item: ShoppingItem]
}>()

const totalEstimate = () => {
  return props.items.reduce((sum, item) => sum + (item.estimatedPrice || 0) * item.quantity, 0)
}
</script>

<template>
  <div class="shopping-list">
    <div class="header">
      <h4>รายการสินค้า</h4>
      <span class="count">{{ items.length }} รายการ</span>
    </div>
    
    <div class="items">
      <div v-for="item in items" :key="item.id" class="item">
        <div class="item-info">
          <span class="name">{{ item.name }}</span>
          <span v-if="item.note" class="note">{{ item.note }}</span>
        </div>
        <div class="item-meta">
          <span class="quantity">x{{ item.quantity }}</span>
          <span v-if="item.estimatedPrice" class="price">~฿{{ item.estimatedPrice * item.quantity }}</span>
        </div>
        <button v-if="editable" type="button" class="remove-btn" @click="emit('remove', item.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    
    <button v-if="editable" type="button" class="add-btn" @click="emit('add')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      เพิ่มรายการ
    </button>
    
    <div v-if="items.length > 0" class="total">
      <span class="label">ประมาณการค่าสินค้า</span>
      <span class="value">~฿{{ totalEstimate() }}</span>
    </div>
  </div>
</template>

<style scoped>
.shopping-list {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.count {
  font-size: 13px;
  color: #6b6b6b;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 14px;
  font-weight: 500;
}

.note {
  font-size: 12px;
  color: #6b6b6b;
}

.item-meta {
  text-align: right;
}

.quantity {
  font-size: 14px;
  font-weight: 500;
  display: block;
}

.price {
  font-size: 12px;
  color: #6b6b6b;
}

.remove-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: transparent;
  border: 1px dashed #ccc;
  border-radius: 8px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.total {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.total .label {
  font-size: 14px;
  color: #6b6b6b;
}

.total .value {
  font-size: 16px;
  font-weight: 600;
}
</style>
