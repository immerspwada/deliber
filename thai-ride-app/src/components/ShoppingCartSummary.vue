<script setup lang="ts">
/**
 * Feature: F160 - Shopping Cart Summary
 * Display shopping cart with items and checkout
 */

interface CartItem {
  id: string
  name: string
  quantity: number
  estimatedPrice: number
  notes?: string
}

interface Props {
  items: CartItem[]
  storeName?: string
  estimatedTotal: number
  serviceFee?: number
}

withDefaults(defineProps<Props>(), {
  serviceFee: 0
})

const emit = defineEmits<{
  updateQuantity: [id: string, quantity: number]
  removeItem: [id: string]
  checkout: []
  addMore: []
}>()
</script>

<template>
  <div class="shopping-cart-summary">
    <div class="cart-header">
      <h3 class="cart-title">ตะกร้าสินค้า</h3>
      <span v-if="storeName" class="store-name">{{ storeName }}</span>
    </div>
    
    <div v-if="items.length === 0" class="empty-cart">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
      <p>ยังไม่มีสินค้าในตะกร้า</p>
    </div>
</template>

    <div v-else class="cart-items">
      <div v-for="item in items" :key="item.id" class="cart-item">
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.notes" class="item-notes">{{ item.notes }}</span>
          <span class="item-price">~฿{{ item.estimatedPrice }}</span>
        </div>
        <div class="item-controls">
          <button 
            type="button" 
            class="qty-btn"
            @click="item.quantity > 1 ? emit('updateQuantity', item.id, item.quantity - 1) : emit('removeItem', item.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <span class="qty-value">{{ item.quantity }}</span>
          <button type="button" class="qty-btn" @click="emit('updateQuantity', item.id, item.quantity + 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <button type="button" class="add-more-btn" @click="emit('addMore')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      เพิ่มสินค้า
    </button>
    
    <div class="cart-summary">
      <div class="summary-row">
        <span>ราคาสินค้าโดยประมาณ</span>
        <span>~฿{{ estimatedTotal.toLocaleString() }}</span>
      </div>
      <div v-if="serviceFee > 0" class="summary-row">
        <span>ค่าบริการ</span>
        <span>฿{{ serviceFee.toLocaleString() }}</span>
      </div>
      <div class="summary-row total">
        <span>ยอดรวมโดยประมาณ</span>
        <span>~฿{{ (estimatedTotal + serviceFee).toLocaleString() }}</span>
      </div>
    </div>
    
    <button 
      type="button" 
      class="checkout-btn"
      :disabled="items.length === 0"
      @click="emit('checkout')"
    >
      สั่งซื้อ ({{ items.length }} รายการ)
    </button>
  </div>
</template>

<style scoped>
.shopping-cart-summary {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cart-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.store-name {
  font-size: 13px;
  color: #6b6b6b;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  color: #6b6b6b;
}

.empty-cart p {
  margin: 12px 0 0;
  font-size: 14px;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.item-notes {
  font-size: 11px;
  color: #999;
}

.item-price {
  font-size: 12px;
  color: #6b6b6b;
}

.item-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  color: #000;
  cursor: pointer;
}

.qty-btn:hover {
  background: #000;
  color: #fff;
  border-color: #000;
}

.qty-value {
  font-size: 14px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.add-more-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f6f6f6;
  border: 1px dashed #ccc;
  border-radius: 10px;
  font-size: 13px;
  color: #6b6b6b;
  cursor: pointer;
  margin-bottom: 16px;
}

.add-more-btn:hover {
  background: #e5e5e5;
  color: #000;
}

.cart-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b6b6b;
}

.summary-row.total {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin-top: 4px;
}

.checkout-btn {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.checkout-btn:not(:disabled):hover {
  background: #333;
}
</style>