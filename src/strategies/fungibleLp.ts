/**
 * FungibleLp Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, StringMap } from './strategy.js';
import { PoolData, DoubleTvl, PoolBalance } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import BN from 'bn.js';
import { ClmmPoolUtil, LiquidityInput, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';

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
  private xTokenBalance: Decimal = new Decimal(0);
  private context: StrategyContext;

  constructor(
    poolLabel: FungibleLpPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
    this.context = context;
  }

  getPoolLabel(): FungibleLpPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(xTokenBalance: Decimal): void {
    this.xTokenBalance = xTokenBalance;
  }

  /**
   * Returns alpha mining data - FungibleLp pools do not support alpha mining
   */
  protected getAlphaMiningData(): AlphaMiningData {
    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: [],
      xTokenSupply: '0',
      receipt: null,
    };
  }

  /**
   * Get the exchange rate for fungible token to underlying token ratio
   * Calculated as tokens_invested / treasury_cap.total_supply
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
   * Get comprehensive pool data including TVL, LP breakdown, price, and position range
   */
  async getData(): Promise<PoolData> {
    const [
      alphafi,
      parent,
      lpBreakdown,
      parentLpBreakdown,
      currentLPPoolPrice,
      positionRange,
      apr,
    ] = await Promise.all([
      this.getTvl(),
      this.getParentTvl(),
      this.getLpBreakdown(),
      this.getParentLpBreakdown(),
      this.getCurrentLPPoolPrice(),
      this.getPositionRange(),
      this.context.getAprData(this.poolLabel.poolId),
    ]);
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr,
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
   * Get LP token breakdown showing individual asset amounts and total liquidity
   */
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

  /**
   * Get parent pool LP breakdown from underlying protocol
   */
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
   * Calculate user's current pool balance from fungible xToken balance
   * Uses wallet balance instead of receipts
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.xTokenBalance.isZero()) {
      return {
        tokenAAmount: new Decimal(0),
        tokenBAmount: new Decimal(0),
        usdValue: new Decimal(0),
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
    const usdValue = amountA.mul(priceA).add(amountB.mul(priceB));
    return { tokenAAmount: amountA, tokenBAmount: amountB, usdValue };
  }

  private getLiquidity(amount: string, isAmountA: boolean): LiquidityInput {
    const upperBound = 443636;
    let lowerTick = this.investorObject.lowerTick;
    let upperTick = this.investorObject.upperTick;
    if (lowerTick > upperBound) {
      lowerTick = -~(lowerTick - 1);
    }
    if (upperTick > upperBound) {
      upperTick = -~(upperTick - 1);
    }
    const currentSqrtPriceBN = new BN(this.parentPoolObject.currentSqrtPrice);

    return ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      new BN(`${Math.floor(parseFloat(amount))}`),
      isAmountA,
      false,
      0.5,
      currentSqrtPriceBN,
    );
  }

  getOtherAmount(amount: string, isAmountA: boolean): [string, string] {
    const liquidity = this.getLiquidity(amount, isAmountA);
    return [liquidity.coinAmountA.toString(), liquidity.coinAmountB.toString()];
  }

  private coinAmountToXToken(amount: string, isAmountA: boolean): string {
    const liquidity = new Decimal(this.getLiquidity(amount, isAmountA).liquidityAmount.toString());
    const exchangeRate = this.exchangeRate();
    return liquidity.div(exchangeRate).floor().toString();
  }

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
          id: this.getNestedField(fields, 'treasury_cap.id'),
          totalSupply: this.getNestedField(fields, 'treasury_cap.total_supply.value'),
        },
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
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
        currentTickIndex: this.getNestedField(fields, 'current_tick_index.bits'),
        id: this.getStringField(fields, 'id'),
        liquidity: this.getStringField(fields, 'liquidity'),
      };
    }, 'Failed to parse FungibleLp parent pool object');
  }

  /**
   * Parse receipt objects (not applicable for FungibleLp)
   */
  parseReceiptObjects(_responses: any[]): never {
    throw new Error('FungibleLp strategy does not have receipts');
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    if (options.isAmountA === undefined) {
      throw new Error('isAmountA is required for AutobalanceLp strategy');
    }
    const [amountA, amountB] = this.getOtherAmount(options.amount.toString(), options.isAmountA);

    // get Coin Objects
    const depositCoinA = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.assetA.type,
      options.address,
      BigInt(amountA),
    );

    const depositCoinB = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.assetB.type,
      options.address,
      BigInt(amountB),
    );

    const [blueCoin] = await this.context.getCoinsBySymbols(['BLUE']);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_sui_ft_pool::user_deposit`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        this.poolLabel.fungibleCoin.type,
        blueCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.FUNGIBLE_LP),
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (options.isAmountA === undefined) {
      throw new Error('isAmountA is required for AutobalanceLp strategy');
    }
    if (this.xTokenBalance.isZero()) {
      throw new Error('No xToken balance found!');
    }

    let xTokenAmount = '0';
    if (options.withdrawMax) {
      xTokenAmount = this.xTokenBalance.toString();
    } else {
      xTokenAmount = this.coinAmountToXToken(options.amount.toString(), options.isAmountA);
    }

    const withdrawFungibleCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.fungibleCoin.type,
      options.address,
      BigInt(xTokenAmount),
    );

    const [blueCoin] = await this.context.getCoinsBySymbols(['BLUE']);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_sui_ft_pool::user_withdraw`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        this.poolLabel.fungibleCoin.type,
        blueCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.FUNGIBLE_LP),
        withdrawFungibleCoin,
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

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
 * FungibleLp Parent Pool object data structure
 */
export interface FungibleLpParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
}

/**
 * FungibleLp Pool Label configuration
 */
export interface FungibleLpPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'FungibleLp';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  fungibleCoin: StringMap;
  assetA: StringMap;
  assetB: StringMap;
  events: {
    autocompoundEventType: string;
    rebalanceEventType: string;
    liquidityChangeEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
