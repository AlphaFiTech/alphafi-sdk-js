/**
 * Strategy interfaces and shared helpers used by all strategy implementations.
 */

import { Decimal } from 'decimal.js';
import { SingleTvl, DoubleTvl, PoolData, PoolBalance, DistributorObject } from '../models/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { IMAGE_URLS, PACKAGE_IDS } from '../utils/constants.js';

export interface StringMap {
  [key: string]: string;
}

/**
 * Minimal data needed to compute ALPHA mining rewards for a user.
 *
 * Strategies that don't participate in alpha mining should return `receipt: null`.
 */
export interface AlphaMiningData {
  poolId: string;
  accRewardsPerXtoken: StringMap[];
  xTokenSupply: string;
  receipt: {
    lastAccRewardPerXtoken: StringMap[];
    pendingRewards: StringMap[];
    xTokenBalance: string;
  } | null;
}

/**
 * Struct tag for the ALPHA coin used by the distributor.
 */
export const ALPHA_COIN_TYPE =
  'fe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA';

// ===== Common Pool Label Types =====

export type StrategyType =
  | 'AlphaVault'
  | 'Lp'
  | 'FungibleLp'
  | 'AutobalanceLp'
  | 'Lending'
  | 'SlushLending'
  | 'Looping'
  | 'SingleAssetLooping'
  | 'Lyf'
  | 'FungibleLending';

export type ProtocolType =
  | 'AlphaFi'
  | 'Navi'
  | 'Alphalend'
  | 'Cetus'
  | 'Bluefin'
  | 'Bucket'
  | 'DeepBook';

// Forward declarations for pool label types (will be imported from individual strategy files)
export type LpPoolLabel = import('./lp.js').LpPoolLabel;
export type AlphaVaultPoolLabel = import('./alphaVault.js').AlphaVaultPoolLabel;
export type AutobalanceLpPoolLabel = import('./autobalanceLp.js').AutobalanceLpPoolLabel;
export type FungibleLpPoolLabel = import('./fungibleLp.js').FungibleLpPoolLabel;
export type LendingPoolLabel = import('./lending.js').LendingPoolLabel;
export type SlushLendingPoolLabel = import('./slushLending.js').SlushLendingPoolLabel;
export type LoopingPoolLabel = import('./looping.js').LoopingPoolLabel;
export type SingleAssetLoopingPoolLabel =
  import('./singleAssetLooping.js').SingleAssetLoopingPoolLabel;
export type LyfPoolLabel = import('./lyf.js').LyfPoolLabel;
export type FungibleLendingPoolLabel = import('./fungibleLending.js').FungibleLendingPoolLabel;

/**
 * Union of all strategy-specific pool label types.
 */
export type PoolLabel =
  | LpPoolLabel
  | AlphaVaultPoolLabel
  | AutobalanceLpPoolLabel
  | FungibleLpPoolLabel
  | LendingPoolLabel
  | SlushLendingPoolLabel
  | LoopingPoolLabel
  | SingleAssetLoopingPoolLabel
  | LyfPoolLabel
  | FungibleLendingPoolLabel;

/**
 * Common strategy surface used by the SDK.
 */
export interface Strategy<TPool = any, TInvestor = any, TParentPool = any, TReceipt = any> {
  /**
   * Parse a pool object fetched from chain into a typed shape.
   */
  parsePoolObject(response: any): TPool;

  /**
   * Parse an investor object fetched from chain into a typed shape.
   */
  parseInvestorObject(response: any): TInvestor;

  /**
   * Parse a parent pool object (underlying protocol) fetched from chain.
   */
  parseParentPoolObject(response: any): TParentPool;

  /**
   * Parse receipt objects fetched from chain.
   */
  parseReceiptObjects(responses: any[]): TReceipt[];

  /**
   * Current exchange rate used by the strategy.
   * Typically: `tokens_invested / xToken_supply`.
   */
  exchangeRate(): Decimal;

  /**
   * TVL for the AlphaFi pool and the underlying parent protocol (if any).
   */
  getTvl(): Promise<SingleTvl | DoubleTvl>;
  getParentTvl(): Promise<SingleTvl | DoubleTvl>;

  /**
   * User balance breakdown for this pool.
   */
  getBalance(userAddress: string): Promise<PoolBalance>;

  /**
   * Static metadata/config for this pool (from config API).
   */
  getPoolLabel(): PoolLabel;

  /**
   * High-level pool summary (APR + TVL + strategy-specific metadata).
   */
  getData(): Promise<PoolData>;

  /**
   * Compute ALPHA mining rewards claimable for this pool.
   *
   * Note: this uses the cached distributor object from `StrategyContext`.
   */
  getAlphaMiningRewardsToClaim(distributor: DistributorObject): Decimal;

