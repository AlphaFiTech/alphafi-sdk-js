// ============================================================================
// AUTOCOMPOUND TESTING SUITE
// ============================================================================
// This section contains automated testing functions for the autocompound
// feature across all AlphaFi pools.
//
// Available test functions:
//
// 1. testAllPoolsAutocompound()
//    - Fetches all active pools from API
//    - Tests autocompound dry run for each pool
//    - Generates comprehensive report with results
//    - Saves detailed JSON report to scripts/autocompound-test-report.json
//
// 2. testSpecificPools(poolIds: string[])
//    - Tests specific pool IDs you provide
//    - Useful for targeted testing or debugging
//
// 3. autocompound()
//    - Tests a single hardcoded pool
//    - Simple quick test for development
//
// Usage:
//   npm run test           # Runs the default test (testAllPoolsAutocompound)
//   tsx scripts/testRun.ts # Alternative way to run
//
// To change which test runs, uncomment the desired function call at the
// bottom of this file and comment out the others.
// ============================================================================

import { AlphaFiSDK } from '../src/index.js';
import fs from 'fs';
import { getExecStuff } from './testRun.js';
interface PoolConfig {
  strategy_type: string;
  data: {
    pool_id: string;
    pool_name: string;
    is_active: boolean;
    strategy_type: string;
    parent_protocol?: string;
  };
}

interface ApiConfig {
  [poolId: string]: PoolConfig;
}

/**
 * Fetches all pool configurations from the AlphaFi API
 */
async function fetchPoolConfigs(): Promise<ApiConfig> {
  try {
    const response = await fetch('https://api.alphafi.xyz/public/config');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data as ApiConfig;
  } catch (error) {
    console.error('❌ Failed to fetch pool configs:', error);
    throw error;
  }
}

/**
 * Dry run test for a single pool's autocompound function
 */
async function testPoolAutocompound(
  sdk: AlphaFiSDK,
  poolId: string,
  poolName: string,
  strategyType: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Testing Pool: ${poolName || 'Unnamed'}`);
    console.log(`   Pool ID: ${poolId}`);
    console.log(`   Strategy Type: ${strategyType}`);
    console.log(`${'='.repeat(80)}`);

    // Create autocompound transaction
    const tx = await sdk.autocompound({ poolId });
    tx.setGasBudget(2e8);

    // Get sender address
    const { address, suiClient } = getExecStuff();
    tx.setSender(address);

    // Build and dry run the transaction
    console.log('📦 Building transaction...');
    const serializedTxb = await tx.build({ client: suiClient });

    console.log('🔄 Running dry run...');
    const result = await suiClient.dryRunTransactionBlock({
      transactionBlock: serializedTxb,
    });

    // Log results
    console.log('\n✅ DRY RUN SUCCESSFUL');
    console.log('📊 Status:', result.effects.status);
    console.log('💰 Balance Changes:', JSON.stringify(result.balanceChanges, null, 2));
    console.log('📝 Events Count:', result.events.length);

    if (result.events.length > 0) {
      console.log('📢 Events:');
      result.events.forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.type}`);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('\n❌ DRY RUN FAILED');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Test autocompound for all active pools from the API
 */
