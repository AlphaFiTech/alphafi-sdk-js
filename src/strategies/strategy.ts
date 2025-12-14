/**
 * Strategy Base Class and Interface
 * Contains both the Strategy interface and BaseStrategy implementation with parsing utilities
 */

import { Decimal } from 'decimal.js';
import { SingleTvl, DoubleTvl, PoolData, PoolBalance } from '../models/types.js';
import { DistributorObject } from '../models/strategyContext.js';

export interface KeyValuePair {
  key: string;
  value: string;
}

/**
 * Data required to calculate alpha mining rewards for a user.
 * Returns null if the strategy does not support alpha mining rewards.
 */
export interface AlphaMiningData {
  poolId: string;
  accRewardsPerXtoken: KeyValuePair[];
  xTokenSupply: string;
  receipt: {
    lastAccRewardPerXtoken: KeyValuePair[];
    pendingRewards: KeyValuePair[];
    xTokenBalance: string;
  } | null;
}

/**
 * Alpha coin type for mining rewards
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
  | 'Lyf';

export type ProtocolType = 'AlphaFi' | 'Navi' | 'Alphalend' | 'Cetus' | 'Bluefin' | 'Bucket';

export interface NameType {
  name: string;
  type: string;
}

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

/**
 * Union type containing all strategy-specific pool label types
 * Similar to PoolLabelEnum in the Rust SDK
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
  | LyfPoolLabel;

/**
 * Strategy interface that all strategies must implement
 */
export interface Strategy<TPool = any, TInvestor = any, TParentPool = any, TReceipt = any> {
  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): TPool;

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): TInvestor;

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): TParentPool;

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): TReceipt[];

  /**
   * Get the exchange rate for the strategy (xtoken to underlying token ratio)
   */
  exchangeRate(): Decimal;

  /**
   * Compute the TVL (and parent TVL if applicable) for the strategy.
   */
  getTvl(): Promise<SingleTvl | DoubleTvl>;
  getParentTvl(): Promise<SingleTvl | DoubleTvl>;

  getBalance(userAddress: string): Promise<PoolBalance>;

  getPoolLabel(): PoolLabel;

  /**
   * Get full pool data for this strategy (high-level summary used by the SDK).
   */
  getData(): Promise<PoolData>;

  /**
   * Get alpha mining rewards to claim for this strategy.
   * Returns the amount of ALPHA tokens claimable by the user.
   * @param distributor - The distributor object from StrategyContext
   */
  getAlphaMiningRewardsToClaim(distributor: DistributorObject): Decimal;
}

/**
 * Base Strategy class with built-in parsing utilities
 * All strategies should extend this class
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

  /**
   * Get the data needed for alpha mining rewards calculation.
   * Strategies that don't support alpha mining (e.g., AutobalanceLp, SlushLending, FungibleLp)
   * should return data with `receipt: null`.
   */
  protected abstract getAlphaMiningData(): AlphaMiningData;

  /**
   * Get alpha mining rewards to claim for this strategy.
   * Implements the same logic as the Rust SDK's get_alpha_mining_rewards_to_claim.
   * @param distributor - The distributor object from StrategyContext
   * @returns The amount of ALPHA tokens claimable (in human-readable units, i.e., divided by 1e9)
   */
  getAlphaMiningRewardsToClaim(distributor: DistributorObject): Decimal {
    const data = this.getAlphaMiningData();

    // If no receipt, return 0 (no alpha mining rewards for this user/strategy)
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
   * Helper function to parse VecMap structures from Move objects into KeyValuePair format
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
