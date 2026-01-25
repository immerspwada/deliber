<script setup lang="ts">
/**
 * Component: RideFareBreakdown
 * แสดงรายละเอียดค่าโดยสาร
 */
import { computed } from 'vue'

const props = defineProps<{
  baseFare: number
  distanceFare: number
  timeFare?: number
  discount?: number
  promoCode?: string
  finalFare: number
}>()

const emit = defineEmits<{
  removePromo: []
}>()

const breakdown = computed(() => {
  const items = [
    { label: 'ค่าเริ่มต้น', amount: 35 },
    { label: `ค่าระยะทาง (${(props.distanceFare / 12).toFixed(1)} กม.)`, amount: props.distanceFare }
  ]
  
  if (props.timeFare && props.timeFare > 0) {
    items.push({ label: 'ค่าเวลา', amount: props.timeFare })
  }
  
  return items
})

const subtotal = computed(() => breakdown.value.reduce((sum, item) => sum + item.amount, 0))
</script>

<template>
  <div class="fare-breakdown">
    <div class="breakdown-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <span>รายละเอียดค่าโดยสาร</span>
    </div>
    
    <div class="breakdown-items">
      <div v-for="(item, index) in breakdown" :key="index" class="breakdown-item">
        <span class="item-label">{{ item.label }}</span>
        <span class="item-amount">฿{{ item.amount.toLocaleString() }}</span>
      </div>
      
      <!-- Subtotal -->
      <div class="breakdown-item subtotal">
        <span class="item-label">รวม</span>
        <span class="item-amount">฿{{ subtotal.toLocaleString() }}</span>
      </div>
      
      <!-- Discount -->
      <div v-if="discount && discount > 0" class="breakdown-item discount">
        <span class="item-label">
          ส่วนลด
          <span v-if="promoCode" class="promo-badge">
            {{ promoCode }}
            <button class="remove-promo" aria-label="ลบโค้ด" @click="emit('removePromo')">×</button>
          </span>
        </span>
        <span class="item-amount">-฿{{ discount.toLocaleString() }}</span>
      </div>
    </div>
    
    <!-- Final Total -->
    <div class="breakdown-total">
      <span class="total-label">ยอดชำระ</span>
      <span class="total-amount">฿{{ finalFare.toLocaleString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.fare-breakdown {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.breakdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.breakdown-header svg {
  color: #00a86b;
}

.breakdown-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.item-label {
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-amount {
  color: #1a1a1a;
  font-weight: 500;
}

.breakdown-item.subtotal {
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  margin-top: 4px;
}

.breakdown-item.discount .item-amount {
  color: #00a86b;
  font-weight: 600;
}

.promo-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e8f5ef;
  color: #00a86b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.remove-promo {
  background: none;
  border: none;
  color: #00a86b;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.breakdown-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #00a86b;
}

.total-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00a86b;
}
</style>
