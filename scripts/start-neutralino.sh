#!/bin/bash

# Yes Sessions - Neutralino Startup Script
# This script starts the application with proper process lifecycle management

set -e

echo "=== Yes Sessions v9.0.0 ==="
echo "Starting Neutralino application..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if Rust service is running
check_rust_service() {
    curl -s http://localhost:3000/health > /dev/null 2>&1
    return $?
}

# Function to start Rust service manually (fallback)
start_rust_service() {
    echo -e "${YELLOW}Starting Rust microservice...${NC}"
    
    # Build Rust service if not exists
    if [ ! -f "./rust-service/target/release/yes-sessions-service" ]; then
        echo -e "${YELLOW}Building Rust service...${NC}"
        cd rust-service
        cargo build --release
        cd ..
    fi
    
    # Start Rust service
    ./rust-service/target/release/yes-sessions-service &
    RUST_PID=$!
    echo -e "${GREEN}Rust service started with PID: $RUST_PID${NC}"
    
    # Wait for service to be ready
    echo -e "${YELLOW}Waiting for service to be ready...${NC}"
    for i in {1..30}; do
        if check_rust_service; then
            echo -e "${GREEN}Rust service is ready!${NC}"
            return 0
        fi
        sleep 0.1
    done
    
    echo -e "${RED}Failed to start Rust service${NC}"
    return 1
}

# Function to stop Rust service
stop_rust_service() {
    echo -e "${YELLOW}Stopping Rust microservice...${NC}"
    
    # Find and kill Rust service process
    if [ ! -z "$RUST_PID" ]; then
        kill $RUST_PID 2>/dev/null || true
        echo -e "${GREEN}Rust service stopped${NC}"
    fi
}

# Register cleanup handler
trap stop_rust_service EXIT INT TERM

# Main startup logic
main() {
    # Check if running in development mode
    if [ "$1" == "dev" ]; then
        echo -e "${YELLOW}Development mode${NC}"
        
        # Start Rust service
        start_rust_service
        
        # Wait a moment for service to stabilize
        sleep 1
        
        # Start Neutralino in dev mode
        echo -e "${GREEN}Starting Neutralino...${NC}"
        neu run
    else
        echo -e "${YELLOW}Production mode${NC}"
        
        # Neutralino will auto-start Rust service via extensions config
        echo -e "${GREEN}Starting Neutralino application...${NC}"
        neu run --release
    fi
}

# Run main function
main "$@"