#!/bin/bash

# Yes Sessions - Cross-platform Package Script
# Creates distribution packages for macOS, Windows, and Linux

set -e

echo "=== Yes Sessions Cross-Platform Packaging ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Detect current platform
detect_platform() {
    case "$(uname -s)" in
        Darwin*)    echo "mac";;
        Linux*)     echo "linux";;
        MINGW*|CYGWIN*|MSYS*) echo "win";;
        *)          echo "unknown";;
    esac
}

PLATFORM=$(detect_platform)
VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"

# Function to build for specific platform
build_platform() {
    local target_platform=$1
    
    echo -e "${YELLOW}Building for ${target_platform}...${NC}"
    
    # Build Rust service for target platform
    case "${target_platform}" in
        mac)
            echo -e "${BLUE}Building Rust service for macOS...${NC}"
            cd rust-service
            cargo build --release --target aarch64-apple-darwin
            cd ..
            cp rust-service/target/aarch64-apple-darwin/release/yes-sessions-service rust-service/
            ;;
        
        win)
            echo -e "${BLUE}Building Rust service for Windows...${NC}"
            cd rust-service
            cargo build --release --target x86_64-pc-windows-msvc
            cd ..
            cp rust-service/target/x86_64-pc-windows-msvc/release/yes-sessions-service.exe rust-service/
            ;;
        
        linux)
            echo -e "${BLUE}Building Rust service for Linux...${NC}"
            cd rust-service
            cargo build --release --target x86_64-unknown-linux-gnu
            cd ..
            cp rust-service/target/x86_64-unknown-linux-gnu/release/yes-sessions-service rust-service/
            ;;
    esac
    
    # Build Neutralino bundle
    echo -e "${BLUE}Building Neutralino bundle...${NC}"
    neu build --release
    
    echo -e "${GREEN}${target_platform} build complete${NC}"
}

# Function to create distribution package
create_package() {
    local target_platform=$1
    local output_dir="dist-packages"
    local temp_dir="dist-temp"
    
    mkdir -p "${output_dir}"
    mkdir -p "${temp_dir}/yes-sessions"
    
    echo -e "${YELLOW}Creating distribution package for ${target_platform}...${NC}"
    
    # Copy frontend resources
    echo -e "${BLUE}Copying frontend resources...${NC}"
    cp -r dist/* "${temp_dir}/yes-sessions/"
    
    # Copy Neutralino binary for the platform
    echo -e "${BLUE}Copying Neutralino binary...${NC}"
    case "${target_platform}" in
        mac)
            cp bin/neutralino-mac_arm64 "${temp_dir}/yes-sessions/yes-sessions"
            chmod +x "${temp_dir}/yes-sessions/yes-sessions"
            ;;
        win)
            cp bin/neutralino-win_x64.exe "${temp_dir}/yes-sessions/yes-sessions.exe"
            ;;
        linux)
            cp bin/neutralino-linux_x64 "${temp_dir}/yes-sessions/yes-sessions"
            chmod +x "${temp_dir}/yes-sessions/yes-sessions"
            ;;
    esac
    
    # Copy Rust service
    echo -e "${BLUE}Copying Rust service...${NC}"
    case "${target_platform}" in
        mac)
            cp rust-service/target/release/yes-sessions-service "${temp_dir}/yes-sessions/"
            chmod +x "${temp_dir}/yes-sessions/yes-sessions-service"
            ;;
        win)
            if [ -f "rust-service/target/x86_64-pc-windows-msvc/release/yes-sessions-service.exe" ]; then
                cp rust-service/target/x86_64-pc-windows-msvc/release/yes-sessions-service.exe "${temp_dir}/yes-sessions/"
            fi
            ;;
        linux)
            if [ -f "rust-service/target/x86_64-unknown-linux-gnu/release/yes-sessions-service" ]; then
                cp rust-service/target/x86_64-unknown-linux-gnu/release/yes-sessions-service "${temp_dir}/yes-sessions/"
                chmod +x "${temp_dir}/yes-sessions/yes-sessions-service"
            fi
            ;;
    esac
    
    # Copy config file
    cp neutralino.config.json "${temp_dir}/yes-sessions/"
    
    # Create package
    echo -e "${BLUE}Creating archive...${NC}"
    cd "${temp_dir}"
    case "${target_platform}" in
        mac)
            zip -r "../${output_dir}/yes-sessions-${VERSION}-mac-arm64.zip" yes-sessions
            ;;
        win)
            7z a "../${output_dir}/yes-sessions-${VERSION}-win-x64.zip" yes-sessions
            ;;
        linux)
            tar -czf "../${output_dir}/yes-sessions-${VERSION}-linux-x64.tar.gz" yes-sessions
            ;;
    esac
    cd ..
    
    # Cleanup
    rm -rf "${temp_dir}"
    
    echo -e "${GREEN}Package created: ${output_dir}/yes-sessions-${VERSION}-${target_platform}*${NC}"
}

# Main build process
main() {
    # Check if Neutralino CLI is installed
    if ! command -v neu &> /dev/null; then
        echo -e "${RED}Neutralino CLI not found. Installing...${NC}"
        npm install -g @neutralinojs/neu
    fi
    
    # Build frontend
    echo -e "${BLUE}[1/3] Building frontend...${NC}"
    npm run build:frontend
    
    # Build for current platform
    echo -e "${BLUE}[2/3] Building for current platform (${PLATFORM})...${NC}"
    build_platform "${PLATFORM}"
    
    # Create distribution package
    echo -e "${BLUE}[3/3] Creating distribution package...${NC}"
    create_package "${PLATFORM}"
    
    echo -e "${GREEN}=== Build Complete ===${NC}"
    echo ""
    echo "Packages available in: dist-packages/"
    ls -lh dist-packages/
}

# Build for all platforms (requires cross-compilation setup)
build_all() {
    echo -e "${YELLOW}Building for all platforms...${NC}"
    
    # Check if Rust targets are installed
    rustup target list --installed
    
    # macOS
    if rustup target list --installed | grep -q "aarch64-apple-darwin"; then
        build_platform "mac"
        create_package "mac"
    fi
    
    # Windows (requires cross-compilation setup)
    if rustup target list --installed | grep -q "x86_64-pc-windows-msvc"; then
        echo -e "${YELLOW}Note: Windows cross-compilation may require additional setup${NC}"
        build_platform "win"
        create_package "win"
    fi
    
    # Linux
    if rustup target list --installed | grep -q "x86_64-unknown-linux-gnu"; then
        build_platform "linux"
        create_package "linux"
    fi
    
    echo -e "${GREEN}=== All Platforms Built ===${NC}"
    ls -lh dist-packages/
}

# Run based on argument
case "${1:-}" in
    all)
        build_all
        ;;
    mac|win|linux)
        build_platform "${1}"
        create_package "${1}"
        ;;
    *)
        main
        ;;
esac