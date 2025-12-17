<script setup lang="ts">
/**
 * Feature: F327 - Shopping Item Row
 * Row component for shopping list item
 */
interface ShoppingItem {
  id: string
  name: string
  quantity: number
  note?: string
  status?: 'pending' | 'found' | 'not_found' | 'substituted'
  substitute?: string
  actualPrice?: number
}

const props = defineProps<{
  item: ShoppingItem
  editable?: boolean
}>()

const emit = defineEmits<{
  'edit': [item: ShoppingItem]
  'remove': [id: string]
  'updateQty': [id: string, qty: number]
}>()

const statusLabels: Record<string, { text: string; class: string }> = {
  pending: { text: 'รอดำเนินการ', class: 'pending' },
  found: { text: 'พบสินค้า', class: 'found' },
  not_found: { text: 'ไม่พบสินค้า', class: 'not-found' },
  substituted: { text: 'ทดแทน', class: 'substituted' }
}

const incrementQty = () => {
  emit('updateQty', props.item.id, props.item.quantity + 1)
}

const decrementQty = () => {
  if (props.item.quantity > 1) {
    emit('updateQty', props.item.id, props.item.quantity - 1)
  }
}
</script>

<template>
  <div class="item-row" :class="{ 'not-found': item.status === 'not_found' }">
    <div class="item-main">
      <div class="item-info">
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.note" class="item-note">{{ item.note }}</span>
        <span v-if="item.substitute" class="item-substitute">
          ทดแทนด้วย: {{ item.substitute }}
        </span>
      </div>
      
      <div v-if="item.status" class="item-status" :class="statusLabels[item.status]?.class">
        {{ statusLabels[item.status]?.text }}
      </div>
    </div>
    
    <div class="item-actions">
      <div v-if="editable" class="qty-control">
        <button type="button" class="qty-btn" :disabled="item.quantity <= 1" @click="decrementQty">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <span class="qty-value">{{ item.quantity }}</span>
        <button type="button" class="qty-btn" @click="incrementQty">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
      <span v-else class="qty-display">x{{ item.quantity }}</span>
      
      <span v-if="item.actualPrice" class="item-price">฿{{ item.actualPrice.toFixed(0) }}</span>
      
      <button v-if="editable" type="button" class="remove-btn" @click="emit('remove', item.id)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e5e5e5;
}

.item-row:last-child {
  border-bottom: none;
}

.item-row.not-found {
  opacity: 0.5;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.item-note {
  font-size: 12px;
  color: #6b6b6b;
}

.item-substitute {
  font-size: 12px;
  color: #276ef1;
}

.item-status {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 4px;
}

.item-status.pending {
  background: #f6f6f6;
  color: #6b6b6b;
}

.item-status.found {
  background: #e8f5e9;
  color: #2e7d32;
}

.item-status.not-found {
  background: #ffeae6;
  color: #e11900;
}

.item-status.substituted {
  background: #e3f2fd;
  color: #276ef1;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f6f6f6;
  border-radius: 6px;
  padding: 2px;
}

.qty-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
}

.qty-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.qty-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.qty-value {
  font-size: 13px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.qty-display {
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
}

.item-price {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.remove-btn {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  color: #e11900;
}
</style>
