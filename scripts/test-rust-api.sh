#!/bin/bash

# Yes Sessions - Integration Test Script
# Tests Rust backend API endpoints

set -e

BASE_URL="http://localhost:3000"
TEST_RESULTS=()

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
test_api() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TEST_RESULTS+=("✓ $name: PASS")
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got HTTP $http_code)"
        echo "Response: $body"
        TEST_RESULTS+=("✗ $name: FAIL (HTTP $http_code)")
        return 1
    fi
}

test_api_with_data() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        # Check if response has data
        if echo "$body" | jq -e '.success == true' > /dev/null 2>&1; then
            data_count=$(echo "$body" | jq -r '.data | length' 2>/dev/null || echo "N/A")
            echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code, data: $data_count)"
            TEST_RESULTS+=("✓ $name: PASS (items: $data_count)")
            return 0
        else
            echo -e "${YELLOW}⚠ WARN${NC} (HTTP $http_code, but no success flag)"
            TEST_RESULTS+=("⚠ $name: WARN (no success flag)")
            return 0
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got HTTP $http_code)"
        TEST_RESULTS+=("✗ $name: FAIL (HTTP $http_code)")
        return 1
    fi
}

echo "========================================="
echo "Yes Sessions Integration Test Suite"
echo "========================================="
echo ""

# 1. Health Check
echo "1. Health Check Tests"
echo "----------------------"
test_api "Health Check" "/health"
echo ""

# 2. Session Query Tests
echo "2. Session Query Tests"
echo "----------------------"
test_api_with_data "OpenCode Sessions" "/api/sessions/opencode"
test_api_with_data "Claude Sessions" "/api/sessions/claude"
test_api_with_data "CodeBuddy Sessions" "/api/sessions/codebuddy"
echo ""

# 3. Session Stats Tests
echo "3. Session Stats Tests"
echo "----------------------"
test_api_with_data "OpenCode Stats" "/api/sessions/stats/opencode"
test_api_with_data "Claude Stats" "/api/sessions/stats/claude"
test_api_with_data "CodeBuddy Stats" "/api/sessions/stats/codebuddy"
echo ""

# 4. Settings Tests
echo "4. Settings Tests"
echo "----------------------"
test_api_with_data "Get Settings" "/api/settings"
echo ""

# 5. File Operation Tests
echo "5. File Operation Tests"
echo "----------------------"
test_api_with_data "Read Text File" "/api/file/read?file_path=/Users/krabswang/Personal/yes-sessions/package.json"
test_api_with_data "Read Directory Tree" "/api/tree?dir_path=/Users/krabswang/Personal/yes-sessions/src"
echo ""

# 6. Shell API Tests (these will actually open apps, so we skip them)
echo "6. Shell API Tests"
echo "----------------------"
echo -e "${YELLOW}⊘ SKIP${NC} Shell.openExternal (would open browser)"
echo -e "${YELLOW}⊘ SKIP${NC} Shell.openPath (would open file manager)"
TEST_RESULTS+=("⊘ Shell API: SKIP (interactive)")
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
done
echo ""

passed=$(echo "${TEST_RESULTS[@]}" | grep -o "✓" | wc -l | tr -d ' ')
failed=$(echo "${TEST_RESULTS[@]}" | grep -o "✗" | wc -l | tr -d ' ')
skipped=$(echo "${TEST_RESULTS[@]}" | grep -o "⊘" | wc -l | tr -d ' ')

echo "Total: ${#TEST_RESULTS[@]} tests"
echo -e "${GREEN}Passed: $passed${NC}"
if [ "$failed" -gt 0 ]; then
    echo -e "${RED}Failed: $failed${NC}"
else
    echo "Failed: 0"
fi
echo -e "${YELLOW}Skipped: $skipped${NC}"
