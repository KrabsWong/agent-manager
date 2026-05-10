#!/bin/bash

# Yes Sessions - Performance Benchmark Script
# Benchmarks Rust backend performance

BASE_URL="http://localhost:3000"
ITERATIONS=10

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

benchmark() {
    local name="$1"
    local endpoint="$2"
    local iterations="${3:-$ITERATIONS}"
    
    echo -e "${BLUE}Benchmarking: $name${NC}"
    echo "Iterations: $iterations"
    
    total_time=0
    min_time=999999
    max_time=0
    
    for i in $(seq 1 $iterations); do
        start_time=$(python3 -c "import time; print(int(time.time() * 1000000))")
        curl -s "$BASE_URL$endpoint" > /dev/null
        end_time=$(python3 -c "import time; print(int(time.time() * 1000000))")
        
        elapsed=$((end_time - start_time))
        elapsed_ms=$(echo "scale=2; $elapsed / 1000" | bc)
        
        total_time=$(echo "$total_time + $elapsed_ms" | bc)
        
        if (( $(echo "$elapsed_ms < $min_time" | bc -l) )); then
            min_time=$elapsed_ms
        fi
        
        if (( $(echo "$elapsed_ms > $max_time" | bc -l) )); then
            max_time=$elapsed_ms
        fi
    done
    
    avg_time=$(echo "scale=2; $total_time / $iterations" | bc)
    
    echo -e "  ${GREEN}Average:${NC} ${avg_time}ms"
    echo "  Min: ${min_time}ms"
    echo "  Max: ${max_time}ms"
    echo ""
}

echo "========================================="
echo "Yes Sessions Performance Benchmark"
echo "========================================="
echo "Backend: Rust (Actix-web)"
echo "URL: $BASE_URL"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. Session Query Performance
echo "1. Session Query Performance"
echo "----------------------------------------"
benchmark "OpenCode Sessions (Large Dataset)" "/api/sessions/opencode" 10
benchmark "Claude Sessions (Medium Dataset)" "/api/sessions/claude" 10
benchmark "CodeBuddy Sessions (Small Dataset)" "/api/sessions/codebuddy" 10

# 2. File Operation Performance
echo "2. File Operation Performance"
echo "----------------------------------------"
benchmark "Read Small File (package.json)" "/api/file/read?file_path=/Users/krabswang/Personal/yes-sessions/package.json" 20
benchmark "Read Large File (README.md)" "/api/file/read?file_path=/Users/krabswang/Personal/yes-sessions/README.md" 20

# 3. Directory Tree Performance
echo "3. Directory Tree Performance"
echo "----------------------------------------"
benchmark "Shallow Tree (src/)" "/api/tree?dir_path=/Users/krabswang/Personal/yes-sessions/src" 10
benchmark "Deep Tree (rust-service/)" "/api/tree?dir_path=/Users/krabswang/Personal/yes-sessions/rust-service" 10

# 4. Settings Performance
echo "4. Settings Performance"
echo "----------------------------------------"
benchmark "Get Settings" "/api/settings" 20

# 5. Health Check Performance
echo "5. Health Check Performance"
echo "----------------------------------------"
benchmark "Health Check" "/health" 50

echo "========================================="
echo "Benchmark Complete"
echo "========================================="
echo ""
echo "Note: All times are in milliseconds (ms)"
echo "Lower is better ⬇️"
