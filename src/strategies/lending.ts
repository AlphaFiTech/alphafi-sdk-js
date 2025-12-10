/**
 * Lending Strategy Implementation
 * Lending strategy for single-asset pools with lending protocol integration
 * Based on alphafi-sdk-rust/src/strategies/lending.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

// ===== Lending Strategy Class =====

/**
 * Lending Strategy for single-asset pools with lending protocol integration
 */
export class LendingStrategy extends BaseStrategy<
  LendingPoolObject,
  LendingInvestorObject,
  LendingParentPoolObject,
  LendingReceiptObject
> {
  private poolLabel: LendingPoolLabel;
  private poolObject: LendingPoolObject;
  private investorObject: LendingInvestorObject;
  private parentPoolObject: LendingParentPoolObject;
  private receiptObjects: LendingReceiptObject[];
  private context: StrategyContext;

  constructor(
    poolLabel: LendingPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    receiptObjects: any[],
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.receiptObjects = this.parseReceiptObjects(receiptObjects);
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Lending strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokensInvested);
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
    const price = await this.context.getCoinPrice(coinType);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(new Decimal(10).pow(9));
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const price = await this.context.getCoinPrice(this.poolLabel.asset.type);
    if (protocol === 'Bucket') {
      const tokenAmount = this.context.getBucketTvl();
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Navi') {
      const tokenAmount = this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Alphalend') {
      const tokenAmount = this.context.getAlphaLendTvl(this.poolLabel.asset.type);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Compute the user's current pool balance for Lending strategy.
   * Mirrors lending.rs: xTokens -> tokens via exchangeRate, scaled by 1e9, priced by asset.
   */
  async getBalance(): Promise<{ tokenAmount: Decimal; usdValue: Decimal }> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [price, exchangeRate] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      Promise.resolve(this.exchangeRate()),
    ]);
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(9));
    return { tokenAmount: tokens, usdValue: tokens.mul(price) };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LendingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
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
    }, 'Failed to parse Lending pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LendingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        freeRewards: (() => {
          const idVal =
            (this.getNestedField(fields, 'free_rewards.fields.id.id') as string | undefined) || '';
          const sizeVal =
            (this.getNestedField(fields, 'free_rewards.fields.size') as string | undefined) || '';
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        naviAccCap: (() => {
          const capFields = this.getNestedField(fields, 'navi_acc_cap.fields') || {};
          const idVal = (capFields?.id?.id as string | undefined) || '';
          const ownerVal = (capFields?.owner as string | undefined) || '';
          return { id: String(idVal), owner: String(ownerVal) };
        })(),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        tokensDeposited:
          this.getStringField(fields, 'tokens_deposited') ||
          this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse Lending investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): LendingParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        balance: this.getStringField(fields, 'balance'),
        decimal: this.getNumberField(fields, 'decimal'),
        id: this.getStringField(fields, 'id'),
        treasuryBalance: this.getStringField(fields, 'treasury_balance'),
      };
    }, 'Failed to parse Lending parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LendingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          imageUrl: this.getStringField(fields, 'image_url'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          xTokenBalance:
            this.getStringField(fields, 'xtoken_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse Lending receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * Lending Pool object data structure
 */
export interface LendingPoolObject {
  accRewardsPerXtoken: KeyValuePair[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  name: string;
  paused: boolean;
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
 * Lending Investor object data structure
 */
export interface LendingInvestorObject {
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  naviAccCap: {
    id: string;
    owner: string;
  };
  performanceFee: string;
  tokensDeposited: string;
}

/**
 * Lending Parent Pool object data structure
 */
export interface LendingParentPoolObject {
  balance: string;
  decimal: number;
  id: string;
  treasuryBalance: string;
}

/**
 * Lending Receipt object data structure
 */
export interface LendingReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  name: string;
  owner: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  xTokenBalance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * Lending Pool Label - Configuration for Lending strategy pools
 */
export interface LendingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Lending';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  receipt: NameType;
  asset: NameType;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
