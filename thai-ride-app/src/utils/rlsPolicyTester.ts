/**
 * RLS Policy Tester - ทดสอบ Row Level Security Policies
 * ตรวจสอบว่า Provider สามารถเข้าถึงงานได้ถูกต้องหรือไม่
 */

import { supabase } from '@/lib/supabase'

export interface RLSTestResult {
  testName: string
  success: boolean
  message: string
  data?: any
  error?: string
  duration?: number
}

export interface RLSTestSuite {
  suiteName: string
  results: RLSTestResult[]
  overallSuccess: boolean
  totalDuration: number
}

export class RLSPolicyTester {
  private results: RLSTestResult[] = []

  // Test if provider can see pending rides
  async testProviderCanSeePendingRides(): Promise<RLSTestResult> {
    const startTime = performance.now()
    
    try {
      console.log('[RLS Test] Testing provider access to pending rides...')
      
      const { data, error } = await supabase
        .from('ride_requests')
        .select('id, tracking_id, status, pickup_address, estimated_fare')
        .eq('status', 'pending')
        .is('provider_id', null)
        .limit(10)

      const duration = performance.now() - startTime

      if (error) {
        return {
          testName: 'Provider Can See Pending Rides',
          success: false,
          message: `RLS Policy blocked access: ${error.message}`,
          error: error.message,
          duration: Math.round(duration)
        }
      }

      const jobCount = data?.length || 0
      
      return {
        testName: 'Provider Can See Pending Rides',
        success: true,
        message: `✅ Provider can see ${jobCount} pending rides`,
        data: data,
        duration: Math.round(duration)
      }

    } catch (error: any) {
      const duration = performance.now() - startTime
      
      return {
        testName: 'Provider Can See Pending Rides',
        success: false,
        message: `Exception occurred: ${error.message}`,
        error: error.message,
        duration: Math.round(duration)
      }
    }
  }

