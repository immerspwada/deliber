<template>
  <div class="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
    <div class="w-full max-w-lg">
      <!-- Card -->
      <div 
        class="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100"
        :class="{ 'animate-fade-in': mounted }"
      >
        <!-- Icon & Title Section -->
        <div class="bg-gradient-to-r from-red-500 to-red-600 px-8 py-12 sm:px-10 sm:py-14 text-center">
          <!-- Icon -->
          <div class="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-lg">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <!-- Title -->
          <h1 class="text-3xl font-bold text-white mb-3">
            บัญชีถูกระงับการใช้งาน
          </h1>

          <!-- Subtitle -->
          <p class="text-red-100 text-base">
            บัญชีของคุณถูกระงับชั่วคราว
          </p>
        </div>

        <!-- Content -->
        <div class="px-8 py-10 sm:px-10 sm:py-12 space-y-8">
          <!-- Reason -->
          <div v-if="suspensionReason">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              เหตุผล
            </h2>
            <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <p class="text-gray-800 leading-relaxed text-base">
                {{ suspensionReason }}
              </p>
            </div>
          </div>

          <!-- Info -->
          <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
            <h3 class="font-semibold text-blue-900 mb-4 flex items-center text-base">
              <svg class="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ทำไมบัญชีถึงถูกระงับ?
            </h3>
            <ul class="space-y-3 text-sm text-gray-700">
              <li class="flex items-start">
                <span class="text-blue-500 mr-3 mt-0.5 text-lg">•</span>
                <span>การละเมิดเงื่อนไขการใช้งาน</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-3 mt-0.5 text-lg">•</span>
                <span>พฤติกรรมที่ไม่เหมาะสม</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-3 mt-0.5 text-lg">•</span>
                <span>การใช้งานที่ผิดปกติ</span>
              </li>
            </ul>
          </div>

          <!-- Actions -->
          <div class="space-y-3 pt-2">
            <!-- Contact Support -->
            <button
              @click="contactSupport"
              :disabled="loading"
              type="button"
              aria-label="ติดต่อฝ่ายสนับสนุน"
              class="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 active:from-primary-800 active:to-primary-900 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-h-[56px]"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ติดต่อฝ่ายสนับสนุน
            </button>

            <!-- Logout -->
            <button
              @click="handleLogout"
              :disabled="loading"
              type="button"
              aria-label="ออกจากระบบ"
              class="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:from-gray-800 active:to-gray-900 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-h-[56px]"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ออกจากระบบ
            </button>
          </div>

          <!-- Footer -->
          <div class="text-center space-y-2 pt-4">
            <p class="text-base text-gray-600 font-medium">
              หากคุณคิดว่านี่เป็นข้อผิดพลาด
            </p>
            <p class="text-sm text-gray-500">
              กรุณาติดต่อฝ่ายสนับสนุน
            </p>
          </div>
        </div>
      </div>

      <!-- Additional spacing at bottom -->
      <div class="h-8"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

const suspensionReason = ref<string>('')
const loading = ref(false)
const mounted = ref(false)

// Fetch suspension reason on mount
onMounted(async () => {
  // Trigger fade-in animation
  setTimeout(() => {
    mounted.value = true
  }, 100)

  try {
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      // Fetch suspension reason from database
      const { data, error } = await supabase
        .from('users')
        .select('suspended_reason')
        .eq('id', session.user.id)
        .single()
      
      if (!error && data) {
        suspensionReason.value = data.suspended_reason || 'ไม่ระบุเหตุผล'
      }
    }
  } catch (err) {
    console.error('Failed to fetch suspension reason:', err)
  }
})

// Contact support
const contactSupport = () => {
  // Open email client or redirect to support page
  window.location.href = 'mailto:support@gobear.app?subject=บัญชีถูกระงับ - ขอความช่วยเหลือ'
}

// Logout
const handleLogout = async () => {
  loading.value = true
  try {
    await authStore.logout()
    router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
</style>
