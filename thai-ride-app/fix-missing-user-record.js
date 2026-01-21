import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://onsflqhkgqhydeupiqyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMissingUserRecord() {
  const email = 'ridertest@gmail.com'
  
  console.log('🔧 Fixing missing user record for:', email)
  console.log('=' .repeat(60))
  
  try {
    // Step 1: Try to sign in to get the user ID from auth
    console.log('📝 Please provide the password for', email)
    console.log('   (or we can create a new user record manually)')
    console.log('')
    
    // Alternative: Check if we can find the user by searching auth metadata
    // This requires service_role key, so we'll create the record manually
    
    console.log('💡 Solution Options:')
    console.log('')
    console.log('Option 1: Login and let the system create the record')
    console.log('   1. Go to http://localhost:5173/login')
    console.log('   2. Login with ridertest@gmail.com')
    console.log('   3. The trigger should create the user record automatically')
    console.log('')
    console.log('Option 2: Manually create user record (requires user_id from auth)')
    console.log('   Run this SQL in Supabase SQL Editor:')
    console.log('')
    console.log('   -- First, find the user_id from auth.users')
    console.log('   SELECT id, email FROM auth.users WHERE email = \'ridertest@gmail.com\';')
    console.log('')
    console.log('   -- Then insert into users table (replace USER_ID with actual ID)')
    console.log('   INSERT INTO users (id, email, role, name)')
    console.log('   VALUES (')
    console.log('     \'USER_ID\',  -- Replace with actual user ID from auth.users')
    console.log('     \'ridertest@gmail.com\',')
    console.log('     \'customer\',')
    console.log('     \'Rider Test\'')
    console.log('   );')
    console.log('')
    console.log('Option 3: Check if user exists in auth but not in users table')
    console.log('   This might indicate a trigger issue that needs to be fixed')
    console.log('')
    
    // Try to check if there's a way to verify auth user exists
    console.log('🔍 Attempting to verify if auth user exists...')
    
    // Try signing in with a test (this won't work without password)
    // But we can provide instructions
    
    console.log('')
    console.log('📋 Recommended Steps:')
    console.log('   1. Login at http://localhost:5173/login with ridertest@gmail.com')
    console.log('   2. If login succeeds, check browser console for errors')
    console.log('   3. If user record is still not created, check Supabase logs')
    console.log('   4. Verify the trigger "on_auth_user_created" is enabled')
    console.log('')
    console.log('🔍 To check trigger status, run this SQL:')
    console.log('   SELECT * FROM pg_trigger WHERE tgname = \'on_auth_user_created\';')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixMissingUserRecord()
