#!/bin/bash

# Apply Customer Home Fixes
# Date: 2024-12-25

echo "🔧 Applying Customer Home Fixes..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from thai-ride-app directory"
  exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI not found. Please install it first:"
  echo "   npm install -g supabase"
  exit 1
fi

echo "📊 Step 1: Checking Supabase connection..."
if ! supabase status &> /dev/null; then
  echo "⚠️  Supabase not running. Starting local instance..."
  supabase start
fi

echo ""
echo "🗄️  Step 2: Applying database fixes..."
echo ""

# Apply the fix script
if [ -f "scripts/fix-customer-home-issues.sql" ]; then
  supabase db execute -f scripts/fix-customer-home-issues.sql
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database fixes applied successfully!"
  else
    echo ""
    echo "❌ Error applying database fixes"
    exit 1
  fi
else
  echo "❌ Fix script not found: scripts/fix-customer-home-issues.sql"
  exit 1
fi

echo ""
echo "🎉 All fixes applied successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Navigate to http://localhost:5173/customer"
echo "4. Check console - should see no errors!"
echo ""
echo "📚 See CUSTOMER_HOME_FIXES_COMPLETE.md for details"
echo ""