  // Test if customer can create rides
  async testCustomerCanCreateRides(): Promise<RLSTestResult> {
    const startTime = performance.now()
    
    try {
      console.log('[RLS Test] Testing customer ride creation...')
      
      // Try to create a test ride
      const testRide = {
        user_id: '00000000-0000-0000-0000-000000000001', // Test UUID
        tracking_id: `RLS-TEST-${Date.now()}`,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'RLS Test Pickup',
        destination_lat: 13.7467,
        destination_lng: 100.5342,
        destination_address: 'RLS Test Destination',
        estimated_fare: 100,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('ride_requests')
        .insert(testRide)
        .select()
        .single()

      const duration = performance.now() - startTime

      if (error) {
        return {
          testName: 'Customer Can Create Rides',
          success: false,
          message: `RLS Policy blocked ride creation: ${error.message}`,
          error: error.message,
          duration: Math.round(duration)
        }
      }

      // Clean up test data
      if (data?.id) {
        await supabase
          .from('ride_requests')
          .delete()
          .eq('id', data.id)
      }

      return {
        testName: 'Customer Can Create Rides',
        success: true,
        message: `✅ Customer can create rides (test ride: ${data?.tracking_id})`,
        data: data,
        duration: Math.round(duration)
      }

    } catch (error: any) {
      const duration = performance.now() - startTime
      
      return {
        testName: 'Customer Can Create Rides',
        success: false,
        message: `Exception occurred: ${error.message}`,
        error: error.message,
        duration: Math.round(duration)
      }
    }
  }

  // Test provider authentication and profile
  async testProviderAuthentication(): Promise<RLSTestResult> {
    const startTime = performance.now()
    
    try {
      console.log('[RLS Test] Testing provider authentication...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        const duration = performance.now() - startTime
        return {
          testName: 'Provider Authentication',
          success: false,
          message: 'Provider not authenticated',
          error: authError?.message || 'No user found',
          duration: Math.round(duration)
        }
      }

      // Check provider profile
      const { data: provider, error: providerError } = await supabase
        .from('providers_v2')
        .select('id, user_id, status, is_online, is_available')
        .eq('user_id', user.id)
        .maybeSingle()

      const duration = performance.now() - startTime

      if (providerError) {
        return {
          testName: 'Provider Authentication',
          success: false,
          message: `Provider profile error: ${providerError.message}`,
          error: providerError.message,
          duration: Math.round(duration)
        }
      }

      if (!provider) {
        return {
          testName: 'Provider Authentication',
          success: false,
          message: 'Provider profile not found',
          error: 'No provider profile found for authenticated user',
          duration: Math.round(duration)
        }
      }

      return {
        testName: 'Provider Authentication',
        success: true,
        message: `✅ Provider authenticated (${provider.status}, online: ${provider.is_online})`,
        data: { user: { id: user.id, email: user.email }, provider },
        duration: Math.round(duration)
      }

    } catch (error: any) {
      const duration = performance.now() - startTime
      
      return {
        testName: 'Provider Authentication',
        success: false,
        message: `Exception occurred: ${error.message}`,
        error: error.message,
        duration: Math.round(duration)
      }
    }
  }

  // Test nearby rides function
  async testNearbyRidesFunction(): Promise<RLSTestResult> {
    const startTime = performance.now()
    
    try {
      console.log('[RLS Test] Testing nearby rides function...')
      
      const { data, error } = await supabase
        .rpc('get_nearby_pending_rides', {
          provider_lat: 13.7563,
          provider_lng: 100.5018,
          radius_km: 10
        })

      const duration = performance.now() - startTime

      if (error) {
        return {
          testName: 'Nearby Rides Function',
          success: false,
          message: `Function error: ${error.message}`,
          error: error.message,
          duration: Math.round(duration)
        }
      }

      const rideCount = data?.length || 0

      return {
        testName: 'Nearby Rides Function',
        success: true,
        message: `✅ Function returned ${rideCount} nearby rides`,
        data: data,
        duration: Math.round(duration)
      }

    } catch (error: any) {
      const duration = performance.now() - startTime
      
      return {
        testName: 'Nearby Rides Function',
        success: false,
        message: `Exception occurred: ${error.message}`,
        error: error.message,
        duration: Math.round(duration)
      }
    }
  }

  // Test database connection
  async testDatabaseConnection(): Promise<RLSTestResult> {
    const startTime = performance.now()
    
    try {
      console.log('[RLS Test] Testing database connection...')
      
      const { data, error } = await supabase
        .from('ride_requests')
        .select('count')
        .limit(1)

      const duration = performance.now() - startTime

      if (error) {
        return {
          testName: 'Database Connection',
          success: false,
          message: `Connection failed: ${error.message}`,
          error: error.message,
          duration: Math.round(duration)
        }
      }

      return {
        testName: 'Database Connection',
        success: true,
        message: '✅ Database connection successful',
        data: data,
        duration: Math.round(duration)
      }

    } catch (error: any) {
      const duration = performance.now() - startTime
      
      return {
        testName: 'Database Connection',
        success: false,
        message: `Exception occurred: ${error.message}`,
        error: error.message,
        duration: Math.round(duration)
      }
    }
  }

  // Run all tests
  async runAllTests(): Promise<RLSTestSuite> {
    const suiteStartTime = performance.now()
    console.log('[RLS Test] 🧪 Starting RLS Policy Test Suite...')
    
    const results: RLSTestResult[] = []

    // Run tests in sequence
    results.push(await this.testDatabaseConnection())
    results.push(await this.testProviderAuthentication())
    results.push(await this.testProviderCanSeePendingRides())
    results.push(await this.testCustomerCanCreateRides())
    results.push(await this.testNearbyRidesFunction())

    const totalDuration = performance.now() - suiteStartTime
    const overallSuccess = results.every(result => result.success)

    const suite: RLSTestSuite = {
      suiteName: 'RLS Policy Test Suite',
      results,
      overallSuccess,
      totalDuration: Math.round(totalDuration)
    }

    console.log('[RLS Test] 📊 Test Suite Complete:', suite)
    
    return suite
  }

  // Generate test report
  generateReport(suite: RLSTestSuite): string {
    let report = `# 🧪 RLS Policy Test Report\n\n`
    report += `**Suite:** ${suite.suiteName}\n`
    report += `**Overall Result:** ${suite.overallSuccess ? '✅ PASSED' : '❌ FAILED'}\n`
    report += `**Total Duration:** ${suite.totalDuration}ms\n`
    report += `**Tests Run:** ${suite.results.length}\n`
    report += `**Passed:** ${suite.results.filter(r => r.success).length}\n`
    report += `**Failed:** ${suite.results.filter(r => !r.success).length}\n\n`

    report += `## Test Results\n\n`

    suite.results.forEach((result, index) => {
      report += `### ${index + 1}. ${result.testName}\n`
      report += `**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`
      report += `**Message:** ${result.message}\n`
      report += `**Duration:** ${result.duration}ms\n`
      
      if (result.error) {
        report += `**Error:** \`${result.error}\`\n`
      }
      
      if (result.data && typeof result.data === 'object') {
        report += `**Data:** ${JSON.stringify(result.data, null, 2)}\n`
      }
      
      report += `\n`
    })

    report += `## Recommendations\n\n`

    const failedTests = suite.results.filter(r => !r.success)
    if (failedTests.length === 0) {
      report += `🎉 All tests passed! The RLS policies are working correctly.\n\n`
    } else {
      report += `⚠️ ${failedTests.length} test(s) failed. Please check:\n\n`
      
      failedTests.forEach(test => {
        report += `- **${test.testName}:** ${test.message}\n`
      })
      
      report += `\n`
    }

    report += `## Next Steps\n\n`
    report += `1. If database connection failed: Start Docker and Supabase local\n`
    report += `2. If authentication failed: Check user login status\n`
    report += `3. If RLS policies failed: Review migration 260_fix_provider_job_visibility_final.sql\n`
    report += `4. If function failed: Check if get_nearby_pending_rides exists\n\n`

    report += `---\n`
    report += `*Generated at: ${new Date().toLocaleString('th-TH')}*\n`

    return report
  }
}

// Export singleton instance
export const rlsPolicyTester = new RLSPolicyTester()