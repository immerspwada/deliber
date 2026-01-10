/**
 * Test Data Management Composable
 * สำหรับสร้างและจัดการข้อมูลทดสอบให้ระบบทำงานได้จริง
 */
import { supabase } from '../lib/supabase'

export function useTestData() {
  
  async function createTestProvider(): Promise<void> {
    try {
      // 1. สร้าง test provider
      const { error: providerError } = await supabase
        .from('providers_v2')
        .upsert({
          id: 'test-provider-001',
          user_id: '22222222-2222-2222-2222-222222222222',
          first_name: 'สมชาย',
          last_name: 'ใจดี',
          email: 'provider@demo.com',
          phone_number: '0812345678',
          service_types: ['ride', 'delivery'],
          status: 'approved',
          is_online: false,
          rating: 4.8,
          total_trips: 150,
          total_earnings: 45000.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as never)

      if (providerError) {
        console.error('Error creating test provider:', providerError)
      }

      // 2. สร้าง user record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: '22222222-2222-2222-2222-222222222222',
          email: 'provider@demo.com',
          name: 'สมชาย ใจดี',
          phone: '0812345678',
          role: 'provider',
          is_active: true,
          created_at: new Date().toISOString()
        } as never)

      if (userError) {
        console.error('Error creating test user:', userError)
      }

      console.log('✅ Test provider created successfully')
    } catch (error) {
      console.error('Error in createTestProvider:', error)
    }
  }

  async function createTestJobs(): Promise<void> {
    try {
      const testJobs = [
        {
          id: 'job-001',
          customer_id: '11111111-1111-1111-1111-111111111111',
          service_type: 'ride',
          status: 'pending',
          pickup_address: 'สยามพารากอน กรุงเทพฯ',
          dropoff_address: 'สนามบินสุวรรณภูมิ',
          pickup_location: 'POINT(100.5348 13.7463)',
          dropoff_location: 'POINT(100.7501 13.6900)',
          base_fare: 50.00,
          distance_fare: 200.00,
          time_fare: 100.00,
          estimated_earnings: 350.00,
          distance_km: 28.5,
          duration_minutes: 45,
          created_at: new Date().toISOString()
        },
        {
          id: 'job-002',
          customer_id: '11111111-1111-1111-1111-111111111111',
          service_type: 'delivery',
          status: 'pending',
          pickup_address: 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
          dropoff_address: 'ห้างเอ็มโพเรียม',
          pickup_location: 'POINT(100.5398 13.7472)',
          dropoff_location: 'POINT(100.5692 13.7307)',
          base_fare: 40.00,
          distance_fare: 60.00,
          time_fare: 20.00,
          estimated_earnings: 120.00,
          distance_km: 6.2,
          duration_minutes: 20,
          created_at: new Date().toISOString()
        },
        {
          id: 'job-003',
          customer_id: '11111111-1111-1111-1111-111111111111',
          service_type: 'ride',
          status: 'pending',
          pickup_address: 'สถานีรถไฟฟ้าอโศก',
          dropoff_address: 'สถานีรถไฟฟ้าสยาม',
          pickup_location: 'POINT(100.5601 13.7367)',
          dropoff_location: 'POINT(100.5348 13.7463)',
          base_fare: 40.00,
          distance_fare: 30.00,
          time_fare: 10.00,
          estimated_earnings: 80.00,
          distance_km: 3.1,
          duration_minutes: 12,
          created_at: new Date().toISOString()
        },
        {
          id: 'job-004',
          customer_id: '11111111-1111-1111-1111-111111111111',
          service_type: 'delivery',
          status: 'pending',
          pickup_address: 'ตลาดจตุจักร',
          dropoff_address: 'มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์',
          pickup_location: 'POINT(100.5503 13.7998)',
          dropoff_location: 'POINT(100.4926 13.7878)',
          base_fare: 50.00,
          distance_fare: 120.00,
          time_fare: 30.00,
          estimated_earnings: 200.00,
          distance_km: 12.8,
          duration_minutes: 35,
          created_at: new Date().toISOString()
        },
        {
          id: 'job-005',
          customer_id: '11111111-1111-1111-1111-111111111111',
          service_type: 'ride',
          status: 'pending',
          pickup_address: 'สนามบินดอนเมือง',
          dropoff_address: 'ห้างสรรพสินค้าเซ็นทรัลลาดพร้าว',
          pickup_location: 'POINT(100.6069 13.9126)',
          dropoff_location: 'POINT(100.5692 13.8161)',
          base_fare: 60.00,
          distance_fare: 180.00,
          time_fare: 40.00,
          estimated_earnings: 280.00,
          distance_km: 18.2,
          duration_minutes: 40,
          created_at: new Date().toISOString()
        }
      ]

      const { error } = await supabase
        .from('jobs_v2')
        .upsert(testJobs as never[])

      if (error) {
        console.error('Error creating test jobs:', error)
      } else {
        console.log('✅ Test jobs created successfully')
      }
    } catch (error) {
      console.error('Error in createTestJobs:', error)
    }
  }

  async function createTestWallet(): Promise<void> {
    try {
      // สร้าง wallet
      const { error: walletError } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: '22222222-2222-2222-2222-222222222222',
          balance: 1250.00,
          total_earned: 45000.00,
          total_spent: 43750.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as never)

      if (walletError) {
        console.error('Error creating test wallet:', walletError)
      }

      // สร้าง transactions
      const transactions = [
        {
          user_id: '22222222-2222-2222-2222-222222222222',
          type: 'earning',
          amount: 350.00,
          balance_before: 900.00,
          balance_after: 1250.00,
          description: 'รายได้จากการขับรถ - งาน #12345',
          reference_type: 'ride_request',
          reference_id: 'job-completed-001',
          status: 'completed',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: '22222222-2222-2222-2222-222222222222',
          type: 'earning',
          amount: 120.00,
          balance_before: 780.00,
          balance_after: 900.00,
          description: 'รายได้จากการจัดส่ง - งาน #12344',
          reference_type: 'delivery_request',
          reference_id: 'job-completed-002',
          status: 'completed',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ]

      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .upsert(transactions as never[])

      if (transactionError) {
        console.error('Error creating test transactions:', transactionError)
      } else {
        console.log('✅ Test wallet and transactions created successfully')
      }
    } catch (error) {
      console.error('Error in createTestWallet:', error)
    }
  }

  async function createTodayCompletedJobs(): Promise<void> {
    try {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const completedJobs = [
        {
          id: 'completed-today-001',
          customer_id: '11111111-1111-1111-1111-111111111111',
          provider_id: 'test-provider-001',
          service_type: 'ride',
          status: 'completed',
          pickup_address: 'สยามสแควร์',
          dropoff_address: 'สถานีรถไฟฟ้าชิดลม',
          pickup_location: 'POINT(100.5348 13.7463)',
          dropoff_location: 'POINT(100.5434 13.7439)',
          base_fare: 40.00,
          distance_fare: 50.00,
          time_fare: 10.00,
          estimated_earnings: 100.00,
          actual_earnings: 100.00,
          distance_km: 2.1,
          duration_minutes: 15,
          created_at: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          accepted_at: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
          completed_at: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString()
        },
        {
          id: 'completed-today-002',
          customer_id: '11111111-1111-1111-1111-111111111111',
          provider_id: 'test-provider-001',
          service_type: 'delivery',
          status: 'completed',
          pickup_address: 'ร้านอาหารญี่ปุ่น ซอยทองหล่อ',
          dropoff_address: 'คอนโดใน ซอยทองหล่อ 15',
          pickup_location: 'POINT(100.5692 13.7307)',
          dropoff_location: 'POINT(100.5712 13.7298)',
          base_fare: 40.00,
          distance_fare: 35.00,
          time_fare: 10.00,
          estimated_earnings: 85.00,
          actual_earnings: 85.00,
          distance_km: 1.2,
          duration_minutes: 18,
          created_at: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          accepted_at: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
          completed_at: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString()
        }
      ]

      const { error } = await supabase
        .from('jobs_v2')
        .upsert(completedJobs as never[])

      if (error) {
        console.error('Error creating today completed jobs:', error)
      } else {
        console.log('✅ Today completed jobs created successfully')
        
        // Create corresponding earnings records
        const earningsData = [
          {
            provider_id: 'test-provider-001',
            job_id: 'completed-today-001',
            base_fare: 40.00,
            distance_fare: 50.00,
            time_fare: 10.00,
            surge_amount: 0.00,
            tip_amount: 0.00,
            bonus_amount: 0.00,
            gross_earnings: 100.00,
            platform_fee: 15.00,
            net_earnings: 85.00,
            service_type: 'ride',
            earned_at: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString()
          },
          {
            provider_id: 'test-provider-001',
            job_id: 'completed-today-002',
            base_fare: 40.00,
            distance_fare: 35.00,
            time_fare: 10.00,
            surge_amount: 0.00,
            tip_amount: 0.00,
            bonus_amount: 0.00,
            gross_earnings: 85.00,
            platform_fee: 12.75,
            net_earnings: 72.25,
            service_type: 'delivery',
            earned_at: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString()
          }
        ]

        const { error: earningsError } = await supabase
          .from('earnings_v2')
          .upsert(earningsData as never[])

        if (earningsError) {
          console.error('Error creating earnings data:', earningsError)
        } else {
          console.log('✅ Earnings data created successfully')
        }
      }
    } catch (error) {
      console.error('Error in createTodayCompletedJobs:', error)
    }
  }

  async function setupCompleteTestData(): Promise<void> {
    console.log('🚀 Setting up complete test data...')
    
    await createTestProvider()
    await createTestJobs()
    await createTestWallet()
    await createTodayCompletedJobs()
    
    console.log('✅ Complete test data setup finished!')
  }

  async function clearTestData(): Promise<void> {
    try {
      // Clear in reverse order to avoid foreign key constraints
      await supabase.from('earnings_v2').delete().eq('provider_id', 'test-provider-001')
      await supabase.from('wallet_transactions').delete().eq('user_id', '22222222-2222-2222-2222-222222222222')
      await supabase.from('user_wallets').delete().eq('user_id', '22222222-2222-2222-2222-222222222222')
      await supabase.from('jobs_v2').delete().in('id', ['job-001', 'job-002', 'job-003', 'job-004', 'job-005', 'completed-today-001', 'completed-today-002'])
      await supabase.from('providers_v2').delete().eq('id', 'test-provider-001')
      
      console.log('✅ Test data cleared successfully')
    } catch (error) {
      console.error('Error clearing test data:', error)
    }
  }

  return {
    createTestProvider,
    createTestJobs,
    createTestWallet,
    createTodayCompletedJobs,
    setupCompleteTestData,
    clearTestData
  }
}