async function testAllPoolsAutocompound() {
  console.log('\n🚀 Starting Autocompound Dry Run Tests for All Pools');
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    // Initialize SDK
    const sdk = new AlphaFiSDK({ network: 'mainnet' });

    // Fetch pool configurations
    console.log('\n📡 Fetching pool configurations from API...');
    const configs = await fetchPoolConfigs();
    const poolEntries = Object.entries(configs);
    console.log(`✅ Found ${poolEntries.length} total pools`);

    // Filter active pools
    const activePools = poolEntries.filter(([_, config]) => config.data?.is_active === true);
    console.log(`✅ Found ${activePools.length} active pools to test`);

    // Test results tracking
    const results: {
      poolId: string;
      poolName: string;
      strategyType: string;
      success: boolean;
      error?: string;
    }[] = [];

    // Test each active pool
    for (let i = 0; i < activePools.length; i++) {
      const [poolId, config] = activePools[i];
      const { pool_name, strategy_type } = config.data;

      console.log(`\n\n🔍 Progress: ${i + 1}/${activePools.length}`);

      const result = await testPoolAutocompound(sdk, poolId, pool_name, strategy_type);

      results.push({
        poolId,
        poolName: pool_name,
        strategyType: strategy_type,
        success: result.success,
        error: result.error,
      });

      // Small delay to avoid overwhelming the RPC
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📝 Total Pools Tested: ${results.length}`);
    console.log(`✅ Successful: ${results.filter((r) => r.success).length}`);
    console.log(`❌ Failed: ${results.filter((r) => !r.success).length}`);

    // Group by strategy type
    const byStrategy = results.reduce(
      (acc, r) => {
        if (!acc[r.strategyType]) {
          acc[r.strategyType] = { total: 0, success: 0, failed: 0 };
        }
        acc[r.strategyType].total++;
        if (r.success) {
          acc[r.strategyType].success++;
        } else {
          acc[r.strategyType].failed++;
        }
        return acc;
      },
      {} as Record<string, { total: number; success: number; failed: number }>,
    );

    console.log('\n📈 Results by Strategy Type:');
    Object.entries(byStrategy).forEach(([type, stats]) => {
      console.log(
        `   ${type}: ${stats.success}/${stats.total} successful (${((stats.success / stats.total) * 100).toFixed(1)}%)`,
      );
    });

    // Show failed pools
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.log('\n❌ Failed Pools:');
      failed.forEach((f) => {
        console.log(`   • ${f.poolName} (${f.strategyType})`);
        console.log(`     Pool ID: ${f.poolId}`);
        console.log(`     Error: ${f.error}`);
      });
    }

    // Write detailed results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      byStrategy,
      results,
    };

    const reportPath = 'scripts/autocompound-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✨ Testing Complete!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error);
    throw error;
  }
}

/**
 * Test autocompound for specific pool IDs
 */
async function testSpecificPools(poolIds: string[]) {
  console.log('\n🚀 Starting Autocompound Dry Run Tests for Specific Pools');
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const { suiClient } = getExecStuff();
    const sdk = new AlphaFiSDK({ network: 'mainnet' });

    // Fetch pool configurations to get names
    console.log('\n📡 Fetching pool configurations...');
    const configs = await fetchPoolConfigs();

    const results: {
      poolId: string;
      poolName: string;
      strategyType: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (let i = 0; i < poolIds.length; i++) {
      const poolId = poolIds[i];
      const config = configs[poolId];
      const poolName = config?.data?.pool_name || 'Unknown';
      const strategyType = config?.data?.strategy_type || 'Unknown';

      console.log(`\n🔍 Progress: ${i + 1}/${poolIds.length}`);

      const result = await testPoolAutocompound(sdk, poolId, poolName, strategyType);
      results.push({ poolId, poolName, strategyType, ...result });

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successful: ${results.filter((r) => r.success).length}/${results.length}`);
    console.log(`❌ Failed: ${results.filter((r) => !r.success).length}/${results.length}`);
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    throw error;
  }
}

// Test all active pools
// testAllPoolsAutocompound();

// Or test specific pools:
// testSpecificPools([
//   '0x0e1399fe66eca3147766bb113ae7b52b31243874c9e4a64a48e6d8cb91aa3c04',
//   '0x1124c5e7b1fb1f3cfa02cad5934dc27785e083f2b4a49bde3cc41ba66ff9113c',
// ]);

// Single pool test:
// autocompound();

// Other tests:
// claimAirdrop();
// withdraw();
// poolsData();
// portfolioData();
// claimSlushWithdraw();
// deposit();
// cancelSlushWithdraw();
