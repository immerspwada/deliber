// Test script to verify wallet functions work correctly
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://onsflqhkgqhydeupiqyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWalletFunctions() {
  console.log('🧪 Testing Wallet Functions...')
  
  try {
    // Test 1: Login as test user
    console.log('\n1. Testing login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    })
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message)
      return
    }
    
    console.log('✅ Login successful, User ID:', loginData.user?.id)
    
    // Test 2: Get wallet balance
    console.log('\n2. Testing wallet balance...')
    const { data: balanceData, error: balanceError } = await supabase.rpc('get_wallet_balance', {
      p_user_id: loginData.user.id
    })
    
    if (balanceError) {
      console.error('❌ Get balance failed:', balanceError.message)
    } else {
      console.log('✅ Balance retrieved:', balanceData)
    }
    
    // Test 3: Create topup request
    console.log('\n3. Testing topup request creation...')
    const { data: topupData, error: topupError } = await supabase.rpc('create_simple_topup_request', {
      p_user_id: loginData.user.id,
      p_amount: 100,
      p_payment_method: 'promptpay',
      p_payment_reference: 'TEST-' + Date.now(),
      p_slip_url: null
    })
    
    if (topupError) {
      console.error('❌ Topup request failed:', topupError.message)
      console.error('Error details:', topupError)
    } else {
      console.log('✅ Topup request created:', topupData)
    }
    
    // Test 4: Get topup requests
    console.log('\n4. Testing topup requests retrieval...')
    const { data: requestsData, error: requestsError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('user_id', loginData.user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (requestsError) {
      console.error('❌ Get topup requests failed:', requestsError.message)
    } else {
      console.log('✅ Topup requests retrieved:', requestsData?.length, 'requests')
      if (requestsData && requestsData.length > 0) {
        console.log('Latest request:', requestsData[0])
      }
    }
    
    console.log('\n🎉 All tests completed!')
    
  } catch (err) {
    console.error('💥 Test exception:', err)
  }
}

// Run tests
testWalletFunctions()