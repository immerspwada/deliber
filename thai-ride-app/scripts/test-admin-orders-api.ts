/**
 * Test script for Admin Orders API
 * Run with: npx ts-node scripts/test-admin-orders-api.ts
 * Or copy to browser console
 */

// Browser console version - copy this to test in browser
const testAdminOrdersAPI = async () => {
  console.log('=== Testing Admin Orders API ===');
  
  // Get Supabase client from window (if available in Vue app)
  const supabaseUrl = 'https://onsflqhkgqhydeupiqyt.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk';
  
  // Test 1: Direct fetch to RPC endpoint
  console.log('\n--- Test 1: Direct fetch to RPC endpoint ---');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_all_orders_for_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        p_type: null,
        p_status: null,
        p_limit: 10,
        p_offset: 0
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data length:', Array.isArray(data) ? data.length : 'not array');
    console.log('First item:', data[0]);
  } catch (error) {
    console.error('Test 1 failed:', error);
  }
  
  // Test 2: Count function
  console.log('\n--- Test 2: Count function ---');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/count_all_orders_for_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        p_type: null,
        p_status: null
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Count:', data);
  } catch (error) {
    console.error('Test 2 failed:', error);
  }
  
  console.log('\n=== Tests Complete ===');
};

// Run test
testAdminOrdersAPI();
