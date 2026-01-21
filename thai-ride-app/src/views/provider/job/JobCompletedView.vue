<!--
  JobCompletedView - ขั้นตอน: เสร็จสิ้น
  URL: /provider/job/:id/completed
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { JobDetail } from '@/types/ride-requests'

interface Props {
  job: JobDetail
}

const props = defineProps<Props>()
const router = useRouter()

const hasTip = computed(() => props.job.tip_amount && props.job.tip_amount > 0)
const totalEarnings = computed(() => {
  return props.job.fare + (props.job.tip_amount || 0)
})

function goToOrders(): void {
  router.push('/provider/orders')
}

function goHome(): void {
  router.push('/provider')
}
</script>

<template>
  <div class="step-view completed-view">
    <!-- Header -->
    <header class="step-header">
      <div class="header-content">
        <span class="step-badge">เสร็จสิ้น</span>
        <h1>งานสำเร็จ!</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="step-content">
      <!-- Success Banner -->
      <div class="success-banner">
        <span class="success-icon">🎉</span>
        <div class="success-text">
          <h2>ยินดีด้วย!</h2>
          <p>คุณทำงานนี้สำเร็จแล้ว</p>
        </div>
      </div>

      <!-- Earnings Card -->
      <section class="earnings-card" aria-label="รายได้">
        <div class="earnings-row">
          <span class="earnings-label">ค่าโดยสาร</span>
          <span class="earnings-value">฿{{ job.fare.toLocaleString() }}</span>
        </div>
        
        <div v-if="hasTip" class="earnings-row tip">
          <span class="earnings-label">💰 ทิป</span>
          <span class="earnings-value tip-amount">+฿{{ job.tip_amount?.toLocaleString() }}</span>
        </div>
        
        <div class="earnings-divider"></div>
        
        <div class="earnings-row total">
          <span class="earnings-label">รายได้รวม</span>
          <span class="earnings-value total-amount">฿{{ totalEarnings.toLocaleString() }}</span>
        </div>
      </section>

      <!-- Tip Message -->
      <div v-if="hasTip && job.tip_message" class="tip-message-card">
        <h4>💬 ข้อความจากลูกค้า</h4>
        <p>"{{ job.tip_message }}"</p>
      </div>

      <!-- Route Summary -->
      <section class="route-summary" aria-label="สรุปเส้นทาง">
        <div class="route-point">
          <span class="route-icon pickup">📍</span>
          <div class="route-info">
            <span class="route-label">จุดรับ</span>
            <p>{{ job.pickup_address }}</p>
          </div>
        </div>
        <div class="route-line"></div>
        <div class="route-point">
          <span class="route-icon dropoff">🏁</span>
          <div class="route-info">
            <span class="route-label">จุดส่ง</span>
            <p>{{ job.dropoff_address }}</p>
          </div>
        </div>
      </section>
    </main>

    <!-- Action Bar -->
    <footer class="action-bar">
      <button class="btn-secondary" @click="goToOrders" type="button">
        ดูงานทั้งหมด
      </button>
      <button class="btn-primary" @click="goHome" type="button">
        รับงานใหม่
      </button>
    </footer>
  </div>
</template>

<style scoped>
.step-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5EF 0%, #F5F5F5 30%);
  display: flex;
  flex-direction: column;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  text-align: center;
}

.header-content { text-align: center; }

.step-badge {
  font-size: 12px;
  font-weight: 600;
  background: #00A86B;
  color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 8px;
}

.step-header h1 { font-size: 24px; font-weight: 700; color: #00A86B; margin: 0; }

.step-content {
  flex: 1;
  padding: 0 16px 120px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.success-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.15);
}

.success-icon { font-size: 64px; margin-bottom: 16px; }
.success-text h2 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
.success-text p { font-size: 16px; color: #6B7280; margin: 0; }

.earnings-card {
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.earnings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.earnings-label { font-size: 15px; color: #6B7280; font-weight: 500; }
.earnings-value { font-size: 16px; color: #111827; font-weight: 600; }

.earnings-row.tip { background: #FEF3C7; margin: 8px -12px; padding: 12px; border-radius: 8px; }
.tip-amount { color: #B45309; font-weight: 700; }

.earnings-divider { height: 1px; background: #E5E7EB; margin: 12px 0; }

.earnings-row.total { padding-top: 12px; }
.earnings-row.total .earnings-label { font-size: 16px; font-weight: 600; color: #111827; }
.total-amount { font-size: 24px; font-weight: 700; color: #00A86B; }

.tip-message-card {
  padding: 16px;
  background: #FEF3C7;
  border-radius: 16px;
}

.tip-message-card h4 { font-size: 14px; font-weight: 700; color: #92400E; margin: 0 0 8px 0; }
.tip-message-card p { font-size: 15px; color: #78350F; margin: 0; font-style: italic; line-height: 1.5; }

.route-summary {
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.route-point { display: flex; gap: 12px; align-items: flex-start; }
.route-icon { font-size: 20px; flex-shrink: 0; }
.route-info { flex: 1; min-width: 0; }
.route-label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; }
.route-info p { font-size: 14px; color: #111827; margin: 4px 0 0 0; line-height: 1.4; }

.route-line {
  width: 2px;
  height: 24px;
  background: #E5E7EB;
  margin: 8px 0 8px 9px;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #E5E7EB;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

.btn-secondary {
  flex: 1;
  padding: 16px;
  background: #fff;
  color: #111827;
  border: 2px solid #E5E7EB;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 56px;
}

.btn-primary {
  flex: 1;
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  min-height: 56px;
}
</style>
