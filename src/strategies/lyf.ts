/**
 * Lyf Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { PoolData, DoubleTvl, PoolBalance } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import BN from 'bn.js';
import { ClmmPoolUtil, LiquidityInput, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  POOLS,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { getConf as getStsuiConf } from '@alphafi/stsui-sdk';

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
   * Calculate user's current pool balance from xToken balance
   * Converts to underlying assets, calculates USD value, then converts to zap asset
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

  /**
   * Calculate leverage from debt-to-supply ratio
   */
  private getLeverage(): Decimal {
    // leverage = 1 / (1 - debt_to_supply_ratio_scaled)
    const ratioScaled = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const ratio = ratioScaled.div(new Decimal(10).pow(18));
    return new Decimal(1).div(new Decimal(1).minus(ratio));
  }

  /**
   * Calculate token A and B amounts from liquidity using Cetus CLMM SDK, adjusted by leverage
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
    const liquidity = new Decimal(
      this.getLiquidity(amount, isAmountA).liquidityAmount.toString(),
    ).div(
      new Decimal(1).minus(new Decimal(this.investorObject.currentDebtToSupplyRatio).div(1e18)),
    );
    const exchangeRate = this.exchangeRate();
    return liquidity.div(exchangeRate).floor().toString();
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LyfPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);
      const investor = this.parseInvestorFields(fields?.investor ?? {});

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}).map(
          (item: any) => ({ key: item.key, value: item.value.value }) as StringMap,
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
            lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken).map(
              (item: any) => ({ key: item.key, value: item.value.value }) as StringMap,
            ),
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

  /**
   * Parse investor fields from blockchain response data
   */
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

  private async collectAndSwapRewards(tx: Transaction) {
    const [blueCoin, suiCoin, alphaCoin, stsuiCoin, usdcCoin] =
      await this.context.getCoinsBySymbols(['BLUE', 'SUI', 'ALPHA', 'stSUI', 'USDC']);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        blueCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        blueCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.pure.bool(false),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        alphaCoin.coinType,
        stsuiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'stSUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.pure.bool(false),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        stsuiCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.pure.bool(false),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [
        this.poolLabel.assetA.type,
        this.poolLabel.assetB.type,
        stsuiCoin.coinType,
        suiCoin.coinType,
      ],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    if (this.poolLabel.poolName === 'BLUEFIN-LYF-SUIUSDT-USDC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_lyf_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [
          this.poolLabel.assetA.type,
          this.poolLabel.assetB.type,
          suiCoin.coinType,
          usdcCoin.coinType,
        ],
        arguments: [
          tx.object(VERSIONS.LYF_LP),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
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

    const receiptOption = this.context.blockchain.getOptionReceipt(
      tx,
      this.poolLabel.receipt.type,
      this.receiptObjects.length > 0 ? this.receiptObjects[0].id : undefined,
    );

    await this.collectAndSwapRewards(tx);

    const alphalendClient = new AlphalendClient('mainnet', this.context.blockchain.suiClient);
    await alphalendClient.updatePrices(tx, [
      this.poolLabel.assetA.type,
      this.poolLabel.assetB.type,
    ]);
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::user_deposit`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
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

    await this.collectAndSwapRewards(tx);

    const noneAlphaReceipt = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [
        '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
      ],
      arguments: [],
    });

    const [lyfReceiptOption, lyfBalanceA, lyfBalanceB] = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_lyf_pool::withdraw`,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.LYF_LP),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        tx.object(this.receiptObjects[0].id),
        noneAlphaReceipt,
        tx.object(POOLS.ALPHA_LEGACY),
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.pure.u128(xTokenAmount),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    if (this.receiptObjects[0].xTokenBalance !== xTokenAmount) {
      const [lyfReceipt] = tx.moveCall({
        target: `0x1::option::extract`,
        typeArguments: [this.poolLabel.receipt.type],
        arguments: [lyfReceiptOption],
      });
      tx.transferObjects([lyfReceipt], options.address);
    }
    tx.moveCall({
      target: `0x1::option::destroy_none`,
      typeArguments: [this.poolLabel.receipt.type],
      arguments: [lyfReceiptOption],
    });

    const lyfCoinA = tx.moveCall({
      target: `0x2::coin::from_balance`,
      typeArguments: [this.poolLabel.assetA.type],
      arguments: [lyfBalanceA],
    });
    const lyfCoinB = tx.moveCall({
      target: `0x2::coin::from_balance`,
      typeArguments: [this.poolLabel.assetB.type],
      arguments: [lyfBalanceB],
    });
    if (this.poolLabel.poolName === 'BLUEFIN-LYF-STSUI-SUI') {
      const [sui] = tx.moveCall({
        target: getStsuiConf().STSUI_LATEST_PACKAGE_ID + '::liquid_staking::redeem',
        arguments: [
          tx.object(getStsuiConf().LST_INFO),
          lyfCoinA,
          tx.object(getStsuiConf().SUI_SYSTEM_STATE_OBJECT_ID),
        ],
        typeArguments: [getStsuiConf().STSUI_COIN_TYPE],
      });
      tx.mergeCoins(sui, [lyfCoinB]);
      tx.transferObjects([sui], options.address);
    } else {
      tx.transferObjects([lyfCoinA, lyfCoinB], options.address);
    }
  }

  async claimRewards(tx: Transaction, alphaReceipt: TransactionResult) {
    this.receiptObjects.forEach((receipt) => {
      alphaReceipt = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_lyf_pool::get_user_rewards_all`,
        typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
        arguments: [
          tx.object(VERSIONS.LYF_LP),
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

/**
 * Lyf Pool object data structure
 */
export interface LyfPoolObject {
  accRewardsPerXtoken: StringMap[];
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
 * Lyf Parent Pool object data structure
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
  lastAccRewardPerXtoken: StringMap[];
  owner: string;
  name: string;
  pendingRewards: StringMap[];
  poolId: string;
  xTokenBalance: string;
}

/**
 * Lyf Pool Label configuration
 */
export interface LyfPoolLabel {
  poolId: string;
  packageId: string;
  versionObjectId: string;
  packageNumber: number;
  strategyType: 'Lyf';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  receipt: StringMap;
  zapAsset: StringMap;
  assetA: StringMap;
  assetB: StringMap;
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
