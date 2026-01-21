#!/bin/bash
# ============================================================================
# Auto Generate TypeScript Types from Supabase
# ============================================================================
#
# Role Impact Analysis (3 บริบท):
#
# 👤 Customer: Type-safe API calls, better autocomplete in IDE
# 🚗 Provider: Type-safe job data, prevent runtime errors
# 👑 Admin: Type-safe admin queries, reliable data handling
#
# Usage:
#   ./scripts/generate-types.sh [--local|--production]
#
# Examples:
#   ./scripts/generate-types.sh              # Auto-detect (prefer production)
#   ./scripts/generate-types.sh --local      # Generate from local Supabase
#   ./scripts/generate-types.sh --production # Generate from production
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_PROJECT_ID="${SUPABASE_PROJECT_ID:-onsflqhkgqhydeupiqyt}"
OUTPUT_FILE="src/types/database.ts"
BACKUP_FILE="src/types/database.ts.backup"

echo -e "${BLUE}📝 TypeScript Type Generator${NC}"
echo "=================================="

# Parse arguments
SOURCE="auto"
while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            SOURCE="local"
            shift
            ;;
        --production)
            SOURCE="production"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Backup existing types
backup_types() {
    if [ -f "$OUTPUT_FILE" ]; then
        cp "$OUTPUT_FILE" "$BACKUP_FILE"
        echo -e "${YELLOW}📦 Backed up existing types to $BACKUP_FILE${NC}"
    fi
}

# Generate from local
generate_local() {
    echo -e "${YELLOW}🔄 Generating types from local Supabase...${NC}"
    
    # Check if local is running
    if ! npx supabase status 2>/dev/null | grep -q "API URL"; then
        echo -e "${RED}❌ Local Supabase not running${NC}"
        echo -e "${YELLOW}💡 Run: npx supabase start${NC}"
        return 1
    fi
    
    npx supabase gen types typescript --local > "$OUTPUT_FILE"
    echo -e "${GREEN}✅ Types generated from local${NC}"
}

# Generate from production
generate_production() {
    echo -e "${YELLOW}🔄 Generating types from production...${NC}"
    
    # Check if we have access token
    if ! npx supabase projects list 2>/dev/null | grep -q "$PRODUCTION_PROJECT_ID"; then
        echo -e "${YELLOW}⚠️  Not authenticated or project not found${NC}"
        echo -e "${YELLOW}💡 Run: npx supabase login${NC}"
        return 1
    fi
    
    npx supabase gen types typescript --project-id "$PRODUCTION_PROJECT_ID" > "$OUTPUT_FILE"
    echo -e "${GREEN}✅ Types generated from production${NC}"
}

# Auto-detect best source
auto_generate() {
    echo -e "${YELLOW}🔍 Auto-detecting best source...${NC}"
    
    # Try production first
    if generate_production 2>/dev/null; then
        return 0
    fi
    
    # Fall back to local
    echo -e "${YELLOW}⚠️  Production unavailable, trying local...${NC}"
    if generate_local 2>/dev/null; then
        return 0
    fi
    
    echo -e "${RED}❌ Could not generate types from any source${NC}"
    return 1
}

# Add custom types header
add_custom_header() {
    local temp_file=$(mktemp)
    
    cat > "$temp_file" << 'EOF'
/**
 * Auto-generated TypeScript types from Supabase schema
 * 
 * Role Impact (3 บริบท):
 * - 👤 Customer: Type-safe booking, profile, ride data
 * - 🚗 Provider: Type-safe job, earnings, location data
 * - 👑 Admin: Type-safe analytics, user management
 * 
 * DO NOT EDIT MANUALLY - Run: ./scripts/generate-types.sh
 * Generated at: TIMESTAMP_PLACEHOLDER
 */

EOF
    
    # Replace timestamp
    sed -i '' "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$temp_file" 2>/dev/null || \
    sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$temp_file"
    
    # Append generated types
    cat "$OUTPUT_FILE" >> "$temp_file"
    mv "$temp_file" "$OUTPUT_FILE"
}

# Main execution
backup_types

case $SOURCE in
    local)
        generate_local
        ;;
    production)
        generate_production
        ;;
    auto)
        auto_generate
        ;;
esac

# Add custom header
add_custom_header

# Show summary
echo -e "\n${BLUE}📊 Generated Types Summary:${NC}"
echo "File: $OUTPUT_FILE"
echo "Size: $(wc -c < "$OUTPUT_FILE" | tr -d ' ') bytes"
echo "Tables: $(grep -c "Row:" "$OUTPUT_FILE" 2>/dev/null || echo "N/A")"

echo -e "\n${GREEN}✅ Done!${NC}"
echo -e "${YELLOW}💡 Remember to commit the updated types${NC}"
