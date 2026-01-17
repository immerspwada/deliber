import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://onsflqhkgqhydeupiqyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserProviderStatus() {
  const email = 'ridertest@gmail.com'
  
  console.log('🔍 Checking user and provider status for:', email)
  console.log('=' .repeat(60))
  
  try {
    // 1. Check if user exists in auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
      console.log('\n⚠️  Note: admin.listUsers() requires service_role key')
      console.log('Trying alternative method...\n')
    }
    
    // 2. Check users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    
    if (userError) {
      console.error('❌ Error fetching user from users table:', userError.message)
      return
    }
    
    if (!userData) {
      console.log('❌ User not found in users table')
      return
    }
    
    console.log('✅ User found in users table:')
    console.log('   - ID:', userData.id)
    console.log('   - Email:', userData.email)
    console.log('   - Role:', userData.role)
    console.log('   - Name:', userData.name || 'N/A')
    console.log('')
    
    // 3. Check providers_v2 table
    const { data: providerData, error: providerError } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', userData.id)
      .maybeSingle()
    
    if (providerError) {
      console.error('❌ Error fetching provider:', providerError.message)
      return
    }
    
    if (!providerData) {
      console.log('❌ No provider record found in providers_v2 table')
      console.log('')
      console.log('📋 Solution:')
      console.log('   User needs to complete provider onboarding at:')
      console.log('   http://localhost:5173/provider/onboarding')
      return
    }
    
    console.log('✅ Provider record found:')
    console.log('   - Provider ID:', providerData.id)
    console.log('   - Status:', providerData.status)
    console.log('   - Service Type:', providerData.service_type || 'N/A')
    console.log('   - Vehicle Type:', providerData.vehicle_type || 'N/A')
    console.log('   - Created:', providerData.created_at)
    console.log('')
    
    // 4. Check status and provide recommendations
    if (providerData.status === 'approved' || providerData.status === 'active') {
      console.log('✅ Provider is APPROVED - should be able to access /provider')
      console.log('')
      console.log('🔍 Debugging steps:')
      console.log('   1. Check browser console for router logs')
      console.log('   2. Verify user is logged in with correct email')
      console.log('   3. Check if RLS policies are blocking access')
      console.log('   4. Try clearing browser cache and localStorage')
    } else if (providerData.status === 'pending') {
      console.log('⏳ Provider status is PENDING - waiting for admin approval')
      console.log('   User can access /provider but will see pending status')
    } else if (providerData.status === 'rejected') {
      console.log('❌ Provider status is REJECTED')
      console.log('   User will be redirected to /provider/onboarding')
    } else if (providerData.status === 'suspended') {
      console.log('🚫 Provider status is SUSPENDED')
      console.log('   User will be redirected to /provider/onboarding')
    } else {
      console.log('⚠️  Unknown provider status:', providerData.status)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkUserProviderStatus()
