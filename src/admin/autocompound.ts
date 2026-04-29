/**
 * Autocompound admin dispatcher and groupedRewards helper.
 *
 * `getAutoCompoundSingleTxb` builds the transaction for a single pool's
 * autocompound operation.  It delegates pool-specific Move calls to the
 * per-strategy helper functions in this file.
 *
 * `groupedRewards` fetches available NAVI lending rewards for a set of pools
 * and groups them by pool name → coin type → reward list.
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { LendingReward, getUserAvailableLendingRewards } from '@naviprotocol/lending';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/lp.js';
import { LendingPoolLabel } from '../strategies/lending.js';
import { LoopingPoolLabel } from '../strategies/looping.js';
import { SingleAssetLoopingPoolLabel } from '../strategies/singleAssetLooping.js';
import { LyfPoolLabel } from '../strategies/lyf.js';
import { FungibleLpPoolLabel } from '../strategies/fungibleLp.js';
import { AutobalanceLpPoolLabel } from '../strategies/autobalanceLp.js';
import { SlushLendingPoolLabel } from '../strategies/slushLending.js';
import { SlushSingleAssetLoopingPoolLabel } from '../strategies/slushSingleAssetLooping.js';
import {
  ADMIN,
  ALPHALEND_LENDING_PROTOCOL_ID,
  BUCKET_CONFIG,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  NAVI_CONFIG,
  PYTH_STATE_ID,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
  WORMHOLE_STATE_ID,
} from '../utils/constants.js';

export { LendingReward };

// ──────────────────────────────────────────────────────────────────────────────
// groupedRewards
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch NAVI available lending rewards for the given pools and group them by
 * pool name → { [coinType]: LendingReward[] }.
 */
export async function groupedRewards(
  pools: string[],
  context: StrategyContext,
): Promise<Map<string, Map<string, LendingReward[]>>> {
  const labels = await context.getPoolLabels();
  const result = new Map<string, Map<string, LendingReward[]>>();

  for (const poolName of pools) {
    const label = labels.get(poolName);
    if (!label || label.parentProtocol !== 'Navi') continue;

    const accountAddress = (NAVI_CONFIG.ACCOUNT_ADDRESSES as Record<string, string>)[
      _naviAccountKey(poolName)
    ];
    if (!accountAddress) continue;

    try {
      const rewards = await getUserAvailableLendingRewards(accountAddress);
      const byType = new Map<string, LendingReward[]>();
      if (Array.isArray(rewards)) {
        for (const r of rewards) {
          if (!r.assetCoinType) continue;
          const list = byType.get(r.assetCoinType) ?? [];
          list.push(r);
          byType.set(r.assetCoinType, list);
        }
      }
      result.set(poolName, byType);
    } catch {
      // Skip pools where rewards can't be fetched
    }
  }

  return result;
}