  /**
   * Get the other amount for a given amount and isAmountA flag.
   *
   * @param amount - The amount to get the other amount for
   * @param isAmountA - Whether the amount is amount A
   * @returns The other amount
   */
  getOtherAmount(amount: string, isAmountA: boolean): [string, string];

  /**
   * Deposit assets into the pool.
   *
   * @param options - The options for the deposit
   * @returns Transaction to deposit assets into the pool
   */
  deposit(tx: Transaction, options: DepositOptions): Promise<void>;

  /**
   * Withdraw assets from the pool.
   *
   * @param options - The options for the withdrawal
   * @returns Transaction to withdraw assets from the pool
   */
  withdraw(tx: Transaction, options: WithdrawOptions): Promise<void>;

  /**
   * Claim rewards for a specific pool.
   *
   * @param poolId - The ID of the pool to claim rewards for
   * @param address - The address of the user to claim rewards for
   * @returns Transaction to claim rewards for the specified pool
   */
  claimRewards(tx: Transaction, alphaReceipt: TransactionResult): Promise<void>;

  /**
   * Create an AlphaFi receipt.
   *
   * @param tx - The transaction to create the AlphaFi receipt
   * @returns Transaction to create the AlphaFi receipt
   */
  createAlphaFiReceipt(tx: Transaction): TransactionResult;
}

/**
 * Base class shared by all strategies.
 * Provides parsing helpers and common reward calculation logic.
 */
