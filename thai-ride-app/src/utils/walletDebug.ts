/**
 * Wallet Debug Utilities
 * ใช้สำหรับ debug wallet system ใน development mode เท่านั้น
 */

import { supabase } from '@/lib/supabase';

export interface WalletDebugResults {
  walletExists: boolean;
  walletBalance: number | null;
  transactionCount: number;
  pendingWithdrawals: number;
  lastTransaction: string | null;
  errors: string[];
}

/**
 * Debug wallet system - ตรวจสอบสถานะ wallet ของ user ปัจจุบัน
 */
export async function debugWalletSystem(): Promise<WalletDebugResults> {
  const results: WalletDebugResults = {
    walletExists: false,
    walletBalance: null,
    transactionCount: 0,
    pendingWithdrawals: 0,
    lastTransaction: null,
    errors: [],
  };

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      results.errors.push('ไม่พบ user ที่ login');
      return results;
    }

    // Check wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      results.errors.push(`Wallet error: ${walletError.message}`);
    } else if (wallet) {
      results.walletExists = true;
      results.walletBalance = wallet.balance;
    }

    // Check transactions
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet?.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (txError) {
      results.errors.push(`Transaction error: ${txError.message}`);
    } else {
      results.transactionCount = transactions?.length ?? 0;
      results.lastTransaction = transactions?.[0]?.created_at ?? null;
    }

    // Check pending withdrawals
    const { count: pendingCount, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (withdrawalError) {
      results.errors.push(`Withdrawal error: ${withdrawalError.message}`);
    } else {
      results.pendingWithdrawals = pendingCount ?? 0;
    }

  } catch (error) {
    results.errors.push(`Unexpected error: ${(error as Error).message}`);
  }

  return results;
}

/**
 * Print debug results to console
 */
export function printDebugResults(results: WalletDebugResults): void {
  console.group('🔍 Wallet Debug Results');
  console.log('Wallet exists:', results.walletExists);
  console.log('Balance:', results.walletBalance);
  console.log('Transaction count:', results.transactionCount);
  console.log('Pending withdrawals:', results.pendingWithdrawals);
  console.log('Last transaction:', results.lastTransaction);
  
  if (results.errors.length > 0) {
    console.warn('Errors:', results.errors);
  }
  
  console.groupEnd();
}
