/**
 * Admin scripts for alphalend_slush_pool and alphalend_slush_locked_loop_pool modules.
 *
 * Covers:
 *  - admin_set_coin_swap_info      (normal pool + locked-loop pool)
 *  - admin_add_allowed_bluefin_pool (normal pool + locked-loop pool)
 *
 * packageId and pool coin type are derived from the API via StrategyContext.getPoolLabel().
 * Coin types for swap/Bluefin params are resolved from symbol via CoinInfoProvider.
 * Bluefin pool IDs are resolved from POOL_REGISTRY via getPoolIdsByTypes().
 */

import { Transaction } from '@mysten/sui/transactions';
import { StrategyContext } from '../src/models/strategyContext.js';
import { CoinInfoProvider } from '../src/models/coinInfoProvider.js';
import { VERSIONS } from '../src/utils/constants.js';
import { dryRunTransactionBlock, executeTransactionBlock } from './utils.js';

// ─── Admin capabilities ───────────────────────────────────────────────────────

const ADMIN_CAP = '0xf9de0b4ad34fbdd260cb4adcd00f00f3cf37e118e178437eaf2f0a8340226c4f';
const TEST_ADMIN_CAP = '0xfba01590aa578515e4713f7e92a78e1a5e34ca6d693147597cfd5d6d684af956';

// ─── Package ID ───────────────────────────────────────────────────────────────

const SLUSH_PACKAGE = '0x3dff36585d07f3d7caeb5b2645391310ba090c967f8d483e7ede6e28c37a0e30';

// ─── Pool ID maps ─────────────────────────────────────────────────────────────

export const SLUSH_LENDING_POOL_IDS: Record<string, string> = {
  SUI: '0x18db5470cc2da4f74b1b957891f274d896764d08c56c3941788cef84d2a1362e',
  USDC: '0x15a537db45889267354a2576e1cf24e84ea7674a4e5691e71dd4c4592c9a8ce9',
  WAL: '0xcb8b3311b50c89edc2a0e51a0ffc591a651f8c8819ad000aa46f5974a619378d',
  DEEP: '0xed4302b0db5a1eabc2f8404222572892c0bf7c81004935b23e4f22808b52a0af',
};

export const SLUSH_LOCKED_LOOP_POOL_IDS: Record<string, string> = {
  WAL: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
  USDSUI: '0x0e1399fe66eca3147766bb113ae7b52b31243874c9e4a64a48e6d8cb91aa3c04',
};

// ─── Alphalend market IDs ─────────────────────────────────────────────────────
// Source: alphalendMarketIdMap in alphafi-sdk

