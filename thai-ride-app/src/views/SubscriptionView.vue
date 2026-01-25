<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'

const router = useRouter()
const {
  subscriptionPlans,
  userSubscription,
  subscriptionStatus,
  loading,
  fetchSubscriptionPlans,
  getUserSubscription,
  checkSubscriptionStatus,
  subscribeToPlan,
  cancelSubscription
} = useAdvancedFeatures()

const selectedCycle = ref<'monthly' | 'yearly'>('monthly')
const showCancelModal = ref(false)
const cancelReason = ref('')
const processingPlanId = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([
    fetchSubscriptionPlans(),
    getUserSubscription(),
    checkSubscriptionStatus()
  ])
})

const filteredPlans = computed(() => {
  return subscriptionPlans.value.filter(p => p.billing_cycle === selectedCycle.value)
})

const handleSubscribe = async (planId: string) => {
  processingPlanId.value = planId
  const result = await subscribeToPlan(planId)
  processingPlanId.value = null
  if (result) {
    // Show success
  }
}

const handleCancel = async () => {
  const success = await cancelSubscription(cancelReason.value)
  if (success) {
    showCancelModal.value = false
    cancelReason.value = ''
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH').format(price)
}

const getPlanIcon = (planType: string | null) => {
  switch (planType) {
    case 'basic': return 'star'
    case 'plus': return 'zap'
    case 'premium': return 'crown'
    case 'unlimited': return 'infinity'
    default: return 'star'
  }
}
</script>

<template>
  <div class="subscription-page">
    <!-- Header -->
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>แพ็คเกจสมาชิก</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Current Subscription -->
    <div v-if="userSubscription" class="current-subscription">
      <div class="subscription-badge">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>สมาชิกปัจจุบัน</span>
      </div>
      <div class="current-plan-info">
        <h3>{{ userSubscription.plan?.name_th }}</h3>
        <p>หมดอายุ: {{ new Date(userSubscription.current_period_end || '').toLocaleDateString('th-TH') }}</p>
      </div>
      <div class="subscription-benefits">
        <div class="benefit-item">
          <span class="benefit-value">{{ subscriptionStatus?.discount_percentage }}%</span>
          <span class="benefit-label">ส่วนลด</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-value">{{ userSubscription.free_cancellations_remaining }}</span>
          <span class="benefit-label">ยกเลิกฟรี</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-value">{{ subscriptionStatus?.free_wait_time_minutes }}</span>
          <span class="benefit-label">นาทีรอฟรี</span>
        </div>
      </div>
      <button class="cancel-sub-btn" @click="showCancelModal = true">
        ยกเลิกแพ็คเกจ
      </button>
    </div>

    <!-- Cycle Toggle -->
    <div class="cycle-toggle">
      <button 
        :class="['toggle-btn', { active: selectedCycle === 'monthly' }]"
        @click="selectedCycle = 'monthly'"
      >
        รายเดือน
      </button>
      <button 
        :class="['toggle-btn', { active: selectedCycle === 'yearly' }]"
        @click="selectedCycle = 'yearly'"
      >
        รายปี
        <span class="save-badge">ประหยัด 20%</span>
      </button>
    </div>

    <!-- Plans List -->
    <div class="plans-list">
      <div 
        v-for="plan in filteredPlans" 
        :key="plan.id"
        :class="['plan-card', plan.plan_type || 'basic', { current: userSubscription?.plan_id === plan.id }]"
      >
        <!-- Popular badge -->
        <div v-if="plan.plan_type === 'premium'" class="popular-badge">
          ยอดนิยม
        </div>

        <div class="plan-header">
          <div class="plan-icon">
            <svg v-if="getPlanIcon(plan.plan_type || 'basic') === 'star'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <svg v-else-if="getPlanIcon(plan.plan_type || 'basic') === 'zap'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <svg v-else-if="getPlanIcon(plan.plan_type || 'basic') === 'crown'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l3.5 7L12 6l3.5 4L19 3M5 21h14M5 17h14M5 13h14"/>
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
          </div>
          <h3 class="plan-name">{{ plan.name_th }}</h3>
          <p class="plan-desc">{{ plan.description_th }}</p>
        </div>

        <div class="plan-price">
          <span v-if="plan.original_price" class="original-price">฿{{ formatPrice(plan.original_price) }}</span>
          <span class="current-price">฿{{ formatPrice(plan.price) }}</span>
          <span class="price-period">/{{ plan.billing_cycle === 'monthly' ? 'เดือน' : 'ปี' }}</span>
        </div>

        <ul class="plan-features">
          <li v-for="(feature, idx) in plan.features" :key="idx">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>

        <button 
          v-if="userSubscription?.plan_id !== plan.id"
          :disabled="loading || processingPlanId === plan.id"
          :class="['subscribe-btn', plan.plan_type || 'basic']"
          @click="handleSubscribe(plan.id)"
        >
          <span v-if="processingPlanId === plan.id">กำลังดำเนินการ...</span>
          <span v-else>{{ userSubscription ? 'เปลี่ยนแพ็คเกจ' : 'สมัครเลย' }}</span>
        </button>
        <div v-else class="current-plan-badge">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          แพ็คเกจปัจจุบัน
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click="showCancelModal = false">
      <div class="modal-content" @click.stop>
        <h3>ยกเลิกแพ็คเกจ</h3>
        <p>คุณแน่ใจหรือไม่ที่จะยกเลิกแพ็คเกจ? สิทธิประโยชน์จะหมดเมื่อสิ้นสุดรอบบิล</p>
        <textarea 
          v-model="cancelReason" 
          placeholder="เหตุผลในการยกเลิก (ไม่บังคับ)"
          class="cancel-reason"
        ></textarea>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showCancelModal = false">ยกเลิก</button>
          <button class="btn-danger" @click="handleCancel">ยืนยันยกเลิก</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subscription-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn, .header-spacer {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.current-subscription {
  background: linear-gradient(135deg, #000 0%, #333 100%);
  color: #fff;
  margin: 16px;
  padding: 20px;
  border-radius: 16px;
}

.subscription-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  margin-bottom: 12px;
}

.subscription-badge svg {
  width: 16px;
  height: 16px;
}

.current-plan-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.current-plan-info p {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
}

.subscription-benefits {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.benefit-item {
  flex: 1;
  text-align: center;
}

.benefit-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.benefit-label {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

.cancel-sub-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.cycle-toggle {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #fff;
}

.toggle-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

.toggle-btn.active {
  border-color: #000;
  background: #000;
  color: #fff;
}

.save-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #22c55e;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.plans-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  border: 2px solid transparent;
}

.plan-card.premium {
  border-color: #000;
}

.plan-card.current {
  border-color: #22c55e;
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.plan-header {
  text-align: center;
  margin-bottom: 20px;
}

.plan-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-icon svg {
  width: 24px;
  height: 24px;
}

.plan-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.plan-desc {
  font-size: 14px;
  color: #6b6b6b;
}

.plan-price {
  text-align: center;
  margin-bottom: 20px;
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
  margin-right: 8px;
}

.current-price {
  font-size: 32px;
  font-weight: 700;
}

.price-period {
  font-size: 14px;
  color: #6b6b6b;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.plan-features li:last-child {
  border-bottom: none;
}

.plan-features svg {
  width: 16px;
  height: 16px;
  color: #22c55e;
  flex-shrink: 0;
}

.subscribe-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: #f6f6f6;
  color: #000;
}

.subscribe-btn.premium,
.subscribe-btn.unlimited {
  background: #000;
  color: #fff;
}

.subscribe-btn:disabled {
  opacity: 0.5;
}

.current-plan-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #f0fdf4;
  color: #22c55e;
  border-radius: 8px;
  font-weight: 500;
}

.current-plan-badge svg {
  width: 20px;
  height: 20px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-content p {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 16px;
}

.cancel-reason {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  height: 80px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 14px;
}
</style>
