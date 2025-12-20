<template>
  <div class="provider-onboarding">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>กำลังตรวจสอบสถานะ...</p>
    </div>

    <!-- Case A: No Provider Profile (Start Application) -->
    <div v-else-if="!onboardingState.hasProviderProfile" class="onboarding-step start">
      <div class="icon">🚗</div>
      <h1>เริ่มต้นเป็นผู้ให้บริการ</h1>
      <p>สมัครเป็นผู้ให้บริการและเริ่มรับงานได้ทันที</p>
      
      <div class="benefits">
        <div class="benefit-item">
          <span class="icon">💰</span>
          <span>รายได้ดี</span>
        </div>
        <div class="benefit-item">
          <span class="icon">⏰</span>
          <span>เวลาทำงานยืดหยุ่น</span>
        </div>
        <div class="benefit-item">
          <span class="icon">📱</span>
          <span>ใช้งานง่าย</span>
        </div>
      </div>

      <button @click="handleStartOnboarding" class="btn-primary" :disabled="loading">
        เริ่มสมัคร
      </button>
    </div>

    <!-- Case B: Status = PENDING (Waiting for Approval) -->
    <div v-else-if="isWaitingApproval" class="onboarding-step pending">
      <div class="icon">⏳</div>
      <h1>รอการอนุมัติ</h1>
      <p>ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ</p>
      
      <div class="timeline">
        <div class="timeline-item completed">
          <div class="timeline-icon">✓</div>
          <div class="timeline-content">
            <h3>ส่งใบสมัคร</h3>
            <p>{{ formatDate(onboardingState.submittedAt) }}</p>
          </div>
        </div>
        <div class="timeline-item active">
          <div class="timeline-icon">⏳</div>
          <div class="timeline-content">
            <h3>กำลังตรวจสอบ</h3>
            <p>ใช้เวลาประมาณ 1-2 วันทำการ</p>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon">🎉</div>
          <div class="timeline-content">
            <h3>เริ่มรับงาน</h3>
            <p>รอการอนุมัติ</p>
          </div>
        </div>
      </div>

      <div class="info-box">
        <p>💡 เราจะแจ้งเตือนคุณทันทีเมื่อใบสมัครได้รับการอนุมัติ</p>
      </div>

      <button @click="goToCustomerHome" class="btn-secondary">
        กลับไปใช้บริการลูกค้า
      </button>
    </div>

    <!-- Case C: Status = REJECTED (Show Rejection Reason + Re-apply) -->
    <div v-else-if="isRejected" class="onboarding-step rejected">
      <div class="icon">❌</div>
      <h1>ใบสมัครต้องการปรับปรุง</h1>
      <p>ใบสมัครของคุณต้องการการแก้ไขเพิ่มเติม</p>
      
      <div class="rejection-box">
        <h3>เหตุผลที่ต้องแก้ไข:</h3>
        <p>{{ onboardingState.rejectionReason || 'ไม่ระบุเหตุผล' }}</p>
      </div>

      <div v-if="!onboardingState.canReapply" class="cooldown-box">
        <p>⏰ คุณสามารถสมัครใหม่ได้ในวันที่: {{ formatDate(onboardingState.canReapplyAt) }}</p>
      </div>

      <div class="action-buttons">
        <button 
          v-if="onboardingState.canReapply" 
          @click="handleReapply" 
          class="btn-primary"
          :disabled="loading"
        >
          แก้ไขและส่งใหม่
        </button>
        <button @click="goToCustomerHome" class="btn-secondary">
          กลับไปใช้บริการลูกค้า
        </button>
      </div>
    </div>

    <!-- Case D: Status = APPROVED (Should not reach here, but show success) -->
    <div v-else-if="isApproved" class="onboarding-step approved">
      <div class="icon">🎉</div>
      <h1>ยินดีด้วย!</h1>
      <p>บัญชีของคุณได้รับการอนุมัติแล้ว</p>
      
      <button @click="goToProviderDashboard" class="btn-primary">
        ไปที่แดชบอร์ดผู้ให้บริการ
      </button>
    </div>

    <!-- Case E: Status = SUSPENDED -->
    <div v-else-if="isSuspended" class="onboarding-step suspended">
      <div class="icon">⚠️</div>
      <h1>บัญชีถูกระงับชั่วคราว</h1>
      <p>บัญชีผู้ให้บริการของคุณถูกระงับชั่วคราว</p>
      
      <div class="info-box warning">
        <p>กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม</p>
      </div>

      <div class="action-buttons">
        <button @click="contactSupport" class="btn-primary">
          ติดต่อฝ่ายสนับสนุน
        </button>
        <button @click="goToCustomerHome" class="btn-secondary">
          กลับไปใช้บริการลูกค้า
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderOnboarding } from '@/composables/useProviderOnboarding'

