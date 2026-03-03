/**
 * LP Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { PoolData, DoubleTvl, PoolBalance } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import BN from 'bn.js';
import { ClmmPoolUtil, LiquidityInput, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import {
  Transaction,
  TransactionObjectArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import {
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  POOLS,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';

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
      strategyType: this.poolLabel.strategyType,
      coinAType: this.poolLabel.assetA.type,
      coinBType: this.poolLabel.assetB.type,
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

  async depositBluefinSuiFirstTx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    const [blueCoin, suiCoin] = await this.context.getCoinsBySymbols(['BLUE', 'SUI']);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        blueCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async withdrawBluefinSuiFirstTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    const [blueCoin, suiCoin] = await this.context.getCoinsBySymbols(['BLUE', 'SUI']);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        blueCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[4]),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        tx.object(this.receiptObjects[0].id),
        noneAlphaReceipt,
        tx.object(POOLS.ALPHA_LEGACY),
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.pure.u128(xTokensAmount),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async depositBluefinSuiSecondTx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    const [deepCoin, blueCoin, suiCoin] = await this.context.getCoinsBySymbols([
      'DEEP',
      'BLUE',
      'SUI',
    ]);
    if (this.poolLabel.poolName === 'BLUEFIN-STSUI-SUI') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_sui_pool::user_deposit`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          this.poolLabel.assetA.name === 'BLUE' ? deepCoin.coinType : blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdrawBluefinSuiSecondTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    const [blueCoin, suiCoin, deepCoin] = await this.context.getCoinsBySymbols([
      'BLUE',
      'SUI',
      'DEEP',
    ]);

    if (this.poolLabel.poolName === 'BLUEFIN-STSUI-SUI') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_sui_pool::user_withdraw`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          this.poolLabel.assetA.name === 'BLUE' ? deepCoin.coinType : blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async depositBluefinType1Tx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    const [blueCoin, suiCoin, deepCoin] = await this.context.getCoinsBySymbols([
      'BLUE',
      'SUI',
      'DEEP',
    ]);
    if (this.poolLabel.poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'cetus')),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (
      this.poolLabel.poolName === 'BLUEFIN-SUIBTC-USDC' ||
      this.poolLabel.poolName === 'BLUEFIN-LBTC-SUIBTC'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
          deepCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.BLUEFIN_V2),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'DEEP', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'bluefin',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
          deepCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.BLUEFIN_V2),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'DEEP', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with same tokens
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdrawBluefinType1Tx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    const [blueCoin, suiCoin, deepCoin] = await this.context.getCoinsBySymbols([
      'BLUE',
      'SUI',
      'DEEP',
    ]);

    if (this.poolLabel.poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_withdraw`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'cetus')),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (
      this.poolLabel.poolName === 'BLUEFIN-SUIBTC-USDC' ||
      this.poolLabel.poolName === 'BLUEFIN-LBTC-SUIBTC'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
          deepCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.BLUEFIN_V2),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'DEEP', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'bluefin',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_withdraw`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
          deepCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.BLUEFIN_V2),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'DEEP', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with same tokens
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async depositBluefinType2Tx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    const [blueCoin, suiCoin, deepCoin] = await this.context.getCoinsBySymbols([
      'BLUE',
      'SUI',
      'DEEP',
    ]);

    if (
      this.poolLabel.poolName === 'BLUEFIN-STSUI-ETH' ||
      this.poolLabel.poolName === 'BLUEFIN-STSUI-WSOL'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_2_pool::user_deposit`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // same asset cetus pool
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_2_pool::user_deposit_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          this.poolLabel.assetA.type === 'BLUE' ? deepCoin.coinType : blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // same asset cetus pool
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdrawBluefinType2Tx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    const [blueCoin, suiCoin] = await this.context.getCoinsBySymbols(['BLUE', 'SUI']);

    if (
      this.poolLabel.poolName === 'BLUEFIN-STSUI-ETH' ||
      this.poolLabel.poolName === 'BLUEFIN-STSUI-WSOL'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_2_pool::user_withdraw`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // same asset cetus pool
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_2_pool::user_withdraw_v2`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          blueCoin.coinType,
          suiCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[4]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name === 'BLUE' ? 'DEEP' : 'BLUE',
              'bluefin',
            ),
          ),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // same asset cetus pool
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async depositBluefinStsuiTx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    const [blueCoin] = await this.context.getCoinsBySymbols(['BLUE']);

    if (
      this.poolLabel.poolName === 'BLUEFIN-ALPHA-STSUI' ||
      this.poolLabel.poolName === 'BLUEFIN-WAL-STSUI'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_second_pool::user_deposit`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId), // parent-pool id
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'cetus',
            ),
          ), // cetus pool with assetA, SUI
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'bluefin',
            ),
          ), // bluefin pool with assetA, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId), // parent-pool id
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'bluefin',
            ),
          ), // bluefin pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdrawBluefinStsuiTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    const [blueCoin] = await this.context.getCoinsBySymbols(['BLUE']);

    if (
      this.poolLabel.poolName === 'BLUEFIN-ALPHA-STSUI' ||
      this.poolLabel.poolName === 'BLUEFIN-WAL-STSUI'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_second_pool::user_withdraw`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId), // parent-pool id
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'cetus',
            ),
          ), // cetus pool with assetA, SUI
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'bluefin',
            ),
          ), // bluefin pool with assetA, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.STSUI),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(this.poolLabel.parentPoolId), // parent-pool id
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'BLUE', 'bluefin')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ), // cetus pool with assetB, SUI
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'bluefin',
            ),
          ), // bluefin pool with assetB, SUI
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async depositCetusTx(tx: Transaction, receiptOption: any, depositCoinA: any, depositCoinB: any) {
    if (
      this.poolLabel.poolName == 'WUSDC-WBTC' ||
      this.poolLabel.poolName == 'USDC-USDT' ||
      this.poolLabel.poolName == 'USDC-WUSDC' ||
      this.poolLabel.poolName == 'USDC-ETH'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_cetus_pool_base_a::user_deposit`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              this.poolLabel.assetA.name,
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_cetus_pool::user_deposit`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdrawCetusTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    if (
      this.poolLabel.poolName == 'WUSDC-WBTC' ||
      this.poolLabel.poolName == 'USDC-USDT' ||
      this.poolLabel.poolName == 'USDC-WUSDC' ||
      this.poolLabel.poolName == 'USDC-ETH'
    ) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_cetus_pool_base_a::user_withdraw`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetA.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_cetus_pool::user_withdraw`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(this.poolLabel.investorId),
          tx.pure.u128(xTokensAmount),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(
            await this.context.getPoolIdBySymbolsAndProtocol(
              'SUI',
              this.poolLabel.assetB.name,
              'cetus',
            ),
          ),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async depositCetusAlphaSuiTx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::user_deposit`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async withdrawCetusAlphaSuiTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        tx.object(this.receiptObjects[0].id),
        noneAlphaReceipt,
        tx.object(POOLS.ALPHA_LEGACY),
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.pure.u128(xTokensAmount),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'CETUS', 'cetus')),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async depositCetusSuiTx(
    tx: Transaction,
    receiptOption: any,
    depositCoinA: any,
    depositCoinB: any,
  ) {
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::user_deposit`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[2]),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async withdrawCetusSuiTx(tx: Transaction, noneAlphaReceipt: any, xTokensAmount: string) {
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.ALPHA_VERSIONS[2]),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        tx.object(this.receiptObjects[0].id),
        noneAlphaReceipt,
        tx.object(POOLS.ALPHA_LEGACY),
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.pure.u128(xTokensAmount),
        tx.object(GLOBAL_CONFIGS.CETUS),
        tx.object(GLOBAL_CONFIGS.CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(
          await this.context.getPoolIdBySymbolsAndProtocol(
            this.poolLabel.assetA.name,
            this.poolLabel.assetB.name,
            'cetus',
          ),
        ),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async deposit(
    tx: Transaction,
    options: DepositOptions,
    depositCoins?: [TransactionObjectArgument, TransactionObjectArgument],
  ) {
    let depositCoinA: TransactionObjectArgument;
    let depositCoinB: TransactionObjectArgument;

    if (depositCoins === undefined || depositCoins === null) {
      if (options.isAmountA === undefined) {
        throw new Error('isAmountA is required for AutobalanceLp strategy');
      }
      const [amountA, amountB] = this.getOtherAmount(options.amount.toString(), options.isAmountA);

      // get Coin Objects
      depositCoinA = await this.context.blockchain.getCoinObject(
        tx,
        this.poolLabel.assetA.type,
        options.address,
        BigInt(amountA),
      );
      depositCoinB = await this.context.blockchain.getCoinObject(
        tx,
        this.poolLabel.assetB.type,
        options.address,
        BigInt(amountB),
      );
    } else {
      depositCoinA = depositCoins[0];
      depositCoinB = depositCoins[1];
    }

    const receiptOption = this.context.blockchain.getOptionReceipt(
      tx,
      this.poolLabel.receipt.type,
      this.receiptObjects.length > 0 ? this.receiptObjects[0].id : undefined,
    );

    if (this.poolLabel.parentProtocol === 'Cetus') {
      if (this.poolLabel.assetA.name === 'CETUS' && this.poolLabel.assetB.name === 'SUI') {
        await this.depositCetusSuiTx(tx, receiptOption, depositCoinA, depositCoinB);
      } else if (this.poolLabel.assetB.name === 'SUI') {
        await this.depositCetusAlphaSuiTx(tx, receiptOption, depositCoinA, depositCoinB);
      } else {
        await this.depositCetusTx(tx, receiptOption, depositCoinA, depositCoinB);
      }
    } else if (this.poolLabel.parentProtocol === 'Bluefin') {
      if (
        this.poolLabel.poolName === 'BLUEFIN-NAVX-VSUI' ||
        this.poolLabel.poolName === 'BLUEFIN-ALPHA-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-BLUE-USDC'
      ) {
        await this.depositBluefinType2Tx(tx, receiptOption, depositCoinA, depositCoinB);
      } else if (this.poolLabel.assetA.name === 'SUI') {
        await this.depositBluefinSuiFirstTx(tx, receiptOption, depositCoinA, depositCoinB);
      } else if (this.poolLabel.assetB.name === 'SUI') {
        await this.depositBluefinSuiSecondTx(tx, receiptOption, depositCoinA, depositCoinB);
      } else if (this.poolLabel.assetA.name === 'stSUI' || this.poolLabel.assetB.name === 'stSUI') {
        await this.depositBluefinStsuiTx(tx, receiptOption, depositCoinA, depositCoinB);
      } else {
        await this.depositBluefinType1Tx(tx, receiptOption, depositCoinA, depositCoinB);
      }
    }
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (options.isAmountA === undefined) {
      throw new Error('isAmountA is required for AutobalanceLp strategy');
    }
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found!');
    }
    let xTokenAmount = '0';
    if (options.withdrawMax) {
      xTokenAmount = this.receiptObjects[0].xTokenBalance;
    } else {
      xTokenAmount = this.coinAmountToXToken(options.amount.toString(), options.isAmountA);
    }

    const noneAlphaReceipt = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [
        '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
      ],
      arguments: [],
    });

    if (this.poolLabel.parentProtocol === 'Cetus') {
      if (this.poolLabel.assetA.name === 'CETUS' && this.poolLabel.assetB.name === 'SUI') {
        await this.withdrawCetusSuiTx(tx, noneAlphaReceipt, xTokenAmount);
      } else if (this.poolLabel.assetB.name === 'SUI') {
        await this.withdrawCetusAlphaSuiTx(tx, noneAlphaReceipt, xTokenAmount);
      } else {
        await this.withdrawCetusTx(tx, noneAlphaReceipt, xTokenAmount);
      }
    } else if (this.poolLabel.parentProtocol === 'Bluefin') {
      if (
        this.poolLabel.poolName === 'BLUEFIN-NAVX-VSUI' ||
        this.poolLabel.poolName === 'BLUEFIN-ALPHA-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-BLUE-USDC'
      ) {
        await this.withdrawBluefinType2Tx(tx, noneAlphaReceipt, xTokenAmount);
      } else if (this.poolLabel.assetA.name === 'SUI') {
        await this.withdrawBluefinSuiFirstTx(tx, noneAlphaReceipt, xTokenAmount);
      } else if (this.poolLabel.assetB.name === 'SUI') {
        await this.withdrawBluefinSuiSecondTx(tx, noneAlphaReceipt, xTokenAmount);
      } else if (this.poolLabel.assetA.name === 'stSUI' || this.poolLabel.assetB.name === 'stSUI') {
        await this.withdrawBluefinStsuiTx(tx, noneAlphaReceipt, xTokenAmount);
      } else {
        await this.withdrawBluefinType1Tx(tx, noneAlphaReceipt, xTokenAmount);
      }
    }
  }

  async claimRewards(tx: Transaction, alphaReceipt: TransactionResult) {
    if (this.poolLabel.parentProtocol === 'Cetus') {
      if (this.poolLabel.poolName === 'CETUS-SUI') {
        this.receiptObjects.forEach((receipt) => {
          alphaReceipt = tx.moveCall({
            target: `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::get_user_rewards_all`,
            typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
            arguments: [
              tx.object(VERSIONS.ALPHA_VERSIONS[2]),
              tx.object(VERSIONS.ALPHA_VERSIONS[1]),
              tx.object(receipt.id),
              alphaReceipt,
              tx.object(this.poolLabel.poolId),
              tx.object(POOLS.ALPHA_LEGACY),
              tx.object(DISTRIBUTOR_OBJECT_ID),
              tx.object(CLOCK_PACKAGE_ID),
            ],
          });
        });
      } else {
        let target;
        if (this.poolLabel.assetB.name == 'SUI') {
          target = `${this.poolLabel.packageId}::alphafi_cetus_sui_pool::get_user_rewards_all`;
        } else if (
          this.poolLabel.poolName == 'WUSDC-WBTC' ||
          this.poolLabel.poolName == 'USDC-USDT' ||
          this.poolLabel.poolName == 'USDC-WUSDC' ||
          this.poolLabel.poolName == 'USDC-ETH'
        ) {
          target = `${this.poolLabel.packageId}::alphafi_cetus_pool_base_a::get_user_rewards_all`;
        } else {
          target = `${this.poolLabel.packageId}::alphafi_cetus_pool::get_user_rewards_all`;
        }
        if (target) {
          this.receiptObjects.forEach((receipt) => {
            alphaReceipt = tx.moveCall({
              target,
              typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
              arguments: [
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(receipt.id),
                alphaReceipt,
                tx.object(this.poolLabel.poolId),
                tx.object(POOLS.ALPHA_LEGACY),
                tx.object(DISTRIBUTOR_OBJECT_ID),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          });
        }
      }
    } else if (this.poolLabel.parentProtocol === 'Bluefin') {
      let version, target;
      if (
        this.poolLabel.poolName === 'BLUEFIN-SUIBTC-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-LBTC-SUIBTC'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`;
        version = VERSIONS.BLUEFIN_V2;
      } else if (
        this.poolLabel.poolName == 'BLUEFIN-SUI-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-SUI-BUCK' ||
        this.poolLabel.poolName === 'BLUEFIN-SUI-AUSD'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[4];
      } else if (
        this.poolLabel.poolName == 'BLUEFIN-USDT-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-AUSD-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-WBTC-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-SEND-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-SUIUSDT-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-WAL-USDC'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[4];
      } else if (
        this.poolLabel.poolName === 'BLUEFIN-ALPHA-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-NAVX-VSUI' ||
        this.poolLabel.poolName === 'BLUEFIN-BLUE-USDC'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_type_2_pool::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[4];
      } else if (
        this.poolLabel.poolName === 'BLUEFIN-BLUE-SUI' ||
        this.poolLabel.poolName === 'BLUEFIN-WBTC-SUI' ||
        this.poolLabel.poolName === 'BLUEFIN-DEEP-SUI'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[4];
      } else if (this.poolLabel.poolName === 'BLUEFIN-STSUI-SUI') {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_stsui_sui_pool::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[4];
      } else if (
        this.poolLabel.poolName === 'BLUEFIN-STSUI-USDC' ||
        this.poolLabel.poolName === 'BLUEFIN-STSUI-WSOL' ||
        this.poolLabel.poolName === 'BLUEFIN-STSUI-ETH' ||
        this.poolLabel.poolName === 'BLUEFIN-STSUI-BUCK' ||
        this.poolLabel.poolName === 'BLUEFIN-STSUI-MUSD'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_stsui_first_pool::get_user_rewards_all`;
        version = VERSIONS.STSUI;
      } else if (
        this.poolLabel.poolName === 'BLUEFIN-ALPHA-STSUI' ||
        this.poolLabel.poolName === 'BLUEFIN-WAL-STSUI'
      ) {
        target = `${this.poolLabel.packageId}::alphafi_bluefin_stsui_second_pool::get_user_rewards_all`;
        version = VERSIONS.STSUI;
      }
      if (version && target) {
        this.receiptObjects.forEach((receipt) => {
          alphaReceipt = tx.moveCall({
            target,
            typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
            arguments: [
              tx.object(version),
              tx.object(VERSIONS.ALPHA_VERSIONS[1]),
              tx.object(receipt.id),
              alphaReceipt,
              tx.object(this.poolLabel.poolId),
              tx.object(POOLS.ALPHA_LEGACY),
              tx.object(DISTRIBUTOR_OBJECT_ID),
              tx.object(CLOCK_PACKAGE_ID),
            ],
          });
        });
      }
    }
  }

  fetchCoinTypes(): [string, string] {
    return [this.poolLabel.assetA.type, this.poolLabel.assetB.type];
  }
}

/**
 * LP Pool object data structure
 */
export interface LpPoolObject {
  accRewardsPerXtoken: StringMap[];
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
  lastAccRewardPerXtoken: StringMap[];
  owner: string;
  name: string;
  pendingRewards: StringMap[];
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
  receipt: StringMap;
  assetA: StringMap;
  assetB: StringMap;
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
