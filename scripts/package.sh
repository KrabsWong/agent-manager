#!/bin/bash

# Package Yes Sessions for distribution
# Usage: ./scripts/package.sh [platform]
# Platforms: mac-arm64, mac-x64, mac-universal, win-x64, linux-x64, linux-arm64, all

set -e

VERSION=$(node -p "require('./package.json').version")
DIST_DIR="dist/yes-sessions"
RELEASE_DIR="release"

mkdir -p "$RELEASE_DIR"

package_platform() {
    local platform=$1
    local binary=""
    local ext=""
    
    case $platform in
        mac-arm64)
            binary="yes-sessions-mac_arm64"
            ext=""
            ;;
        mac-x64)
            binary="yes-sessions-mac_x64"
            ext=""
            ;;
        mac-universal)
            binary="yes-sessions-mac_universal"
            ext=""
            ;;
        win-x64)
            binary="yes-sessions-win_x64.exe"
            ext=".zip"
            ;;
        linux-x64)
            binary="yes-sessions-linux_x64"
            ext=""
            ;;
        linux-arm64)
            binary="yes-sessions-linux_arm64"
            ext=""
            ;;
        *)
            echo "Unknown platform: $platform"
            return 1
            ;;
    esac
    
    local archive_name="yes-sessions-${platform}-${VERSION}"
    
    echo "Packaging $platform..."
    
    mkdir -p "$RELEASE_DIR/$archive_name"
    
    # Copy required files
    cp "$DIST_DIR/$binary" "$RELEASE_DIR/$archive_name/yes-sessions${ext}"
    cp "$DIST_DIR/resources.neu" "$RELEASE_DIR/$archive_name/"
    cp "$DIST_DIR/yes-sessions-service" "$RELEASE_DIR/$archive_name/"
    
    chmod +x "$RELEASE_DIR/$archive_name/yes-sessions${ext:-}"
    chmod +x "$RELEASE_DIR/$archive_name/yes-sessions-service"
    
    # Create archive
    cd "$RELEASE_DIR"
    if [[ "$platform" == "win-x64" ]]; then
        zip -r "${archive_name}.zip" "$archive_name"
    else
        tar -czf "${archive_name}.tar.gz" "$archive_name"
    fi
    cd - > /dev/null
    
    # Cleanup
    rm -rf "$RELEASE_DIR/$archive_name"
    
    echo "Created: $RELEASE_DIR/${archive_name}.tar.gz"
}

# Parse platform argument
PLATFORM=${1:-all}

if [ "$PLATFORM" == "all" ]; then
    package_platform "mac-arm64"
    package_platform "mac-x64"
    package_platform "win-x64"
    package_platform "linux-x64"
else
    package_platform "$PLATFORM"
fi

echo ""
echo "=== Packaging Complete ==="
echo "Release packages are in: $RELEASE_DIR/"
ls -lh "$RELEASE_DIR"
