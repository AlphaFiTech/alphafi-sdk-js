#!/bin/bash

# AlphaFi SDK Deposit Test Runner
# This script handles TypeScript execution across different Node.js setups

echo "🚀 Running AlphaFi SDK Deposit Tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the alphafi-sdk-js directory"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Try different execution methods in order of preference
echo "🔍 Attempting to run TypeScript file..."

# Method 1: Using NODE_OPTIONS with ts-node ESM loader (suppress warnings)
echo "Method 1: NODE_OPTIONS with ts-node/esm loader"
if NODE_OPTIONS='--loader ts-node/esm --no-deprecation --no-warnings' node scripts/testDeposits.ts; then
    echo "✅ Test completed successfully!"
    exit 0
fi

# Method 2: Direct ts-node with ESM flag (suppress warnings)
echo "Method 2: ts-node with --esm flag"
if NODE_OPTIONS='--no-deprecation --no-warnings' npx ts-node --esm scripts/testDeposits.ts; then
    echo "✅ Test completed successfully!"
    exit 0
fi

# Method 3: Compile and run
echo "Method 3: Compile TypeScript and run JavaScript"
echo "🔨 Compiling TypeScript..."

# Create build directory
mkdir -p scripts/build

# Compile with specific settings
if npx tsc scripts/testDeposits.ts scripts/env.config.ts \
    --outDir scripts/build \
    --module esnext \
    --target es2022 \
    --moduleResolution node \
    --esModuleInterop \
    --allowSyntheticDefaultImports \
    --skipLibCheck \
    --resolveJsonModule \
    --strict false; then
    
    echo "📄 Running compiled JavaScript..."
    if node scripts/build/testDeposits.js; then
        echo "✅ Test completed successfully!"
        # Clean up
        rm -rf scripts/build
        exit 0
    fi
fi

# Method 4: Try without ESM (fallback)
echo "Method 4: Fallback - ts-node without ESM"
if npx ts-node scripts/testDeposits.ts; then
    echo "✅ Test completed successfully!"
    exit 0
fi

# If all methods fail
echo "❌ Failed to run tests with any method."
echo ""
echo "🛠️  Troubleshooting suggestions:"
echo "1. Make sure you have Node.js 16+ installed: node --version"
echo "2. Try installing ts-node globally: npm install -g ts-node"
echo "3. Check your environment variables are set:"
echo "   - NETWORK (e.g., 'testnet')"
echo "   - PK_B64 (your private key)"
echo "4. Try running manually:"
echo "   npx ts-node --esm scripts/testDeposits.ts"
echo ""
echo "For more help, see scripts/README.md"

exit 1 