<script setup lang="ts">
import { ref } from 'vue'

const receipt = ref({
  id: 'TH-2024121501',
  type: 'ride',
  typeName: 'เรียกรถ',
  status: 'completed',
  date: '15 ธันวาคม 2567',
  time: '14:30',
  from: { name: 'สยามพารากอน', address: 'ถนนพระราม 1 ปทุมวัน กรุงเทพฯ' },
  to: { name: 'สถานีรถไฟฟ้าอโศก', address: 'ถนนสุขุมวิท คลองเตย กรุงเทพฯ' },
  distance: '5.2 กม.',
  duration: '18 นาที',
  driver: { name: 'สมชาย ใจดี', rating: 4.9, vehicle: 'Toyota Vios สีขาว', plate: 'กข 1234' },
  payment: { method: 'พร้อมเพย์', last4: '678' },
  breakdown: [
    { label: 'ค่าโดยสารพื้นฐาน', amount: 35 },
    { label: 'ค่าระยะทาง (5.2 กม.)', amount: 42 },
    { label: 'ค่าเวลา (18 นาที)', amount: 18 },
    { label: 'ส่วนลดโปรโมชั่น', amount: -10 }
  ],
  total: 85
})

const shareReceipt = () => {
  if (navigator.share) {
    navigator.share({
      title: 'ใบเสร็จ ThaiRide',
      text: `การเดินทาง ${receipt.value.from.name} → ${receipt.value.to.name}\nราคา: ฿${receipt.value.total}`
    })
  }
}

const downloadReceipt = () => {
  alert('กำลังดาวน์โหลดใบเสร็จ...')
}
</script>

<template>
  <div class="receipt-page">
    <div class="content-container">
      <!-- Receipt Card -->
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="receipt-logo">
            <span>ThaiRide</span>
          </div>
          <div class="receipt-meta">
            <span class="receipt-id">#{{ receipt.id }}</span>
            <span class="receipt-date">{{ receipt.date }} {{ receipt.time }}</span>
          </div>
        </div>

        <!-- Status -->
        <div class="status-section">
          <div class="status-badge completed">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>เสร็จสิ้น</span>
          </div>
        </div>

        <!-- Route -->
        <div class="route-section">
          <div class="route-point">
            <div class="route-dot from"></div>
            <div class="route-details">
              <span class="route-name">{{ receipt.from.name }}</span>
              <span class="route-address">{{ receipt.from.address }}</span>
            </div>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <div class="route-dot to"></div>
            <div class="route-details">
              <span class="route-name">{{ receipt.to.name }}</span>
              <span class="route-address">{{ receipt.to.address }}</span>
            </div>
          </div>
        </div>

        <!-- Trip Info -->
        <div class="trip-info">
          <div class="info-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>{{ receipt.distance }}</span>
          </div>
          <div class="info-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ receipt.duration }}</span>
          </div>
        </div>

        <!-- Driver -->
        <div class="driver-section">
          <div class="driver-avatar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="driver-info">
            <span class="driver-name">{{ receipt.driver.name }}</span>
            <span class="driver-vehicle">{{ receipt.driver.vehicle }} - {{ receipt.driver.plate }}</span>
          </div>
          <div class="driver-rating">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ receipt.driver.rating }}</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Price Breakdown -->
        <div class="breakdown-section">
          <h3 class="section-title">รายละเอียดค่าใช้จ่าย</h3>
          <div class="breakdown-list">
            <div v-for="item in receipt.breakdown" :key="item.label" class="breakdown-item">
              <span>{{ item.label }}</span>
              <span :class="{ discount: item.amount < 0 }">
                {{ item.amount < 0 ? '-' : '' }}฿{{ Math.abs(item.amount) }}
              </span>
            </div>
          </div>
          <div class="total-row">
            <span>รวมทั้งหมด</span>
            <span class="total-amount">฿{{ receipt.total }}</span>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="payment-section">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
          </svg>
          <span>{{ receipt.payment.method }} (xxx-{{ receipt.payment.last4 }})</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="shareReceipt" class="btn-secondary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          <span>แชร์</span>
        </button>
        <button @click="downloadReceipt" class="btn-primary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>ดาวน์โหลด</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.receipt-page {
  min-height: 100vh;
  background-color: var(--color-background);
  padding-bottom: 100px;
}

.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.receipt-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.receipt-logo span {
  font-size: 22px;
  font-weight: 700;
}

.receipt-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.receipt-id {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.receipt-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.status-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
}

.status-badge.completed {
  background-color: rgba(5, 148, 79, 0.1);
  color: var(--color-success);
}

.status-badge svg {
  width: 18px;
  height: 18px;
}

.route-section {
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  gap: 12px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.route-dot.from { background-color: var(--color-success); }
.route-dot.to { background-color: var(--color-error); }

.route-details {
  display: flex;
  flex-direction: column;
}

.route-name {
  font-size: 15px;
  font-weight: 500;
}

.route-address {
  font-size: 12px;
  color: var(--color-text-muted);
}

.route-line {
  width: 2px;
  height: 20px;
  background-color: var(--color-border);
  margin-left: 5px;
}
</style>

<style scoped>
.trip-info {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-item svg {
  width: 18px;
  height: 18px;
}

.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  border-radius: 50%;
}

.driver-avatar svg {
  width: 24px;
  height: 24px;
}

.driver-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 15px;
  font-weight: 500;
}

.driver-vehicle {
  font-size: 12px;
  color: var(--color-text-muted);
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
}

.driver-rating svg {
  width: 16px;
  height: 16px;
  color: #F59E0B;
}

.divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 20px 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.breakdown-item .discount {
  color: var(--color-success);
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-weight: 600;
}

.total-amount {
  font-size: 20px;
}

.payment-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 12px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.payment-section svg {
  width: 20px;
  height: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary, .btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background-color: var(--color-secondary);
  border: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.btn-secondary svg, .btn-primary svg {
  width: 20px;
  height: 20px;
}
</style>
