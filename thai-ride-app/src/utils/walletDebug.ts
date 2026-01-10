/**
 * Wallet Debug Utility
 * Deep inspection tool for wallet system
 */
import { supabase } from '@/lib/supabase'

interface DebugResult {
  section: string
  status: 'success' | 'error' | 'warning'
  message: string
  data?: unknown
  error?: unknown
}

export async function debugWalletSystem(): Promise<DebugResult[]> {
  const results: DebugResult[] = []

  // =====================================================
  // 1. Check Authentication
  // =====================================================
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      results.push({
        section: '1. Authentication',
        status: 'error',
        message: 'Failed to get user',
        error
      })
    } else if (!user) {
      results.push({
        section: '1. Authentication',
        status: 'error',
        message: 'No authenticated user'
      })
    } else {
      results.push({
        section: '1. Authentication',
        status: 'success',
        message: `User authenticated: ${user.email}`,
        data: { userId: user.id, email: user.email }
      })
    }
  } catch (err) {
    results.push({
      section: '1. Authentication',
      status: 'error',
      message: 'Exception in auth check',
      error: err
    })
  }

  // =====================================================
  // 2. Check get_customer_wallet Function
  // =====================================================
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.rpc('get_customer_wallet', {
        p_user_id: user.id
      })

      if (error) {
        results.push({
          section: '2. get_customer_wallet RPC',
          status: 'error',
          message: 'RPC call failed',
          error
        })
      } else if (!data || data.length === 0) {
        results.push({
          section: '2. get_customer_wallet RPC',
          status: 'warning',
          message: 'No wallet data returned',
          data
        })
      } else {
        results.push({
          section: '2. get_customer_wallet RPC',
          status: 'success',
          message: 'Wallet data retrieved',
          data: data[0]
        })
      }
    }
  } catch (err) {
    results.push({
      section: '2. get_customer_wallet RPC',
      status: 'error',
      message: 'Exception in RPC call',
      error: err
    })
  }

  // =====================================================
  // 3. Check wallet_transactions Table
  // =====================================================
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error, count } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        results.push({
          section: '3. wallet_transactions Table',
          status: 'error',
          message: 'Query failed',
          error
        })
      } else {
        results.push({
          section: '3. wallet_transactions Table',
          status: data && data.length > 0 ? 'success' : 'warning',
          message: `Found ${count || 0} transactions`,
          data: { count, sample: data }
        })
      }
    }
  } catch (err) {
    results.push({
      section: '3. wallet_transactions Table',
      status: 'error',
      message: 'Exception in query',
      error: err
    })
  }

  // =====================================================
  // 4. Check topup_requests Table
  // =====================================================
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.rpc('get_topup_requests_by_user', {
        p_user_id: user.id,
        p_limit: 5
      })

      if (error) {
        results.push({
          section: '4. topup_requests (RPC)',
          status: 'error',
          message: 'RPC call failed',
          error
        })
      } else {
        results.push({
          section: '4. topup_requests (RPC)',
          status: data && data.length > 0 ? 'success' : 'warning',
          message: `Found ${data?.length || 0} topup requests`,
          data
        })
      }
    }
  } catch (err) {
    results.push({
      section: '4. topup_requests (RPC)',
      status: 'error',
      message: 'Exception in RPC call',
      error: err
    })
  }

  // =====================================================
  // 5. Check user_wallets Table Direct
  // =====================================================
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        results.push({
          section: '5. user_wallets Table (Direct)',
          status: 'error',
          message: 'Query failed',
          error
        })
      } else if (!data) {
        results.push({
          section: '5. user_wallets Table (Direct)',
          status: 'warning',
          message: 'No wallet record found',
          data: null
        })
      } else {
        results.push({
          section: '5. user_wallets Table (Direct)',
          status: 'success',
          message: 'Wallet record found',
          data
        })
      }
    }
  } catch (err) {
    results.push({
      section: '5. user_wallets Table (Direct)',
      status: 'error',
      message: 'Exception in query',
      error: err
    })
  }

  // =====================================================
  // 6. Check RLS Policies
  // =====================================================
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Try to query with explicit user_id filter
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) {
        results.push({
          section: '6. RLS Policy Check',
          status: 'error',
          message: 'RLS policy may be blocking access',
          error
        })
      } else {
        results.push({
          section: '6. RLS Policy Check',
          status: 'success',
          message: 'RLS policies allow access'
        })
      }
    }
  } catch (err) {
    results.push({
      section: '6. RLS Policy Check',
      status: 'error',
      message: 'Exception in RLS check',
      error: err
    })
  }

  // =====================================================
  // 7. Check Supabase Connection
  // =====================================================
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('count')
      .limit(0)

    if (error) {
      results.push({
        section: '7. Supabase Connection',
        status: 'error',
        message: 'Connection test failed',
        error
      })
    } else {
      results.push({
        section: '7. Supabase Connection',
        status: 'success',
        message: 'Supabase connection OK'
      })
    }
  } catch (err) {
    results.push({
      section: '7. Supabase Connection',
      status: 'error',
      message: 'Exception in connection test',
      error: err
    })
  }

  return results
}

export function printDebugResults(results: DebugResult[]): void {
  console.group('🔍 Wallet System Debug Report')
  
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️'
    
    console.group(`${icon} ${result.section}`)
    console.log('Status:', result.status)
    console.log('Message:', result.message)
    
    if (result.data) {
      console.log('Data:', result.data)
    }
    
    if (result.error) {
      console.error('Error:', result.error)
    }
    
    console.groupEnd()
  })
  
  console.groupEnd()

  // Summary
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const warningCount = results.filter(r => r.status === 'warning').length

  console.log('\n📊 Summary:')
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`⚠️  Warnings: ${warningCount}`)
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).debugWallet = async () => {
    const results = await debugWalletSystem()
    printDebugResults(results)
    return results
  }
}
