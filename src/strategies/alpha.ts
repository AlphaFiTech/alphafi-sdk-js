/**
 * Alpha Strategy Implementation
 * Single-asset pool strategy for SUI deposits with Alpha token rewards
 * Based on alphafi-sdk-rust/src/strategies/alpha.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategy_context.js';

// ===== Alpha Strategy Class =====

/**
 * Alpha Strategy for single-asset pools with SUI deposits and Alpha token rewards
 */
export class AlphaStrategy extends BaseStrategy<
  AlphaPoolObject,
  never, // Alpha doesn't have investor objects
  never, // Alpha doesn't have parent pool objects
  AlphaReceiptObject
> {
  private poolLabel: AlphaPoolLabel;
  private poolObject: AlphaPoolObject;
  private receiptObjects: AlphaReceiptObject[];
  private context: StrategyContext;

  constructor(
    poolLabel: AlphaPoolLabel,
    poolObject: any,
    receiptObjects: any[],
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.context = context;
    this.receiptObjects = this.parseReceiptObjects(receiptObjects);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Alpha strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    // For Alpha, tokens invested numerator should use alphaBal (matches Rust)
    const tokensInvested = new Decimal(this.poolObject.alphaBal);
    const xtokenSupply = new Decimal(this.poolObject.xTokenSupply);

    if (xtokenSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(xtokenSupply);
  }

  /**
   * Stubbed getData similar to Rust get_data; returns zero/empty placeholders
   */
  async getData(): Promise<PoolData> {
    const [alphafi, parent] = await Promise.all([this.getTvl(), this.getParentTvl()]);
    return {
      poolId: this.poolLabel.poolId,
      apr: this.context.getAprData(this.poolLabel.poolId),
      tvl: {
        alphafi,
        parent,
      },
    };
  }

  /**
   * Compute TVL in quote currency using coin price data.
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const decimals = await this.context.getCoinDecimals(coinType);
    const price = await this.context.getCoinPrice(coinType);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(
      new Decimal(10).pow(decimals),
    );
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  async getParentTvl(): Promise<SingleTvl> {
    return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
  }

  /**
   * Compute user's current Alpha balance.
   * Uses first stored receipt xTokenBalance and exchangeRate; scales by asset decimals.
   * Note: Locked/unlocked breakdown requires dynamic field reads; here we return total only.
   */
  async getBalance(): Promise<{ tokenAmount: Decimal; usdValue: Decimal }> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [decimals, price] = await Promise.all([
      this.context.getCoinDecimals(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    const exchangeRate = this.exchangeRate();
    const tokens = xTokens.mul(exchangeRate);
    const tokenAmount = tokens.div(new Decimal(10).pow(decimals));
    return { tokenAmount, usdValue: tokenAmount.mul(price) };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): AlphaPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        alphaBal: this.getStringField(fields, 'alpha_bal'),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        instantWithdrawFee: this.getStringField(fields, 'instant_withdraw_fee'),
        instantWithdrawFeeMaxCap: this.getStringField(fields, 'instant_withdraw_fee_max_cap'),
        lockedPeriodInMs: this.getStringField(fields, 'locked_period_in_ms'),
        lockingStartMs: this.getStringField(fields, 'locking_start_ms'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        performanceFeeMaxCap: this.getStringField(fields, 'performance_fee_max_cap'),
        rewards: (() => {
          const idVal =
            (this.getNestedField(fields, 'rewards.fields.id.id') as string | undefined) || '';
          const sizeVal =
            (this.getNestedField(fields, 'rewards.fields.size') as string | undefined) || '';
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply:
          this.getStringField(fields, 'xtoken_supply') ||
          this.getStringField(fields, 'xTokenSupply'),
      };
    }, 'Failed to parse Alpha pool object');
  }

  /**
   * Parse investor object from blockchain response (not applicable for Alpha)
   */
  parseInvestorObject(_response: any): never {
    throw new Error('Alpha strategy does not have investor objects');
  }

  /**
   * Parse parent pool object from blockchain response (not applicable for Alpha)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('Alpha strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): AlphaReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          imageUrl: this.getStringField(fields, 'image_url'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          lockedBalance: (() => {
            const idVal =
              (this.getNestedField(fields, 'locked_balance.fields.id.id') as string | undefined) ||
              '';
            const sizeVal =
              (this.getNestedField(fields, 'locked_balance.fields.size') as string | undefined) ||
              '';
            const headVal =
              (this.getNestedField(fields, 'locked_balance.fields.head') as string | undefined) ||
              '';
            const tailVal =
              (this.getNestedField(fields, 'locked_balance.fields.tail') as string | undefined) ||
              '';
            return {
              id: String(idVal),
              size: String(sizeVal),
              head: String(headVal),
              tail: String(tailVal),
            };
          })(),
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          unlockedXtokens: this.getStringField(fields, 'unlocked_xtokens'),
          xTokenBalance:
            this.getStringField(fields, 'xtoken_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse Alpha receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * Alpha Pool object data structure
 */
export interface AlphaPoolObject {
  accRewardsPerXtoken: KeyValuePair[];
  alphaBal: string;
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  instantWithdrawFee: string;
  instantWithdrawFeeMaxCap: string;
  lockedPeriodInMs: string;
  lockingStartMs: string;
  name: string;
  paused: boolean;
  performanceFee: string;
  performanceFeeMaxCap: string;
  rewards: {
    id: string;
    size: string;
  };
  tokensInvested: string;
  withdrawFeeMaxCap: string;
  withdrawalFee: string;
  xTokenSupply: string;
}

/**
 * Alpha Receipt object data structure
 */
export interface AlphaReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  lockedBalance: {
    id: string;
    size: string;
    head: string;
    tail: string;
  };
  name: string;
  owner: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  unlockedXtokens: string;
  xTokenBalance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * Alpha Pool Label - Configuration for Alpha strategy pools
 */
export interface AlphaPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'AlphaVault';
  parentProtocol: ProtocolType;
  receipt: NameType;
  asset: NameType;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
    withdrawV2EventType: string;
    afterTransactionEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