const router = useRouter()
const {
  loading,
  error,
  onboardingState,
  getOnboardingStatus,
  startOnboarding,
  isWaitingApproval,
  isRejected,
  isApproved,
  isSuspended
} = useProviderOnboarding()

onMounted(async () => {
  await getOnboardingStatus()
})

const handleStartOnboarding = async () => {
  const providerId = await startOnboarding()
  if (providerId) {
    // Redirect to registration form
    router.push('/provider/register')
  }
}

const handleReapply = () => {
  // Redirect to registration form to edit and resubmit
  router.push('/provider/register')
}

const goToProviderDashboard = () => {
  router.push('/provider')
}

const goToCustomerHome = () => {
  router.push('/customer')
}

const contactSupport = () => {
  router.push('/customer/help')
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.provider-onboarding {
  min-height: 100vh;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.loading-container {
  text-align: center;
  color: white;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.onboarding-step {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.icon {
  font-size: 64px;
  margin-bottom: 24px;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 12px;
}

p {
  font-size: 16px;
  color: #666666;
  margin-bottom: 24px;
}

.benefits {
  display: flex;
  gap: 16px;
  margin: 32px 0;
}

.benefit-item {
  flex: 1;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.benefit-item .icon {
  font-size: 32px;
  margin: 0;
}

.benefit-item span:last-child {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
}

.btn-primary {
  background-color: #00A86B;
  color: white;
  border: none;
  border-radius: 14px;
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #008F5B;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 12px;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background-color: #E8E8E8;
}

.timeline {
  margin: 32px 0;
  text-align: left;
}

.timeline-item {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 19px;
  top: 40px;
  width: 2px;
  height: calc(100% + 8px);
  background: #E8E8E8;
}

.timeline-item.completed::after {
  background: #00A86B;
}

.timeline-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.timeline-item.completed .timeline-icon {
  background: #00A86B;
  color: white;
}

.timeline-item.active .timeline-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.timeline-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.timeline-content p {
  font-size: 14px;
  color: #999999;
  margin: 0;
}

.info-box {
  background: #E8F5EF;
  border-radius: 12px;
  padding: 16px;
  margin: 24px 0;
}

.info-box p {
  margin: 0;
  color: #00A86B;
  font-size: 14px;
}

.info-box.warning {
  background: #FFF3E0;
}

.info-box.warning p {
  color: #F5A623;
}

.rejection-box {
  background: #FFF3E0;
  border-left: 4px solid #F5A623;
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
  text-align: left;
}

.rejection-box h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12px;
}

.rejection-box p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.cooldown-box {
  background: #FFE5E5;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
}

.cooldown-box p {
  margin: 0;
  color: #E53935;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-message {
  background: #FFE5E5;
  color: #E53935;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
}

@media (max-width: 640px) {
  .onboarding-step {
    padding: 24px;
  }

  h1 {
    font-size: 24px;
  }

  .benefits {
    flex-direction: column;
  }
}
</style>
