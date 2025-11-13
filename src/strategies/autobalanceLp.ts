/**
 * AutobalanceLp Strategy Implementation
 * Autobalance liquidity pool strategy for dual-asset pools with automatic rebalancing
 * Based on alphafi-sdk-rust/src/strategies/autobalance_lp.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, DoubleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategy_context.js';
import BN from 'bn.js';
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';

// ===== AutobalanceLp Strategy Class =====

/**
 * AutobalanceLp Strategy for dual-asset liquidity pools with automatic rebalancing
 */
export class AutobalanceLpStrategy extends BaseStrategy<
  AutobalanceLpPoolObject,
  AutobalanceLpInvestorObject,
  AutobalanceLpParentPoolObject,
  AutobalanceLpReceiptObject
> {
  private poolLabel: AutobalanceLpPoolLabel;
  private poolObject: AutobalanceLpPoolObject;
  private investorObject: AutobalanceLpInvestorObject;
  private parentPoolObject?: AutobalanceLpParentPoolObject;
  private context: StrategyContext;

  constructor(
    poolLabel: AutobalanceLpPoolLabel,
    poolObject: any,
    investorObject: any,
    context: StrategyContext,
    parentPoolObject?: any,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    if (parentPoolObject) {
      this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
    }
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for AutobalanceLp strategy (xtoken to underlying token ratio)
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
    const [alphafi, parent, lpBreakdown, parentLpBreakdown, currentLPPoolPrice, positionRange] =
      await Promise.all([
        this.getTvl(),
        this.getParentTvl(),
        this.getLpBreakdown(),
        this.getParentLpBreakdown(),
        this.getCurrentLPPoolPrice(),
        this.getPositionRange(),
      ]);
    return {
      poolId: this.poolLabel.poolId,
      apr: this.context.getAprData(this.poolLabel.poolId),
      tvl: {
        alphafi,
        parent,
      },
      lpBreakdown,
      parentLpBreakdown,
      currentLPPoolPrice,
      positionRange,
    };
  }

  /**
   * Compute TVL using primary asset (asset_a) price and tokens_invested.
   */
  async getTvl(): Promise<DoubleTvl> {
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const priceA = await this.context.getCoinPrice(coinTypeA);
    const priceB = await this.context.getCoinPrice(coinTypeB);
    const { amountA, amountB } = await this.getTokenAmounts(this.poolObject.tokensInvested);
    const usdValue = amountA.mul(priceA).add(amountB.mul(priceB));
    return { tokenAmountA: amountA, tokenAmountB: amountB, usdValue };
  }

  async getParentTvl(): Promise<DoubleTvl> {
    if (!this.parentPoolObject) {
      return {
        tokenAmountA: new Decimal(0),
        tokenAmountB: new Decimal(0),
        usdValue: new Decimal(0),
      };
    }
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const decimalsA = await this.context.getCoinDecimals(coinTypeA);
    const decimalsB = await this.context.getCoinDecimals(coinTypeB);
    const priceA = await this.context.getCoinPrice(coinTypeA);
    const priceB = await this.context.getCoinPrice(coinTypeB);

    const tokenAmountA = new Decimal(this.parentPoolObject.coinA).div(
      new Decimal(10).pow(decimalsA),
    );
    const tokenAmountB = new Decimal(this.parentPoolObject.coinB).div(
      new Decimal(10).pow(decimalsB),
    );
    const usdValue = tokenAmountA.mul(priceA).add(tokenAmountB.mul(priceB));
    return { tokenAmountA, tokenAmountB, usdValue };
  }

  async getLpBreakdown(): Promise<{
    token1Amount: Decimal;
    token2Amount: Decimal;
    totalLiquidity: Decimal;
  }> {
    const liquidity = this.poolObject.tokensInvested;
    const { amountA, amountB } = await this.getTokenAmounts(liquidity);
    const totalLiquidity = new Decimal(liquidity).div(new Decimal(1e9));
    return {
      token1Amount: amountA,
      token2Amount: amountB,
      totalLiquidity,
    };
  }

  async getParentLpBreakdown(): Promise<{
    token1Amount: Decimal;
    token2Amount: Decimal;
    totalLiquidity: Decimal;
  }> {
    if (!this.parentPoolObject) {
      return {
        token1Amount: new Decimal(0),
        token2Amount: new Decimal(0),
        totalLiquidity: new Decimal(0),
      };
    }
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const decimalsA = await this.context.getCoinDecimals(coinTypeA);
    const decimalsB = await this.context.getCoinDecimals(coinTypeB);
    const token1Amount = new Decimal(this.parentPoolObject.coinA).div(
      new Decimal(10).pow(decimalsA),
    );
    const token2Amount = new Decimal(this.parentPoolObject.coinB).div(
      new Decimal(10).pow(decimalsB),
    );
    const totalLiquidity = new Decimal(this.parentPoolObject.liquidity).div(new Decimal(1e9));
    return { token1Amount, token2Amount, totalLiquidity };
  }

  async getCurrentLPPoolPrice(): Promise<Decimal> {
    if (!this.parentPoolObject) {
      return new Decimal(0);
    }
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const decimalsA = await this.context.getCoinDecimals(coinTypeA);
    const decimalsB = await this.context.getCoinDecimals(coinTypeB);
    const currentTick = this.parentPoolObject.currentTickIndex;
    const price = TickMath.tickIndexToPrice(currentTick, decimalsA, decimalsB);
    return new Decimal(price.toString());
  }

  async getPositionRange(): Promise<{ lowerPrice: Decimal; upperPrice: Decimal }> {
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const decimalsA = await this.context.getCoinDecimals(coinTypeA);
    const decimalsB = await this.context.getCoinDecimals(coinTypeB);

    const upperBound = 443636;
    let lowerTick = this.investorObject.lowerTick;
    let upperTick = this.investorObject.upperTick;
    if (lowerTick > upperBound) {
      lowerTick = -~(lowerTick - 1);
    }
    if (upperTick > upperBound) {
      upperTick = -~(upperTick - 1);
    }
    const lower = TickMath.tickIndexToPrice(lowerTick, decimalsA, decimalsB);
    const upper = TickMath.tickIndexToPrice(upperTick, decimalsA, decimalsB);
    return { lowerPrice: new Decimal(lower.toString()), upperPrice: new Decimal(upper.toString()) };
  }

  // ===== Helper Functions =====

  /**
   * Estimate token A and B amounts from liquidity using Cetus CLMM SDK.
   */
  private async getTokenAmounts(
    liquidity: string,
  ): Promise<{ amountA: Decimal; amountB: Decimal }> {
    if (!this.parentPoolObject) {
      return { amountA: new Decimal(0), amountB: new Decimal(0) };
    }
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const scalingA = new Decimal(10).pow(await this.context.getCoinDecimals(coinTypeA));
    const scalingB = new Decimal(10).pow(await this.context.getCoinDecimals(coinTypeB));

    const liquidityBN = new BN(new Decimal(liquidity).toFixed(0));
    const currentSqrtPriceBN = new BN(this.parentPoolObject.currentSqrtPrice);

    const upperBound = 443636;
    let lowerTick = this.investorObject.lowerTick;
    let upperTick = this.investorObject.upperTick;
    if (lowerTick > upperBound) {
      lowerTick = -~(lowerTick - 1);
    }
    if (upperTick > upperBound) {
      upperTick = -~(upperTick - 1);
    }
    const lowerSqrtPriceBN = TickMath.tickIndexToSqrtPriceX64(lowerTick as number);
    const upperSqrtPriceBN = TickMath.tickIndexToSqrtPriceX64(upperTick as number);
    const amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
      liquidityBN,
      currentSqrtPriceBN,
      lowerSqrtPriceBN,
      upperSqrtPriceBN,
      false,
    );

    const amountA = new Decimal(amounts.coinA.toString()).div(scalingA);
    const amountB = new Decimal(amounts.coinB.toString()).div(scalingB);
    return { amountA, amountB };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): AutobalanceLpPoolObject {
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
    }, 'Failed to parse AutobalanceLp pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): AutobalanceLpInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        emergencyBalanceA: this.getStringField(fields, 'emergency_balance_a'),
        emergencyBalanceB: this.getStringField(fields, 'emergency_balance_b'),
        freeBalanceA: this.getStringField(fields, 'free_balance_a'),
        freeBalanceB: this.getStringField(fields, 'free_balance_b'),
        freeRewards: (() => {
          const idVal =
            (this.getNestedField(fields, 'free_rewards.fields.id.id') as string | undefined) || '';
          const sizeVal =
            (this.getNestedField(fields, 'free_rewards.fields.size') as string | undefined) || '';
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        isEmergency: this.getBooleanField(fields, 'is_emergency', false),
        lowerTick: this.getNumberField(fields, 'lower_tick'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        performanceFeeMaxCap: this.getStringField(fields, 'performance_fee_max_cap'),
        upperTick: this.getNumberField(fields, 'upper_tick'),
      };
    }, 'Failed to parse AutobalanceLp investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): AutobalanceLpParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        coinA: this.getStringField(fields, 'coin_a'),
        coinB: this.getStringField(fields, 'coin_b'),
        currentSqrtPrice: this.getStringField(fields, 'current_sqrt_price'),
        currentTickIndex:
          (this.getNestedField(fields, 'current_tick_index.fields.bits') as number | undefined) ||
          this.getNumberField(fields, 'current_tick_index'),
        id: this.getStringField(fields, 'id'),
        liquidity: this.getStringField(fields, 'liquidity'),
      };
    }, 'Failed to parse AutobalanceLp parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): AutobalanceLpReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          imageUrl: this.getStringField(fields, 'image_url'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          owner: this.getStringField(fields, 'owner'),
          name: this.getStringField(fields, 'name'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          xTokenBalance:
            this.getStringField(fields, 'xtoken_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse AutobalanceLp receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * AutobalanceLp Pool object data structure
 */
export interface AutobalanceLpPoolObject {
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
 * AutobalanceLp Investor object data structure
 */
export interface AutobalanceLpInvestorObject {
  emergencyBalanceA: string;
  emergencyBalanceB: string;
  freeBalanceA: string;
  freeBalanceB: string;
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  isEmergency: boolean;
  lowerTick: number;
  minimumSwapAmount: string;
  performanceFee: string;
  performanceFeeMaxCap: string;
  upperTick: number;
}

/**
 * AutobalanceLp Parent Pool object data structure (underlying protocol pool)
 */
export interface AutobalanceLpParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
}

/**
 * AutobalanceLp Receipt object data structure
 */
export interface AutobalanceLpReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  owner: string;
  name: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  xTokenBalance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * AutobalanceLp Pool Label - Configuration for AutobalanceLp strategy pools
 */
export interface AutobalanceLpPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'AutobalanceLp';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  receipt: NameType;
  assetA: NameType;
  assetB: NameType;
  events: {
    autocompoundEventType: string;
    rebalanceEventType: string;
    liquidityChangeEventType: string;
    afterTransactionEventType?: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
