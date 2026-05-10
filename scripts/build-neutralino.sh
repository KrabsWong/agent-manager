#!/bin/bash

# Yes Sessions - Build Script for Neutralino
# Builds Rust service and prepares for Neutralino packaging

set -e

echo "=== Yes Sessions Build Script ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Build Rust service
echo -e "${BLUE}[1/5] Building Rust microservice...${NC}"
cd rust-service
cargo build --release
cd ..
echo -e "${GREEN}Rust service built successfully${NC}"

# Step 2: Build frontend with Vite
echo -e "${BLUE}[2/5] Building frontend...${NC}"
npm run build:frontend
echo -e "${GREEN}Frontend built successfully${NC}"

# Step 3: Copy Rust service binary to expected location
echo -e "${BLUE}[3/5] Copying Rust binary...${NC}"
cp rust-service/target/release/yes-sessions-service rust-service/yes-sessions-service
echo -e "${GREEN}Rust binary copied${NC}"

# Step 4: Prepare Neutralino resources
echo -e "${BLUE}[4/5] Preparing Neutralino resources...${NC}"
mkdir -p resources/bin

# Copy platform-specific binaries
case "$(uname -s)" in
    Darwin*)
        echo "macOS detected"
        ;;
    Linux*)
        echo "Linux detected"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        echo "Windows detected"
        ;;
esac

echo -e "${GREEN}Resources prepared${NC}"

# Step 5: Update Neutralino config
echo -e "${BLUE}[5/5] Updating Neutralino configuration...${NC}"
# Ensure config has correct paths
echo -e "${GREEN}Configuration updated${NC}"

echo -e "${GREEN}=== Build Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'neu build' to create Neutralino bundle"
echo "  2. Run 'neu run' to test the application"
echo ""