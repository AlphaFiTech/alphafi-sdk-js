/**
 * LP Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, DoubleTvl, PoolBalance } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import BN from 'bn.js';
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';

/**
 * LP Strategy for dual-asset liquidity pools
 */
export class LpStrategy extends BaseStrategy<
  LpPoolObject,
  LpInvestorObject,
  LpParentPoolObject,
  LpReceiptObject
> {
  private poolLabel: LpPoolLabel;
  private poolObject: LpPoolObject;
  private investorObject: LpInvestorObject;
  private parentPoolObject: LpParentPoolObject;
  private receiptObjects: LpReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LpPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  getPoolLabel(): LpPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Get alpha mining data including pool and receipt information
   */
  protected getAlphaMiningData(): AlphaMiningData {
    const receipt = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;

    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: this.poolObject.accRewardsPerXtoken,
      xTokenSupply: this.poolObject.xTokenSupply,
      receipt: receipt
        ? {
            lastAccRewardPerXtoken: receipt.lastAccRewardPerXtoken,
            pendingRewards: receipt.pendingRewards,
            xTokenBalance: receipt.xTokenBalance,
          }
        : null,
    };
  }

  /**
   * Get the exchange rate for xtoken to underlying token ratio
   * Calculated as tokens_invested / xtoken_supply
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
   * Get comprehensive pool data including TVL, LP breakdown, price, and position range
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
   * Calculate total value locked using current asset prices and token amounts
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

  /**
   * Calculate parent pool TVL from underlying protocol reserves
   */
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

  /**
   * Get LP token breakdown showing individual asset amounts and total liquidity
   */
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

  /**
   * Get parent pool LP breakdown from underlying protocol
   */
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

  /**
   * Get current LP pool price from tick index
   */
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

  /**
   * Get position price range from lower and upper tick bounds
   */
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
   * Calculate user's current pool balance from receipt objects
   * Converts xToken balance to underlying assets and USD value
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return {
        tokenAAmount: new Decimal(0),
        tokenBAmount: new Decimal(0),
        usdValue: new Decimal(0),
      };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);

    const exchangeRate = this.exchangeRate();
    const coinTypeA = this.poolLabel.assetA.type;
    const coinTypeB = this.poolLabel.assetB.type;
    const [priceA, priceB] = await Promise.all([
      this.context.getCoinPrice(coinTypeA),
      this.context.getCoinPrice(coinTypeB),
    ]);

    const tokens = xTokens.mul(exchangeRate);
    const { amountA, amountB } = await this.getTokenAmounts(tokens.floor().toString());

    const usdValue = amountA.mul(priceA).add(amountB.mul(priceB));
    return { tokenAAmount: amountA, tokenBAmount: amountB, usdValue };
  }

  /**
   * Calculate token A and B amounts from liquidity using Cetus CLMM SDK
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

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LpPoolObject {
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
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
      };
    }, `Failed to parse LP pool object (poolId=${this.poolLabel.poolId})`);
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LpInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        emergencyBalanceA: this.getStringField(fields, 'emergency_balance_a'),
        emergencyBalanceB: this.getStringField(fields, 'emergency_balance_b'),
        freeBalanceA: this.getStringField(fields, 'free_balance_a'),
        freeBalanceB: this.getStringField(fields, 'free_balance_b'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
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
    }, `Failed to parse LP investor object (poolId=${this.poolLabel.poolId})`);
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): LpParentPoolObject {
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
    }, `Failed to parse LP parent pool object (poolId=${this.poolLabel.poolId})`);
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LpReceiptObject[] {
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
            xTokenBalance: this.getStringField(fields, 'xTokenBalance'),
          };
        }, `Failed to parse LP receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }
}

/**
 * LP Pool object data structure
 */
export interface LpPoolObject {
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
 * LP Investor object data structure
 */
export interface LpInvestorObject {
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
 * LP Parent Pool object data structure
 */
export interface LpParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
}

/**
 * LP Receipt object data structure
 */
export interface LpReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  owner: string;
  name: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  xTokenBalance: string;
}

/**
 * LP Pool Label configuration
 */
export interface LpPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Lp';
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
