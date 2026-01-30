#!/usr/bin/env node

/**
 * Verify Cache Cleared - Admin Customers History Button
 * =====================================================
 * Run this in browser console to verify cache is cleared
 */

console.log('🔍 Verifying Admin Customers Cache Status...\n');

// Check 1: Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length === 0) {
      console.log('✅ Service Workers: CLEARED (0 registered)');
    } else {
      console.log(`❌ Service Workers: ${registrations.length} still registered`);
      console.log('   Action: Go to DevTools → Application → Service Workers → Unregister all');
    }
  });
} else {
  console.log('ℹ️  Service Workers: Not supported');
}

// Check 2: Local Storage
const localStorageSize = Object.keys(localStorage).length;
if (localStorageSize === 0) {
  console.log('✅ Local Storage: CLEARED (0 items)');
} else {
  console.log(`⚠️  Local Storage: ${localStorageSize} items (may be OK if auth data)`);
}

// Check 3: Session Storage
const sessionStorageSize = Object.keys(sessionStorage).length;
if (sessionStorageSize === 0) {
  console.log('✅ Session Storage: CLEARED (0 items)');
} else {
  console.log(`⚠️  Session Storage: ${sessionStorageSize} items`);
}

// Check 4: Cache Storage
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    if (cacheNames.length === 0) {
      console.log('✅ Cache Storage: CLEARED (0 caches)');
    } else {
      console.log(`❌ Cache Storage: ${cacheNames.length} caches still exist`);
      console.log('   Caches:', cacheNames);
      console.log('   Action: Go to DevTools → Application → Cache Storage → Delete all');
    }
  });
} else {
  console.log('ℹ️  Cache Storage: Not supported');
}

// Check 5: IndexedDB
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    if (databases.length === 0) {
      console.log('✅ IndexedDB: CLEARED (0 databases)');
    } else {
      console.log(`⚠️  IndexedDB: ${databases.length} databases (may be OK if Supabase data)`);
    }
  }).catch(() => {
    console.log('ℹ️  IndexedDB: Cannot check (may require permissions)');
  });
} else {
  console.log('ℹ️  IndexedDB: Not supported');
}

// Check 6: Current Page Cache Status
console.log('\n📄 Current Page:');
console.log('   URL:', window.location.href);
console.log('   Reload to verify fresh load');

// Check 7: History Button Verification
setTimeout(() => {
  console.log('\n🔍 Checking for History Button...');
  
  const historyButtons = document.querySelectorAll('.btn-history, .action-btn.history-btn, button[aria-label*="ประวัติ"]');
  
  if (historyButtons.length > 0) {
    console.log(`✅ History Button: FOUND (${historyButtons.length} buttons)`);
    console.log('   Success! Cache is cleared and button is visible.');
  } else {
    console.log('❌ History Button: NOT FOUND');
    console.log('   Action: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
  }
  
  // Check HTML structure
  const actionCells = document.querySelectorAll('.td-actions, .actions-cell');
  if (actionCells.length > 0) {
    const firstCell = actionCells[0];
    const classes = firstCell.className;
    console.log('\n📋 Button Container Class:', classes);
    
    if (classes.includes('td-actions')) {
      console.log('   ✅ Using NEW structure (td-actions)');
    } else if (classes.includes('actions-cell')) {
      console.log('   ❌ Using OLD structure (actions-cell)');
      console.log('   Action: Cache not cleared! Run NUCLEAR-CACHE-FIX.sh');
    }
  }
}, 1000);

console.log('\n⏳ Checking DOM in 1 second...');
