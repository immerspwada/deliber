/**
 * Test Wallet Functionality
 * 
 * This script tests the wallet authentication and basic functionality
 * Run this in the browser console after logging in
 */

// Test 1: Check if user is authenticated
console.log('🔍 Testing Wallet Functionality...')

// Test 2: Check Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    
    const supabase = createClient(
      'https://onsflqhkgqhydeupiqyt.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk'
    )
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session Error:', sessionError)
      return false
    }
    
    if (!session) {
      console.warn('⚠️ No active session - please login first')
      return false
    }
    
    console.log('✅ Session found:', {
      userId: session.user.id,
      email: session.user.email
    })
    
    // Test wallet function
    const { data: walletData, error: walletError } = await supabase.rpc('get_customer_wallet', {
      p_user_id: session.user.id
    })
    
    if (walletError) {
      console.error('❌ Wallet Error:', walletError)
      return false
    }
    
    if (walletData && walletData.length > 0) {
      console.log('✅ Wallet data retrieved:', walletData[0])
      return true
    } else {
      console.warn('⚠️ No wallet data found')
      return false
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Test 3: Check if wallet page loads
const testWalletPageAccess = () => {
  const currentPath = window.location.pathname
  console.log('📍 Current path:', currentPath)
  
  if (currentPath === '/customer/wallet') {
    console.log('✅ Already on wallet page')
    return true
  } else {
    console.log('ℹ️ Navigate to /customer/wallet to test the page')
    return false
  }
}

// Run tests
const runTests = async () => {
  console.log('\n🧪 Running Wallet Tests...\n')
  
  const connectionTest = await testSupabaseConnection()
  const pageTest = testWalletPageAccess()
  
  console.log('\n📊 Test Results:')
  console.log('- Supabase Connection:', connectionTest ? '✅ PASS' : '❌ FAIL')
  console.log('- Wallet Page Access:', pageTest ? '✅ PASS' : 'ℹ️ SKIP')
  
  if (connectionTest) {
    console.log('\n🎉 Wallet functionality is working!')
    console.log('💡 Next steps:')
    console.log('1. Navigate to /customer/wallet')
    console.log('2. Check if wallet balance displays correctly')
    console.log('3. Try creating a top-up request')
  } else {
    console.log('\n❌ Wallet functionality needs attention')
    console.log('💡 Troubleshooting:')
    console.log('1. Make sure you are logged in')
    console.log('2. Check browser console for errors')
    console.log('3. Verify Supabase connection')
  }
}

// Auto-run tests
runTests()

// Export for manual testing
window.testWallet = {
  runTests,
  testSupabaseConnection,
  testWalletPageAccess
}

console.log('\n💡 You can also run individual tests:')
console.log('- window.testWallet.testSupabaseConnection()')
console.log('- window.testWallet.testWalletPageAccess()')
console.log('- window.testWallet.runTests()')