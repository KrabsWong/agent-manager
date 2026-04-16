#!/bin/bash

# Pre-build cleanup script
# Ensures no source files or sourcemaps are included in the final package

echo "Cleaning up source files and sourcemaps..."

# Remove all sourcemap files from dist directories
find dist -name "*.map" -type f -delete 2>/dev/null || true
find dist-electron -name "*.map" -type f -delete 2>/dev/null || true

# Remove TypeScript source files (keep only compiled JS)
find dist -name "*.ts" -type f -delete 2>/dev/null || true
find dist-electron -name "*.ts" -type f -delete 2>/dev/null || true

# Remove development config files
rm -f dist/tsconfig.json 2>/dev/null || true
rm -f dist-electron/tsconfig.json 2>/dev/null || true

echo "Cleanup complete!"
echo ""
echo "Checking for remaining sourcemaps:"
find dist dist-electron -name "*.map" 2>/dev/null | head -5 || echo "  None found (good!)"
