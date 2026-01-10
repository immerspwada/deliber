<script setup lang="ts">
/**
 * ProviderOnboardingView - หน้าแนะนำก่อนสมัครเป็นคนขับ
 * MUNEEF Style: สีเขียว #00A86B
 * Flow: Customer กด "สมัครเป็นคนขับ" → หน้านี้ → ProviderRegisterView
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(true)
const providerStatus = ref<'none' | 'pending' | 'approved' | 'rejected'>('none')
const currentSlide = ref(0)

// Benefits slides
const slides = [
  {
    icon: 'money',
    title: 'รายได้ดี',
    description: 'รับรายได้ทันทีหลังจบงาน ถอนเงินได้ทุกวัน',
    highlight: 'เฉลี่ย ฿15,000-30,000/เดือน'
  },
  {
    icon: 'clock',
    title: 'เวลายืดหยุ่น',
    description: 'เลือกเวลาทำงานได้เอง ไม่มีขั้นต่ำ',
    highlight: 'ทำงานเมื่อไหร่ก็ได้'
  },
  {
    icon: 'shield',
    title: 'ประกันภัย',
    description: 'ประกันอุบัติเหตุฟรีตลอดเวลาทำงาน',
    highlight: 'คุ้มครองสูงสุด ฿500,000'
  },
  {
    icon: 'gift',
    title: 'โบนัสพิเศษ',
    description: 'รับโบนัสเพิ่มเมื่อทำครบเป้า',
    highlight: 'โบนัสสูงสุด ฿5,000/สัปดาห์'
  }
]

// Requirements
const requirements = [
  { icon: 'id', text: 'บัตรประชาชนไทย' },
  { icon: 'license', text: 'ใบขับขี่ที่ยังไม่หมดอายุ' },
  { icon: 'vehicle', text: 'รถยนต์หรือมอเตอร์ไซค์' },
  { icon: 'phone', text: 'สมาร์ทโฟนที่รองรับ GPS' }
]

// Check existing provider status
const checkProviderStatus = async () => {
  isLoading.value = true
  try {
    if (!authStore.user?.id) {
      router.push('/login')
      return
    }

    const userId = authStore.user.id
    const userEmail = authStore.user.email
    console.log('[ProviderOnboarding] Checking status for user:', userId, 'email:', userEmail)

    // CRITICAL FIX: Use providers_v2 table (same as router guard)
    const { data, error } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', userId)

    console.log('[ProviderOnboarding] Query providers_v2 result:', { 
      data, 
      dataLength: data?.length,
      error: error?.message, 
      errorCode: error?.code 
    })

    if (error) {
      console.error('[ProviderOnboarding] Query error:', error)
    }

    // ตรวจสอบว่ามี data หรือไม่ (data เป็น array)
    const providerRecord = data && data.length > 0 ? data[0] : null

    if (providerRecord) {
      console.log('[ProviderOnboarding] Found provider:', {
        id: providerRecord.id,
        status: providerRecord.status,
        provider_type: providerRecord.provider_type,
        user_id: providerRecord.user_id
      })
      
      if (providerRecord.status === 'approved' || providerRecord.status === 'active') {
        // Already approved, go to dashboard
        console.log('[ProviderOnboarding] Approved - redirecting to dashboard')
        router.replace('/provider')
        return
      } else if (providerRecord.status === 'pending') {
        console.log('[ProviderOnboarding] Pending - showing waiting screen')
        providerStatus.value = 'pending'
      } else if (providerRecord.status === 'rejected') {
        console.log('[ProviderOnboarding] Rejected - showing retry option')
        providerStatus.value = 'rejected'
      } else {
        // Unknown status, treat as pending
        console.log('[ProviderOnboarding] Unknown status:', providerRecord.status, '- treating as pending')
        providerStatus.value = 'pending'
      }
    } else {
      // No provider record found - show onboarding
      console.log('[ProviderOnboarding] No provider record - showing onboarding intro')
      providerStatus.value = 'none'
    }
  } catch (e) {
    console.error('[ProviderOnboarding] Exception:', e)
    // No provider record found
    providerStatus.value = 'none'
  } finally {
    isLoading.value = false
  }
}

// Navigation - กลับหน้าหลัก
const goBack = () => {
  router.push('/customer')
}

const startRegistration = () => {
  router.push('/provider/register')
}

const nextSlide = () => {
  if (currentSlide.value < slides.length - 1) {
    currentSlide.value++
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

const goToSlide = (index: number) => {
  currentSlide.value = index
}

onMounted(() => {
  checkProviderStatus()
})
</script>

<template>
  <div class="onboarding-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="goBack" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-logo">
        <span class="logo-text">GOBEAR</span>
        <span class="logo-badge">Partner</span>
      </div>
      <div class="header-spacer"></div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังตรวจสอบ...</p>
    </div>

    <!-- Pending Status with Progress Tracker -->
    <div v-else-if="providerStatus === 'pending'" class="status-page">
      <!-- Progress Tracker -->
      <div class="progress-tracker">
        <div class="progress-step completed">
          <div class="step-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <span class="step-label">สมัคร</span>
        </div>
        <div class="progress-line completed"></div>
        <div class="progress-step active">
          <div class="step-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </div>
          <span class="step-label">ตรวจสอบ</span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step">
          <div class="step-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <span class="step-label">อนุมัติ</span>
        </div>
      </div>

      <div class="status-icon pending">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h2>รอการอนุมัติ</h2>
      <p>ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ<br/>ทีมงานจะติดต่อกลับภายใน 1-3 วันทำการ</p>
      
      <!-- Notification Info -->
      <div class="notification-info">
        <div class="notif-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <span>เราจะแจ้งเตือนคุณทันทีเมื่อมีการอัพเดท</span>
      </div>
      
      <div class="status-tips">
        <h4>ระหว่างรอ คุณสามารถ:</h4>
        <ul>
          <li>ตรวจสอบเอกสารให้ครบถ้วน</li>
          <li>เตรียมยานพาหนะให้พร้อม</li>
          <li>ศึกษาวิธีการใช้งานแอป</li>
        </ul>
      </div>
      <button type="button" @click="goBack" class="btn-secondary">กลับหน้าหลัก</button>
    </div>

    <!-- Rejected Status -->
    <div v-else-if="providerStatus === 'rejected'" class="status-page">
      <div class="status-icon rejected">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <h2>ใบสมัครไม่ผ่าน</h2>
      <p>ขออภัย ใบสมัครของคุณไม่ผ่านการอนุมัติ<br/>กรุณาตรวจสอบเอกสารและลองสมัครใหม่</p>
      <button type="button" @click="startRegistration" class="btn-primary">สมัครใหม่</button>
      <button type="button" @click="goBack" class="btn-secondary">กลับหน้าหลัก</button>
    </div>

    <!-- Onboarding Content -->
    <div v-else class="onboarding-content">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-illustration">
          <svg viewBox="0 0 200 150" fill="none">
            <!-- Car -->
            <rect x="40" y="70" width="80" height="40" rx="10" fill="#00A86B"/>
            <rect x="55" y="55" width="50" height="25" rx="8" fill="#00A86B"/>
            <circle cx="60" cy="115" r="12" fill="#1A1A1A"/>
            <circle cx="100" cy="115" r="12" fill="#1A1A1A"/>
            <circle cx="60" cy="115" r="6" fill="#666"/>
            <circle cx="100" cy="115" r="6" fill="#666"/>
            <!-- Money -->
            <circle cx="150" cy="50" r="25" fill="#FFD700"/>
            <text x="150" y="58" text-anchor="middle" font-size="24" font-weight="bold" fill="#1A1A1A">฿</text>
            <!-- Stars -->
            <path d="M30 40l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" fill="#FFD700"/>
            <path d="M170 100l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1 2-4z" fill="#FFD700"/>
          </svg>
        </div>
        <h1 class="hero-title">หารายได้กับ GOBEAR</h1>
        <p class="hero-subtitle">เป็นคนขับ รับงานเมื่อไหร่ก็ได้ รายได้ดี</p>
      </div>

      <!-- Benefits Slider -->
      <div class="benefits-slider">
        <div class="slider-container">
          <div 
            class="slides-wrapper"
            :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
          >
            <div v-for="(slide, index) in slides" :key="index" class="slide">
              <div class="slide-icon" :class="slide.icon">
                <svg v-if="slide.icon === 'money'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M9 9h6M9 15h6"/>
                </svg>
                <svg v-else-if="slide.icon === 'clock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <svg v-else-if="slide.icon === 'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <svg v-else-if="slide.icon === 'gift'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="8" width="18" height="14" rx="2"/>
                  <path d="M12 8V22M3 12h18"/>
                  <path d="M12 8c-2-2-4-3-4-5a2 2 0 114 2M12 8c2-2 4-3 4-5a2 2 0 10-4 2"/>
                </svg>
              </div>
              <h3 class="slide-title">{{ slide.title }}</h3>
              <p class="slide-desc">{{ slide.description }}</p>
              <span class="slide-highlight">{{ slide.highlight }}</span>
            </div>
          </div>
        </div>
        
        <!-- Slider Controls -->
        <div class="slider-controls">
          <button @click="prevSlide" :disabled="currentSlide === 0" class="slider-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="slider-dots">
            <button 
              v-for="(_, index) in slides" 
              :key="index"
              @click="goToSlide(index)"
              :class="['dot', { active: currentSlide === index }]"
            ></button>
          </div>
          <button @click="nextSlide" :disabled="currentSlide === slides.length - 1" class="slider-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Requirements Section -->
      <div class="requirements-section">
        <h3 class="section-title">สิ่งที่ต้องเตรียม</h3>
        <div class="requirements-grid">
          <div v-for="req in requirements" :key="req.text" class="requirement-item">
            <div class="req-icon">
              <svg v-if="req.icon === 'id'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <circle cx="8" cy="15" r="1"/>
                <path d="M14 15h4"/>
              </svg>
              <svg v-else-if="req.icon === 'license'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <path d="M7 15h2M14 15h4"/>
                <circle cx="9" cy="10" r="2"/>
              </svg>
              <svg v-else-if="req.icon === 'vehicle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <svg v-else-if="req.icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="12" y1="18" x2="12" y2="18"/>
              </svg>
            </div>
            <span>{{ req.text }}</span>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <button @click="startRegistration" class="btn-primary btn-large">
          <span>เริ่มสมัครเลย</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <p class="cta-note">ใช้เวลาสมัครประมาณ 5 นาที</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5EF 0%, #FFFFFF 30%);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  color: #00A86B;
}

.logo-badge {
  padding: 4px 8px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 600;
  border-radius: 6px;
  text-transform: uppercase;
}

.header-spacer {
  width: 40px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 14px;
  color: #666666;
}

/* Status Pages */
.status-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
}

