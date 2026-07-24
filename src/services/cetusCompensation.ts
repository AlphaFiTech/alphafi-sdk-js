/**
 * Cetus hack compensation claims (May 2025 incident).
 *
 * The 15 attacked pool names and the compensator object IDs are frozen,
 * incident-scoped constants. Everything else (pool IDs, coin types, receipt
 * types, move-call variant) is derived from the live /public/config, which
 * still serves the retired Cetus pools.
 *
 * Ported from sui-alpha-sdk's cetusCompensation module; response shapes are
 * kept identical. All chain reads and simulation go through GraphQL.
 */
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { Blockchain } from '../models/blockchain.js';

const CETUS_COMPENSATOR_PACKAGE_ID =
  '0x614f9d104fcfcd76a98aab67c45c73f1231522a52def3ea31725cf1366599a88';
const CETUS_COMPENSATOR_VERSION =
  '0x4e6ca04ce6f2a0c0c50b96f952a80662761eca904786abd1022be4664b02952c';
const CETUS_COMPENSATOR = '0x3be8b5e423ad088466e90e02d9d9afea3e9dda1d71b638b7aaef78976b4e55bc';

const COMPENSATION_MODULE = `${CETUS_COMPENSATOR_PACKAGE_ID}::alphafi_cetus_compensation`;

const DEFAULT_API_BASE_URL = 'https://api.alphafi.xyz';

/** Pools covered by the compensator contract — a subset of all Cetus pools. */
export const attackedPools = [
  'WETH-WUSDC',
  'WUSDC-WBTC',
  'USDC-ETH',
  'BUCK-SUI',
  'USDC-WUSDC',
  'USDC-SUIUSDT',
  'WUSDC-SUI',
  'FUD-SUI',
  'ALPHA-SUI',
  'NAVX-SUI',
  'USDT-WUSDC',
  'CETUS-SUI',
  'USDC-USDT',
  'DEEP-SUI',
  'USDC-SUI',
] as const;

export type CetusCompensationPoolName = (typeof attackedPools)[number];

export type CetusCompensationUserData = {
  [key: string]: {
    amount: number;
    receiptId: string;
  };
};

/** Move-call suffix per pool, encoded on-chain by the pool's receipt module. */
type CompensationVariant = '' | '_sui' | '_base_a' | '_cetus_sui';

type CompensationPool = {
  poolName: CetusCompensationPoolName;
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  receiptType: string;
  receiptName: string;
  variant: CompensationVariant;
};

function variantFromReceiptType(receiptType: string, poolName: string): CompensationVariant {
  if (receiptType.includes('::alphafi_cetus_pool_base_a::')) return '_base_a';
  if (receiptType.includes('::alphafi_cetus_sui_pool::')) {
    return poolName === 'CETUS-SUI' ? '_cetus_sui' : '_sui';
  }
  return '';
}

let poolsPromise: Promise<Map<string, CompensationPool>> | null = null;

/** Fetch the attacked pools' data from /public/config, keyed by pool name. Cached. */
function getCompensationPools(): Promise<Map<string, CompensationPool>> {
  if (!poolsPromise) {
    poolsPromise = (async () => {
      const response = await fetch(`${DEFAULT_API_BASE_URL}/public/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch pool config: ${response.status} ${response.statusText}`);
      }
      const json = (await response.json()) as Record<string, { data: any }>;
      const pools = new Map<string, CompensationPool>();
      for (const entry of Object.values(json)) {
        const d = entry.data;
        if (
          d?.parent_protocol !== 'Cetus' ||
          !(attackedPools as readonly string[]).includes(d.pool_name)
        ) {
          continue;
        }
        pools.set(d.pool_name, {
          poolName: d.pool_name,
          poolId: d.pool_id,
          coinTypeA: d.asset_a.type,
          coinTypeB: d.asset_b.type,
          receiptType: d.receipt.type,
          receiptName: d.receipt.name,
          variant: variantFromReceiptType(d.receipt.type, d.pool_name),
        });
      }
      return pools;
    })();
    // Allow retry on failure instead of caching the rejection
    poolsPromise.catch(() => {
      poolsPromise = null;
    });
  }
  return poolsPromise;
}

let blockchain: Blockchain | null = null;

function getBlockchain(): Blockchain {
  if (!blockchain) {
    blockchain = new Blockchain({ network: 'mainnet' });
  }
  return blockchain;
}

