#!/usr/bin/env node

/**
 * Test Provider Job System
 * Simple test to verify the provider job matching system works end-to-end
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProviderJobSystem() {
  console.log('🧪 Testing Provider Job System...\n')

  try {
    // 1. Check if tables exist
    console.log('1️⃣ Checking database tables...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['ride_requests', 'providers_v2'])
      .eq('table_schema', 'public')

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message)
      return
    }

    const tableNames = tables.map(t => t.table_name)
    console.log('✅ Found tables:', tableNames)

    if (!tableNames.includes('ride_requests') || !tableNames.includes('providers_v2')) {
      console.error('❌ Missing required tables')
      return
    }

    // 2. Check ride_requests schema
    console.log('\n2️⃣ Checking ride_requests schema...')
    
    const { data: rideColumns, error: rideColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'ride_requests')
      .eq('table_schema', 'public')

    if (rideColumnsError) {
      console.error('❌ Error checking ride_requests columns:', rideColumnsError.message)
      return
    }

    const requiredColumns = ['id', 'user_id', 'provider_id', 'status', 'pickup_lat', 'pickup_lng', 'tracking_id']
    const existingColumns = rideColumns.map(c => c.column_name)
    
    console.log('📋 ride_requests columns:', existingColumns.slice(0, 10), '...')
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns in ride_requests:', missingColumns)
      return
    }
    console.log('✅ All required columns present')

    // 3. Check providers_v2 schema
    console.log('\n3️⃣ Checking providers_v2 schema...')
    
    const { data: providerColumns, error: providerColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'providers_v2')
      .eq('table_schema', 'public')

    if (providerColumnsError) {
      console.error('❌ Error checking providers_v2 columns:', providerColumnsError.message)
      return
    }

    const providerRequiredColumns = ['id', 'user_id', 'status', 'is_online', 'is_available']
    const existingProviderColumns = providerColumns.map(c => c.column_name)
    
    console.log('📋 providers_v2 columns:', existingProviderColumns.slice(0, 10), '...')
    
    const missingProviderColumns = providerRequiredColumns.filter(col => !existingProviderColumns.includes(col))
    if (missingProviderColumns.length > 0) {
      console.error('❌ Missing columns in providers_v2:', missingProviderColumns)
      return
    }
    console.log('✅ All required provider columns present')

    // 4. Test creating a ride request
    console.log('\n4️⃣ Testing ride request creation...')
    
    const testRide = {
      user_id: '00000000-0000-0000-0000-000000000001', // Demo user ID
      tracking_id: `TEST-${Date.now()}`,
      pickup_lat: 13.7563,
      pickup_lng: 100.5018,
      pickup_address: 'Bangkok Center',
      destination_lat: 13.7466,
      destination_lng: 100.5392,
      destination_address: 'Siam Square',
      estimated_fare: 120.00,
      status: 'pending'
    }

    const { data: createdRide, error: createError } = await supabase
      .from('ride_requests')
      .insert(testRide)
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating test ride:', createError.message)
      return
    }

    console.log('✅ Test ride created:', {
      id: createdRide.id,
      tracking_id: createdRide.tracking_id,
      status: createdRide.status
    })

    // 5. Test querying pending rides
    console.log('\n5️⃣ Testing pending rides query...')
    
    const { data: pendingRides, error: queryError } = await supabase
      .from('ride_requests')
      .select('id, tracking_id, status, pickup_address, estimated_fare')
      .eq('status', 'pending')
      .is('provider_id', null)
      .limit(5)

    if (queryError) {
      console.error('❌ Error querying pending rides:', queryError.message)
      return
    }

    console.log('✅ Found pending rides:', pendingRides.length)
    pendingRides.forEach(ride => {
      console.log(`   📍 ${ride.tracking_id}: ${ride.pickup_address} (฿${ride.estimated_fare})`)
    })

    // 6. Test provider query
    console.log('\n6️⃣ Testing provider query...')
    
    const { data: providers, error: providerError } = await supabase
      .from('providers_v2')
      .select('id, user_id, status, is_online, is_available')
      .limit(3)

    if (providerError) {
      console.error('❌ Error querying providers:', providerError.message)
      return
    }

    console.log('✅ Found providers:', providers.length)
    providers.forEach(provider => {
      console.log(`   👤 ${provider.id}: ${provider.status} (online: ${provider.is_online})`)
    })

    // 7. Test nearby rides function (if exists)
    console.log('\n7️⃣ Testing nearby rides function...')
    
    try {
      const { data: nearbyRides, error: nearbyError } = await supabase
        .rpc('get_nearby_pending_rides', {
          provider_lat: 13.7563,
          provider_lng: 100.5018,
          radius_km: 10
        })

      if (nearbyError) {
        console.warn('⚠️ Nearby rides function not available:', nearbyError.message)
      } else {
        console.log('✅ Nearby rides function works:', nearbyRides.length, 'rides found')
      }
    } catch (e) {
      console.warn('⚠️ Nearby rides function test failed:', e.message)
    }

    // 8. Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...')
    
    const { error: deleteError } = await supabase
      .from('ride_requests')
      .delete()
      .eq('id', createdRide.id)

    if (deleteError) {
      console.warn('⚠️ Could not delete test ride:', deleteError.message)
    } else {
      console.log('✅ Test data cleaned up')
    }

    console.log('\n🎉 Provider Job System Test Complete!')
    console.log('✅ All core components are working correctly')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testProviderJobSystem()