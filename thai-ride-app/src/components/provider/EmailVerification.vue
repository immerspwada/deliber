<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

interface Props {
  email: string
  providerId: string
}

const props = defineProps<Props>()
const router = useRouter()

const verificationCode = ref('')
const isVerifying = ref(false)
const error = ref<string | null>(null)
const resendCooldown = ref(0)
const canResend = computed(() => resendCooldown.value === 0)

// Auto-focus first input on mount
onMounted(() => {
  startCooldown()
})

// Start 60 second cooldown for resend
function startCooldown(): void {
  resendCooldown.value = 60
  const interval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(interval)
    }
  }, 1000)
}

async function verifyCode(): Promise<void> {
  if (verificationCode.value.length !== 6) {
    error.value = 'กรุณากรอกรหัสยืนยัน 6 หลัก'
    return
  }

  isVerifying.value = true
  error.value = null

  try {
    // Call Edge Function to verify code
    const { data, error: verifyError } = await supabase.functions.invoke(
      'provider-registration',
      {
        body: {
          action: 'verify_email',
          provider_id: props.providerId,
          verification_code: verificationCode.value,
        },
      }
    )

    if (verifyError) throw verifyError

    if (data.success) {
      // Redirect to document upload
      router.push({
        name: 'provider-onboarding',
        params: { providerId: props.providerId },
        query: { step: 'documents' },
      })
    } else {
      error.value = data.message || 'รหัสยืนยันไม่ถูกต้อง'
    }
  } catch (err: any) {
    console.error('Email verification error:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการยืนยันอีเมล'
  } finally {
    isVerifying.value = false
  }
}

async function resendCode(): Promise<void> {
  if (!canResend.value) return

  error.value = null

  try {
    const { data, error: resendError } = await supabase.functions.invoke(
      'provider-registration',
      {
        body: {
          action: 'resend_verification',
          provider_id: props.providerId,
          email: props.email,
        },
      }
    )

    if (resendError) throw resendError

    if (data.success) {
      startCooldown()
      // Show success message
      error.value = null
    }
  } catch (err: any) {
    console.error('Resend code error:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการส่งรหัสใหม่'
  }
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  // Only allow numbers
  target.value = target.value.replace(/[^0-9]/g, '')
  verificationCode.value = target.value
}
</script>

<template>
  <div class="max-w-md mx-auto p-6">
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">ยืนยันอีเมล</h2>
      <p class="text-gray-600">
        เราได้ส่งรหัสยืนยัน 6 หลักไปที่<br />
        <span class="font-medium text-gray-900">{{ email }}</span>
      </p>
    </div>

    <form @submit.prevent="verifyCode" class="space-y-6">
      <!-- Verification Code Input -->
      <div>
        <label for="code" class="block text-sm font-medium text-gray-700 mb-2">
          รหัสยืนยัน
        </label>
        <input
          id="code"
          v-model="verificationCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          class="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isVerifying"
          @input="handleInput"
          autofocus
        />
      </div>

      <!-- Error Message -->
      <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <!-- Verify Button -->
      <button
        type="submit"
        :disabled="isVerifying || verificationCode.length !== 6"
        class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isVerifying">กำลังยืนยัน...</span>
        <span v-else>ยืนยันอีเมล</span>
      </button>

      <!-- Resend Code -->
      <div class="text-center">
        <p class="text-sm text-gray-600 mb-2">ไม่ได้รับรหัส?</p>
        <button
          type="button"
          :disabled="!canResend"
          @click="resendCode"
          class="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <span v-if="canResend">ส่งรหัสใหม่</span>
          <span v-else>ส่งรหัสใหม่ได้ใน {{ resendCooldown }} วินาที</span>
        </button>
      </div>
    </form>

    <!-- Help Text -->
    <div class="mt-8 p-4 bg-gray-50 rounded-lg">
      <p class="text-xs text-gray-600">
        💡 <strong>เคล็ดลับ:</strong> ตรวจสอบโฟลเดอร์ Spam หรือ Junk Mail
        หากไม่พบอีเมลในกล่องจดหมาย
      </p>
    </div>
  </div>
</template>
