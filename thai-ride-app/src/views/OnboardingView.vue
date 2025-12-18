<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentSlide = ref(0)

const slides = [
  {
    title: 'ยินดีต้อนรับสู่ GOBEAR',
    description: 'แอปเรียกรถ ส่งของ และซื้อของครบวงจร ให้บริการทั่วประเทศไทย',
    icon: 'welcome'
  },
  {
    title: 'เรียกรถได้ทุกที่',
    description: 'ไม่ว่าจะไปไหน เรามีคนขับพร้อมรับส่งคุณอย่างปลอดภัย',
    icon: 'ride'
  },
  {
    title: 'ส่งของรวดเร็ว',
    description: 'ส่งพัสดุถึงมือผู้รับภายในวันเดียว ติดตามสถานะได้ตลอด',
    icon: 'delivery'
  },
  {
    title: 'ซื้อของให้คุณ',
    description: 'ไม่ต้องออกจากบ้าน มีคนซื้อของและส่งถึงที่',
    icon: 'shopping'
  }
]

const nextSlide = () => {
  if (currentSlide.value < slides.length - 1) {
    currentSlide.value++
  } else {
    completeOnboarding()
  }
}

const skipOnboarding = () => {
  completeOnboarding()
}

const completeOnboarding = () => {
  localStorage.setItem('onboarding_completed', 'true')
  router.push('/login')
}

const goToSlide = (index: number) => {
  currentSlide.value = index
}
</script>

<template>
  <div class="onboarding-page">
    <button @click="skipOnboarding" class="skip-btn">ข้าม</button>

    <!-- Slides -->
    <div class="slides-container">
      <div class="slide" v-for="(slide, index) in slides" :key="index" v-show="currentSlide === index">
        <div class="slide-icon">
          <svg v-if="slide.icon === 'welcome'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          <svg v-else-if="slide.icon === 'ride'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
          </svg>
          <svg v-else-if="slide.icon === 'delivery'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <h1 class="slide-title">{{ slide.title }}</h1>
        <p class="slide-description">{{ slide.description }}</p>
      </div>
    </div>

    <!-- Dots -->
    <div class="dots">
      <button
        v-for="(_, index) in slides"
        :key="index"
        @click="goToSlide(index)"
        :class="['dot', { active: currentSlide === index }]"
      ></button>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button @click="nextSlide" class="btn-primary">
        {{ currentSlide === slides.length - 1 ? 'เริ่มต้นใช้งาน' : 'ถัดไป' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  padding: 24px;
}

.skip-btn {
  align-self: flex-end;
  padding: 8px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.slides-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
  max-width: 320px;
}

.slide-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: 50%;
  margin-bottom: 32px;
}

.slide-icon svg {
  width: 56px;
  height: 56px;
}

.slide-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.slide-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-border);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background-color: var(--color-primary);
}

.actions {
  padding-bottom: env(safe-area-inset-bottom);
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