const ALPHALEND_MARKET_IDS: Record<string, number> = {
  SUI: 1,
  stSUI: 2,
  wBTC: 3,
  suiUSDT: 5,
  USDC: 6,
  WAL: 7,
  DEEP: 11,
  USDSUI: 33,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function resolveCoinType(symbol: string, provider: CoinInfoProvider): Promise<string> {
  const coin = await provider.getCoinBySymbol(symbol);
  if (!coin) throw new Error(`Coin not found for symbol: ${symbol}`);
  return coin.coinType;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Sets coin swap info on a normal alphalend_slush_pool.
 *
 * Move target: alphalend_slush_pool::admin_set_coin_swap_info<T>
 *
 * @param poolId         - Object ID of the slush pool (SlushLending strategy type)
 * @param swapCoinSymbol - Symbol of the reward coin to configure swap for (e.g. 'DEEP')
 * @param adminCapId     - AdminCap object ID (defaults to prod ADMIN_CAP)
 * @param tx             - Optional Transaction to chain onto; if omitted a new one is created and dry-run
 */
async function adminSetCoinSwapInfoSlushPool(
  poolId: string,
  swapCoinSymbol: string,
  adminCapId: string = ADMIN_CAP,
  tx?: Transaction,
): Promise<Transaction> {
  const marketId = ALPHALEND_MARKET_IDS[swapCoinSymbol];
  if (marketId === undefined) {
    throw new Error(`No Alphalend market ID found for symbol: ${swapCoinSymbol}`);
  }

  const context = new StrategyContext('mainnet');
  const [label, swapCoinType] = await Promise.all([
    context.getPoolLabel(poolId),
    resolveCoinType(swapCoinSymbol, context.coinInfoProvider),
  ]);

  if (!label || label.strategyType !== 'SlushLending') {
    throw new Error(
      `Expected a SlushLending pool for poolId ${poolId}, got: ${label?.strategyType}`,
    );
  }

  const { asset } = label;
  const txb = tx ?? new Transaction();

  txb.moveCall({
    target: `${SLUSH_PACKAGE}::alphalend_slush_pool::admin_set_coin_swap_info`,
    typeArguments: [asset.type],
    arguments: [
      txb.object(adminCapId),
      txb.object(VERSIONS.SLUSH),
      txb.object(poolId),
      txb.moveCall({
        target: '0x1::type_name::get',
        typeArguments: [swapCoinType],
      }),
      txb.pure.u64(marketId),
    ],
  });

  if (!tx) {
    dryRunTransactionBlock(txb);
  }
  return txb;
}

/**
 * Sets coin swap info on an alphalend_slush_locked_loop_pool.
 *
 * Move target: alphalend_slush_locked_loop_pool::admin_set_coin_swap_info<T>
 *
 * @param poolId         - Object ID of the locked-loop pool (SlushSingleAssetLooping strategy type)
 * @param swapCoinSymbol - Symbol of the reward coin to configure swap for (e.g. 'stSUI')
 * @param adminCapId     - AdminCap object ID (defaults to prod ADMIN_CAP)
 * @param tx             - Optional Transaction to chain onto; if omitted a new one is created and dry-run
 */
async function adminSetCoinSwapInfoLockedLoopPool(
  poolId: string,
  swapCoinSymbol: string,
  adminCapId: string = ADMIN_CAP,
  tx?: Transaction,
): Promise<Transaction> {
  const marketId = ALPHALEND_MARKET_IDS[swapCoinSymbol];
  if (marketId === undefined) {
    throw new Error(`No Alphalend market ID found for symbol: ${swapCoinSymbol}`);
  }

  const context = new StrategyContext('mainnet');
  const [label, swapCoinType] = await Promise.all([
    context.getPoolLabel(poolId),
    resolveCoinType(swapCoinSymbol, context.coinInfoProvider),
  ]);

  if (!label || label.strategyType !== 'SlushSingleAssetLooping') {
    throw new Error(
      `Expected a SlushSingleAssetLooping pool for poolId ${poolId}, got: ${label?.strategyType}`,
    );
  }

  const { asset } = label;
  const txb = tx ?? new Transaction();

  txb.moveCall({
    target: `${SLUSH_PACKAGE}::alphalend_slush_locked_loop_pool::admin_set_coin_swap_info`,
    typeArguments: [asset.type],
    arguments: [
      txb.object(adminCapId),
      txb.object(VERSIONS.SLUSH),
      txb.object(poolId),
      txb.moveCall({
        target: '0x1::type_name::get',
        typeArguments: [swapCoinType],
      }),
      txb.pure.u64(marketId),
    ],
  });

  if (!tx) {
    dryRunTransactionBlock(txb);
  }
  return txb;
}

/**
 * Adds an allowed Bluefin pool for reward swapping on a normal alphalend_slush_pool.
 *
 * Move target: alphalend_slush_pool::admin_add_allowed_bluefin_pool<T, R, S>
 *
 * @param poolId        - Object ID of the slush pool (SlushLending strategy type)
 * @param coinRSymbol   - Symbol of R coin in BluefinPool<R, S> (e.g. 'WAL')
 * @param coinSSymbol   - Symbol of S coin in BluefinPool<R, S> (e.g. 'SUI')
 * @param slippageBps   - Allowed slippage in basis points (max 500 per pool)
 * @param adminCapId    - AdminCap object ID (defaults to prod ADMIN_CAP)
 * @param tx            - Optional Transaction to chain onto; if omitted a new one is created and dry-run
 */
async function adminAddAllowedBluefinPoolSlushPool(
  poolId: string,
  coinRSymbol: string,
  coinSSymbol: string,
  slippageBps: number,
  adminCapId: string = ADMIN_CAP,
  tx?: Transaction,
): Promise<Transaction> {
  const context = new StrategyContext('mainnet');
  const [label, coinRType, coinSType] = await Promise.all([
    context.getPoolLabel(poolId),
    resolveCoinType(coinRSymbol, context.coinInfoProvider),
    resolveCoinType(coinSSymbol, context.coinInfoProvider),
  ]);

  if (!label || label.strategyType !== 'SlushLending') {
    throw new Error(
      `Expected a SlushLending pool for poolId ${poolId}, got: ${label?.strategyType}`,
    );
  }

  const { asset } = label;
  const bluefinPoolIds = context.getPoolIdsByTypes(coinRType, coinSType);

  if (!bluefinPoolIds.bluefin) {
    throw new Error(`No Bluefin pool found for coin pair: ${coinRSymbol} / ${coinSSymbol}`);
  }

  const txb = tx ?? new Transaction();

  txb.moveCall({
    target: `${SLUSH_PACKAGE}::alphalend_slush_pool::admin_add_allowed_bluefin_pool`,
    typeArguments: [asset.type, coinRType, coinSType],
    arguments: [
      txb.object(adminCapId),
      txb.object(VERSIONS.SLUSH),
      txb.object(poolId),
      txb.object(bluefinPoolIds.bluefin),
      txb.pure.u64(slippageBps),
    ],
  });

  if (!tx) {
    dryRunTransactionBlock(txb);
  }
  return txb;
}

/**
 * Adds an allowed Bluefin pool for reward swapping on an alphalend_slush_locked_loop_pool.
 *
 * Move target: alphalend_slush_locked_loop_pool::admin_add_allowed_bluefin_pool<T, R, S>
 *
 * @param poolId        - Object ID of the locked-loop pool (SlushSingleAssetLooping strategy type)
 * @param coinRSymbol   - Symbol of R coin in BluefinPool<R, S> (e.g. 'stSUI')
 * @param coinSSymbol   - Symbol of S coin in BluefinPool<R, S> (e.g. 'SUI')
 * @param slippageBps   - Allowed slippage in basis points (max 500 per pool)
 * @param adminCapId    - AdminCap object ID (defaults to prod ADMIN_CAP)
 * @param tx            - Optional Transaction to chain onto; if omitted a new one is created and dry-run
 */
async function adminAddAllowedBluefinPoolLockedLoopPool(
  poolId: string,
  coinRSymbol: string,
  coinSSymbol: string,
  slippageBps: number,
  adminCapId: string = ADMIN_CAP,
  tx?: Transaction,
): Promise<Transaction> {
  const context = new StrategyContext('mainnet');
  const [label, coinRType, coinSType] = await Promise.all([
    context.getPoolLabel(poolId),
    resolveCoinType(coinRSymbol, context.coinInfoProvider),
    resolveCoinType(coinSSymbol, context.coinInfoProvider),
  ]);

  if (!label || label.strategyType !== 'SlushSingleAssetLooping') {
    throw new Error(
      `Expected a SlushSingleAssetLooping pool for poolId ${poolId}, got: ${label?.strategyType}`,
    );
  }

  const { asset } = label;
  const bluefinPoolIds = context.getPoolIdsByTypes(coinRType, coinSType, true);

  if (!bluefinPoolIds.bluefin) {
    throw new Error(`No Bluefin pool found for coin pair: ${coinRSymbol} / ${coinSSymbol}`);
  }

  const txb = tx ?? new Transaction();

  txb.moveCall({
    target: `${SLUSH_PACKAGE}::alphalend_slush_locked_loop_pool::admin_add_allowed_bluefin_pool`,
    typeArguments: [asset.type, coinRType, coinSType],
    arguments: [
      txb.object(adminCapId),
      txb.object(VERSIONS.SLUSH),
      txb.object(poolId),
      txb.object(bluefinPoolIds.bluefin),
      txb.pure.u64(slippageBps),
    ],
  });

  if (!tx) {
    dryRunTransactionBlock(txb);
  }
  return txb;
}

/**
 * Fully initialises a SlushLending pool in one transaction by chaining:
 *   - admin_set_coin_swap_info for stSUI, SUI, DEEP, WAL, USDC
 *   - admin_add_allowed_bluefin_pool for stSUI-SUI, DEEP-SUI, WAL-SUI, SUI-USDC (100 bps each)
 *
 * Use SLUSH_LENDING_POOL_IDS[symbol] to get the poolId, e.g.:
 *   adminInitSlushLendingPool(SLUSH_LENDING_POOL_IDS['SUI'])
 *
 * @param poolId     - Object ID of the SlushLending pool
 * @param adminCapId - AdminCap object ID (defaults to prod ADMIN_CAP)
 * @param tx         - Optional Transaction to chain onto; if omitted a new one is created and dry-run
 */
async function adminInitSlushLendingPool(
  poolId: string,
  adminCapId: string = ADMIN_CAP,
  tx?: Transaction,
): Promise<Transaction> {
  const txb = tx ?? new Transaction();

  await adminSetCoinSwapInfoSlushPool(poolId, 'stSUI', adminCapId, txb);
  await adminSetCoinSwapInfoSlushPool(poolId, 'SUI', adminCapId, txb);
  await adminSetCoinSwapInfoSlushPool(poolId, 'DEEP', adminCapId, txb);
  await adminSetCoinSwapInfoSlushPool(poolId, 'WAL', adminCapId, txb);
  await adminSetCoinSwapInfoSlushPool(poolId, 'USDC', adminCapId, txb);

  await adminAddAllowedBluefinPoolSlushPool(poolId, 'stSUI', 'SUI', 100, adminCapId, txb);
  await adminAddAllowedBluefinPoolSlushPool(poolId, 'DEEP', 'SUI', 100, adminCapId, txb);
  await adminAddAllowedBluefinPoolSlushPool(poolId, 'WAL', 'SUI', 100, adminCapId, txb);
  await adminAddAllowedBluefinPoolSlushPool(poolId, 'SUI', 'USDC', 100, adminCapId, txb);

  if (!tx) {
    dryRunTransactionBlock(txb);
  }
  return txb;
}

// ─── Example calls (uncomment to run) ─────────────────────────────────────────

// --- adminInitSlushLendingPool: initialise all coin infos + Bluefin pools in one tx ---
// adminInitSlushLendingPool(SLUSH_LENDING_POOL_IDS['SUI']);
adminInitSlushLendingPool(SLUSH_LENDING_POOL_IDS['USDC']);
adminInitSlushLendingPool(SLUSH_LENDING_POOL_IDS['WAL']);
adminInitSlushLendingPool(SLUSH_LENDING_POOL_IDS['DEEP']);

// --- admin_set_coin_swap_info: normal pool ---
// adminSetCoinSwapInfoSlushPool(SLUSH_LENDING_POOL_IDS['SUI'], 'stSUI');

// --- admin_set_coin_swap_info: locked-loop pool ---
// adminSetCoinSwapInfoLockedLoopPool(SLUSH_LOCKED_LOOP_POOL_IDS['WAL'], 'stSUI');

// --- admin_add_allowed_bluefin_pool: normal pool ---
// adminAddAllowedBluefinPoolSlushPool(SLUSH_LENDING_POOL_IDS['SUI'], 'stSUI', 'SUI', 300);

// --- admin_add_allowed_bluefin_pool: locked-loop pool ---
// adminAddAllowedBluefinPoolLockedLoopPool(SLUSH_LOCKED_LOOP_POOL_IDS['WAL'], 'stSUI', 'SUI', 300);