.status-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: 24px;
}

.status-icon svg {
  width: 40px;
  height: 40px;
}

.status-icon.pending {
  background: #FEF3C7;
  color: #F59E0B;
}

.status-icon.rejected {
  background: #FEE2E2;
  color: #E53935;
}

.status-page h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 12px;
}

.status-page p {
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.status-tips {
  width: 100%;
  max-width: 320px;
  padding: 20px;
  background: #F5F5F5;
  border-radius: 16px;
  text-align: left;
  margin-bottom: 24px;
}

.status-tips h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.status-tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.status-tips li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666666;
  padding: 6px 0;
}

.status-tips li::before {
  content: '✓';
  color: #00A86B;
  font-weight: bold;
}

/* Progress Tracker */
.progress-tracker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  margin-bottom: 32px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-step .step-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: 2px solid #E8E8E8;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.progress-step .step-icon svg {
  width: 24px;
  height: 24px;
  color: #999999;
}

.progress-step.completed .step-icon {
  background: #00A86B;
  border-color: #00A86B;
}

.progress-step.completed .step-icon svg {
  color: #FFFFFF;
}

.progress-step.active .step-icon {
  background: #FEF3C7;
  border-color: #F59E0B;
  animation: pulse 2s infinite;
}

.progress-step.active .step-icon svg {
  color: #F59E0B;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}

.progress-step .step-label {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
}

.progress-step.completed .step-label {
  color: #00A86B;
}

.progress-step.active .step-label {
  color: #F59E0B;
}

.progress-line {
  width: 40px;
  height: 3px;
  background: #E8E8E8;
  margin: 0 8px;
  margin-bottom: 28px;
  border-radius: 2px;
}

.progress-line.completed {
  background: #00A86B;
}

/* Notification Info */
.notification-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #E8F5EF;
  border-radius: 12px;
  margin-bottom: 20px;
}

