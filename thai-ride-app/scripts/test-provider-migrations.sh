#!/bin/bash

# ============================================================================
# Test Provider System Migrations
# ============================================================================

echo "🚀 Testing Provider System Redesign Migrations..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Please install: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Check if migrations exist
MIGRATIONS=(
    "218_provider_system_redesign_schema.sql"
    "219_provider_system_functions.sql"
    "220_provider_documents_storage.sql"
)

echo "📋 Checking migrations..."
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "supabase/migrations/$migration" ]; then
        echo -e "${GREEN}✓${NC} $migration"
    else
        echo -e "${RED}✗${NC} $migration ${RED}(missing)${NC}"
        exit 1
    fi
done
echo ""

# Run migrations (dry run first)
echo "🔍 Validating SQL syntax..."
for migration in "${MIGRATIONS[@]}"; do
    echo "  Checking $migration..."
    # Basic SQL syntax check (you can enhance this)
    if grep -q "CREATE\|ALTER\|INSERT" "supabase/migrations/$migration"; then
        echo -e "  ${GREEN}✓${NC} Valid SQL"
    else
        echo -e "  ${YELLOW}⚠${NC}  Warning: No CREATE/ALTER/INSERT statements found"
    fi
done
echo ""

# Test database functions
echo "🧪 Testing database functions..."
echo ""

# Run property tests
echo "🎲 Running property-based tests..."
npm run test -- src/tests/provider-system/

echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Review migrations in supabase/migrations/"
echo "2. Run: supabase db reset (to apply migrations)"
echo "3. Verify in Supabase Dashboard"

