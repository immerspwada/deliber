#!/bin/bash
# ============================================================================
# Schema Sync Script - Compare Local vs Production Supabase Schema
# ============================================================================
#
# Role Impact Analysis (3 บริบท):
#
# 👤 Customer: ไม่มีผลกระทบโดยตรง (เป็น dev tool)
# 🚗 Provider: ไม่มีผลกระทบโดยตรง (เป็น dev tool)
# 👑 Admin/Dev: ช่วยตรวจสอบ schema differences ก่อน deploy
#
# Usage:
#   ./scripts/schema-sync.sh [table_name]
#
# Examples:
#   ./scripts/schema-sync.sh                    # Compare all tables
#   ./scripts/schema-sync.sh ride_requests      # Compare specific table
#   ./scripts/schema-sync.sh --generate-types   # Generate types from production
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_PROJECT_ID="${SUPABASE_PROJECT_ID:-onsflqhkgqhydeupiqyt}"
OUTPUT_DIR="./schema-diff"

echo -e "${BLUE}🔄 Schema Sync Tool${NC}"
echo "=================================="

# Check if supabase CLI is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

# Parse arguments
TABLE_NAME=""
GENERATE_TYPES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --generate-types)
            GENERATE_TYPES=true
            shift
            ;;
        *)
            TABLE_NAME="$1"
            shift
            ;;
    esac
done

# Function: Generate types from production
generate_types() {
    echo -e "${YELLOW}📝 Generating TypeScript types from production...${NC}"
    
    # Check if linked to production
    if ! npx supabase projects list 2>/dev/null | grep -q "$PRODUCTION_PROJECT_ID"; then
        echo -e "${YELLOW}⚠️  Not linked to production. Using local types.${NC}"
        npx supabase gen types typescript --local > src/types/database.ts
    else
        npx supabase gen types typescript --project-id "$PRODUCTION_PROJECT_ID" > src/types/database.ts
    fi
    
    echo -e "${GREEN}✅ Types generated: src/types/database.ts${NC}"
}

# Function: Compare schemas
compare_schemas() {
    echo -e "${YELLOW}🔍 Comparing schemas...${NC}"
    
    mkdir -p "$OUTPUT_DIR"
    
    # Get local schema
    echo "Getting local schema..."
    npx supabase db dump --local --schema public > "$OUTPUT_DIR/local_schema.sql" 2>/dev/null || {
        echo -e "${RED}❌ Failed to dump local schema. Is Supabase running locally?${NC}"
        echo -e "${YELLOW}💡 Run: npx supabase start${NC}"
        exit 1
    }
    
    # Get production schema (requires linking)
    echo "Getting production schema..."
    if npx supabase db dump --schema public > "$OUTPUT_DIR/production_schema.sql" 2>/dev/null; then
        echo -e "${GREEN}✅ Production schema retrieved${NC}"
    else
        echo -e "${YELLOW}⚠️  Cannot get production schema directly.${NC}"
        echo -e "${YELLOW}💡 Use MCP or Supabase Dashboard to compare${NC}"
        
        # Create a comparison report based on local only
        echo -e "\n${BLUE}📊 Local Schema Summary:${NC}"
        grep -E "^CREATE TABLE" "$OUTPUT_DIR/local_schema.sql" | head -20
        return
    fi
    
    # Compare
    echo -e "\n${BLUE}📊 Schema Differences:${NC}"
    if diff -u "$OUTPUT_DIR/production_schema.sql" "$OUTPUT_DIR/local_schema.sql" > "$OUTPUT_DIR/diff.txt" 2>/dev/null; then
        echo -e "${GREEN}✅ Schemas are identical${NC}"
    else
        echo -e "${YELLOW}⚠️  Differences found:${NC}"
        cat "$OUTPUT_DIR/diff.txt" | head -50
        echo -e "\n${YELLOW}Full diff saved to: $OUTPUT_DIR/diff.txt${NC}"
    fi
}

# Function: Check specific table
check_table() {
    local table="$1"
    echo -e "${YELLOW}🔍 Checking table: $table${NC}"
    
    # Query local
    echo -e "\n${BLUE}Local columns:${NC}"
    npx supabase db execute --local "
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = '$table' AND table_schema = 'public'
        ORDER BY ordinal_position
    " 2>/dev/null || echo "Failed to query local"
    
    echo -e "\n${YELLOW}💡 To check production, use MCP:${NC}"
    echo "kiroPowers → execute_sql → SELECT column_name FROM information_schema.columns WHERE table_name = '$table'"
}

# Main execution
if [ "$GENERATE_TYPES" = true ]; then
    generate_types
elif [ -n "$TABLE_NAME" ]; then
    check_table "$TABLE_NAME"
else
    compare_schemas
fi

echo -e "\n${GREEN}✅ Done!${NC}"
