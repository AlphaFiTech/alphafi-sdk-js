#!/usr/bin/env npx tsx

/**
 * Single Pool Test Runner
 * 
 * Easy script to test deposit and withdraw for any specific pool ID
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_POOL_ID = '1'; // ALPHA pool as default
const AVAILABLE_POOLS = {
  '1': 'ALPHA (Single Asset)',
  '2': 'NAVI-DEEP (Single Asset)', 
  '16': 'BLUEFIN-STSUI-BUCK (Double Asset)',
  '45': 'ALPHALEND-LOOP-SUI-STSUI (Looping)',
  '50': 'BUCKET-BUCK (Single Asset)',
  '53': 'DEEP-SUI (Double Asset)',
  '58': 'NAVI-SUI (Single Asset)',
};

const runSinglePoolTest = async (poolId: string) => {
  console.log(`\n🎯 Testing Pool ID: ${poolId}`);
  
  if (AVAILABLE_POOLS[poolId as keyof typeof AVAILABLE_POOLS]) {
    console.log(`📛 Pool Name: ${AVAILABLE_POOLS[poolId as keyof typeof AVAILABLE_POOLS]}`);
  } else {
    console.log(`⚠️  Pool ID ${poolId} not in common pools list - testing anyway`);
  }
  
  console.log('=' .repeat(60));

  return new Promise<{ success: boolean; output: string }>((resolve) => {
    // Modify the test file to use the specified pool ID
    const testCommand = [
      'jest',
      'src/__tests__/singlePool.test.ts',
      '--verbose',
      '--no-cache',
      '--config',
      'jest.config.cjs.js'
    ];

    // Set environment variable for the pool ID
    const env = { 
      ...process.env, 
      TARGET_POOL_ID: poolId,
      NODE_ENV: 'test'
    };

    const jest = spawn('npx', testCommand, {
      stdio: 'pipe',
      shell: true,
      cwd: path.resolve(__dirname, '..'),
      env
    });

    let output = '';
    let errorOutput = '';

    jest.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });

    jest.stderr?.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      process.stderr.write(chunk);
    });

    jest.on('close', (code) => {
      const success = code === 0;
      console.log(`\n${success ? '✅' : '❌'} Pool ${poolId} test ${success ? 'COMPLETED' : 'FAILED'}`);
      
      if (!success) {
        console.log(`Exit code: ${code}`);
      }
      
      resolve({ success, output: output + errorOutput });
    });

    jest.on('error', (error) => {
      console.error(`❌ Failed to start test for pool ${poolId}:`, error);
      resolve({ success: false, output: error.message });
    });
  });
};

const showUsage = () => {
  console.log('🔧 Single Pool Test Runner');
  console.log('Tests deposit and withdraw operations for a specific pool ID\n');
  
  console.log('Usage:');
  console.log('  npm run test:single-pool [poolId]');
  console.log('  npx tsx scripts/testSinglePool.ts [poolId]\n');
  
  console.log('Available Pool Examples:');
  Object.entries(AVAILABLE_POOLS).forEach(([id, name]) => {
    console.log(`  ${id.padStart(2)}: ${name}`);
  });
  
  console.log(`\nDefault Pool ID: ${DEFAULT_POOL_ID} (if none specified)`);
  console.log('\nTo test a custom pool ID:');
  console.log('  npm run test:single-pool 123');
  console.log('  npx tsx scripts/testSinglePool.ts 45\n');
};

const main = async () => {
  const args = process.argv.slice(2);
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }
  
  // Get pool ID from command line or use default
  const poolId = args[0] || DEFAULT_POOL_ID;
  
  // Validate pool ID
  if (!/^\d+$/.test(poolId)) {
    console.error('❌ Error: Pool ID must be a number');
    console.log('Example: npm run test:single-pool 1');
    process.exit(1);
  }
  
  console.log('🚀 AlphaFi SDK Single Pool Test');
  
  try {
    const result = await runSinglePoolTest(poolId);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Pool ID: ${poolId}`);
    console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (result.success) {
      console.log('🎉 All tests completed successfully!');
      console.log('✨ Deposit and withdraw transactions can be built for this pool');
    } else {
      console.log('⚠️  Some tests failed. This might be expected in a test environment.');
      console.log('💡 Check the output above for specific error details.');
      console.log('🔧 Common issues:');
      console.log('   • Missing receipts (normal in test env)');
      console.log('   • Insufficient balance (expected with mocks)');
      console.log('   • Pool configuration issues');
    }
    
    console.log('\n💡 Tips:');
    console.log('• Tests run in dry-run mode by default (safe)');
    console.log('• Modify TARGET_POOL_ID in singlePool.test.ts to change default');
    console.log('• Check poolDetailsMap for available pool IDs');
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Failed to run single pool test:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Show usage if no arguments and not in a test environment
if (process.argv.length === 2 && !process.env.NODE_ENV) {
  showUsage();
} else {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}