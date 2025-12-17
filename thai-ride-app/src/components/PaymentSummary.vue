<script setup lang="ts">
/**
 * Feature: F168 - Payment Summary
 * Display payment breakdown and method
 */

interface Props {
  baseFare: number
  distance?: number
  distanceFare?: number
  timeFare?: number
  surgeMultiplier?: number
  surgeFee?: number
  serviceFee?: number
  discount?: number
  promoCode?: string
  tip?: number
  total: number
  paymentMethod: string
  paymentIcon?: string
  currency?: string
}

withDefaults(defineProps<Props>(), {
  currency: '฿',
  surgeMultiplier: 1
})

const emit = defineEmits<{
  changePayment: []
  addTip: []
}>()
</script>

<template>
  <div class="payment-summary">
    <h3 class="summary-title">รายละเอียดการชำระเงิน</h3>
    
    <div class="fare-breakdown">
      <div class="fare-row">
        <span>ค่าโดยสารพื้นฐาน</span>
        <span>{{ currency }}{{ baseFare.toLocaleString() }}</span>
      </div>
      <div v-if="distanceFare" class="fare-row">
        <span>ค่าระยะทาง ({{ distance }} กม.)</span>
        <span>{{ currency }}{{ distanceFare.toLocaleString() }}</span>
      </div>
      <div v-if="timeFare" class="fare-row">
        <span>ค่าเวลา</span>
        <span>{{ currency }}{{ timeFare.toLocaleString() }}</span>
      </div>
      <div v-if="surgeMultiplier > 1" class="fare-row surge">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Surge ({{ surgeMultiplier }}x)
        </span>
        <span>+{{ currency }}{{ surgeFee?.toLocaleString() }}</span>
      </div>
      <div v-if="serviceFee" class="fare-row">
        <span>ค่าบริการ</span>
        <span>{{ currency }}{{ serviceFee.toLocaleString() }}</span>
      </div>
</template>

      <div v-if="discount" class="fare-row discount">
        <span>
          ส่วนลด
          <span v-if="promoCode" class="promo-tag">{{ promoCode }}</span>
        </span>
        <span>-{{ currency }}{{ discount.toLocaleString() }}</span>
      </div>
      <div v-if="tip" class="fare-row tip">
        <span>ทิป</span>
        <span>{{ currency }}{{ tip.toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="total-section">
      <span class="total-label">ยอดรวม</span>
      <span class="total-amount">{{ currency }}{{ total.toLocaleString() }}</span>
    </div>
    
    <div class="payment-method" @click="emit('changePayment')">
      <div class="method-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M1 10h22"/>
        </svg>
      </div>
      <span class="method-name">{{ paymentMethod }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
    
    <button v-if="!tip" type="button" class="tip-btn" @click="emit('addTip')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      เพิ่มทิปให้คนขับ
    </button>
  </div>
</template>

<style scoped>
.payment-summary {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 16px;
}

.fare-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e5e5;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b6b6b;
}

.fare-row.surge {
  color: #ef6c00;
}

.fare-row.surge span:first-child {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fare-row.discount {
  color: #276ef1;
}

.promo-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-left: 6px;
}

.fare-row.tip {
  color: #2e7d32;
}

.total-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #e5e5e5;
}

.total-label {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  cursor: pointer;
}

.method-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #000;
}

.method-name {
  flex: 1;
  font-size: 14px;
  color: #000;
}

.tip-btn {
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
}

.tip-btn:hover {
  background: #e5e5e5;
  color: #000;
}
</style>