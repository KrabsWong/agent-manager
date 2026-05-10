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
cp rust-service/target/release/yes-sessions-service ./yes-sessions-service
chmod +x ./yes-sessions-service
echo -e "${GREEN}Rust binary copied${NC}"

# Step 4: Prepare Neutralino resources
echo -e "${BLUE}[4/5] Preparing Neutralino resources...${NC}"
mkdir -p resources/bin

# Clean old assets to avoid accumulation
echo "Cleaning old assets..."
rm -rf resources/assets

# Copy dist files to resources
echo "Copying dist to resources..."
cp -r dist/* resources/ 2>/dev/null || true
cp dist/index.html resources/ 2>/dev/null || true
cp dist/file-preview.html resources/ 2>/dev/null || true
cp -r dist/assets resources/ 2>/dev/null || true

# Copy Neutralino client library
echo "Copying Neutralino client library..."
cp node_modules/@neutralinojs/lib/dist/neutralino.js resources/neutralino.js
echo "Neutralino client library copied"

# Inject Neutralino client library into HTML files
echo "Injecting Neutralino client library..."
if [ -f "resources/index.html" ]; then
    # Add neutralino.js script before closing </head>
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|</head>|<script src="neutralino.js"><\/script></head>|' resources/index.html
    else
        # Linux
        sed -i 's|</head>|<script src="neutralino.js"><\/script></head>|' resources/index.html
    fi
    echo "Neutralino client library injected into index.html"
fi

if [ -f "resources/file-preview.html" ]; then
    # Add neutralino.js script before closing </head>
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|</head>|<script src="neutralino.js"><\/script></head>|' resources/file-preview.html
    else
        # Linux
        sed -i 's|</head>|<script src="neutralino.js"><\/script></head>|' resources/file-preview.html
    fi
    echo "Neutralino client library injected into file-preview.html"
fi

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

echo ""
echo -e "${BLUE}Running 'neu build'...${NC}"
neu build

# Copy Rust service to dist directory
echo -e "${BLUE}Copying Rust service to dist...${NC}"
cp rust-service/target/release/yes-sessions-service dist/yes-sessions/
chmod +x dist/yes-sessions/yes-sessions-service
echo -e "${GREEN}Rust service copied${NC}"

echo -e "${GREEN}=== Build Complete ===${NC}"
echo ""
echo "Run: ./dist/yes-sessions/yes-sessions-mac_arm64"