export abstract class BaseStrategy<TPool = any, TInvestor = any, TParentPool = any, TReceipt = any>
  implements Strategy<TPool, TInvestor, TParentPool, TReceipt>
{
  abstract parsePoolObject(response: any): TPool;
  abstract parseInvestorObject(response: any): TInvestor;
  abstract parseParentPoolObject(response: any): TParentPool;
  abstract parseReceiptObjects(responses: any[]): TReceipt[];
  abstract exchangeRate(): Decimal;
  abstract getTvl(): Promise<SingleTvl | DoubleTvl>;
  abstract getParentTvl(): Promise<SingleTvl | DoubleTvl>;
  abstract getData(): Promise<PoolData>;
  abstract getBalance(userAddress: string): Promise<PoolBalance>;
  abstract getPoolLabel(): PoolLabel;
  abstract getOtherAmount(amount: string, isAmountA: boolean): [string, string];
  abstract deposit(tx: Transaction, options: DepositOptions): Promise<void>;
  abstract withdraw(tx: Transaction, options: WithdrawOptions): Promise<void>;
  abstract claimRewards(tx: Transaction, alphaReceipt: TransactionResult): Promise<void>;

  createAlphaFiReceipt(tx: Transaction) {
    return tx.moveCall({
      target: `${PACKAGE_IDS.ALPHAFI_RECEIPT}::alphafi_receipt::create_alphafi_receipt_v2`,
      arguments: [tx.pure.string(IMAGE_URLS.ALPHAFI_RECEIPT)],
    });
  }

  /**
   * Provide the inputs needed to compute ALPHA mining rewards for this strategy.
   * Return `receipt: null` if the strategy/user has no alpha mining position.
   */
  protected abstract getAlphaMiningData(): AlphaMiningData;

  /**
   * Compute claimable ALPHA rewards using the distributor + pool/receipt accounting.
   * Returns a human-readable amount (divided by 1e9).
   */
  getAlphaMiningRewardsToClaim(distributor: DistributorObject): Decimal {
    const data = this.getAlphaMiningData();

    // No receipt -> no position -> no alpha rewards.
    if (!data.receipt) {
      return new Decimal(0);
    }

    const { poolId, accRewardsPerXtoken, xTokenSupply, receipt } = data;
    const { lastAccRewardPerXtoken, pendingRewards, xTokenBalance } = receipt;

    // Get user's last accumulated reward per xtoken for ALPHA
    const userLastAccEntry = lastAccRewardPerXtoken.find((entry) => entry.key === ALPHA_COIN_TYPE);
    const userLastAcc = new Decimal(userLastAccEntry?.value || '0');

    // Get user's xtoken balance
    const userXtokenBalance = new Decimal(xTokenBalance || '0');

    // Get pending alpha rewards from receipt
    const pendingAlphaRewards = pendingRewards
      .filter((entry) => entry.key === ALPHA_COIN_TYPE)
      .reduce((acc, entry) => acc.add(new Decimal(entry.value || '0')), new Decimal(0));

    // Get total alpha weight across all pools from distributor
    const alphaRewardTotalWeight =
      distributor.poolAllocator.totalWeights.find((w) => w.key === ALPHA_COIN_TYPE)?.value || '0';

    // Get distribution status for this pool
    const memberEntry = distributor.poolAllocator.members.find((m) => m.key === poolId);
    const alphaAllocatorDetailsForPool = memberEntry?.value.poolData.find(
      (pd) => pd.key === ALPHA_COIN_TYPE,
    )?.value;

    // Calculate pending rewards for pool
    let pendingRewardsForPool = new Decimal(0);
    if (alphaAllocatorDetailsForPool) {
      const currentTime = Date.now();
      const pendingRewardsInAllocator = new Decimal(
        alphaAllocatorDetailsForPool.pendingRewards || '0',
      );
      const lastUpdateTime = parseInt(alphaAllocatorDetailsForPool.lastUpdateTime || '0', 10);
      const weight = new Decimal(alphaAllocatorDetailsForPool.weight || '0');
      const totalWeight = new Decimal(alphaRewardTotalWeight);
      const target = new Decimal(distributor.target || '0');

      // Calculate unlockPerMS (target per millisecond)
      // unlock_per_ms = target * 2750000 / (4250000 * 100 * 86400000)
      const unlockPerMs = target
        .mul(new Decimal('2750000'))
        .div(new Decimal('4250000').mul('100').mul('86400000'));

      // Calculate time diff
      const timeDiff = Math.max(0, currentTime - lastUpdateTime);

      // Calculate additional rewards
      let additionalRewards = new Decimal(0);
      if (totalWeight.gt(0)) {
        additionalRewards = new Decimal(timeDiff).mul(unlockPerMs).mul(weight).div(totalWeight);
      }

      pendingRewardsForPool = pendingRewardsInAllocator.add(additionalRewards);
    }

    // Get pool's accumulated rewards per xtoken for ALPHA
    const alphaOldAccEntry = accRewardsPerXtoken.find((entry) => entry.key === ALPHA_COIN_TYPE);
    const alphaOldAccInPool = new Decimal(alphaOldAccEntry?.value || '0');

    // Get total xtoken supply from pool
    const totalXtokenSupply = new Decimal(xTokenSupply || '0');

    // Calculate new accumulated rewards per xtoken
    const SCALE = new Decimal('1000000000000000000'); // 1e18
    let addAcc = new Decimal(0);
    if (totalXtokenSupply.gt(0)) {
      addAcc = pendingRewardsForPool.div(totalXtokenSupply).mul(SCALE).mul(SCALE);
    }
    const alphaNewAccInPool = alphaOldAccInPool.add(addAcc);

    // Calculate user's accrued rewards
    // user_accrued_rewards = ((acc_new - acc_last) / SCALE^2) * user_balance
    const deltaAcc = alphaNewAccInPool.sub(userLastAcc);
    const userAccruedRewards = deltaAcc.div(SCALE.mul(SCALE)).mul(userXtokenBalance);

    // Combine pending rewards and accrued rewards, then divide by 1e9 for human-readable amount
    const totalPendingRewards = pendingAlphaRewards.add(userAccruedRewards).div(new Decimal(1e9));

    return totalPendingRewards;
  }

  // ===== Parsing Helper Methods =====

  /**
   * Helper function to get string field from JSON with validation
   */
  protected getStringField(fieldsJson: any, fieldName: string): string {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'string') {
      return value;
    }
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return '';
  }

  /**
   * Helper function to get boolean field from JSON with default value
   */
  protected getBooleanField(fieldsJson: any, fieldName: string, defaultValue: boolean): boolean {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'boolean') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Helper function to get number field from JSON
   */
  protected getNumberField(fieldsJson: any, fieldName: string): number {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Helper function to parse VecMap structures from Move objects into StringMap format
   */
  protected parseVecMap(vecMapField: any) {
    if (!vecMapField || typeof vecMapField !== 'object') {
      return [];
    }

    const contents = vecMapField.contents;
    if (!Array.isArray(contents)) {
      return [];
    }

    return contents.map((entry: any) => {
      const key = entry?.key?.name;
      const value = entry?.value;
      return { key, value };
    });
  }

  /**
   * Helper function to convert ASCII array from JSON to string
   */
  protected asciiToString(asciiArray: any): string {
    if (Array.isArray(asciiArray)) {
      try {
        const bytes = asciiArray.map((n: any) => {
          const num = typeof n === 'number' ? n : parseInt(n);
          if (num < 0 || num > 255) {
            throw new Error('ASCII value out of range');
          }
          return num;
        });
        return String.fromCharCode(...bytes);
      } catch (error) {
        console.error('Error converting ASCII array to string:', error);
        return '';
      }
    }
    return '';
  }

  /**
   * Helper function to extract fields from various response formats
   */
  protected extractFields(response: any): any {
    return response.fields || response.content?.fields || response;
  }

  /**
   * Helper function to safely parse nested object fields
   */
  protected getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper function to parse object with error handling
   */
  protected safeParseObject<T>(parseFunction: () => T, errorMessage: string): T {
    try {
      return parseFunction();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error}`);
    }
  }
}
