<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">GOBEAR Admin</h1>
        <p class="text-gray-600 mt-2">เข้าสู่ระบบจัดการ</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            อีเมล
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            placeholder="admin@gobear.app"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            รหัสผ่าน
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            กำลังเข้าสู่ระบบ...
          </span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
      </form>

      <!-- Quick Fill Button -->
      <div class="mt-4">
        <button
          type="button"
          @click="fillAdminCredentials"
          class="w-full py-2.5 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          กรอกข้อมูลอัตโนมัติ
        </button>
      </div>

      <div class="mt-6 text-center">
        <router-link 
          to="/login" 
          class="text-sm text-gray-600 hover:text-black transition-colors"
        >
          ← กลับไปหน้าเข้าสู่ระบบผู้ใช้
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '../../composables/useAdminAuth'

const router = useRouter()
const adminAuth = useAdminAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// Admin credentials for quick fill
const ADMIN_CREDENTIALS = {
  email: 'admin@gobear.app',
  password: 'Admin@2026!'
}

const fillAdminCredentials = () => {
  email.value = ADMIN_CREDENTIALS.email
  password.value = ADMIN_CREDENTIALS.password
}

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const success = await adminAuth.login(email.value, password.value)
    
    if (success) {
      router.push('/admin')
    } else {
      error.value = adminAuth.error.value || 'เข้าสู่ระบบไม่สำเร็จ'
    }
  } catch (e) {
    error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}
</script>
