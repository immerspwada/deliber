<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'

const router = useRouter()
const {
  insurancePlans,
  userInsurance,
  loading,
  fetchInsurancePlans,
  getUserInsurance,
  subscribeToInsurance
} = useAdvancedFeatures()

const selectedPlanId = ref<string | null>(null)
const showPlanDetail = ref(false)
const processingPlanId = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([
    fetchInsurancePlans(),
    getUserInsurance()
  ])
})

const handleSubscribe = async (planId: string) => {
  processingPlanId.value = planId
  await subscribeToInsurance(planId, 'per_ride')
  processingPlanId.value = null
}

const viewPlanDetail = (planId: string) => {
  selectedPlanId.value = planId
  showPlanDetail.value = true
}

const selectedPlan = () => {
  return insurancePlans.value.find(p => p.id === selectedPlanId.value)
}

const formatCoverage = (amount: number) => {
  return new Intl.NumberFormat('th-TH').format(amount)
}

// Removed unused functions getCoverageIcon and getCoverageLabel
</script>

<template>
  <div class="insurance-page">
    <!-- Header -->
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>ประกันการเดินทาง</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Current Insurance -->
    <div v-if="userInsurance" class="current-insurance">
      <div class="insurance-badge">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        <span>คุ้มครองอยู่</span>
      </div>
      <h3>{{ (userInsurance as any).plan?.name_th || 'แผนประกัน' }}</h3>
      <p class="coverage-amount">คุ้มครองสูงสุด ฿{{ formatCoverage((userInsurance as any).plan?.coverage_amount || 0) }}</p>
      <div class="insurance-validity">
        <span v-if="(userInsurance as any).subscription_type === 'per_ride'">คุ้มครองทุกเที่ยว</span>
        <span v-else>หมดอายุ: {{ new Date((userInsurance as any).valid_until || new Date()).toLocaleDateString('th-TH') }}</span>
      </div>
    </div>

    <!-- Hero Section -->
    <div v-else class="hero-section">
      <div class="hero-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>
      <h2>เดินทางอย่างอุ่นใจ</h2>
      <p>คุ้มครองทุกเที่ยวการเดินทางของคุณ</p>
    </div>

    <!-- Plans List -->
    <div class="plans-section">
      <h3 class="section-title">เลือกแผนประกัน</h3>
      
      <div class="plans-list">
        <div 
          v-for="plan in insurancePlans" 
          :key="plan.id"
          :class="['plan-card', plan.coverage_type, { current: userInsurance?.plan_id === plan.id }]"
        >
          <div class="plan-header">
            <div class="plan-type-badge">{{ plan.coverage_type }}</div>
            <h4>{{ plan.name_th }}</h4>
            <p class="plan-desc">{{ plan.description_th }}</p>
          </div>

          <div class="plan-coverage">
            <div class="coverage-main">
              <span class="coverage-label">คุ้มครองสูงสุด</span>
              <span class="coverage-value">฿{{ formatCoverage(plan.coverage_amount) }}</span>
            </div>
          </div>

          <div class="plan-price">
            <span class="price-value">฿{{ plan.price_per_ride }}</span>
            <span class="price-unit">/เที่ยว</span>
          </div>

          <button 
            class="view-detail-btn" 
            @click="viewPlanDetail(plan.id)"
          >
            ดูรายละเอียด
          </button>

          <button 
            v-if="userInsurance?.plan_id !== plan.id"
            :disabled="loading || processingPlanId === plan.id"
            :class="['subscribe-btn', plan.coverage_type]"
            @click="handleSubscribe(plan.id)"
          >
            <span v-if="processingPlanId === plan.id">กำลังดำเนินการ...</span>
            <span v-else>เลือกแผนนี้</span>
          </button>
          <div v-else class="current-badge">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            แผนปัจจุบัน
          </div>
        </div>
      </div>
    </div>

    <!-- Benefits Section -->
    <div class="benefits-section">
      <h3 class="section-title">ทำไมต้องมีประกัน?</h3>
      <div class="benefits-list">
        <div class="benefit-item">
          <div class="benefit-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div class="benefit-text">
            <h4>คุ้มครองทันที</h4>
            <p>เริ่มคุ้มครองทันทีที่เริ่มเดินทาง</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="benefit-text">
            <h4>เคลมง่าย</h4>
            <p>เคลมผ่านแอปได้ทันที</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </div>
          <div class="benefit-text">
            <h4>ช่วยเหลือ 24 ชม.</h4>
            <p>ทีมงานพร้อมช่วยเหลือตลอด 24 ชั่วโมง</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Plan Detail Modal -->
    <div v-if="showPlanDetail && selectedPlan()" class="modal-overlay" @click="showPlanDetail = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedPlan()?.name_th }}</h3>
          <button class="close-btn" @click="showPlanDetail = false">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <p class="plan-description">{{ selectedPlan()?.description_th }}</p>

          <div class="coverage-details">
            <h4>ความคุ้มครอง</h4>
            <div class="coverage-list">
              <div 
                v-for="(detail, idx) in (selectedPlan()?.coverage_details || [])" 
                :key="idx"
                class="coverage-item"
              >
                <div class="coverage-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div class="coverage-info">
                  <span class="coverage-type">{{ detail }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="plan-price-detail">
            <span>ราคา</span>
            <span class="price">฿{{ selectedPlan()?.price_per_ride }}/เที่ยว</span>
          </div>
        </div>

        <div class="modal-footer">
          <button 
            v-if="userInsurance?.plan_id !== selectedPlan()?.id"
            class="btn-primary"
            @click="handleSubscribe(selectedPlan()!.id); showPlanDetail = false"
          >
            เลือกแผนนี้
          </button>
          <button v-else class="btn-current" disabled>
            แผนปัจจุบันของคุณ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insurance-page {
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

.current-insurance {
  background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
  color: #fff;
  margin: 16px;
  padding: 20px;
  border-radius: 16px;
}

.insurance-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}

.insurance-badge svg {
  width: 16px;
  height: 16px;
}

.current-insurance h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.coverage-amount {
  font-size: 14px;
  opacity: 0.9;
}

.insurance-validity {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.3);
  font-size: 12px;
}

