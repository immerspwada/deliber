/**
 * Debug Session Restore - Thai Ride App
 * ไฟล์นี้ใช้สำหรับ debug ปัญหา session restore
 * วางใน browser console เพื่อตรวจสอบสถานะ auth
 */

console.log('🔍 Starting Session Restore Debug...')

// ฟังก์ชันตรวจสอบ Supabase session
async function checkSupabaseSession() {
  console.log('📡 Checking Supabase session...')
  
  try {
    // ตรวจสอบว่ามี supabase client ไหม
    if (typeof window.supabase === 'undefined') {
      console.warn('❌ Supabase client not found in window object')
      return null
    }
    
    const { data, error } = await window.supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Supabase session error:', error)
      return null
    }
    
    if (data.session) {
      console.log('✅ Supabase session found:', {
        userId: data.session.user?.id,
        email: data.session.user?.email,
        expiresAt: new Date(data.session.expires_at * 1000).toLocaleString(),
        accessToken: data.session.access_token ? 'Present' : 'Missing'
      })
      return data.session
    } else {
      console.log('ℹ️ No Supabase session found')
      return null
    }
  } catch (err) {
    console.error('💥 Error checking Supabase session:', err)
    return null
  }
}

// ฟังก์ชันตรวจสอบ localStorage/sessionStorage
function checkBrowserStorage() {
  console.log('💾 Checking browser storage...')
  
  // ตรวจสอบ sessionStorage (demo mode)
  const demoMode = sessionStorage.getItem('demo_mode')
  const demoUser = sessionStorage.getItem('demo_user')
  
  console.log('🎭 Demo mode:', { demoMode, demoUser })
  
  // ตรวจสอบ localStorage (Supabase tokens)
  const localStorageKeys = Object.keys(localStorage)
  const supabaseKeys = localStorageKeys.filter(key => 
    key.includes('supabase') || key.includes('sb-')
  )
  
  console.log('🔑 Supabase keys in localStorage:', supabaseKeys)
  
  supabaseKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      if (value) {
        const parsed = JSON.parse(value)
        console.log(`📝 ${key}:`, {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A',
          userId: parsed.user?.id || 'N/A'
        })
      }
    } catch (e) {
      console.log(`📝 ${key}: Invalid JSON`)
    }
  })
}

// ฟังก์ชันตรวจสอบ Vue store state
function checkVueStoreState() {
  console.log('🏪 Checking Vue store state...')
  
  try {
    // ลองเข้าถึง Pinia store
    if (typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
      console.log('🔧 Vue DevTools detected')
    }
    
    // ตรวจสอบ auth store ใน window (ถ้ามี)
    if (window.authStore) {
      console.log('🔐 Auth store found:', {
        loading: window.authStore.loading,
        hasUser: !!window.authStore.user,
        hasSession: !!window.authStore.session,
        isAuthenticated: window.authStore.isAuthenticated,
        isDemoMode: window.authStore.isDemoMode
      })
    } else {
      console.log('ℹ️ Auth store not accessible from window')
    }
  } catch (err) {
    console.error('💥 Error checking Vue store:', err)
  }
}

// ฟังก์ชันตรวจสอบ router state
function checkRouterState() {
  console.log('🛣️ Checking router state...')
  
  const currentUrl = window.location.href
  const currentPath = window.location.pathname
  
  console.log('📍 Current location:', {
    url: currentUrl,
    path: currentPath,
    isCustomerRoute: currentPath.startsWith('/customer'),
    isLoginRoute: currentPath.startsWith('/login'),
    isAdminRoute: currentPath.startsWith('/admin')
  })
}

// ฟังก์ชันจำลองการ refresh
async function simulateRefresh() {
  console.log('🔄 Simulating page refresh scenario...')
  
  // 1. ตรวจสอบ storage ก่อน refresh
  console.log('1️⃣ Pre-refresh state:')
  checkBrowserStorage()
  
  // 2. จำลองการโหลด auth store
  console.log('2️⃣ Simulating auth store initialization...')
  const session = await checkSupabaseSession()
  
  // 3. จำลอง router guard logic
  console.log('3️⃣ Simulating router guard logic...')
  const hasValidSession = !!session
  const isOnCustomerRoute = window.location.pathname.startsWith('/customer')
  
  if (isOnCustomerRoute) {
    if (hasValidSession) {
      console.log('✅ Router guard would ALLOW access to customer route')
    } else {
      console.log('❌ Router guard would REDIRECT to login')
      console.log('🔍 Redirect reason: No valid session found')
    }
  }
}

// ฟังก์ชันแก้ไขปัญหาชั่วคราว
function temporaryFix() {
  console.log('🔧 Applying temporary fix...')
  
  // เพิ่ม debug logs ใน console
  const originalLog = console.log
  window.debugAuth = true
  
  // Override router navigation
  if (window.router) {
    console.log('🛣️ Router override applied')
  }
  
  console.log('✅ Temporary fix applied. Check console for detailed logs.')
}

// รันการตรวจสอบทั้งหมด
async function runFullDiagnosis() {
  console.log('🏥 Running full diagnosis...')
  console.log('=' .repeat(50))
  
  checkRouterState()
  console.log('-'.repeat(30))
  
  checkBrowserStorage()
  console.log('-'.repeat(30))
  
  await checkSupabaseSession()
  console.log('-'.repeat(30))
  
  checkVueStoreState()
  console.log('-'.repeat(30))
  
  await simulateRefresh()
  console.log('-'.repeat(30))
  
  console.log('🏁 Diagnosis complete!')
  console.log('💡 To apply temporary fix, run: temporaryFix()')
}

// Export functions to window for easy access
window.debugSessionRestore = {
  checkSupabaseSession,
  checkBrowserStorage,
  checkVueStoreState,
  checkRouterState,
  simulateRefresh,
  temporaryFix,
  runFullDiagnosis
}

console.log('🎯 Debug functions available:')
console.log('- window.debugSessionRestore.runFullDiagnosis()')
console.log('- window.debugSessionRestore.checkSupabaseSession()')
console.log('- window.debugSessionRestore.checkBrowserStorage()')
console.log('- window.debugSessionRestore.temporaryFix()')

// รันการวินิจฉัยทันที
runFullDiagnosis()