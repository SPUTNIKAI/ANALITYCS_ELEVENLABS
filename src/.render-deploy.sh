#!/bin/bash
# Render deployment script
echo "Starting Render deployment..."

# Set working directory
cd src/

# Install dependencies
echo "Installing dependencies..."
npm install --production=false

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in src/ directory"
    exit 1
fi

echo "Build completed successfully"
