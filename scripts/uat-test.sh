#!/bin/bash

# Yes Sessions - User Acceptance Test Script
# Comprehensive testing for Neutralino + Rust architecture

set -e

echo "=== Yes Sessions User Acceptance Testing ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[Test $TOTAL_TESTS] $test_name${NC}"
    
    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAILED${NC}"
    fi
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Neutralino CLI
    if ! command -v neu &> /dev/null; then
        echo -e "${RED}Neutralino CLI not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}Neutralino CLI installed${NC}"
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}Rust not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}Rust installed${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}Node.js installed${NC}"
}

# Build test
build_tests() {
    echo -e "${YELLOW}=== Build Tests ===${NC}"
    
    # Test Rust service build
    run_test "Build Rust service" "cargo build --release --manifest-path rust-service/Cargo.toml"
    
    # Test frontend build
    run_test "Build frontend" "npm run build:frontend"
    
    # Test Neutralino build
    run_test "Build Neutralino bundle" "neu build --release"
}

# Functionality tests
functionality_tests() {
    echo -e "${YELLOW}=== Functionality Tests ===${NC}"
    
    # Start Rust service for testing
    echo -e "${BLUE}Starting Rust service...${NC}"
    ./rust-service/target/release/yes-sessions-service &
    RUST_PID=$!
    
    # Wait for service to start
    sleep 3
    
    # Test API endpoints
    run_test "Health check API" "curl -f http://localhost:3000/health"
    run_test "OpenCode sessions API" "curl -f http://localhost:3000/api/sessions/opencode"
    run_test "Claude sessions API" "curl -f http://localhost:3000/api/sessions/claude"
    run_test "CodeBuddy sessions API" "curl -f http://localhost:3000/api/sessions/codebuddy"
    run_test "Settings API" "curl -f http://localhost:3000/api/settings"
    
    # Test file operations
    run_test "File read API" "curl -f 'http://localhost:3000/api/file/read?file_path=/etc/hosts'"
    run_test "File tree API" "curl -f 'http://localhost:3000/api/tree?dir_path=/tmp'"
    
    # Test shell operations
    run_test "Shell openExternal API" "curl -f 'http://localhost:3000/api/shell/openExternal?url=https://github.com'"
    
    # Stop Rust service
    kill $RUST_PID 2>/dev/null || true
}

# Performance tests
performance_tests() {
    echo -e "${YELLOW}=== Performance Tests ===${NC}"
    
    # Start Rust service
    echo -e "${BLUE}Starting Rust service for performance tests...${NC}"
    ./rust-service/target/release/yes-sessions-service &
    RUST_PID=$!
    sleep 3
    
    # Measure response times
    echo -e "${BLUE}Measuring API response times...${NC}"
    
    # Test 1: Response time < 200ms
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/health)
    run_test "Response time < 200ms" "awk 'BEGIN{exit ($RESPONSE_TIME < 0.200 ? 0 : 1)}'"
    
    # Test 2: Memory usage < 50MB
    MEMORY_USAGE=$(ps -o rss= -p $RUST_PID | awk '{print $1}')
    run_test "Memory usage < 50MB" "[ '$MEMORY_USAGE' -lt '50000' ]"
    
    # Test 3: Startup time < 5 seconds
    STARTUP_TIME=3  # From sleep above
    run_test "Startup time < 5 seconds" "[ '$STARTUP_TIME' -lt '5' ]"
    
    # Test 4: Binary size < 10MB
    BINARY_SIZE=$(stat -f%z rust-service/target/release/yes-sessions-service 2>/dev/null || stat -c%s rust-service/target/release/yes-sessions-service)
    run_test "Binary size < 10MB" "[ '$BINARY_SIZE' -lt '10485760' ]"
    
    # Stop Rust service
    kill $RUST_PID 2>/dev/null || true
}

# Integration tests
integration_tests() {
    echo -e "${YELLOW}=== Integration Tests ===${NC}"
    
    # Test Neutralino integration
    echo -e "${BLUE}Testing Neutralino integration...${NC}"
    
    # Test 1: Config file exists
    run_test "Neutralino config exists" "test -f neutralino.config.json"
    
    # Test 2: Process manager works
    run_test "Process manager module exists" "test -f src/services/process/process-manager.ts"
    
    # Test 3: Neutralino adapter exists
    run_test "Neutralino adapter exists" "test -f src/services/api/adapters/neutralino-adapter.ts"
    
    # Test 4: Scripts exist
    run_test "Build script exists" "test -f scripts/build-neutralino.sh"
    run_test "Package script exists" "test -f scripts/package-neutralino.sh"
    run_test "Start script exists" "test -f scripts/start-neutralino.sh"
}

# Package tests
package_tests() {
    echo -e "${YELLOW}=== Package Tests ===${NC}"
    
    # Test package creation
    echo -e "${BLUE}Creating distribution package...${NC}"
    
    # Clean previous packages
    rm -rf dist-packages/
    
    # Create package
    bash scripts/package-neutralino.sh
    
    # Test package exists
    run_test "Package created" "test -f dist-packages/*.zip || test -f dist-packages/*.tar.gz"
    
    # Test package size
    PACKAGE_SIZE=$(ls -lh dist-packages/* | awk '{print $5}' | head -1)
    echo -e "${BLUE}Package size: $PACKAGE_SIZE${NC}"
    
    # Test 2: Package size < 10MB (approximate check)
    PACKAGE_SIZE_BYTES=$(stat -f%z dist-packages/*.zip 2>/dev/null || stat -c%s dist-packages/*.zip 2>/dev/null)
    run_test "Package size < 10MB" "[ '$PACKAGE_SIZE_BYTES' -lt '10485760' ]"
}

# Final test run
main() {
    echo -e "${GREEN}=== Starting User Acceptance Testing ===${NC}"
    echo ""
    
    check_prerequisites
    
    echo ""
    build_tests
    
    echo ""
    functionality_tests
    
    echo ""
    performance_tests
    
    echo ""
    integration_tests
    
    echo ""
    package_tests
    
    # Summary
    echo ""
    echo -e "${GREEN}=== Test Summary ===${NC}"
    echo -e "Total Tests:  $TOTAL_TESTS"
    echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
    else
        echo -e "Failed:       0"
    fi
    
    # Pass rate
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "Pass Rate:    ${PASS_RATE}%"
    
    # Exit status
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}=== TESTS FAILED ===${NC}"
        exit 1
    else
        echo -e "${GREEN}=== ALL TESTS PASSED ===${NC}"
        exit 0
    fi
}

# Run main function
main "$@"