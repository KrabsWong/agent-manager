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
    
    # Remove non-macOS arm64 binaries to save space
    echo -e "${BLUE}Cleaning non-macOS arm64 binaries...${NC}"
    rm -f dist/yes-sessions/yes-sessions-linux_*
    rm -f dist/yes-sessions/yes-sessions-win_*
    rm -f dist/yes-sessions/yes-sessions-mac_x64
    rm -f dist/yes-sessions/yes-sessions-mac_universal
    
    echo -e "${GREEN}${target_platform} build complete${NC}"
}

# Function to create distribution package
create_package() {
    local target_platform=$1
    local output_dir="release"
    
    mkdir -p "${output_dir}"
    
    echo -e "${YELLOW}Creating distribution package for ${target_platform}...${NC}"
    
    # Create macOS .app bundle
    if [ "${target_platform}" = "mac" ]; then
        echo -e "${BLUE}Creating macOS .app bundle...${NC}"
        
mkdir -p "dist/Yes Sessions.app/Contents/MacOS"
        mkdir -p "dist/Yes Sessions.app/Contents/Resources"
        
        # Copy executable
        cp dist/yes-sessions/yes-sessions-mac_arm64 "dist/Yes Sessions.app/Contents/MacOS/yes-sessions"
        chmod +x "dist/Yes Sessions.app/Contents/MacOS/yes-sessions"
        
        # Copy resources.neu (must be in same dir as executable)
        cp dist/yes-sessions/resources.neu "dist/Yes Sessions.app/Contents/MacOS/"
        
        # Copy config file (must be in same dir as executable)
        cp neutralino.config.json "dist/Yes Sessions.app/Contents/MacOS/"
        
        # Copy Rust service
        cp rust-service/target/release/yes-sessions-service "dist/Yes Sessions.app/Contents/MacOS/"
        chmod +x "dist/Yes Sessions.app/Contents/MacOS/yes-sessions-service"
        
        # Copy icon for Finder display
        if [ -f "public/icon.icns" ]; then
            cp public/icon.icns "dist/Yes Sessions.app/Contents/Resources/app.icns"
        fi
        
        # Create Info.plist
        cat > "dist/Yes Sessions.app/Contents/Info.plist" << 'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>yes-sessions</string>
    <key>CFBundleIconFile</key>
    <string>app.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.yes-sessions.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Yes Sessions</string>
    <key>CFBundleDisplayName</key>
    <string>Yes Sessions</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
</dict>
</plist>
PLIST_EOF
        
        # Create PkgInfo
        echo -n "APPLyes-sessions" > "dist/Yes Sessions.app/Contents/PkgInfo"
        
        echo -e "${GREEN}.app bundle created${NC}"
        
        # Zip the .app
        cd dist
        zip -r "../${output_dir}/yes-sessions-${VERSION}-mac-arm64.zip" "Yes Sessions.app"
        cd ..
    fi
    
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