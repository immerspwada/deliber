<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Get session from URL hash (OAuth callback)
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      status.value = 'error'
      errorMessage.value = error.message
      return
    }
    
    if (data.session) {
      // Check if user profile exists, if not create one
      const { error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      
      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create profile from OAuth data
        const user = data.session.user
        const metadata = user.user_metadata
        
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: metadata?.full_name || metadata?.name || user.email?.split('@')[0] || 'User',
          phone: metadata?.phone || '',
          role: 'customer',
          is_active: true
        } as any)
      }
      
      // Re-initialize auth store
      await authStore.initialize()
      
      status.value = 'success'
      
      // Redirect based on role
      setTimeout(() => {
        const userRole = authStore.user?.role
        if (userRole === 'driver' || userRole === 'rider') {
          router.replace('/provider')
        } else if (userRole === 'admin') {
          router.replace('/admin')
        } else {
          router.replace('/')
        }
      }, 1000)
    } else {
      status.value = 'error'
      errorMessage.value = 'ไม่พบ session'
    }
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err.message || 'เกิดข้อผิดพลาด'
  }
})

const goToLogin = () => router.push('/login')
</script>

<template>
  <div class="callback-page">
    <div class="callback-card">
      <!-- Loading -->
      <div v-if="status === 'loading'" class="status-content">
        <div class="spinner-large"></div>
        <p class="status-text">กำลังเข้าสู่ระบบ...</p>
      </div>
      
      <!-- Success -->
      <div v-else-if="status === 'success'" class="status-content">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>
        <p class="status-text success">เข้าสู่ระบบสำเร็จ!</p>
        <p class="status-hint">กำลังนำคุณไปยังหน้าหลัก...</p>
      </div>
      
      <!-- Error -->
      <div v-else class="status-content">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p class="status-text error">เกิดข้อผิดพลาด</p>
        <p class="status-hint">{{ errorMessage }}</p>
        <button @click="goToLogin" class="btn-primary">กลับไปหน้าเข้าสู่ระบบ</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F5EF 0%, #FFFFFF 50%, #F0FDF4 100%);
  padding: 16px;
}

.callback-card {
  width: 100%;
  max-width: 320px;
  background: #FFFFFF;
  border-radius: 24px;
  padding: 40px 24px;
  box-shadow: 0 8px 32px rgba(0, 168, 107, 0.12);
  text-align: center;
}

.status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner-large {
  width: 48px;
  height: 48px;
  border: 4px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-icon,
.error-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.error-icon {
  background: #FFEBEE;
  color: #E53935;
}

.success-icon svg,
.error-icon svg {
  width: 32px;
  height: 32px;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.status-text.success {
  color: #00A86B;
}

.status-text.error {
  color: #E53935;
}

.status-hint {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.btn-primary {
  margin-top: 8px;
  padding: 12px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #008F5B;
}
</style>
