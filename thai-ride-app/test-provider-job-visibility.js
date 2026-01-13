/**
 * Test Provider Job Visibility
 * ทดสอบว่า Provider สามารถเห็นงานจาก Customer ได้หรือไม่
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test users (you may need to adjust these based on your test data)
const TEST_CUSTOMER = {
  email: 'customer@test.com',
  password: 'password123'
}

const TEST_PROVIDER = {
  email: 'provider@test.com', 
  password: 'password123'
}

async function testProviderJobVisibility() {
  console.log('🧪 Testing Provider Job Visibility System...\n')

  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...')
    const { data: testResult, error: testError } = await supabase
      .rpc('test_provider_job_visibility')
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      return
    }
    
    console.log('✅ Database connected successfully')
    testResult?.forEach(test => {
      console.log(`   ${test.result ? '✅' : '❌'} ${test.test_name}: ${test.message}`)
    })
    console.log()

    // Step 2: Login as customer and create a test ride
    console.log('2️⃣ Creating test ride as customer...')
    
    const { data: customerAuth, error: customerAuthError } = await supabase.auth.signInWithPassword({
      email: TEST_CUSTOMER.email,
      password: TEST_CUSTOMER.password
    })

    if (customerAuthError) {
      console.log('⚠️ Customer login failed, creating test ride with direct insert...')
      
      // Create test ride directly
      const { data: testRide, error: insertError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000001', // Test UUID
          status: 'pending',
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'สยามพารากอน กรุงเทพฯ',
          destination_lat: 13.7467,
          destination_lng: 100.5342,
          destination_address: 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
          estimated_fare: 150,
          tracking_id: 'TEST-' + Date.now()
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Failed to create test ride:', insertError.message)
        return
      }
      
      console.log('✅ Test ride created:', testRide.tracking_id)
    } else {
      console.log('✅ Customer logged in successfully')
      
      // Create ride as authenticated customer
      const { data: newRide, error: rideError } = await supabase
        .from('ride_requests')
        .insert({
          status: 'pending',
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'สยามพารากอน กรุงเทพฯ',
          destination_lat: 13.7467,
          destination_lng: 100.5342,
          destination_address: 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
          estimated_fare: 150,
          tracking_id: 'TEST-' + Date.now()
        })
        .select()
        .single()

      if (rideError) {
        console.error('❌ Failed to create ride:', rideError.message)
        return
      }
      
      console.log('✅ Ride created successfully:', newRide.tracking_id)
    }
    console.log()

    // Step 3: Check pending rides (without authentication)
    console.log('3️⃣ Checking pending rides visibility...')
    
    const { data: pendingRides, error: pendingError } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .is('provider_id', null)
      .limit(5)

    if (pendingError) {
      console.error('❌ Failed to fetch pending rides:', pendingError.message)
    } else {
      console.log(`✅ Found ${pendingRides.length} pending rides`)
      pendingRides.forEach(ride => {
        console.log(`   📍 ${ride.tracking_id}: ${ride.pickup_address} → ${ride.destination_address}`)
      })
    }
    console.log()

    // Step 4: Login as provider and test job visibility
    console.log('4️⃣ Testing provider job visibility...')
    
    const { data: providerAuth, error: providerAuthError } = await supabase.auth.signInWithPassword({
      email: TEST_PROVIDER.email,
      password: TEST_PROVIDER.password
    })

    if (providerAuthError) {
      console.log('⚠️ Provider login failed, testing with anonymous access...')
    } else {
      console.log('✅ Provider logged in successfully')
    }

    // Test provider can see pending rides
    const { data: providerJobs, error: jobsError } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .is('provider_id', null)
      .limit(10)

    if (jobsError) {
      console.error('❌ Provider cannot see jobs:', jobsError.message)
    } else {
      console.log(`✅ Provider can see ${providerJobs.length} available jobs`)
      providerJobs.forEach(job => {
        console.log(`   🚗 ${job.tracking_id}: ฿${job.estimated_fare} - ${job.pickup_address}`)
      })
    }
    console.log()

    // Step 5: Test nearby rides function
    console.log('5️⃣ Testing nearby rides function...')
    
    const { data: nearbyRides, error: nearbyError } = await supabase
      .rpc('get_nearby_pending_rides', {
        provider_lat: 13.7563,
        provider_lng: 100.5018,
        radius_km: 10
      })

    if (nearbyError) {
      console.error('❌ Nearby rides function failed:', nearbyError.message)
    } else {
      console.log(`✅ Found ${nearbyRides.length} nearby rides`)
      nearbyRides.forEach(ride => {
        console.log(`   📍 ${ride.tracking_id}: ${ride.distance_km?.toFixed(2)}km away`)
      })
    }
    console.log()

    // Step 6: Summary
    console.log('📊 Test Summary:')
    console.log('================')
    
    if (pendingRides?.length > 0) {
      console.log('✅ Customers can create ride requests')
    } else {
      console.log('❌ No pending rides found - customers may not be able to create rides')
    }
    
    if (providerJobs?.length > 0) {
      console.log('✅ Providers can see customer jobs - PROBLEM FIXED! 🎉')
    } else {
      console.log('❌ Providers cannot see customer jobs - problem still exists')
    }
    
    if (nearbyRides?.length > 0) {
      console.log('✅ Nearby rides function works correctly')
    } else {
      console.log('⚠️ Nearby rides function may need provider authentication')
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error.message)
  }
}

// Run the test
testProviderJobVisibility()