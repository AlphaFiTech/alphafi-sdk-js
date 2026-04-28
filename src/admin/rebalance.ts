/**
 * Rebalance admin dispatcher.
 *
 * `getManualRebalanceUsingTicksTxb` builds the rebalance transaction for
 * a single LP/LYF pool.  It mirrors the legacy function of the same name but
 * uses `StrategyContext` for dynamic pool-ID lookups and the new SDK constants.
 */

import { Transaction } from '@mysten/sui/transactions';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/lp.js';
import { LyfPoolLabel } from '../strategies/lyf.js';
import {
  ADMIN,
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';

// ──────────────────────────────────────────────────────────────────────────────
// Tick helpers (two's complement for Cetus/Bluefin)
// ──────────────────────────────────────────────────────────────────────────────

/** Convert a possibly-negative Cetus tick to its 32-bit unsigned representation. */
function toTwosComplementIfPossible(tick: number): number {
  if (tick < 0) {
    return (tick >>> 0) & 0xffffffff;
  }
  return tick;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main dispatcher
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a manual rebalance transaction for the given pool.
 *
 * Returns `undefined` when the pool name is not a rebalanceable strategy
 * (AlphaVault, lending pools, etc.).
 *
 * `loops` defaults to 15 — callers can pass pool TVL-derived value if needed.
 */
export async function getManualRebalanceUsingTicksTxb(
  poolName: string,
  rebalanceCap: string,
  lowerTick: string,
  upperTick: string,
  context: StrategyContext,
  loops = 15,
  swap_using_bluefin?: boolean,
  rebalance_using_base_pool?: boolean,
): Promise<Transaction | undefined> {
  if (lowerTick === upperTick) {
    throw new Error(`Invalid ticks: ${lowerTick}, ${upperTick}`);
  }

  const labels = await context.getPoolLabels();
  const label = labels.get(poolName);
  if (!label) return undefined;

  const txb = new Transaction();

  if (label.strategyType === 'Lp') {
    await _rebalanceLp(
      txb,
      label as LpPoolLabel,
      rebalanceCap,
      lowerTick,
      upperTick,
      loops,
      context,
      swap_using_bluefin,
      rebalance_using_base_pool,
    );
  } else if (label.strategyType === 'Lyf') {
    await _rebalanceLyf(
      txb,
      label as LyfPoolLabel,
      rebalanceCap,
      lowerTick,
      upperTick,
      loops,
      context,
    );
  } else {
    return undefined;
  }

  return txb;
}

// ──────────────────────────────────────────────────────────────────────────────
// LP rebalance
// ──────────────────────────────────────────────────────────────────────────────

async function _rebalanceLp(
  tx: Transaction,
  label: LpPoolLabel,
  rebalanceCap: string,
  lowerTick: string,
  upperTick: string,
  loops: number,
  context: StrategyContext,
  swap_using_bluefin?: boolean,
  rebalance_using_base_pool?: boolean,
): Promise<void> {
  const poolName = label.poolName;
  const coinAType = label.assetA.type;
  const coinBType = label.assetB.type;

  const lo = toTwosComplementIfPossible(Number(lowerTick));
  const hi = toTwosComplementIfPossible(Number(upperTick));

  const [blueInfo, suiInfo, deepInfo] = await context.getCoinsBySymbols(['BLUE', 'SUI', 'DEEP']);
  const blueType = blueInfo.coinType;
  const suiType = suiInfo.coinType;
  const deepType = deepInfo.coinType;

  const blueSuiPool = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin');
  const deepSuiPool = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');

  if (poolName === 'BLUEFIN-SUI-USDC') {
    const bluefinSuiUsdc = label.parentPoolId;
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(bluefinSuiUsdc),
        tx.object(cetusSuiUsdc),
        tx.object(blueSuiPool),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-SUI-BUCK') {
    const bluefinSuiBuck = label.parentPoolId;
    const cetusBuckSui = await context.getPoolIdBySymbolsAndProtocol('BUCK', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(bluefinSuiBuck),
        tx.object(cetusBuckSui),
        tx.object(blueSuiPool),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusBuckSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-SUI-AUSD') {
    const cetusAusdSui = await context.getPoolIdBySymbolsAndProtocol('AUSD', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusAusdSui),
        tx.object(blueSuiPool),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_first_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusAusdSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-USDT-USDC') {
    const cetusUsdcUsdt = await context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    // collect first
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusUsdcUsdt),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusUsdcUsdt),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-AUSD-USDC') {
    const cetusUsdcAusd = await context.getPoolIdBySymbolsAndProtocol('USDC', 'AUSD', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    const bluefinAusdUsdc = label.parentPoolId;
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(bluefinAusdUsdc),
        tx.object(blueSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(bluefinAusdUsdc),
        tx.object(cetusUsdcAusd),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusUsdcAusd),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-ALPHA-USDC') {
    const cetusAlphaUsdc = await context.getPoolIdBySymbolsAndProtocol('ALPHA', 'USDC', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusAlphaUsdc),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusAlphaUsdc),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-WBTC-USDC') {
    const cetusUsdcWbtc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'WBTC', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusUsdcWbtc),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusUsdcWbtc),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-NAVX-VSUI') {
    const cetusNavxVsui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'VSUI', 'cetus');
    const cetusVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusNavxVsui),
        tx.object(blueSuiPool),
        tx.object(cetusVsuiSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusNavxVsui),
        tx.object(cetusVsuiSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-BLUE-SUI') {
    const cetusBlueSui = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus');
    const bluefinDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_second_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, deepType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusBlueSui),
        tx.object(bluefinDeepSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_sui_second_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, deepType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(bluefinDeepSui),
        tx.object(cetusBlueSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-BLUE-USDC') {
    const cetusBlueUsdc = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'USDC', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    const bluefinDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, deepType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusBlueUsdc),
        tx.object(bluefinDeepSui),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_2_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, deepType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(bluefinDeepSui),
        tx.object(cetusBlueUsdc),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-SEND-USDC') {
    const cetusUsdcSend = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SEND', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusUsdcSend),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(cetusUsdcSend),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-SUIBTC-USDC') {
    const cetusUsdcSuibtc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUIBTC', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(label.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(label.parentPoolId),
        tx.object(cetusUsdcSuibtc),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(label.parentPoolId),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(cetusUsdcSuibtc),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-LBTC-SUIBTC') {
    const cetusSuibtcLbtc = await context.getPoolIdBySymbolsAndProtocol('SUIBTC', 'LBTC', 'cetus');
    const cetusSuibtcSui = await context.getPoolIdBySymbolsAndProtocol('SUIBTC', 'SUI', 'cetus');
    const bluefinSuiSuibtc = await context.getPoolIdBySymbolsAndProtocol('SUI', 'SUIBTC', 'bluefin');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(label.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(ADMIN.BLUEFIN_LBTC_SUIBTC_POOL),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(bluefinSuiSuibtc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(ADMIN.BLUEFIN_LBTC_SUIBTC_POOL),
        tx.object(cetusSuibtcLbtc),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(cetusSuibtcSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool`,
      typeArguments: [coinAType, coinBType, blueType, suiType, deepType],
      arguments: [
        tx.object(VERSIONS.BLUEFIN_V2),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(ADMIN.BLUEFIN_LBTC_SUIBTC_POOL),
        tx.object(blueSuiPool),
        tx.object(deepSuiPool),
        tx.object(cetusSuibtcLbtc),
        tx.object(cetusSuibtcSui),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'BLUEFIN-WAL-USDC') {
    const cetusUsdcWal = await context.getPoolIdBySymbolsAndProtocol('USDC', 'WAL', 'cetus');
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    const bluefinWalUsdc = label.parentPoolId;
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(bluefinWalUsdc),
        tx.object(blueSuiPool),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_investor::rebalance_v3`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(label.investorId),
        tx.object(rebalanceCap),
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.pure.u32(lo),
        tx.pure.u32(hi),
        tx.pure.u32(loops),
        tx.object(bluefinWalUsdc),
        tx.object(cetusUsdcWal),
        tx.object(blueSuiPool),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.pure.bool(swap_using_bluefin ?? false),
        tx.pure.bool(rebalance_using_base_pool ?? false),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_type_1_pool::update_pool_v2`,
      typeArguments: [coinAType, coinBType, blueType, suiType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(bluefinWalUsdc),
        tx.object(blueSuiPool),
        tx.object(cetusUsdcWal),
        tx.object(cetusSuiUsdc),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// LYF rebalance
// ──────────────────────────────────────────────────────────────────────────────

async function _rebalanceLyf(
  tx: Transaction,
  label: LyfPoolLabel,
  rebalanceCap: string,
  lowerTick: string,
  upperTick: string,
  loops: number,
  context: StrategyContext,
): Promise<void> {
  const coinAType = label.assetA.type;
  const coinBType = label.assetB.type;
  const lo = toTwosComplementIfPossible(Number(lowerTick));
  const hi = toTwosComplementIfPossible(Number(upperTick));

  const alphalendClient = new AlphalendClient('mainnet', context.blockchain.suiClient);
  await alphalendClient.updatePrices(tx, [coinAType, coinBType]);

  // Call collect rewards for LYF
  // This is inline equivalent of collectAndSwapRewardsLyf
  if (label.poolName === 'BLUEFIN-LYF-STSUI-SUI') {
    const [blueInfo, suiInfo, stsuiInfo, alphaInfo] = await context.getCoinsBySymbols([
      'BLUE', 'SUI', 'STSUI', 'ALPHA',
    ]);
    for (const [rewardType, toType, pool, isBorrow] of [
      [blueInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND, true],
      [blueInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND, true],
      [alphaInfo.coinType, stsuiInfo.coinType, ADMIN.BLUEFIN_ALPHA_STSUI_POOL, false],
    ] as [string, string, string, boolean][]) {
      tx.moveCall({
        target: `${label.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinAType, coinBType, rewardType, toType],
        arguments: [
          tx.object(VERSIONS.LYF_LP),
          tx.object(label.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(label.parentPoolId),
          tx.object(pool),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.pure.bool(isBorrow),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  tx.moveCall({
    target: `${label.packageId}::alphafi_lyf_pool::rebalance_bluefin`,
    typeArguments: [coinAType, coinBType],
    arguments: [
      tx.object(rebalanceCap),
      tx.object(VERSIONS.LYF_LP),
      tx.object(label.poolId),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(GLOBAL_CONFIGS.BLUEFIN),
      tx.pure.u32(lo),
      tx.pure.u32(hi),
      tx.pure.u32(loops),
      tx.object(label.parentPoolId),
      tx.object(SUI_SYSTEM_STATE),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}
