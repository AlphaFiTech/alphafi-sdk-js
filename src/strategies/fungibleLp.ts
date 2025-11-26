/**
 * FungibleLp Strategy Implementation
 * Fungible liquidity pool strategy for dual-asset pools with fungible tokens
 * Based on alphafi-sdk-rust/src/strategies/fungible_lp.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, ProtocolType, NameType } from './strategy.js';
import { PoolData, DoubleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategy_context.js';
import BN from 'bn.js';
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';

// ===== FungibleLp Strategy Class =====

/**
 * FungibleLp Strategy for dual-asset liquidity pools with fungible tokens
 */
export class FungibleLpStrategy extends BaseStrategy<
  FungibleLpPoolObject,
  FungibleLpInvestorObject,
  FungibleLpParentPoolObject,
  never // FungibleLp doesn't have receipts
> {
  private poolLabel: FungibleLpPoolLabel;
  private poolObject: FungibleLpPoolObject;
  private investorObject: FungibleLpInvestorObject;
  private parentPoolObject: FungibleLpParentPoolObject;
  private xTokenBalance: Decimal;
  private context: StrategyContext;

  constructor(
    poolLabel: FungibleLpPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    xTokenBalance: string,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.xTokenBalance = new Decimal(xTokenBalance);
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for FungibleLp strategy (fungible token to underlying token ratio)
   * Exchange rate = tokens_invested / treasury_cap.total_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokensInvested);
    const totalSupply = new Decimal(this.poolObject.treasuryCap.totalSupply);

    if (totalSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(totalSupply);
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

  // ===== Helper Functions =====

  /**
   * Estimate token A and B amounts from liquidity using Cetus CLMM SDK.
   */
  private async getTokenAmounts(
    liquidity: string,
  ): Promise<{ amountA: Decimal; amountB: Decimal }> {
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

  private async getLpBreakdown(): Promise<{
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

  private async getParentLpBreakdown(): Promise<{
    token1Amount: Decimal;
    token2Amount: Decimal;
    totalLiquidity: Decimal;
  }> {
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

  /**
   * Compute the user's current pool balance based on fungible xToken balance.
   * Mirrors fungible_lp.rs: uses wallet balance instead of receipts.
   */
  async getBalance(): Promise<{
    tokenAAmount: Decimal;
    tokenBAmount: Decimal;
    totalUsdValue: Decimal;
  }> {
    if (this.xTokenBalance.isZero()) {
      return {
        tokenAAmount: new Decimal(0),
        tokenBAmount: new Decimal(0),
        totalUsdValue: new Decimal(0),
      };
    }

    const exchangeRate = this.exchangeRate();
    const tokens = this.xTokenBalance.mul(exchangeRate);

    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const [priceA, priceB] = await Promise.all([
      this.context.getCoinPrice(coinTypeA),
      this.context.getCoinPrice(coinTypeB),
    ]);

    const { amountA, amountB } = await this.getTokenAmounts(tokens.floor().toString());
    const totalUsdValue = amountA.mul(priceA).add(amountB.mul(priceB));
    return { tokenAAmount: amountA, tokenBAmount: amountB, totalUsdValue };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): FungibleLpPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        paused: this.getBooleanField(fields, 'paused', false),
        treasuryCap: {
          id:
            (this.getNestedField(fields, 'treasury_cap.fields.id.id') as string | undefined) ||
            this.getStringField(fields.treasury_cap || {}, 'id'),
          totalSupply:
            (this.getNestedField(fields, 'treasury_cap.fields.total_supply.fields.value') as
              | string
              | undefined) || this.getStringField(fields.treasury_cap || {}, 'total_supply'),
        },
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
      };
    }, 'Failed to parse FungibleLp pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): FungibleLpInvestorObject {
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
    }, 'Failed to parse FungibleLp investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): FungibleLpParentPoolObject {
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
    }, 'Failed to parse FungibleLp parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses (not applicable for FungibleLp)
   */
  parseReceiptObjects(_responses: any[]): never {
    throw new Error('FungibleLp strategy does not have receipts');
  }
}

// ===== Types =====

/**
 * FungibleLp Pool object data structure
 */
export interface FungibleLpPoolObject {
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  paused: boolean;
  treasuryCap: {
    id: string;
    totalSupply: string;
  };
  tokensInvested: string;
  withdrawFeeMaxCap: string;
  withdrawalFee: string;
}

/**
 * FungibleLp Investor object data structure
 */
export interface FungibleLpInvestorObject {
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
 * FungibleLp Parent Pool object data structure (underlying protocol pool)
 */
export interface FungibleLpParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
}

// ===== Pool Label =====

/**
 * FungibleLp Pool Label - Configuration for FungibleLp strategy pools
 */
export interface FungibleLpPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'FungibleLp';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  fungibleCoin: NameType;
  assetA: NameType;
  assetB: NameType;
  events: {
    autocompoundEventType: string;
    rebalanceEventType: string;
    liquidityChangeEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
