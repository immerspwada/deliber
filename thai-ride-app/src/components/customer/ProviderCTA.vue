<script setup lang="ts">
/**
 * ProviderCTA - Call to Action สมัครเป็นคนขับ
 * MUNEEF Style: สีเขียว #00A86B
 * Flow: กดแล้วไปหน้า /provider/onboarding
 */
import { useRouter } from 'vue-router'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

const router = useRouter()
const { vibrate } = useHapticFeedback()

const handleClick = () => {
  vibrate('medium')
  // Navigate to provider onboarding page
  router.push('/provider/onboarding')
}
</script>

<template>
  <button class="provider-cta" @click="handleClick">
    <!-- Illustration -->
    <div class="cta-illustration">
      <svg viewBox="0 0 80 60" fill="none">
        <!-- Steering Wheel -->
        <circle cx="40" cy="30" r="20" stroke="#00A86B" stroke-width="3" fill="none"/>
        <circle cx="40" cy="30" r="8" stroke="#00A86B" stroke-width="2" fill="none"/>
        <path d="M40 10v12M40 38v12M20 30h12M48 30h12" stroke="#00A86B" stroke-width="2"/>
        <!-- Money -->
        <circle cx="65" cy="15" r="10" fill="#FFD700"/>
        <text x="65" y="19" text-anchor="middle" font-size="10" font-weight="bold" fill="#1A1A1A">฿</text>
        <!-- Stars -->
        <path d="M15 20l2 4 4.5.5-3.25 3 .75 4.5L15 30l-4 2 .75-4.5-3.25-3L13 24l2-4z" fill="#FFD700"/>
      </svg>
    </div>
    
    <!-- Content -->
    <div class="cta-content">
      <span class="cta-title">สมัครเป็นคนขับ</span>
      <span class="cta-subtitle">หารายได้กับ GOBEAR</span>
    </div>
    
    <!-- Arrow -->
    <div class="cta-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.provider-cta {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  background: linear-gradient(135deg, #E8F5EF 0%, #D0EBE0 100%);
  border: 2px solid #00A86B;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.provider-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.2);
}

.provider-cta:active {
  transform: scale(0.98);
}

.cta-illustration {
  width: 60px;
  height: 50px;
  flex-shrink: 0;
}

.cta-illustration svg {
  width: 100%;
  height: 100%;
}

.cta-content {
  flex: 1;
}

.cta-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #00A86B;
  margin-bottom: 2px;
}

.cta-subtitle {
  display: block;
  font-size: 13px;
  color: #008F5B;
}

.cta-arrow {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 12px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.provider-cta:hover .cta-arrow {
  transform: translateX(4px);
}

.cta-arrow svg {
  width: 20px;
  height: 20px;
  color: #FFFFFF;
}
</style>
