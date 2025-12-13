/**
 * Lyf Strategy Implementation
 * Lyf strategy for dual-asset pools using alphalend for leverage
 * Based on alphafi-sdk-rust/src/strategies/lyf.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, DoubleTvl, PoolBalance } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import BN from 'bn.js';
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';

// ===== Lyf Strategy Class =====

/**
 * Lyf Strategy for dual-asset pools using alphalend for leverage
 */
export class LyfStrategy extends BaseStrategy<
  LyfPoolObject,
  LyfInvestorObject,
  LyfParentPoolObject,
  LyfReceiptObject
> {
  private poolLabel: LyfPoolLabel;
  private poolObject: LyfPoolObject;
  private investorObject: LyfInvestorObject;
  private parentPoolObject: LyfParentPoolObject;
  private receiptObjects: LyfReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LyfPoolLabel,
    poolObject: any,
    parentPoolObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.poolObject.investor;
    this.context = context;
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  getPoolLabel(): LyfPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Lyf strategy (xtoken to underlying token ratio)
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
      poolName: this.poolLabel.poolName,
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
    let currentTick = this.parentPoolObject.currentTickIndex;
    const upperBound = 443636;
    if (currentTick > upperBound) {
      currentTick = -~(currentTick - 1);
    }
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
   * Compute the user's current pool balance for LYF strategy.
   * Mirrors lyf.rs: convert xTokens to underlying amounts via exchange rate,
   * get token A/B amounts, compute USD value, then convert to zap asset amount.
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const exchangeRate = this.exchangeRate();
    const tokens = xTokens.mul(exchangeRate);

    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const [priceA, priceB] = await Promise.all([
      this.context.getCoinPrice(coinTypeA),
      this.context.getCoinPrice(coinTypeB),
    ]);

    const { amountA, amountB } = await this.getTokenAmounts(tokens.floor().toString());
    const usdValue = amountA.mul(priceA).add(amountB.mul(priceB));

    const zapPrice = await this.context.getCoinPrice(this.poolLabel.zapAsset.type);
    const tokenAmount = usdValue.div(zapPrice);
    return { tokenAmount, usdValue };
  }

  // ===== Helper Functions =====

  private getLeverage(): Decimal {
    // leverage = 1 / (1 - debt_to_supply_ratio_scaled)
    const ratioScaled = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const ratio = ratioScaled.div(new Decimal(10).pow(18));
    return new Decimal(1).div(new Decimal(1).minus(ratio));
  }

  /**
   * Estimate token A and B amounts from liquidity using Cetus CLMM SDK, adjusted by leverage.
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

    let amountA = new Decimal(amounts.coinA.toString()).div(scalingA);
    let amountB = new Decimal(amounts.coinB.toString()).div(scalingB);
    const leverage = this.getLeverage();
    if (!leverage.isZero()) {
      amountA = amountA.div(leverage);
      amountB = amountB.div(leverage);
    }
    return { amountA, amountB };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LyfPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);
      const investor = this.parseInvestorFields(fields?.investor ?? {});

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}).map(
          (item: any) => ({ key: item.key, value: item.value.value }) as KeyValuePair,
        ),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        rewards: (() => {
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
        investor,
      };
    }, 'Failed to parse Lyf pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LyfInvestorObject {
    return this.safeParseObject(
      () => this.parseInvestorFields(response),
      'Failed to parse Lyf investor object',
    );
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): LyfParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        coinA: this.getStringField(fields, 'coin_a'),
        coinB: this.getStringField(fields, 'coin_b'),
        currentSqrtPrice: this.getStringField(fields, 'current_sqrt_price'),
        currentTickIndex: this.getNestedField(fields, 'current_tick_index.bits'),
        id: this.getStringField(fields, 'id'),
        liquidity: this.getStringField(fields, 'liquidity'),
      };
    }, 'Failed to parse Lyf parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LyfReceiptObject[] {
    return responses
      .map((response, index) => {
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
          };
        }, `Failed to parse Lyf receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }

  private parseInvestorFields(response: any): LyfInvestorObject {
    const fields = this.extractFields(response ?? {});
    const freeRewards = (() => {
      const idVal = this.getNestedField(fields, 'free_rewards.id');
      const sizeVal = this.getNestedField(fields, 'free_rewards.size');
      return { id: String(idVal), size: String(sizeVal) };
    })();

    return {
      emergencyBalanceA: this.getStringField(fields, 'emergency_balance_a'),
      emergencyBalanceB: this.getStringField(fields, 'emergency_balance_b'),
      freeBalanceA: this.getStringField(fields, 'free_balance_a'),
      freeBalanceB: this.getStringField(fields, 'free_balance_b'),
      freeRewards,
      id: this.getStringField(fields, 'id'),
      isEmergency: this.getBooleanField(fields, 'is_emergency', false),
      lowerTick: this.getNumberField(fields, 'lower_tick'),
      minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
      performanceFee: this.getStringField(fields, 'performance_fee'),
      performanceFeeMaxCap: this.getStringField(fields, 'performance_fee_max_cap'),
      currDebtA: this.getStringField(fields, 'cur_debt_a'),
      currDebtB: this.getStringField(fields, 'cur_debt_b'),
      marketIdA: this.getStringField(fields, 'market_id_a'),
      marketIdB: this.getStringField(fields, 'market_id_b'),
      currentDebtToSupplyRatio: this.getNestedField(fields, 'current_debt_to_supply_ratio.value'),
      safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
      upperTick: this.getNumberField(fields, 'upper_tick'),
    };
  }
}

// ===== Types =====

/**
 * Lyf Pool object data structure
 */
export interface LyfPoolObject {
  accRewardsPerXtoken: KeyValuePair[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  name: string;
  rewards: {
    id: string;
    size: string;
  };
  tokensInvested: string;
  withdrawFeeMaxCap: string;
  withdrawalFee: string;
  xTokenSupply: string;
  investor: LyfInvestorObject;
}

/**
 * Lyf Investor object data structure
 */
export interface LyfInvestorObject {
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
  currDebtA: string;
  currDebtB: string;
  marketIdA: string;
  marketIdB: string;
  currentDebtToSupplyRatio: string;
  safeBorrowPercentage: string;
  upperTick: number;
}

/**
 * Lyf Parent Pool object data structure (underlying protocol pool)
 */
export interface LyfParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
}

/**
 * Lyf Receipt object data structure
 */
export interface LyfReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  owner: string;
  name: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  xTokenBalance: string;
}

// ===== Pool Label =====

/**
 * Lyf Pool Label - Configuration for Lyf strategy pools
 */
export interface LyfPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Lyf';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  receipt: NameType;
  zapAsset: NameType;
  assetA: NameType;
  assetB: NameType;
  events: {
    autocompoundEventType: string;
    rebalanceEventType: string;
    liquidityChangeEventType: string;
    afterTransactionEventType?: string;
  };
  isActive: boolean;
  isNative: boolean;
  poolName: string;
}
