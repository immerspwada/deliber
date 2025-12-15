<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // Try Supabase auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (!authError && authData.user) {
      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      
      if ((userData as any)?.role === 'admin') {
        localStorage.setItem('admin_token', authData.session?.access_token || 'admin_token')
        localStorage.setItem('admin_user', JSON.stringify(userData))
        router.push('/admin')
        loading.value = false
        return
      } else {
        error.value = 'บัญชีนี้ไม่มีสิทธิ์เข้าถึง Admin'
        await supabase.auth.signOut()
        loading.value = false
        return
      }
    }
  } catch (e) {
    console.warn('Supabase auth failed, trying demo mode')
  }
  
  // Fallback: Demo admin credentials
  if (email.value === 'admin@thairide.app' && password.value === 'admin123') {
    // Check if admin exists in database
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .eq('role', 'admin')
      .single()
    
    if (adminUser) {
      localStorage.setItem('admin_token', 'demo_admin_token')
      localStorage.setItem('admin_user', JSON.stringify(adminUser))
    } else {
      localStorage.setItem('admin_token', 'demo_admin_token')
      localStorage.setItem('admin_user', JSON.stringify({
        id: 'admin-001',
        email: 'admin@thairide.app',
        name: 'Admin User',
        role: 'admin'
      }))
    }
    router.push('/admin')
  } else if (email.value === 'admin@demo.com' && password.value === 'password123') {
    // Alternative demo credentials matching database
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single()
    
    if (adminUser) {
      localStorage.setItem('admin_token', 'demo_admin_token')
      localStorage.setItem('admin_user', JSON.stringify(adminUser))
      router.push('/admin')
    } else {
      error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    }
  } else {
    error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  
  loading.value = false
}

const goToUserApp = () => router.push('/login')
</script>

<template>
  <div class="admin-login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1>Thai Ride Admin</h1>
        <p class="subtitle">ระบบจัดการสำหรับผู้ดูแล</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>อีเมล</label>
          <input v-model="email" type="email" placeholder="admin@thairide.app" autocomplete="email"/>
        </div>

        <div class="form-group">
          <label>รหัสผ่าน</label>
          <input v-model="password" type="password" placeholder="รหัสผ่าน" autocomplete="current-password"/>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>
      </form>

      <div class="demo-info">
        <p>Demo Credentials:</p>
        <code>admin@thairide.app / admin123</code>
      </div>

      <button class="link-btn" @click="goToUserApp">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        กลับไปหน้าผู้ใช้งาน
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  color: #fff;
}

.logo {
  width: 80px;
  height: 80px;
  background: #fff;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #000;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #000;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
}

.error-text {
  color: #e11900;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-login:hover:not(:disabled) { background: #333; }
.btn-login:active:not(:disabled) { transform: scale(0.98); }
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.demo-info {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 24px;
}

.demo-info p {
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  margin-bottom: 8px;
}

.demo-info code {
  color: #fff;
  font-size: 14px;
  font-family: monospace;
}

.link-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.link-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
}
</style>
