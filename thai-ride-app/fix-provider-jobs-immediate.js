/**
 * Immediate Fix for Provider Job System
 * Run this in browser console on provider page to debug
 */

// 1. Check if provider is properly subscribed
console.log('🔍 Debugging Provider Job System...')

// 2. Mock job notification for testing
function createMockJob() {
  const mockJob = {
    id: 'mock-' + Date.now(),
    tracking_id: 'MOCK-' + Date.now(),
    user_id: 'test-user',
    status: 'pending',
    estimated_fare: 120,
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    pickup_address: 'Bangkok Center (Mock)',
    destination_lat: 13.7466,
    destination_lng: 100.5392,
    destination_address: 'Siam Square (Mock)',
    created_at: new Date().toISOString(),
    type: 'ride',
    distance: 2.5
  }
  
  console.log('📱 Mock job created:', mockJob)
  
  // Try to trigger job notification manually
  if (window.Vue && window.Vue.config.globalProperties) {
    const app = window.Vue.config.globalProperties
    if (app.$emit) {
      app.$emit('new-job', mockJob)
    }
  }
  
  return mockJob
}

// 3. Check Supabase connection
async function checkSupabaseConnection() {
  try {
    // Try to access Supabase from window
    if (window.supabase) {
      console.log('✅ Supabase client found')
      
      // Test connection
      const { data, error } = await window.supabase
        .from('ride_requests')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('❌ Supabase connection error:', error.message)
        return false
      } else {
        console.log('✅ Supabase connection working')
        return true
      }
    } else {
      console.error('❌ Supabase client not found in window')
      return false
    }
  } catch (err) {
    console.error('❌ Error checking Supabase:', err.message)
    return false
  }
}

// 4. Check for pending rides manually
async function checkPendingRides() {
  try {
    if (!window.supabase) {
      console.error('❌ Supabase not available')
      return []
    }
    
    const { data, error } = await window.supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .is('provider_id', null)
      .limit(10)
    
    if (error) {
      console.error('❌ Error fetching pending rides:', error.message)
      return []
    }
    
    console.log(`📋 Found ${data.length} pending rides:`, data)
    return data
  } catch (err) {
    console.error('❌ Error:', err.message)
    return []
  }
}

// 5. Force trigger job notification
function forceJobNotification(jobs = []) {
  try {
    // Try to find Vue app instance
    const app = document.querySelector('#app').__vue__
    if (app) {
      console.log('✅ Vue app found')
      
      // Try to access provider job pool
      if (app.$refs && app.$refs.providerJobPool) {
        app.$refs.providerJobPool.availableJobs = jobs
        console.log('✅ Jobs injected into provider job pool')
      }
      
      // Try to trigger reactive update
      if (app.$forceUpdate) {
        app.$forceUpdate()
        console.log('✅ Force update triggered')
      }
    }
  } catch (err) {
    console.error('❌ Error forcing notification:', err.message)
  }
}

// 6. Main debug function
async function debugProviderJobs() {
  console.log('🚀 Starting provider job debug...')
  
  // Check connection
  const connected = await checkSupabaseConnection()
  if (!connected) {
    console.log('💡 Try opening: http://localhost:5173/debug-provider-jobs.html')
    return
  }
  
  // Check pending rides
  const pendingRides = await checkPendingRides()
  
  if (pendingRides.length === 0) {
    console.log('📝 No pending rides found. Creating mock job...')
    const mockJob = createMockJob()
    forceJobNotification([mockJob])
  } else {
    console.log('📱 Forcing notification for existing rides...')
    forceJobNotification(pendingRides)
  }
  
  console.log('✅ Debug complete!')
}

// 7. Auto-run debug
debugProviderJobs()

// 8. Expose functions globally for manual testing
window.debugProviderJobs = debugProviderJobs
window.createMockJob = createMockJob
window.checkPendingRides = checkPendingRides
window.forceJobNotification = forceJobNotification

console.log(`
🔧 Debug functions available:
- debugProviderJobs() - Run full debug
- createMockJob() - Create mock job
- checkPendingRides() - Check database
- forceJobNotification(jobs) - Force UI update

💡 Also try: http://localhost:5173/debug-provider-jobs.html
`)