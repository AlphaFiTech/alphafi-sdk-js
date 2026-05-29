// ============================================================================
// REBALANCE TESTING SUITE
// ============================================================================
// Tests manual rebalance dry-runs for all active rebalanceable pools
// (Lp, AutobalanceLp, FungibleLp, Lyf strategy types) from alphafi.xyz.
//
// Usage:
//   npx tsx scripts/rebalanceScript.ts
//
// Requires env vars: PK_B64, NETWORK
// The wallet must own a RebalanceCap object.
// ============================================================================

import {
  getCurrentTick,
  getManualRebalanceUsingTicksTxb,
  getTickSpacing,
  StrategyContext,
} from '../src/index.js';
import fs from 'fs';
import { getExecStuff } from './utils.js';

const REBALANCEABLE_STRATEGIES = new Set(['Lp', 'AutobalanceLp', 'FungibleLp', 'Lyf']);
const RANGE_HALF_WIDTH_IN_SPACINGS = 5;

interface PoolConfig {
  strategy_type: string;
  data: {
    pool_id: string;
    pool_name: string;
    is_active: boolean;
    strategy_type: string;
  };
}

interface ApiConfig {
  [poolId: string]: PoolConfig;
}

async function fetchPoolConfigs(): Promise<ApiConfig> {
  const response = await fetch('https://api.alphafi.xyz/public/config');
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiConfig>;
}

async function testPoolRebalance(
  poolName: string,
  poolId: string,
  strategyType: string,
  address: string,
  context: StrategyContext,
): Promise<{ success: boolean; error?: string }> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing Pool: ${poolName}`);
  console.log(`   Pool ID:       ${poolId}`);
  console.log(`   Strategy:      ${strategyType}`);
  console.log(`${'='.repeat(80)}`);

  try {
    const [currentTick, tickSpacing] = await Promise.all([
      getCurrentTick(poolName, context),
      getTickSpacing(poolName, context),
    ]);

    const lowerTick =
      Math.floor((currentTick - RANGE_HALF_WIDTH_IN_SPACINGS * tickSpacing) / tickSpacing) *
      tickSpacing;
    const upperTick =
      Math.ceil((currentTick + RANGE_HALF_WIDTH_IN_SPACINGS * tickSpacing) / tickSpacing) *
      tickSpacing;

    if (lowerTick === upperTick) {
      throw new Error(`Empty range (lower=${lowerTick}, upper=${upperTick}, spacing=${tickSpacing})`);
    }

    console.log(`   currentTick=${currentTick}, spacing=${tickSpacing} → [${lowerTick}, ${upperTick}]`);

    const tx = await getManualRebalanceUsingTicksTxb(
      poolName,
      address,
      String(lowerTick),
      String(upperTick),
      15,
      context,
      true,
    );

    if (!tx) {
      return { success: false, error: 'getManualRebalanceUsingTicksTxb returned undefined' };
    }

    tx.setGasBudget(2e8);
    tx.setSender(address);

    const { suiClient } = getExecStuff();
    console.log('📦 Building transaction...');
    const serializedTxb = await tx.build({ client: suiClient });

    console.log('🔄 Running dry run...');
    const result = await suiClient.dryRunTransactionBlock({ transactionBlock: serializedTxb });

    console.log('\n✅ DRY RUN SUCCESSFUL');
    console.log('📊 Status:', result.effects.status);
    console.log('📝 Events Count:', result.events.length);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ DRY RUN FAILED');
    console.error('Error:', message);
    return { success: false, error: message };
  }
}

async function testAllPoolsRebalance() {
  console.log('\n🚀 Starting Rebalance Dry Run Tests for All Active Pools');
  console.log('='.repeat(80));

  const startTime = Date.now();
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');

  console.log('\n📡 Fetching pool configurations...');
  const configs = await fetchPoolConfigs();
  const allPools = Object.entries(configs);
  console.log(`✅ Found ${allPools.length} total pools`);

  const rebalancePools = allPools.filter(
    ([, config]) =>
      config.data?.is_active === true &&
      REBALANCEABLE_STRATEGIES.has(config.data?.strategy_type),
  );
  console.log(`✅ Found ${rebalancePools.length} active rebalanceable pools to test`);

  const results: {
    poolId: string;
    poolName: string;
    strategyType: string;
    success: boolean;
    error?: string;
  }[] = [];

  for (let i = 0; i < rebalancePools.length; i++) {
    const [poolId, config] = rebalancePools[i];
    const { pool_name, strategy_type } = config.data;

    console.log(`\n🔍 Progress: ${i + 1}/${rebalancePools.length}`);

    const result = await testPoolRebalance(pool_name, poolId, strategy_type, address, context);
    results.push({ poolId, poolName: pool_name, strategyType: strategy_type, ...result });

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📝 Total Tested: ${results.length}`);
  console.log(`✅ Successful: ${results.filter((r) => r.success).length}`);
  console.log(`❌ Failed: ${results.filter((r) => !r.success).length}`);

  const byStrategy = results.reduce(
    (acc, r) => {
      if (!acc[r.strategyType]) acc[r.strategyType] = { total: 0, success: 0, failed: 0 };
      acc[r.strategyType].total++;
      r.success ? acc[r.strategyType].success++ : acc[r.strategyType].failed++;
      return acc;
    },
    {} as Record<string, { total: number; success: number; failed: number }>,
  );

  console.log('\n📈 Results by Strategy Type:');
  Object.entries(byStrategy).forEach(([type, stats]) => {
    const pct = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`   ${type}: ${stats.success}/${stats.total} successful (${pct}%)`);
  });

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log('\n❌ Failed Pools:');
    failed.forEach((f) => {
      console.log(`   • ${f.poolName} (${f.strategyType})`);
      console.log(`     Pool ID: ${f.poolId}`);
      console.log(`     Error: ${f.error}`);
    });
  }

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

  const reportPath = 'scripts/rebalance-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
  console.log('\n' + '='.repeat(80));
  console.log('✨ Testing Complete!');
  console.log('='.repeat(80));
}

testAllPoolsRebalance().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
