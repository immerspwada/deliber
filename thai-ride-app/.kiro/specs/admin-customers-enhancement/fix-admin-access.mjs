#!/usr/bin/env node

/**
 * 🚀 MCP Auto-Fix: Admin Customers Access
 * 
 * This script automatically fixes the admin access issue by:
 * 1. Connecting to production Supabase
 * 2. Executing the fix SQL
 * 3. Verifying the results
 * 
 * Usage:
 *   node fix-admin-access.mjs
 * 
 * Requirements:
 *   - SUPABASE_ACCESS_TOKEN environment variable
 *   - Or run interactively to paste token
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = 'https://onsflqhkgqhydeupiqyt.supabase.co';
const PROJECT_REF = 'onsflqhkgqhydeupiqyt';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function getAccessToken() {
  // Try environment variable first
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }

  // Interactive mode
  log('\n📝 Supabase Access Token Required', 'yellow');
  log('Get your token from: https://supabase.com/dashboard/account/tokens', 'cyan');
  log('Or set SUPABASE_ACCESS_TOKEN environment variable\n', 'cyan');

  // For now, show instructions
  log('❌ No access token found!', 'red');
  log('\nTo run this script:', 'yellow');
  log('1. Get your access token from Supabase Dashboard', 'cyan');
  log('2. Run: SUPABASE_ACCESS_TOKEN=your_token node fix-admin-access.mjs', 'cyan');
  log('\nOr use the SQL Editor method (see MCP-PRODUCTION-FIX.sql)', 'yellow');
  
  process.exit(1);
}

async function executeSQLViaAPI(accessToken, sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function main() {
  logSection('🔌 MCP Auto-Fix: Admin Customers Access');

  try {
    // Step 1: Get access token
    log('\n📋 Step 1: Getting access token...', 'cyan');
    const accessToken = await getAccessToken();
    log('✅ Access token found', 'green');

    // Step 2: Load SQL
    log('\n📋 Step 2: Loading fix SQL...', 'cyan');
    const sqlPath = join(__dirname, 'MCP-PRODUCTION-FIX.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    log('✅ SQL loaded', 'green');

    // Step 3: Execute SQL
    log('\n📋 Step 3: Executing fix on production...', 'cyan');
    log('⏳ This may take a few seconds...', 'yellow');
    
    const result = await executeSQLViaAPI(accessToken, sql);
    log('✅ Fix executed successfully!', 'green');

    // Step 4: Verify
    log('\n📋 Step 4: Verifying results...', 'cyan');
    
    // Check admin user
    const checkAdmin = await executeSQLViaAPI(
      accessToken,
      "SELECT id, email, role FROM profiles WHERE email = 'superadmin@gobear.app'"
    );
    
    if (checkAdmin.length > 0 && checkAdmin[0].role === 'admin') {
      log('✅ Admin user verified: role = admin', 'green');
    } else {
      log('⚠️  Admin user not found or role incorrect', 'yellow');
    }

    // Check function
    const checkFunction = await executeSQLViaAPI(
      accessToken,
      "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'admin_get_customers'"
    );
    
    if (checkFunction.length > 0) {
      log('✅ Function admin_get_customers exists', 'green');
    } else {
      log('⚠️  Function not found', 'yellow');
    }

    // Success
    logSection('🎉 FIX COMPLETE!');
    log('\n✅ Admin access has been fixed', 'green');
    log('✅ Refresh your browser at: http://localhost:5173/admin/customers', 'cyan');
    log('\n');

  } catch (error) {
    logSection('❌ ERROR');
    log(`\n${error.message}`, 'red');
    log('\n💡 Alternative: Use SQL Editor method', 'yellow');
    log('   See: .kiro/specs/admin-customers-enhancement/MCP-PRODUCTION-FIX.sql', 'cyan');
    process.exit(1);
  }
}

main();
