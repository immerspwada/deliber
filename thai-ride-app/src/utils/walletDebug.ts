/**
 * Wallet Debug Utility
 * Helps diagnose wallet balance display issues
 */

import { supabase } from '@/lib/supabase'

export interface WalletDebugResult {
  step: string
  success: boolean
  data?: any
  error?: any
}

export async function debugWalletSystem(): Promise<WalletDebugResult[]> {
  const results: WalletDebugResult[] = []

  // Step 1: Check auth
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    results.push({
      step: '1. Auth Check',
      success: !error && !!user,
      data: user ? { id: user.id, email: user.email } : null,
      error: error?.message
    })

    if (!user) {
      return results
    }

    // Step 2: Check wallet record
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    results.push({
      step: '2. Wallet Record',
      success: !walletError && !!walletData,
      data: walletData,
      error: walletError?.message
    })

    // Step 3: Test RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_wallet', {
      p_user_id: user.id
    })

    results.push({
      step: '3. RPC Function (get_customer_wallet)',
      success: !rpcError && !!rpcData,
      data: rpcData,
      error: rpcError?.message
    })

    // Step 4: Check transactions
    const { data: txnData, error: txnError, count } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .limit(5)

    results.push({
      step: '4. Wallet Transactions',
      success: !txnError,
      data: { count, transactions: txnData },
      error: txnError?.message
    })

    // Step 5: Check topup requests
    const { data: topupData, error: topupError } = await supabase.rpc('get_topup_requests_by_user', {
      p_user_id: user.id,
      p_limit: 5
    })

    results.push({
      step: '5. Topup Requests',
      success: !topupError,
      data: topupData,
      error: topupError?.message
    })

  } catch (err) {
    results.push({
      step: 'Exception',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }

  return results
}

export function printDebugResults(results: WalletDebugResult[]): void {
  console.log('='.repeat(60))
  console.log('WALLET DEBUG RESULTS')
  console.log('='.repeat(60))
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.step}`)
    console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    if (result.data) {
      console.log('   Data:', result.data)
    }
    
    if (result.error) {
      console.log('   Error:', result.error)
    }
  })
  
  console.log('\n' + '='.repeat(60))
}

// Make it available in browser console
if (typeof window !== 'undefined') {
  (window as any).debugWallet = debugWalletSystem;
  (window as any).printDebugResults = printDebugResults;
}
