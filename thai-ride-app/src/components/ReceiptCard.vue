<!--
  Feature: F52 - Receipt Card Component
  
  แสดงใบเสร็จในรูปแบบ Card
  - แสดงข้อมูลครบถ้วน
  - รองรับ download/print/share
-->
<template>
  <div class="receipt-card">
    <!-- Header -->
    <div class="receipt-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
          <circle cx="7.5" cy="17" r="1.5"/>
          <circle cx="16.5" cy="17" r="1.5"/>
        </svg>
        <span>GOBEAR</span>
      </div>
      <div class="receipt-meta">
        <div class="receipt-number">{{ receipt.receiptNumber }}</div>
        <div class="receipt-date">{{ formatDate(receipt.date) }}</div>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="status-badge" :class="receipt.paymentStatus">
      <svg v-if="receipt.paymentStatus === 'paid'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      <span>{{ receipt.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ' }}</span>
    </div>

    <!-- Trip Details -->
    <div class="section">
      <div class="section-title">รายละเอียดการเดินทาง</div>
      <div class="route-info">
        <div class="route-point">
          <div class="point-dot pickup"></div>
          <div class="point-content">
            <div class="point-label">จุดรับ</div>
            <div class="point-address">{{ receipt.pickupAddress }}</div>
            <div class="point-time">{{ formatTime(receipt.pickupTime) }}</div>
          </div>
        </div>
        <div class="route-line"></div>
        <div class="route-point">
          <div class="point-dot destination"></div>
          <div class="point-content">
            <div class="point-label">จุดหมาย</div>
            <div class="point-address">{{ receipt.destinationAddress }}</div>
            <div class="point-time">{{ formatTime(receipt.dropoffTime) }}</div>
          </div>
        </div>
      </div>
      <div class="trip-stats">
        <div class="stat">
          <span class="stat-value">{{ receipt.distance }}</span>
          <span class="stat-label">กม.</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">{{ receipt.duration }}</span>
          <span class="stat-label">นาที</span>
        </div>
      </div>
    </div>

    <!-- Driver Details -->
    <div class="section">
      <div class="section-title">ข้อมูลคนขับ</div>
      <div class="driver-info">
        <div class="driver-avatar">
          {{ receipt.driverName.charAt(0) }}
        </div>
        <div class="driver-details">
          <div class="driver-name">{{ receipt.driverName }}</div>
          <div class="driver-vehicle">{{ receipt.vehicleModel }} • {{ receipt.licensePlate }}</div>
        </div>
      </div>
    </div>

    <!-- Fare Breakdown -->
    <div class="section">
      <div class="section-title">รายละเอียดค่าโดยสาร</div>
      <div class="fare-rows">
        <div class="fare-row">
          <span>ค่าโดยสารพื้นฐาน</span>
          <span>฿{{ receipt.baseFare }}</span>
        </div>
        <div class="fare-row">
          <span>ค่าระยะทาง</span>
          <span>฿{{ receipt.distanceFare }}</span>
        </div>
        <div class="fare-row">
          <span>ค่าเวลา</span>
          <span>฿{{ receipt.timeFare }}</span>
        </div>
        <div v-if="receipt.surgeFare > 0" class="fare-row surge">
          <span>ค่าช่วงเวลาเร่งด่วน</span>
          <span>+฿{{ receipt.surgeFare }}</span>
        </div>
        <div v-if="receipt.discount > 0" class="fare-row discount">
          <span>ส่วนลด {{ receipt.promoCode ? `(${receipt.promoCode})` : '' }}</span>
          <span>-฿{{ receipt.discount }}</span>
        </div>
      </div>
      <div class="fare-total">
        <span>รวมทั้งหมด</span>
        <span class="total-amount">฿{{ receipt.total }}</span>
      </div>
    </div>

    <!-- Payment Method -->
    <div class="section payment-section">
      <div class="payment-method">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M12 12h.01"/>
          <path d="M17 12h.01"/>
          <path d="M7 12h.01"/>
        </svg>
        <span>{{ receipt.paymentMethod }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions" v-if="showActions">
      <button class="action-btn" @click="$emit('download')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>ดาวน์โหลด</span>
      </button>
      <button class="action-btn" @click="$emit('print')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,9 6,2 18,2 18,9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        <span>พิมพ์</span>
      </button>
      <button class="action-btn" @click="$emit('share')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span>แชร์</span>
      </button>
    </div>

    <!-- Footer -->
    <div class="receipt-footer">
      <p>ขอบคุณที่ใช้บริการ GOBEAR</p>
      <p class="support-text">หากมีข้อสงสัย กรุณาติดต่อ support@gobear.com</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReceiptData } from '../composables/useReceipt'

interface Props {
  receipt: ReceiptData
  showActions?: boolean
}

withDefaults(defineProps<Props>(), {
  showActions: true
})

defineEmits<{
  (e: 'download'): void
  (e: 'print'): void
  (e: 'share'): void
}>()

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.receipt-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Header */
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  background: #000000;
  color: #ffffff;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.receipt-meta {
  text-align: right;
}

.receipt-number {
  font-size: 12px;
  opacity: 0.8;
}

.receipt-date {
  font-size: 13px;
  margin-top: 2px;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 16px 20px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.paid {
  background: #dcfce7;
  color: #22c55e;
}

.status-badge.pending {
  background: #fef3c7;
  color: #f59e0b;
}

.status-badge.failed {
  background: #fee2e2;
  color: #e11900;
}

/* Sections */
.section {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Route Info */
.route-info {
  position: relative;
}

.route-point {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.point-dot.pickup {
  background: #22c55e;
}

.point-dot.destination {
  background: #e11900;
}

.route-line {
  position: absolute;
  left: 5px;
  top: 28px;
  width: 2px;
  height: 40px;
  background: #e5e5e5;
}

.point-content {
  flex: 1;
}

.point-label {
  font-size: 12px;
  color: #6b6b6b;
}

.point-address {
  font-size: 14px;
  color: #000000;
  font-weight: 500;
  margin-top: 2px;
}

.point-time {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}

/* Trip Stats */
.trip-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e5e5e5;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
}

.stat-label {
  font-size: 12px;
  color: #6b6b6b;
  margin-left: 4px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: #e5e5e5;
}

/* Driver Info */
.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.driver-name {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
}

.driver-vehicle {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 2px;
}

/* Fare */
.fare-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #6b6b6b;
}

.fare-row.surge {
  color: #f57c00;
}

.fare-row.discount {
  color: #22c55e;
}

.fare-total {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #000000;
  font-weight: 600;
  color: #000000;
}

.total-amount {
  font-size: 20px;
}

/* Payment */
.payment-section {
  border-bottom: none;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #000000;
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #000000;
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn:hover {
  background: #e5e5e5;
}

/* Footer */
.receipt-footer {
  padding: 16px 20px;
  background: #f6f6f6;
  text-align: center;
}

.receipt-footer p {
  margin: 0;
  font-size: 13px;
  color: #6b6b6b;
}

.support-text {
  font-size: 11px !important;
  margin-top: 4px !important;
}
</style>
