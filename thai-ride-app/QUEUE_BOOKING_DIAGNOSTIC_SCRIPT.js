/**
 * Queue Booking Wallet Balance - Diagnostic Script
 * 
 * Run this in browser console on /customer/queue-booking page
 * to diagnose wallet balance display issues
 */

async function diagnoseWalletBalance() {
  console.group('🔍 Queue Booking Wallet Balance Diagnostic');
  console.log('Running diagnostic checks...\n');

  // 1. Check Auth
  console.group('1️⃣ Authentication Check');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth Error:', authError);
    } else if (!user) {
      console.error('❌ No user logged in');
    } else {
      console.log('✅ User logged in');
      console.log('   Email:', user.email);
      console.log('   User ID:', user.id);
    }
  } catch (err) {
    console.error('❌ Auth check failed:', err);
  }
  console.groupEnd();

  // 2. Check Database
  console.group('2️⃣ Database Query Check');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('❌ Database Error:', error);
      } else {
        console.log('✅ Database query successful');
        console.log('   Raw balance:', data.wallet_balance);
        console.log('   Type:', typeof data.wallet_balance);
        console.log('   Parsed:', parseFloat(data.wallet_balance));
      }
    }
  } catch (err) {
    console.error('❌ Database check failed:', err);
  }
  console.groupEnd();

  // 3. Check Vue Component State
  console.group('3️⃣ Vue Component State Check');
  try {
    // Try to access Vue app
    const app = document.querySelector('#app');
    if (app && app.__vueParentComponent) {
      console.log('✅ Vue app found');
      console.log('   Check Vue DevTools for component state');
      console.log('   Look for: walletBalance.balance and walletBalance.formattedBalance');
    } else {
      console.warn('⚠️ Could not access Vue app');
      console.log('   Use Vue DevTools to inspect component state');
    }
  } catch (err) {
    console.error('❌ Vue check failed:', err);
  }
  console.groupEnd();

  // 4. Check DOM
  console.group('4️⃣ DOM Display Check');
  try {
    const walletValue = document.querySelector('.wallet-value');
    if (walletValue) {
      console.log('✅ Wallet value element found');
      console.log('   Displayed text:', walletValue.textContent);
      
      if (walletValue.textContent.includes('฿0.00')) {
        console.error('❌ PROBLEM: Displaying ฿0.00');
      } else {
        console.log('✅ Displaying non-zero value');
      }
    } else {
      console.warn('⚠️ Wallet value element not found');
      console.log('   Make sure you are on Step 4 (Confirmation)');
    }
  } catch (err) {
    console.error('❌ DOM check failed:', err);
  }
  console.groupEnd();

  // 5. Check Console Logs
  console.group('5️⃣ Console Logs Check');
  console.log('Look for these log patterns:');
  console.log('   🚀 [useWalletBalance] Composable initialized');
  console.log('   🔍 [useWalletBalance] Fetching wallet balance');
  console.log('   📦 [useWalletBalance] Raw wallet_balance from DB');
  console.log('   ✅ [useWalletBalance] Parsed string to number');
  console.log('   💰 [useWalletBalance] Final balance value');
  console.log('   💰 Balance changed in QueueBookingView');
  console.log('\nIf you don\'t see these logs, the composable might not be initializing correctly.');
  console.groupEnd();

  // 6. Summary
  console.group('📊 Summary');
  console.log('If you see ฿0.00 displayed but database has a value:');
  console.log('1. Check if [useWalletBalance] logs show correct value');
  console.log('2. Check Vue DevTools for walletBalance.balance.value');
  console.log('3. Try refreshing the page (Ctrl+Shift+R / Cmd+Shift+R)');
  console.log('4. Try clearing cache and logging in again');
  console.log('5. Share console logs with developer');
  console.groupEnd();

  console.groupEnd();
}

// Run diagnostic
diagnoseWalletBalance();

// Export for manual use
window.diagnoseWalletBalance = diagnoseWalletBalance;
console.log('\n💡 Tip: Run diagnoseWalletBalance() anytime to re-run diagnostic');
