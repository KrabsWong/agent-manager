#!/bin/bash

# Development script with frontend rebuild

set -e

echo "=== Building frontend ==="
npm run build:frontend

echo "=== Copying to resources ==="
cp -r dist/* resources/

echo "=== Starting Neutralino ==="
bash scripts/start-neutralino.sh dev