/** Fetch the user's receipt object IDs for the attacked pools, keyed by pool name. */
async function getReceiptIdsByPool(
  address: string,
  pools: Map<string, CompensationPool>,
): Promise<Map<string, string>> {
  const receiptTypes = [...new Set([...pools.values()].map((p) => p.receiptType))];
  const receiptsByType = await getBlockchain().multiGetReceipts(address, receiptTypes);
  const receiptIds = new Map<string, string>();
  for (const pool of pools.values()) {
    const receipts = receiptsByType.get(pool.receiptType);
    // Receipt types are shared between pools of the same module; match on the
    // receipt's `name` field, as v1's getReceipts did.
    const receipt = receipts?.find((r: any) => r?.name === pool.receiptName);
    if (receipt?.id) {
      receiptIds.set(pool.poolName, receipt.id);
    }
  }
  return receiptIds;
}

/**
 * Build a claim transaction for one pool's compensation.
 * Returns undefined when the user holds no receipt for the pool.
 */
export async function userCollectCetusCompensation(
  poolName: string,
  address: string,
  tx?: Transaction,
): Promise<Transaction | undefined> {
  const pools = await getCompensationPools();
  const pool = pools.get(poolName);
  if (!pool) {
    console.error('not a compensated pool', poolName);
    return undefined;
  }
  const receiptIds = await getReceiptIdsByPool(address, new Map([[poolName, pool]]));
  const receiptId = receiptIds.get(poolName);
  if (!receiptId) {
    console.error('no receipt', poolName);
    return undefined;
  }
  const txb = tx ?? new Transaction();
  addCollectCall(txb, pool, receiptId, address);
  return txb;
}

/** Build a single transaction claiming compensation from every attacked pool the user has a receipt for. */
export async function userCollectCetusCompensationAll(address: string): Promise<Transaction> {
  const pools = await getCompensationPools();
  const receiptIds = await getReceiptIdsByPool(address, pools);
  const txb = new Transaction();
  for (const poolName of attackedPools) {
    const pool = pools.get(poolName);
    const receiptId = receiptIds.get(poolName);
    if (!pool || !receiptId) {
      console.error('no receipt', poolName);
      continue;
    }
    addCollectCall(txb, pool, receiptId, address);
  }
  return txb;
}

function addCollectCall(
  txb: Transaction,
  pool: CompensationPool,
  receiptId: string,
  address: string,
) {
  const cetusCoin = txb.moveCall({
    target: `${COMPENSATION_MODULE}::user_collect_cetus_compensation${pool.variant}`,
    typeArguments: [pool.coinTypeA, pool.coinTypeB],
    arguments: [
      txb.object(CETUS_COMPENSATOR_VERSION),
      txb.object(CETUS_COMPENSATOR),
      txb.object(receiptId),
      txb.object(pool.poolId),
    ],
  });
  txb.transferObjects([cetusCoin], address);
}

/**
 * Get the user's claimable compensation per attacked pool plus the total,
 * as `[{poolName: {amount, receiptId}}, totalCetusTokens]` (raw CETUS units).
 */
export async function getUserCompensationAmountAll(
  address: string,
): Promise<[CetusCompensationUserData, number]> {
  const pools = await getCompensationPools();
  const receiptIds = await getReceiptIdsByPool(address, pools);

  const amounts = await Promise.all(
    attackedPools.map(async (poolName) => {
      const pool = pools.get(poolName);
      const receiptId = receiptIds.get(poolName);
      if (!pool || !receiptId) {
        return { poolName, amount: 0, receiptId: '' };
      }
      const amount = await getUserCompensationAmount(pool, receiptId, address);
      return { poolName, amount: Number(amount), receiptId };
    }),
  );

  const data: CetusCompensationUserData = {};
  let totalCetusTokens = 0;
  for (const { poolName, amount, receiptId } of amounts) {
    data[poolName] = { amount, receiptId };
    totalCetusTokens += amount;
  }
  return [data, totalCetusTokens];
}

/** Read one pool's claimable amount via GraphQL transaction simulation. Returns "0" on failure. */
async function getUserCompensationAmount(
  pool: CompensationPool,
  receiptId: string,
  address: string,
): Promise<string> {
  try {
    const txb = new Transaction();
    txb.moveCall({
      target: `${COMPENSATION_MODULE}::get_user_compensation_amount${pool.variant}`,
      typeArguments: [pool.coinTypeA, pool.coinTypeB],
      arguments: [txb.object(CETUS_COMPENSATOR), txb.object(receiptId), txb.object(pool.poolId)],
    });
    const res = await getBlockchain().simulateTransaction(txb, address);
    const returnValueBcs = res.commandResults?.[0]?.returnValues?.[0]?.bcs;
    if (!returnValueBcs) {
      return '0';
    }
    return bcs.u64().parse(new Uint8Array(returnValueBcs));
  } catch (err) {
    console.error(`Error reading compensation amount for ${pool.poolName}:`, err);
    return '0';
  }
}