/** Map pool name to NAVI_CONFIG.ACCOUNT_ADDRESSES key. */
function _naviAccountKey(poolName: string): string {
  const map: Record<string, string> = {
    'NAVI-LOOP-USDT-USDC': 'USDT_USDC_LOOP',
    'NAVI-LOOP-USDC-USDT': 'USDC_USDT_LOOP',
    'NAVI-LOOP-SUI-VSUI': 'SUI_VSUI_LOOP',
    'NAVI-LOOP-HASUI-SUI': 'HASUI_SUI_LOOP',
    'ALPHALEND-LOOP-SUI-STSUI': 'ALPHALEND_SUI_STSUI_LOOP',
    'NAVI-SUIUSDT': 'suiUSDT',
    'NAVI-NAVX': 'NAVX',
    'NAVI-AUSD': 'AUSD',
    'NAVI-ETH': 'ETH',
    'NAVI-NS': 'NS',
    'NAVI-STSUI': 'stSUI',
    'NAVI-WBTC': 'wBTC',
    'NAVI-SUI': 'SUI',
    'NAVI-USDY': 'USDY',
    'NAVI-USDC': 'USDC',
    'NAVI-VSUI': 'vSUI',
    'NAVI-WETH': 'WETH',
    'NAVI-WUSDC': 'WUSDC',
    'NAVI-USDT': 'USDT',
    'NAVI-DEEP': 'DEEP',
    'NAVI-WAL': 'WAL',
    'NAVI-SUIBTC': 'SUIBTC',
  };
  return map[poolName] ?? poolName;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pyth price update helper (mirrors updateSingleTokenPrice from legacy)
// ──────────────────────────────────────────────────────────────────────────────

async function updateSingleTokenPrice(
  tx: Transaction,
  pythPriceInfo: string,
  feedId: string,
  suiClient: SuiClient,
): Promise<void> {
  const priceConnection = new SuiPriceServiceConnection(
    'https://hermes.pyth.network',
  );
  const priceUpdateData = await priceConnection.getPriceFeedsUpdateData([feedId]);
  const pythClient = new SuiPythClient(suiClient, PYTH_STATE_ID, WORMHOLE_STATE_ID);
  await pythClient.updatePriceFeeds(tx, priceUpdateData, [feedId]);
  tx.moveCall({
    target: `${NAVI_CONFIG.ORACLE_PRO_PACKAGE_ID}::price_oracle::update_token_price_from_pyth`,
    arguments: [
      tx.object(NAVI_CONFIG.ORACLE_CONFIG),
      tx.object(pythPriceInfo),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main dispatcher
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build an autocompound transaction for the given pool name.
 *
 * Looks up the pool label via `context`, calls the appropriate strategy-level
 * helper, and returns the completed transaction (or `undefined` when the pool
 * is skipped, e.g. ALPHA vault).
 */
export async function getAutoCompoundSingleTxb(
  poolName: string,
  context: StrategyContext,
  tx?: Transaction,
  groupedRewardsMap?: Map<string, Map<string, LendingReward[]>>,
): Promise<Transaction | undefined> {
  const labels = await context.getPoolLabels();
  const label = labels.get(poolName);
  if (!label) return undefined;

  const txb = tx ?? new Transaction();

  switch (label.strategyType) {
    case 'AlphaVault':
      return undefined; // ALPHA pool has no autocompound action

    case 'Lp':
      await _autocompoundLp(txb, label as LpPoolLabel, context);
      break;

    case 'AutobalanceLp':
      await _autocompoundAutobalanceLp(txb, label as AutobalanceLpPoolLabel, context);
      break;

    case 'FungibleLp':
      await _autocompoundFungibleLp(txb, label as FungibleLpPoolLabel, context);
      break;

    case 'Lyf':
      await _autocompoundLyf(txb, label as LyfPoolLabel, context);
      break;

    case 'Lending':
      await _autocompoundLending(txb, label as LendingPoolLabel, context, groupedRewardsMap);
      break;

    case 'Looping':
      await _autocompoundLooping(txb, label as LoopingPoolLabel, context, groupedRewardsMap);
      break;

    case 'SingleAssetLooping':
      await _autocompoundSingleAssetLooping(
        txb,
        label as SingleAssetLoopingPoolLabel,
        context,
      );
      break;

    case 'SlushLending':
      await _autocompoundSlushLending(txb, label as SlushLendingPoolLabel, context);
      break;

    case 'SlushSingleAssetLooping':
      await _autocompoundSlushSingleAssetLooping(
        txb,
        label as SlushSingleAssetLoopingPoolLabel,
        context,
      );
      break;

    default:
      return undefined;
  }

  return txb;
}

// ──────────────────────────────────────────────────────────────────────────────
// LP strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundLp(
  tx: Transaction,
  label: LpPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const poolName = label.poolName;
  const coinB = label.assetB.name;
  const coinAType = label.assetA.type;
  const coinBType = label.assetB.type;

  const blueSuiPool = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin');
  const deepSuiPool = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
  const [blueCoinInfo] = await context.getCoinsBySymbols(['BLUE']);
  const [deepCoinInfo] = await context.getCoinsBySymbols(['DEEP']);
  const [suiCoinInfo] = await context.getCoinsBySymbols(['SUI']);

  const blueType = blueCoinInfo.coinType;
  const deepType = deepCoinInfo.coinType;
  const suiType = suiCoinInfo.coinType;

  if (label.parentProtocol === 'Bluefin') {
    if (poolName === 'BLUEFIN-SUI-USDC') {
      const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
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
      const cetusBuckSui = await context.getPoolIdBySymbolsAndProtocol('BUCK', 'SUI', 'cetus');
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
    } else if (poolName === 'BLUEFIN-USDT-USDC') {
      // Type-1: collect_and_swap first, then update_pool_v2
      const cetusUsdcUsdt = await context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus');
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
    } else if (poolName === 'BLUEFIN-SUI-AUSD') {
      const cetusAusdSui = await context.getPoolIdBySymbolsAndProtocol('AUSD', 'SUI', 'cetus');
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
    } else if (poolName === 'BLUEFIN-ALPHA-USDC') {
      const cetusAlphaUsdc = await context.getPoolIdBySymbolsAndProtocol('ALPHA', 'USDC', 'cetus');
      const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
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
          tx.object(blueSuiPool),
          tx.object(deepSuiPool),
          tx.object(cetusBlueSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-BLUE-USDC') {
      const cetusBlueUsdc = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'USDC', 'cetus');
      const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
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
          tx.object(deepSuiPool),
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
    } else if (poolName === 'BLUEFIN-WBTC-SUI') {
      const cetusWbtcSui = await context.getPoolIdBySymbolsAndProtocol('WBTC', 'SUI', 'cetus');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_sui_second_pool::update_pool_v2`,
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
          tx.object(cetusWbtcSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-DEEP-SUI') {
      const cetusDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'cetus');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_sui_second_pool::update_pool_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(deepSuiPool),
          tx.object(blueSuiPool),
          tx.object(cetusDeepSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-SUI') {
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_stsui_sui_pool::update_pool`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(label.parentPoolId),
          tx.object(blueSuiPool),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-USDC') {
      const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_stsui_first_pool::update_pool`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(ADMIN.BLUEFIN_STSUI_USDC_ZERO_ONE_POOL),
          tx.object(blueSuiPool),
          tx.object(cetusSuiUsdc),
          tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-ALPHA-STSUI') {
      const cetusAlphaSui = await context.getPoolIdBySymbolsAndProtocol('ALPHA', 'SUI', 'cetus');
      const bluefinSuiAlpha = await context.getPoolIdBySymbolsAndProtocol('SUI', 'ALPHA', 'bluefin');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_stsui_second_pool::update_pool`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(ADMIN.BLUEFIN_ALPHA_STSUI_POOL),
          tx.object(blueSuiPool),
          tx.object(cetusAlphaSui),
          tx.object(bluefinSuiAlpha),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-SUIUSDT-USDC') {
      const cetusUsdcSuiusdt = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUIUSDT', 'cetus');
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
          tx.object(cetusUsdcSuiusdt),
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
    } else if (poolName === 'BLUEFIN-WAL-STSUI') {
      const cetusWalSui = await context.getPoolIdBySymbolsAndProtocol('WAL', 'SUI', 'cetus');
      const bluefinSuiWal = await context.getPoolIdBySymbolsAndProtocol('SUI', 'WAL', 'bluefin');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_stsui_second_pool::update_pool`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(label.parentPoolId),
          tx.object(blueSuiPool),
          tx.object(cetusWalSui),
          tx.object(bluefinSuiWal),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WAL-USDC') {
      const cetusUsdcWal = await context.getPoolIdBySymbolsAndProtocol('USDC', 'WAL', 'cetus');
      const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
      const bluefinWalUsdc = await context.getPoolIdBySymbolsAndProtocol('WAL', 'USDC', 'bluefin');
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
    } else if (poolName === 'BLUEFIN-STSUI-WSOL' || poolName === 'BLUEFIN-STSUI-ETH' || poolName === 'BLUEFIN-STSUI-BUCK') {
      // stsui_first_pool pattern: stsui as coinA, other as coinB
      const otherCoinName = coinB;
      const cetusOtherSui = await context.getPoolIdBySymbolsAndProtocol(otherCoinName, 'SUI', 'cetus');
      const bluefinSuiOther = await context.getPoolIdBySymbolsAndProtocol('SUI', otherCoinName, 'bluefin');
      tx.moveCall({
        target: `${label.packageId}::alphafi_bluefin_stsui_first_pool::update_pool`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(label.parentPoolId),
          tx.object(blueSuiPool),
          tx.object(cetusOtherSui),
          tx.object(bluefinSuiOther),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  } else if (label.parentProtocol === 'Bucket') {
    // Bucket strategy autocompound
    const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bucket_investor_v1::collect_and_convert_reward_to_buck`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[3]),
        tx.object(label.investorId),
        tx.object(BUCKET_CONFIG.PROTOCOL_ID),
        tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
        tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_bucket_pool_v1::update_pool`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[3]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(BUCKET_CONFIG.PROTOCOL_ID),
        tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
        tx.object(BUCKET_CONFIG.FLASK_ID),
        tx.object(cetusSuiUsdc),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AutobalanceLp strategy
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Pool name sets for routing autobalance update calls.
 * These match the legacy AUTOBALANCE_SUI_FIRST/SECOND/TYPE_1 lists from alphafi-sdk/src/common/maps.ts.
 */
const AUTOBALANCE_SUI_FIRST_POOLS = new Set([
  'BLUEFIN-AUTOBALANCE-SUI-USDC',
  'BLUEFIN-AUTOBALANCE-SUI-LBTC',
  'BLUEFIN-AUTOBALANCE-SUI-USDC-175',
]);
const AUTOBALANCE_SUI_SECOND_POOLS = new Set([
  'BLUEFIN-AUTOBALANCE-DEEP-SUI',
  'BLUEFIN-AUTOBALANCE-BLUE-SUI',
  'BLUEFIN-AUTOBALANCE-DEEP-SUI-175',
  'BLUEFIN-AUTOBALANCE-WAL-SUI',
]);

async function _autocompoundAutobalanceLp(
  tx: Transaction,
  label: AutobalanceLpPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const coinAType = label.assetA.type;
  const coinBType = label.assetB.type;
  const poolName = label.poolName;

  // Determine module based on pool type
  let poolModule: string;
  let updateFn: string;
  if (AUTOBALANCE_SUI_FIRST_POOLS.has(poolName)) {
    poolModule = 'alphafi_bluefin_sui_first_pool';
    updateFn = 'update_pool_v4';
  } else if (AUTOBALANCE_SUI_SECOND_POOLS.has(poolName)) {
    poolModule = 'alphafi_bluefin_sui_second_pool';
    updateFn = 'update_pool_v3';
  } else {
    poolModule = 'alphafi_bluefin_type_1_pool';
    updateFn = 'update_pool_v3';
  }

  // Step 1: collect_reward for each reward token from the parent pool's reward_infos
  const parentPool = await context.blockchain.suiClient.getObject({
    id: label.parentPoolId,
    options: { showContent: true },
  });
  const rewardInfos: any[] = (parentPool.data?.content as any)?.fields?.reward_infos ?? [];
  for (const reward of rewardInfos) {
    const rewardType = '0x' + reward.fields.reward_coin_type;
    tx.moveCall({
      target: `${label.packageId}::${poolModule}::collect_reward`,
      typeArguments: [coinAType, coinBType, rewardType],
      arguments: [
        tx.object(VERSIONS.AUTOBALANCE_LP),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(label.parentPoolId),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  // Step 2: update_pool
  tx.moveCall({
    target: `${label.packageId}::${poolModule}::${updateFn}`,
    typeArguments: [coinAType, coinBType],
    arguments: [
      tx.object(VERSIONS.AUTOBALANCE_LP),
      tx.object(label.poolId),
      tx.object(label.investorId),
      tx.object(DISTRIBUTOR_OBJECT_ID),
      tx.object(GLOBAL_CONFIGS.BLUEFIN),
      tx.object(label.parentPoolId),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// FungibleLp strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundFungibleLp(
  tx: Transaction,
  label: FungibleLpPoolLabel,
  context: StrategyContext,
): Promise<void> {
  if (label.poolName === 'BLUEFIN-FUNGIBLE-STSUI-SUI') {
    const blueSuiPool = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin');
    const [blueInfo] = await context.getCoinsBySymbols(['BLUE']);
    const bluefinStsuiSuiPool = await context.getPoolIdBySymbolsAndProtocol('STSUI', 'SUI', 'bluefin');
    tx.moveCall({
      target: `${label.packageId}::alphafi_bluefin_stsui_sui_ft_pool::update_pool`,
      typeArguments: [
        label.assetA.type,
        label.assetB.type,
        label.fungibleCoin.type,
        blueInfo.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.FUNGIBLE_LP),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(bluefinStsuiSuiPool),
        tx.object(blueSuiPool),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Lyf strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundLyf(
  tx: Transaction,
  label: LyfPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const coinAType = label.assetA.type;
  const coinBType = label.assetB.type;
  const [blueInfo, suiInfo, stsuiInfo, alphaInfo] = await context.getCoinsBySymbols([
    'BLUE', 'SUI', 'STSUI', 'ALPHA',
  ]);

  // Update price via alphalend
  const alphalendClient = new AlphalendClient('mainnet', context.blockchain.suiClient);
  await alphalendClient.updatePrices(tx, [coinAType, coinBType]);

  if (label.poolName === 'BLUEFIN-LYF-STSUI-SUI') {
    const blueSuiAutoPool = ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND;
    const bluefinAlphaStsui = ADMIN.BLUEFIN_ALPHA_STSUI_POOL;

    // collect_reward_and_swap_bluefin x3
    // isBorrow sequence must match legacy collectAndSwapRewardsLyf: true, false, false
    for (const [rewardType, toType, pool, isBorrow] of [
      [blueInfo.coinType, suiInfo.coinType, blueSuiAutoPool, true],
      [blueInfo.coinType, suiInfo.coinType, blueSuiAutoPool, false],
      [alphaInfo.coinType, stsuiInfo.coinType, bluefinAlphaStsui, false],
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
  } else if (label.poolName === 'BLUEFIN-LYF-SUIUSDT-USDC') {
    const [usdcInfo] = await context.getCoinsBySymbols(['USDC']);
    for (const [rewardType, toType, pool, isBorrow] of [
      [stsuiInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL, true],
      [stsuiInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL, false],
      [suiInfo.coinType, usdcInfo.coinType, ADMIN.BLUEFIN_SUI_USDC_175_POOL, true],
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
    target: `${label.packageId}::alphafi_lyf_pool::update_pool`,
    typeArguments: [coinAType, coinBType],
    arguments: [
      tx.object(VERSIONS.LYF_LP),
      tx.object(label.poolId),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(GLOBAL_CONFIGS.BLUEFIN),
      tx.object(label.parentPoolId),
      tx.object(SUI_SYSTEM_STATE),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Lending (NAVI single-asset) strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundLending(
  tx: Transaction,
  label: LendingPoolLabel,
  context: StrategyContext,
  groupedRewardsMap?: Map<string, Map<string, LendingReward[]>>,
): Promise<void> {
  const poolName = label.poolName;
  const assetName = label.asset.name;
  const assetType = label.asset.type;
  const assetIndex = (NAVI_CONFIG.ASSET_MAP as Record<string, string>)[assetName];
  const priceFeed = (NAVI_CONFIG.PRICE_FEED as any)[assetName] as
    | { feedId: string; pythPriceInfo: string }
    | undefined;

  if (priceFeed) {
    await updateSingleTokenPrice(tx, priceFeed.pythPriceInfo, priceFeed.feedId, context.blockchain.suiClient);
  }

  const claimable = groupedRewardsMap?.get(poolName);

  if (label.packageNumber === 9) {
    // NAVI-SUIBTC — uses ALPHA_NAVI_V2 package
    if (poolName === 'NAVI-SUIBTC' && claimable && assetIndex !== undefined) {
      const bluefinNavxSui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'bluefin');
      const bluefinDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
      const bluefinVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'bluefin');
      const [navxInfo, deepInfo, vsuiInfo, suiInfo] = await context.getCoinsBySymbols(['NAVX', 'DEEP', 'VSUI', 'SUI']);
      const bluefinSuiAsset = await context.getPoolIdBySymbolsAndProtocol('SUI', assetName, 'bluefin').catch(() => '');

      const rewardCalls: Array<{ rewardType: string; swapPool: string; intermediary: string; rewardPool: string }> = [];
      for (const r of claimable.get(assetType) ?? []) {
        if (r.rewardCoinType === navxInfo.coinType) {
          rewardCalls.push({ rewardType: navxInfo.coinType, swapPool: bluefinNavxSui, intermediary: navxInfo.coinType, rewardPool: NAVI_CONFIG.REWARDS_POOL.NAVX });
        } else if (r.rewardCoinType === deepInfo.coinType) {
          rewardCalls.push({ rewardType: deepInfo.coinType, swapPool: bluefinDeepSui, intermediary: deepInfo.coinType, rewardPool: NAVI_CONFIG.REWARDS_POOL.DEEP });
        } else if (r.rewardCoinType === vsuiInfo.coinType) {
          rewardCalls.push({ rewardType: vsuiInfo.coinType, swapPool: bluefinVsuiSui, intermediary: vsuiInfo.coinType, rewardPool: NAVI_CONFIG.REWARDS_POOL.vSUI });
        }
      }

      for (const { rewardType, swapPool, rewardPool } of rewardCalls) {
        const suiPool = bluefinSuiAsset || ADMIN.BLUEFIN_SUI_WAL_POOL;
        tx.moveCall({
          target: `${ADMIN.ALPHA_NAVI_V2_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
          typeArguments: [assetType, suiInfo.coinType, rewardType],
          arguments: [
            tx.object(VERSIONS.ALPHA_NAVI_V2),
            tx.object(label.investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(rewardPool),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(swapPool),
            tx.object(suiPool),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }

      tx.moveCall({
        target: `${ADMIN.ALPHA_NAVI_V2_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::update_pool_v3`,
        typeArguments: [assetType],
        arguments: [
          tx.object(VERSIONS.ALPHA_NAVI_V2),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(label.parentPoolId),
          tx.pure.u8(Number(assetIndex)),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  } else if (label.packageNumber === 3 && assetIndex !== undefined) {
    // Package 3: NAVI-AUSD, NAVI-ETH, NAVI-SUIUSDT, NAVI-NS, NAVI-NAVX, NAVI-STSUI, NAVI-DEEP, NAVI-WAL
    if (claimable) {
      await _collectNaviRewardsV3(tx, poolName, assetType, assetIndex, label.investorId, claimable, context);
    }
    tx.moveCall({
      target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::update_pool_v2`,
      typeArguments: [assetType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[3]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
        tx.object(label.parentPoolId),
        tx.pure.u8(Number(assetIndex)),
        tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
        tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (label.packageNumber === 1) {
    // Package 1: Basic NAVI pools (NAVI-SUI, NAVI-USDC, NAVI-USDT, NAVI-WETH, NAVI-VSUI, NAVI-HASUI, etc.)
    // update_pool_v2 signature: (version, pool, investor, dis, oracle, storage, navi_pool, asset, incentive_v3, incentive_v2, system_state, clock)
    if (assetIndex !== undefined) {
      tx.moveCall({
        target: `${label.packageId}::alphafi_navi_pool::update_pool_v2`,
        typeArguments: [assetType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(label.poolId),
          tx.object(label.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(label.parentPoolId),
          tx.pure.u8(Number(assetIndex)),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }
}

async function _collectNaviRewardsV3(
  tx: Transaction,
  poolName: string,
  assetType: string,
  assetIndex: string,
  investorId: string,
  claimable: Map<string, LendingReward[]>,
  context: StrategyContext,
): Promise<void> {
  const [navxInfo, deepInfo, vsuiInfo, stsuiInfo, nsInfo] = await context.getCoinsBySymbols([
    'NAVX', 'DEEP', 'VSUI', 'STSUI', 'NS',
  ]);
  const [usdcInfo] = await context.getCoinsBySymbols(['USDC']);
  const [suiInfo] = await context.getCoinsBySymbols(['SUI']);

  const assetSymbol = poolName.replace('NAVI-', '');

  for (const reward of claimable.get(assetType) ?? []) {
    const rc = reward.rewardCoinType;

    if (rc === navxInfo.coinType) {
      if (poolName === 'NAVI-NS') {
        // collect_reward_with_two_swaps (NAVX → SUI → asset)
        const cetusNavxSui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
        const cetusAssetSui = await context.getPoolIdBySymbolsAndProtocol(assetSymbol, 'SUI', 'cetus').catch(() => '');
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
          typeArguments: [assetType, navxInfo.coinType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(cetusNavxSui),
            tx.object(cetusAssetSui || ADMIN.NAVI_NS_REWARDS_POOL),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === 'NAVI-NAVX') {
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === 'NAVI-STSUI') {
        const cetusNavxSui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
        const cetusStsuiSui = await context.getPoolIdBySymbolsAndProtocol('STSUI', 'SUI', 'cetus');
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
          typeArguments: [assetType, suiInfo.coinType, navxInfo.coinType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(cetusNavxSui),
            tx.object(cetusStsuiSui),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === 'NAVI-AUSD' || poolName === 'NAVI-ETH' || poolName === 'NAVI-SUIUSDT') {
        // These use collect_reward_with_no_swap for NAVX
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else if (rc === deepInfo.coinType) {
      if (poolName === 'NAVI-NS') {
        const cetusDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'cetus');
        const cetusNsSui = await context.getPoolIdBySymbolsAndProtocol('NS', 'SUI', 'cetus');
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
          typeArguments: [assetType, deepInfo.coinType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.DEEP),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(cetusDeepSui),
            tx.object(cetusNsSui),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === 'NAVI-DEEP') {
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.DEEP),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        const cetusDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'cetus');
        const cetusAssetSui = await context.getPoolIdBySymbolsAndProtocol(assetSymbol, 'SUI', 'cetus').catch(() => '');
        if (cetusAssetSui) {
          tx.moveCall({
            target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
            typeArguments: [assetType, suiInfo.coinType, deepInfo.coinType],
            arguments: [
              tx.object(VERSIONS.ALPHA_VERSIONS[3]),
              tx.object(investorId),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.pure.u8(Number(assetIndex)),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(NAVI_CONFIG.REWARDS_POOL.DEEP),
              tx.object(GLOBAL_CONFIGS.CETUS),
              tx.object(cetusDeepSui),
              tx.object(cetusAssetSui),
              tx.object(CLOCK_PACKAGE_ID),
            ],
          });
        }
      }
    } else if (rc === vsuiInfo.coinType) {
      if (poolName === 'NAVI-AUSD' || poolName === 'NAVI-ETH') {
        const cetusVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
        const cetusSuiUsdc = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
        const cetusUsdcAsset = await context.getPoolIdBySymbolsAndProtocol('USDC', assetSymbol, 'cetus').catch(() => '');
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_three_swaps`,
          typeArguments: [assetType, usdcInfo.coinType, suiInfo.coinType, vsuiInfo.coinType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(cetusVsuiSui),
            tx.object(cetusSuiUsdc),
            tx.object(cetusUsdcAsset || cetusSuiUsdc),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === 'NAVI-DEEP' || poolName === 'NAVI-WAL') {
        const bluefinVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'bluefin');
        const bluefinAssetSui = await context.getPoolIdBySymbolsAndProtocol(assetSymbol, 'SUI', 'bluefin').catch(() => '');
        if (bluefinAssetSui) {
          tx.moveCall({
            target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
            typeArguments: [assetType, suiInfo.coinType, vsuiInfo.coinType],
            arguments: [
              tx.object(VERSIONS.ALPHA_VERSIONS[3]),
              tx.object(investorId),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.pure.u8(Number(assetIndex)),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
              tx.object(GLOBAL_CONFIGS.BLUEFIN),
              tx.object(bluefinVsuiSui),
              tx.object(bluefinAssetSui),
              tx.object(CLOCK_PACKAGE_ID),
            ],
          });
        }
      } else {
        const cetusVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
        const cetusAssetSui = await context.getPoolIdBySymbolsAndProtocol(assetSymbol, 'SUI', 'cetus').catch(() => '');
        if (cetusAssetSui) {
          tx.moveCall({
            target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
            typeArguments: [assetType, suiInfo.coinType, vsuiInfo.coinType],
            arguments: [
              tx.object(VERSIONS.ALPHA_VERSIONS[3]),
              tx.object(investorId),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.pure.u8(Number(assetIndex)),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
              tx.object(GLOBAL_CONFIGS.CETUS),
              tx.object(cetusVsuiSui),
              tx.object(cetusAssetSui),
              tx.object(CLOCK_PACKAGE_ID),
            ],
          });
        }
      }
    } else if (rc === stsuiInfo.coinType) {
      if (poolName === 'NAVI-STSUI') {
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(NAVI_CONFIG.REWARDS_POOL.stSUI),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else if (rc === nsInfo.coinType) {
      if (poolName === 'NAVI-NS') {
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(ADMIN.NAVI_NS_REWARDS_POOL),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else if (rc === (await context.getCoinsBySymbols(['WAL']))[0].coinType) {
      if (poolName === 'NAVI-WAL') {
        tx.moveCall({
          target: `${ADMIN.ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
          typeArguments: [assetType],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(investorId),
            tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
            tx.pure.u8(Number(assetIndex)),
            tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
            tx.object(ADMIN.NAVI_WAL_REWARDS_POOL),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Looping (NAVI-LOOP) strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundLooping(
  tx: Transaction,
  label: LoopingPoolLabel,
  context: StrategyContext,
  groupedRewardsMap?: Map<string, Map<string, LendingReward[]>>,
): Promise<void> {
  const poolName = label.poolName;
  const supplyType = label.supplyAsset.type;
  const borrowType = label.borrowAsset.type;

  // ALPHALEND-LOOP-SUI-STSUI uses a completely different flow (Alphalend parent, not NAVI).
  // Handle it first before the NAVI price-update logic.
  if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
    const cetusBleSui = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus');
    // 1. Collect ALPHA rewards via one-swap (ALPHA → STSUI via Bluefin)
    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
      typeArguments: [(await context.getCoinsBySymbols(['ALPHA']))[0].coinType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[5]),
        tx.object(label.investorId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(ADMIN.BLUEFIN_ALPHA_STSUI_POOL),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    // 2. Collect staking rewards with no swap (e.g. stSUI native rewards)
    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[5]),
        tx.object(label.investorId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    // 3. Collect BLUE rewards via two swaps (BLUE → SUI → STSUI via Cetus)
    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
      typeArguments: [(await context.getCoinsBySymbols(['BLUE']))[0].coinType],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[5]),
        tx.object(label.investorId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(cetusBleSui),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    // 4. Update pool
    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_sui_stsui_pool::update_pool_v3`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[5]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    return;
  }

  const supplyFeed = (NAVI_CONFIG.PRICE_FEED as any)[label.supplyAsset.name] as
    | { feedId: string; pythPriceInfo: string }
    | undefined;

  if (supplyFeed) {
    await updateSingleTokenPrice(tx, supplyFeed.pythPriceInfo, supplyFeed.feedId, context.blockchain.suiClient);
  }

  const claimable = groupedRewardsMap?.get(poolName);

  if (poolName === 'NAVI-LOOP-SUI-VSUI' && label.packageNumber === 2) {
    const borrowFeed = (NAVI_CONFIG.PRICE_FEED as any)[label.borrowAsset.name] as
      | { feedId: string; pythPriceInfo: string }
      | undefined;
    if (borrowFeed) {
      await updateSingleTokenPrice(tx, borrowFeed.pythPriceInfo, borrowFeed.feedId, context.blockchain.suiClient);
    }

    const [navxInfo, vsuiInfo] = await context.getCoinsBySymbols(['NAVX', 'VSUI']);
    const cetusNavxSui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
    const cetusVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
    const suiType = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

    const seen = new Set<string>();
    const types = [supplyType, suiType];
    for (const coinTypeKey of types) {
      for (const r of claimable?.get(coinTypeKey) ?? []) {
        if (seen.has(r.rewardCoinType)) continue;
        seen.add(r.rewardCoinType);

        if (r.rewardCoinType === navxInfo.coinType) {
          tx.moveCall({
            target: `${label.packageId}::alphafi_navi_sui_vsui_investor::collect_reward_with_two_swaps_v2`,
            typeArguments: [navxInfo.coinType],
            arguments: [
              tx.object(label.investorId),
              tx.object(VERSIONS.ALPHA_VERSIONS[2]),
              tx.object(CLOCK_PACKAGE_ID),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
              tx.object(NAVI_CONFIG.VOLO.STAKE_POOL),
              tx.object(NAVI_CONFIG.VOLO.METADATA),
              tx.object(SUI_SYSTEM_STATE),
              tx.object(cetusNavxSui),
              tx.object(cetusVsuiSui),
              tx.object(GLOBAL_CONFIGS.CETUS),
            ],
          });
        } else if (r.rewardCoinType === vsuiInfo.coinType) {
          tx.moveCall({
            target: `${label.packageId}::alphafi_navi_sui_vsui_investor::collect_reward_with_no_swap`,
            arguments: [
              tx.object(label.investorId),
              tx.object(VERSIONS.ALPHA_VERSIONS[2]),
              tx.object(CLOCK_PACKAGE_ID),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
            ],
          });
        }
      }
    }

    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_sui_vsui_pool::update_pool_v3`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[2]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
        tx.object(NAVI_CONFIG.NAVI_POOLS.vSUI),
        tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
        tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
        tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
        tx.object(NAVI_CONFIG.VOLO.STAKE_POOL),
        tx.object(NAVI_CONFIG.VOLO.METADATA),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'NAVI-LOOP-USDT-USDC' && label.packageNumber === 5) {
    const borrowFeed = (NAVI_CONFIG.PRICE_FEED as any)[label.borrowAsset.name] as
      | { feedId: string; pythPriceInfo: string }
      | undefined;
    if (borrowFeed) {
      await updateSingleTokenPrice(tx, borrowFeed.pythPriceInfo, borrowFeed.feedId, context.blockchain.suiClient);
    }

    const [navxInfo, vsuiInfo] = await context.getCoinsBySymbols(['NAVX', 'VSUI']);
    const cetusNavxSui = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
    const cetusVsuiSui = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
    const cetusUsdcSui = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
    const cetusUsdcUsdt = await context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus');

    const seen = new Set<string>();
    for (const coinTypeKey of [supplyType, borrowType]) {
      for (const r of claimable?.get(coinTypeKey) ?? []) {
        if (seen.has(r.rewardCoinType)) continue;
        seen.add(r.rewardCoinType);

        if (r.rewardCoinType === navxInfo.coinType || r.rewardCoinType === vsuiInfo.coinType) {
          const rewardsPool = r.rewardCoinType === navxInfo.coinType
            ? NAVI_CONFIG.REWARDS_POOL.NAVX
            : NAVI_CONFIG.REWARDS_POOL.vSUI;
          const swapPool = r.rewardCoinType === navxInfo.coinType ? cetusNavxSui : cetusVsuiSui;
          tx.moveCall({
            target: `${label.packageId}::alphafi_navi_usdt_usdc_investor::collect_v3_rewards_with_three_swaps`,
            typeArguments: [supplyType, borrowType, '0x2::sui::SUI', r.rewardCoinType],
            arguments: [
              tx.object(label.investorId),
              tx.object(VERSIONS.ALPHA_VERSIONS[5]),
              tx.object(CLOCK_PACKAGE_ID),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(rewardsPool),
              tx.object(swapPool),
              tx.object(cetusUsdcSui),
              tx.object(cetusUsdcUsdt),
              tx.object(GLOBAL_CONFIGS.CETUS),
            ],
          });
        }
      }
    }

    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_usdt_usdc_pool::update_pool_v3`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[5]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
        tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
        tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
        tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
        tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'NAVI-LOOP-HASUI-SUI') {
    const borrowFeed = (NAVI_CONFIG.PRICE_FEED as any)[label.borrowAsset.name] as
      | { feedId: string; pythPriceInfo: string }
      | undefined;
    if (borrowFeed) {
      await updateSingleTokenPrice(tx, borrowFeed.pythPriceInfo, borrowFeed.feedId, context.blockchain.suiClient);
    }

    const [navxInfo2, vsuiInfo2] = await context.getCoinsBySymbols(['NAVX', 'VSUI']);
    const cetusNavxSui2 = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
    const cetusVsuiSui2 = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
    const cetusHasuiSui = await context.getPoolIdBySymbolsAndProtocol('HASUI', 'SUI', 'cetus');
    const suiType2 = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

    const seen2 = new Set<string>();
    const coinTypeKeys2 = [supplyType, suiType2];
    for (const coinTypeKey of coinTypeKeys2) {
      for (const r of claimable?.get(coinTypeKey) ?? []) {
        if (seen2.has(r.rewardCoinType)) continue;
        seen2.add(r.rewardCoinType);

        if (r.rewardCoinType === navxInfo2.coinType || r.rewardCoinType === vsuiInfo2.coinType) {
          const rewardsPool2 = r.rewardCoinType === navxInfo2.coinType
            ? NAVI_CONFIG.REWARDS_POOL.NAVX
            : NAVI_CONFIG.REWARDS_POOL.vSUI;
          const swapPool2 = r.rewardCoinType === navxInfo2.coinType ? cetusNavxSui2 : cetusVsuiSui2;
          tx.moveCall({
            target: `${label.packageId}::alphafi_navi_hasui_sui_investor::collect_reward_with_two_swaps`,
            typeArguments: [r.rewardCoinType],
            arguments: [
              tx.object(label.investorId),
              tx.object(VERSIONS.ALPHA_VERSIONS[2]),
              tx.object(CLOCK_PACKAGE_ID),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(rewardsPool2),
              tx.object(NAVI_CONFIG.HAEDEL_STAKING),
              tx.object(SUI_SYSTEM_STATE),
              tx.object(swapPool2),
              tx.object(cetusHasuiSui),
              tx.object(GLOBAL_CONFIGS.CETUS),
            ],
          });
        }
      }
    }

    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_hasui_sui_pool::update_pool_v2`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[2]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
        tx.object(NAVI_CONFIG.NAVI_POOLS.HASUI),
        tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
        tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
        tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(cetusHasuiSui),
        tx.object(NAVI_CONFIG.HAEDEL_STAKING),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
    const borrowFeed2 = (NAVI_CONFIG.PRICE_FEED as any)[label.borrowAsset.name] as
      | { feedId: string; pythPriceInfo: string }
      | undefined;
    if (borrowFeed2) {
      await updateSingleTokenPrice(tx, borrowFeed2.pythPriceInfo, borrowFeed2.feedId, context.blockchain.suiClient);
    }

    const [navxInfo3, vsuiInfo3] = await context.getCoinsBySymbols(['NAVX', 'VSUI']);
    const cetusNavxSui3 = await context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus');
    const cetusVsuiSui3 = await context.getPoolIdBySymbolsAndProtocol('VSUI', 'SUI', 'cetus');
    const cetusUsdcSui3 = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');

    const seen3 = new Set<string>();
    for (const coinTypeKey of [supplyType, borrowType]) {
      for (const r of claimable?.get(coinTypeKey) ?? []) {
        if (seen3.has(r.rewardCoinType)) continue;
        seen3.add(r.rewardCoinType);

        if (r.rewardCoinType === navxInfo3.coinType || r.rewardCoinType === vsuiInfo3.coinType) {
          const rewardsPool3 = r.rewardCoinType === navxInfo3.coinType
            ? NAVI_CONFIG.REWARDS_POOL.NAVX
            : NAVI_CONFIG.REWARDS_POOL.vSUI;
          const swapPool3 = r.rewardCoinType === navxInfo3.coinType ? cetusNavxSui3 : cetusVsuiSui3;
          tx.moveCall({
            target: `${label.packageId}::alphafi_navi_native_usdc_usdt_investor::collect_reward_with_two_swaps`,
            typeArguments: [r.rewardCoinType],
            arguments: [
              tx.object(label.investorId),
              tx.object(VERSIONS.ALPHA_VERSIONS[2]),
              tx.object(CLOCK_PACKAGE_ID),
              tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
              tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
              tx.object(rewardsPool3),
              tx.object(swapPool3),
              tx.object(cetusUsdcSui3),
              tx.object(GLOBAL_CONFIGS.CETUS),
            ],
          });
        }
      }
    }

    tx.moveCall({
      target: `${label.packageId}::alphafi_navi_native_usdc_usdt_pool::update_pool_v3`,
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[2]),
        tx.object(label.poolId),
        tx.object(label.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
        tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
        tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
        tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
        tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }
}

function _loopingModule(poolName: string): string {
  const map: Record<string, string> = {
    'NAVI-LOOP-HASUI-SUI': 'alphafi_navi_hasui_sui_pool',
    'NAVI-LOOP-USDC-USDT': 'alphafi_navi_native_usdc_usdt_pool',
    'NAVI-LOOP-USDT-USDC': 'alphafi_navi_usdt_usdc_pool',
    'NAVI-LOOP-SUI-VSUI': 'alphafi_navi_sui_vsui_pool',
  };
  return map[poolName] ?? 'alphafi_navi_pool';
}

// ──────────────────────────────────────────────────────────────────────────────
// SingleAssetLooping (ALPHALEND-SINGLE-LOOP) strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundSingleAssetLooping(
  tx: Transaction,
  label: SingleAssetLoopingPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const poolName = label.poolName;
  const assetType = label.asset.type;

  const alphalendClient = new AlphalendClient('mainnet', context.blockchain.suiClient);
  await alphalendClient.updatePrices(tx, [assetType]);

  // Collect rewards (port of collectAndSwapRewardsSingleLoop)
  if (poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
    const [tbtcInfo, alphaInfo, stsuiInfo, blueInfo, deepInfo, usdcInfo, suiInfo] =
      await context.getCoinsBySymbols(['TBTC', 'ALPHA', 'STSUI', 'BLUE', 'DEEP', 'USDC', 'SUI']);
    const bluefinAlphaStsui = ADMIN.BLUEFIN_ALPHA_STSUI_POOL;
    const bluefinStsuiSui0 = ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL;
    const bluefinBlueSuiAuto = ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND;
    const bluefinDeepSui = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
    const bluefinSuiUsdc175 = ADMIN.BLUEFIN_SUI_USDC_175_POOL;
    const bluefinTbtcUsdc = await context.getPoolIdBySymbolsAndProtocol('TBTC', 'USDC', 'bluefin').catch(() => '');

    for (const [coinType, toType, pool, isFrom, isTo] of [
      [alphaInfo.coinType, stsuiInfo.coinType, bluefinAlphaStsui, true, false],
      [stsuiInfo.coinType, suiInfo.coinType, bluefinStsuiSui0, true, true],
      [blueInfo.coinType, suiInfo.coinType, bluefinBlueSuiAuto, true, true],
      [deepInfo.coinType, suiInfo.coinType, bluefinDeepSui, true, true],
      [suiInfo.coinType, usdcInfo.coinType, bluefinSuiUsdc175, true, true],
      ...(bluefinTbtcUsdc ? [[tbtcInfo.coinType, usdcInfo.coinType, bluefinTbtcUsdc, false, true]] : []),
    ] as [string, string, string, boolean, boolean][]) {
      tx.moveCall({
        target: `${label.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [assetType, coinType, toType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(label.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(pool),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(isFrom),
          tx.pure.bool(isTo),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  } else if (poolName === 'ALPHALEND-SINGLE-LOOP-SUIBTC') {
    const [suibtcInfo, alphaInfo, stsuiInfo, blueInfo, deepInfo, suiInfo] =
      await context.getCoinsBySymbols(['SUIBTC', 'ALPHA', 'STSUI', 'BLUE', 'DEEP', 'SUI']);
    const bluefinDeepSui175 = ADMIN.BLUEFIN_DEEP_SUI_175_POOL;

    for (const [coinType, toType, pool, isFrom, isTo] of [
      [alphaInfo.coinType, stsuiInfo.coinType, ADMIN.BLUEFIN_ALPHA_STSUI_POOL, true, false],
      [blueInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND, true, true],
      [deepInfo.coinType, suiInfo.coinType, bluefinDeepSui175, true, true],
      [stsuiInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL, true, true],
      [suiInfo.coinType, suibtcInfo.coinType, await context.getPoolIdBySymbolsAndProtocol('SUI', 'SUIBTC', 'bluefin'), true, false],
    ] as [string, string, string, boolean, boolean][]) {
      tx.moveCall({
        target: `${label.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [assetType, coinType, toType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(label.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(pool),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(isFrom),
          tx.pure.bool(isTo),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  tx.moveCall({
    target: `${label.packageId}::alphafi_alphalend_single_loop_pool::update_pool`,
    typeArguments: [assetType],
    arguments: [
      tx.object(VERSIONS.ALPHALEND_VERSION),
      tx.object(label.poolId),
      tx.object(label.investorId),
      tx.object(DISTRIBUTOR_OBJECT_ID),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// ALPHALEND-LOOP-SUI-STSUI (Looping strategy but Alphalend parent)
// handled in looping strategy but the ALPHALEND version uses different modules
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// SlushLending strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundSlushLending(
  tx: Transaction,
  label: SlushLendingPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const coinType = label.asset.type;
  const coinName = label.asset.name;
  const [suiInfo] = await context.getCoinsBySymbols(['SUI']);
  const [usdcInfo] = await context.getCoinsBySymbols(['USDC']);
  const [stsuiInfo] = await context.getCoinsBySymbols(['STSUI']);
  const [blueInfo] = await context.getCoinsBySymbols(['BLUE']);
  const [deepInfo] = await context.getCoinsBySymbols(['DEEP']);
  const [alphaInfo] = await context.getCoinsBySymbols(['ALPHA']);

  const alphalendClient = new AlphalendClient('mainnet', context.blockchain.suiClient);
  await alphalendClient.updatePrices(tx, [coinType]);

  // collect_reward_and_swap_bluefin calls for slush lending pools
  const calls: [string, string, string, boolean, boolean][] = [
    [alphaInfo.coinType, stsuiInfo.coinType, ADMIN.BLUEFIN_ALPHA_STSUI_POOL, true, true],
    [stsuiInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL, true, true],
    [blueInfo.coinType, suiInfo.coinType, ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND, true, true],
  ];

  if (coinType !== deepInfo.coinType) {
    calls.push([deepInfo.coinType, suiInfo.coinType, await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin'), true, true]);
  }

  if (coinType === usdcInfo.coinType) {
    calls.push([suiInfo.coinType, usdcInfo.coinType, await context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin'), true, false]);
  } else if (coinName === 'WAL') {
    const walSuiPool = await context.getPoolIdBySymbolsAndProtocol('WAL', 'SUI', 'bluefin');
    calls.push([coinType, suiInfo.coinType, walSuiPool, false, true]);
  } else if (coinType === deepInfo.coinType) {
    const deepSuiPool = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');
    calls.push([deepInfo.coinType, suiInfo.coinType, deepSuiPool, false, true]);
  }

  for (const [rewardType, toType, pool, isFrom, isTo] of calls) {
    tx.moveCall({
      target: `${ADMIN.ALPHA_SLUSH_LATEST_PACKAGE_ID}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [coinType, rewardType, toType],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(label.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(pool),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(isFrom),
        tx.pure.bool(isTo),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  tx.moveCall({
    target: `${label.packageId}::alphalend_slush_pool::update_pool`,
    typeArguments: [coinType],
    arguments: [
      tx.object(VERSIONS.SLUSH),
      tx.object(label.poolId),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(SUI_SYSTEM_STATE),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SlushSingleAssetLooping strategy
// ──────────────────────────────────────────────────────────────────────────────

async function _autocompoundSlushSingleAssetLooping(
  tx: Transaction,
  label: SlushSingleAssetLoopingPoolLabel,
  context: StrategyContext,
): Promise<void> {
  const poolName = label.poolName;
  const coinType = label.asset.type;
  const [suiInfo] = await context.getCoinsBySymbols(['SUI']);
  const [stsuiInfo] = await context.getCoinsBySymbols(['STSUI']);
  const [blueInfo] = await context.getCoinsBySymbols(['BLUE']);
  const [usdcInfo] = await context.getCoinsBySymbols(['USDC']);

  if (poolName === 'ALPHALEND-SLUSH-STSUI-LOOP') {
    // STSUI staking loop — uses old SLUSH_TEST_VERSION
    tx.moveCall({
      target: `${label.packageId}::alphafi_slush_stsui_sui_loop_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [blueInfo.coinType, suiInfo.coinType],
      arguments: [
        tx.object(ADMIN.ALPHA_SLUSH_VERSION),
        tx.object(label.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_slush_stsui_sui_loop_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [stsuiInfo.coinType, suiInfo.coinType],
      arguments: [
        tx.object(ADMIN.ALPHA_SLUSH_VERSION),
        tx.object(label.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${label.packageId}::alphafi_slush_stsui_sui_loop_pool::update_pool`,
      arguments: [
        tx.object(ADMIN.ALPHA_SLUSH_VERSION),
        tx.object(label.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  } else if (poolName.endsWith('-SINGLE-LOOP')) {
    const alphalendClient = new AlphalendClient('mainnet', context.blockchain.suiClient);
    await alphalendClient.updatePrices(tx, [coinType]);

    if (poolName === 'ALPHALEND-SLUSH-USDSUI-SINGLE-LOOP') {
      // USDSUI → STSUI → SUI swap chain
      tx.moveCall({
        target: `${label.packageId}::alphalend_slush_locked_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinType, stsuiInfo.coinType, suiInfo.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(label.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.pure.u64(10),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${label.packageId}::alphalend_slush_locked_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinType, suiInfo.coinType, usdcInfo.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(label.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(ADMIN.BLUEFIN_SUI_USDC_175_POOL),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.pure.u64(1000),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${label.packageId}::alphalend_slush_locked_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinType, coinType, usdcInfo.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(label.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await context.getPoolIdBySymbolsAndProtocol('USDSUI', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.pure.u64(10),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }

    tx.moveCall({
      target: `${label.packageId}::alphalend_slush_locked_loop_pool::update_pool`,
      typeArguments: [coinType],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(label.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }
}