.notification-info .notif-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 8px;
  flex-shrink: 0;
}

.notification-info .notif-icon svg {
  width: 18px;
  height: 18px;
  color: #FFFFFF;
}

.notification-info span {
  font-size: 13px;
  color: #008F5B;
  font-weight: 500;
}

/* Onboarding Content */
.onboarding-content {
  padding: 0 20px 40px;
}

/* Hero Section */
.hero-section {
  text-align: center;
  padding: 20px 0 32px;
}

.hero-illustration {
  width: 200px;
  height: 150px;
  margin: 0 auto 20px;
}

.hero-illustration svg {
  width: 100%;
  height: 100%;
}

.hero-title {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 16px;
  color: #666666;
}

/* Benefits Slider */
.benefits-slider {
  margin-bottom: 32px;
}

.slider-container {
  overflow: hidden;
  border-radius: 20px;
  background: #FFFFFF;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.slides-wrapper {
  display: flex;
  transition: transform 0.3s ease;
}

.slide {
  min-width: 100%;
  padding: 32px 24px;
  text-align: center;
}

.slide-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 20px;
  margin: 0 auto 16px;
}

.slide-icon svg {
  width: 32px;
  height: 32px;
  color: #00A86B;
}

.slide-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.slide-desc {
  font-size: 14px;
  color: #666666;
  margin-bottom: 12px;
}

.slide-highlight {
  display: inline-block;
  padding: 8px 16px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
}

.slider-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.slider-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.slider-btn svg {
  width: 20px;
  height: 20px;
  color: #1A1A1A;
}

.slider-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #E8E8E8;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  width: 24px;
  background: #00A86B;
  border-radius: 4px;
}

/* Requirements Section */
.requirements-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 16px;
}

.requirements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.req-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 10px;
  flex-shrink: 0;
}

.req-icon svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.requirement-item span {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

/* CTA Section */
.cta-section {
  text-align: center;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 18px 32px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 18px;
  font-weight: 700;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.3);
}

.btn-primary:hover {
  background: #008F5B;
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 16px 32px;
  background: #F5F5F5;
  color: #1A1A1A;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #E8E8E8;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.cta-note {
  font-size: 13px;
  color: #999999;
  margin-top: 12px;
}
</style>