.hero-section {
  background: #fff;
  padding: 40px 24px;
  text-align: center;
}

.hero-icon {
  width: 80px;
  height: 80px;
  background: #f0fdf4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.hero-icon svg {
  width: 40px;
  height: 40px;
  color: #22c55e;
}

.hero-section h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-section p {
  font-size: 14px;
  color: #6b6b6b;
}

.plans-section {
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid transparent;
}

.plan-card.premium {
  border-color: #000;
}

.plan-card.comprehensive {
  border-color: #22c55e;
}

.plan-card.current {
  border-color: #22c55e;
}

.plan-header {
  margin-bottom: 16px;
}

.plan-type-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
}

.plan-card.premium .plan-type-badge {
  background: #000;
  color: #fff;
}

.plan-card.comprehensive .plan-type-badge {
  background: #22c55e;
  color: #fff;
}

.plan-header h4 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.plan-desc {
  font-size: 14px;
  color: #6b6b6b;
}

.plan-coverage {
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.coverage-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coverage-label {
  font-size: 14px;
  color: #6b6b6b;
}

.coverage-value {
  font-size: 18px;
  font-weight: 600;
}

.plan-price {
  text-align: center;
  margin-bottom: 16px;
}

.price-value {
  font-size: 28px;
  font-weight: 700;
}

.price-unit {
  font-size: 14px;
  color: #6b6b6b;
}

.view-detail-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  margin-bottom: 8px;
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
.subscribe-btn.comprehensive {
  background: #000;
  color: #fff;
}

.subscribe-btn:disabled {
  opacity: 0.5;
}

.current-badge {
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

.current-badge svg {
  width: 20px;
  height: 20px;
}

.benefits-section {
  padding: 16px;
  background: #fff;
  margin-top: 16px;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.benefit-item {
  display: flex;
  gap: 12px;
}

.benefit-icon {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.benefit-icon svg {
  width: 24px;
  height: 24px;
}

.benefit-text h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.benefit-text p {
  font-size: 12px;
  color: #6b6b6b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.plan-description {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 20px;
}

.coverage-details h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.coverage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.coverage-icon {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coverage-icon svg {
  width: 20px;
  height: 20px;
  color: #22c55e;
}

.coverage-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coverage-type {
  font-size: 14px;
}

.coverage-amount {
  font-size: 14px;
  font-weight: 600;
}

.plan-price-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 20px;
}

.plan-price-detail .price {
  font-size: 20px;
  font-weight: 700;
}

.modal-footer {
  padding-top: 16px;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.btn-current {
  width: 100%;
  padding: 14px;
  background: #f0fdf4;
  color: #22c55e;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}
</style>
