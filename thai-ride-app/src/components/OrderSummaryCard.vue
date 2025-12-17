<script setup lang="ts">
/**
 * Feature: F158 - Order Summary Card
 * Display order summary with items and total
 */

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface Props {
  items: OrderItem[]
  subtotal: number
  deliveryFee?: number
  serviceFee?: number
  discount?: number
  total: number
  currency?: string
}

withDefaults(defineProps<Props>(), {
  deliveryFee: 0,
  serviceFee: 0,
  discount: 0,
  currency: '฿'
})
</script>

<template>
  <div class="order-summary-card">
    <div class="summary-header">
      <h3 class="summary-title">สรุปคำสั่งซื้อ</h3>
      <span class="item-count">{{ items.length }} รายการ</span>
    </div>
    
    <div class="items-list">
      <div v-for="(item, index) in items" :key="index" class="item-row">
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-qty">x{{ item.quantity }}</span>
        </div>
        <span class="item-price">{{ currency }}{{ (item.price * item.quantity).toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="fee-breakdown">
      <div class="fee-row">
        <span>ราคาสินค้า</span>
        <span>{{ currency }}{{ subtotal.toLocaleString() }}</span>
      </div>
      <div v-if="deliveryFee > 0" class="fee-row">
        <span>ค่าจัดส่ง</span>
        <span>{{ currency }}{{ deliveryFee.toLocaleString() }}</span>
      </div>
      <div v-if="serviceFee > 0" class="fee-row">
        <span>ค่าบริการ</span>
        <span>{{ currency }}{{ serviceFee.toLocaleString() }}</span>
      </div>
      <div v-if="discount > 0" class="fee-row discount">
        <span>ส่วนลด</span>
        <span>-{{ currency }}{{ discount.toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="total-row">
      <span class="total-label">ยอดรวมทั้งหมด</span>
      <span class="total-amount">{{ currency }}{{ total.toLocaleString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.order-summary-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.item-count {
  font-size: 13px;
  color: #6b6b6b;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-size: 14px;
  color: #000;
}

.item-qty {
  font-size: 12px;
  color: #6b6b6b;
}

.item-price {
  font-size: 14px;
  color: #000;
}

.divider {
  height: 1px;
  background: #e5e5e5;
  margin: 14px 0;
}

.fee-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b6b6b;
}

.fee-row.discount {
  color: #276ef1;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.total-amount {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}
</style>
