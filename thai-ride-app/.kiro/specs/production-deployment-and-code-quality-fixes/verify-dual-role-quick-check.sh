#!/bin/bash

# ============================================================================
# Dual-Role System Quick Verification Script
# ============================================================================
# This script provides a quick way to verify dual-role system integrity
# by checking migration files and code patterns.
#
# Requirements: 12.1, 12.2, 12.3
# ============================================================================

set -e

echo "============================================================================"
echo "DUAL-ROLE SYSTEM QUICK VERIFICATION"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# ============================================================================
# SECTION 1: Check Migration Files for providers_v2.user_id
# ============================================================================

echo "1. Checking migration files for providers_v2.user_id column..."
echo "-------------------------------------------------------------------"

if grep -r "providers_v2" supabase/migrations/ | grep -q "user_id"; then
    echo -e "${GREEN}✓ PASS${NC}: Found providers_v2.user_id in migrations"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: providers_v2.user_id NOT found in migrations"
    echo "  Action: Create migration to add user_id column"
    ((FAIL++))
fi

echo ""

# ============================================================================
# SECTION 2: Check for Dual-Role JOIN Pattern in Migrations
# ============================================================================

echo "2. Checking for dual-role JOIN pattern in migrations..."
echo "-------------------------------------------------------------------"

if grep -r "providers_v2" supabase/migrations/ | grep -q "user_id = auth.uid()"; then
    echo -e "${GREEN}✓ PASS${NC}: Found dual-role JOIN pattern (providers_v2.user_id = auth.uid())"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Dual-role JOIN pattern not found in migrations"
    echo "  Note: This may be okay if policies are defined elsewhere"
    ((WARN++))
fi

echo ""

# ============================================================================
# SECTION 3: Check for Anti-Pattern (Direct provider_id = auth.uid())
# ============================================================================

echo "3. Checking for anti-pattern (direct provider_id = auth.uid())..."
echo "-------------------------------------------------------------------"

# Check migrations
ANTI_PATTERN_COUNT=$(grep -r "provider_id.*auth\.uid()" supabase/migrations/ | grep -v "providers_v2" | wc -l | tr -d ' ')

if [ "$ANTI_PATTERN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: No anti-pattern found in migrations"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}: Found $ANTI_PATTERN_COUNT instances of anti-pattern in migrations"
    echo "  Pattern: provider_id = auth.uid() WITHOUT providers_v2 JOIN"
    echo "  Action: Update policies to use dual-role JOIN"
    ((FAIL++))
    
    echo ""
    echo "  Files with anti-pattern:"
    grep -r "provider_id.*auth\.uid()" supabase/migrations/ | grep -v "providers_v2" | cut -d: -f1 | sort -u
fi

echo ""

# ============================================================================
# SECTION 4: Check Composables for Dual-Role Awareness
# ============================================================================

echo "4. Checking composables for dual-role awareness..."
echo "-------------------------------------------------------------------"

# Check if composables reference providers_v2
if grep -r "providers_v2" src/composables/ 2>/dev/null | grep -q "user_id"; then
    echo -e "${GREEN}✓ PASS${NC}: Composables reference providers_v2.user_id"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Composables may not be dual-role aware"
    echo "  Note: Check if provider-related composables handle user_id correctly"
    ((WARN++))
fi

echo ""

# ============================================================================
# SECTION 5: Check for Storage Policy Patterns
# ============================================================================

echo "5. Checking for storage policy patterns..."
echo "-------------------------------------------------------------------"

if grep -r "storage\.objects" supabase/migrations/ | grep -q "providers_v2"; then
    echo -e "${GREEN}✓ PASS${NC}: Storage policies use dual-role pattern"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Storage policies may not use dual-role pattern"
    echo "  Note: Check ride-evidence and provider-documents bucket policies"
    ((WARN++))
fi

echo ""

# ============================================================================
# SECTION 6: List Relevant Migration Files
# ============================================================================

echo "6. Listing relevant migration files..."
echo "-------------------------------------------------------------------"

echo "Migrations mentioning providers_v2:"
grep -l "providers_v2" supabase/migrations/*.sql 2>/dev/null | sort || echo "  None found"

echo ""

echo "Migrations mentioning RLS policies:"
grep -l "CREATE POLICY\|ALTER POLICY" supabase/migrations/*.sql 2>/dev/null | tail -5 || echo "  None found"

echo ""

# ============================================================================
# SECTION 7: Summary
# ============================================================================

echo "============================================================================"
echo "VERIFICATION SUMMARY"
echo "============================================================================"
echo ""
echo -e "Results:"
echo -e "  ${GREEN}✓ PASS${NC}: $PASS checks"
echo -e "  ${RED}✗ FAIL${NC}: $FAIL checks"
echo -e "  ${YELLOW}⚠ WARN${NC}: $WARN checks"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Overall: PASS${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run SQL verification scripts in Supabase Dashboard"
    echo "  2. Execute verify-dual-role-1-column-exists.sql"
    echo "  3. Execute verify-dual-role-2-rls-policies.sql"
    echo "  4. Execute verify-dual-role-3-storage-policies.sql"
else
    echo -e "${RED}✗ Overall: FAIL${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Review failed checks above"
    echo "  2. Create migrations to fix issues"
    echo "  3. Follow patterns in DUAL-ROLE-SYSTEM-VERIFICATION.md"
    echo "  4. Re-run this script after fixes"
fi

echo ""
echo "For detailed verification, see:"
echo "  - DUAL-ROLE-SYSTEM-VERIFICATION.md"
echo "  - verify-dual-role-system.sql"
echo "  - .kiro/steering/mcp-automation.md"
echo ""
echo "============================================================================"

# Exit with error if any checks failed
if [ $FAIL -gt 0 ]; then
    exit 1
else
    exit 0
fi
