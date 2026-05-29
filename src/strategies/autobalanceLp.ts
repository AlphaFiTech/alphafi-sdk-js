/**
 * AutobalanceLp Strategy
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
  GLOBAL_CONFIGS,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  VERSIONS,
  STSUI,
  SUI_SYSTEM_STATE,
} from '../utils/constants.js';
import { toTwosComplementU32 } from '../utils/math.js';

/**
 * Fixed-point precision scaling factor used by the on-chain `acc_reward_per_xtoken`
 * accumulator (1e36). Pending rewards are computed as
 * `(currentAcc - lastAcc) * userXtokenBalance / ACC_REWARD_PER_XTOKEN_PRECISION`,
 * then divided by the reward coin's own decimal scale to produce a human amount.
 */
const ACC_REWARD_PER_XTOKEN_PRECISION = new Decimal(10).pow(36);

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
  private parentPoolObject: AutobalanceLpParentPoolObject;
  private receiptObjects: AutobalanceLpReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: AutobalanceLpPoolLabel,
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

  getPoolLabel(): AutobalanceLpPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Returns alpha mining data - AutobalanceLp pools do not support alpha mining
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
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
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
    }, 'Failed to parse AutobalanceLp investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): AutobalanceLpParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      const rewardInfos = (fields.reward_infos || []).map((info: any) => ({
        rewardCoinType: String(info.reward_coin_type || ''),
        totalReward: String(info.total_reward || '0'),
      }));

      return {
        coinA: this.getStringField(fields, 'coin_a'),
        coinB: this.getStringField(fields, 'coin_b'),
        currentSqrtPrice: this.getStringField(fields, 'current_sqrt_price'),
        currentTickIndex: this.getNestedField(fields, 'current_tick_index.bits'),
        id: this.getStringField(fields, 'id'),
        liquidity: this.getStringField(fields, 'liquidity'),
        rewardInfos,
      };
    }, 'Failed to parse AutobalanceLp parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): AutobalanceLpReceiptObject[] {
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
        }, `Failed to parse AutobalanceLp receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
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

    this.collectReward(tx);

    let target = `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v3`;
    if (this.poolLabel.assetA.name === 'SUI') {
      target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v4`;
    } else if (this.poolLabel.assetB.name === 'SUI') {
      target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v3`;
    }
    tx.moveCall({
      target,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.AUTOBALANCE_LP),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
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

    if (xTokenAmount === this.receiptObjects[0].xTokenBalance) {
      this.getUserRewards(tx);
    } else this.collectReward(tx);

    let target = `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v3`;
    if (this.poolLabel.assetA.name === 'SUI') {
      target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v4`;
    } else if (this.poolLabel.assetB.name === 'SUI') {
      target = `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v3`;
    }
    tx.moveCall({
      target,
      typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
      arguments: [
        tx.object(VERSIONS.AUTOBALANCE_LP),
        tx.object(this.receiptObjects[0].id),
        tx.object(this.poolLabel.poolId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(this.poolLabel.investorId),
        tx.pure.u128(xTokenAmount),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }

  async updatePool(tx: Transaction): Promise<Transaction> {
    // AutobalanceLp autocompound - collect rewards and update pool
    this.collectReward(tx);

    // Update pool
    const coinAType = this.poolLabel.assetA.type;
    const coinBType = this.poolLabel.assetB.type;
    const poolModule = this.getPoolModule();
    const updateFn = this.getUpdatePoolFn();

    tx.moveCall({
      target: `${this.poolLabel.packageId}::${poolModule}::${updateFn}`,
      typeArguments: [coinAType, coinBType],
      arguments: [
        tx.object(VERSIONS.AUTOBALANCE_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(this.poolLabel.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }
  async pendingRewardAmount(userAddress: string): Promise<UserAutoBalanceRewardAmounts> {
    const tx = new Transaction();
    this.collectReward(tx);

    const moduleName = this.getPoolModule();
    const updatePoolFn = this.getUpdatePoolFn();
    const typeArguments = [this.poolLabel.assetA.type, this.poolLabel.assetB.type];

    tx.moveCall({
      target: `${this.poolLabel.packageId}::${moduleName}::${updatePoolFn}`,
      typeArguments,
      arguments: [
        tx.object(VERSIONS.AUTOBALANCE_LP),
        tx.object(this.poolLabel.poolId),
        tx.object(this.poolLabel.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.object(this.poolLabel.parentPoolId),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    tx.moveCall({
      target: `${this.poolLabel.packageId}::${moduleName}::get_cur_acc_per_xtoken`,
      typeArguments,
      arguments: [tx.object(this.poolLabel.poolId)],
    });

    const res = await this.context.blockchain.simulateTransaction(tx, userAddress);

    const receipt = this.receiptObjects[0];
    if (!receipt) {
      return {};
    }

    const userXtokenBalance = receipt.xTokenBalance;
    const totalPendingRewardAmounts: UserAutoBalanceRewardAmounts = {};
    const userPendingReward: { [key in string]: string } = {};
    const curAcc: { [key in string]: string } = {};
    const lastAcc: { [key in string]: string } = {};

    for (let i = 0; i < receipt.pendingRewards.length; i++) {
      const rewardType = this.normalizeRewardType(receipt.pendingRewards[i].key);
      userPendingReward[rewardType] = receipt.pendingRewards[i].value;
    }

    // `get_cur_acc_per_xtoken` returns a `VecMap<TypeName, u256>` which GraphQL
    // encodes as `{ contents: [{ key, value }, ...] }`.
    const lastOutput = res?.outputs?.[res.outputs.length - 1];
    const rawJson = lastOutput?.returnValues?.[0]?.value?.json;
    const currAccForAllRewards: Array<{ key: string; value: string }> = isVecMapJson(rawJson)
      ? rawJson.contents
      : [];
    currAccForAllRewards.forEach((reward) => {
      curAcc[this.normalizeRewardType(reward.key)] = String(reward.value);
    });

    receipt.lastAccRewardPerXtoken.forEach((reward) => {
      lastAcc[this.normalizeRewardType(reward.key)] = reward.value;
    });

    for (const rewardType of Object.keys(curAcc)) {
      const cur = new Decimal(curAcc[rewardType]);
      const last = new Decimal(rewardType in lastAcc ? lastAcc[rewardType] : '0');
      const pending = new Decimal(
        rewardType in userPendingReward ? userPendingReward[rewardType] : '0',
      );
      const decimals = await this.context.getCoinDecimals(rewardType);

      const totalPending = cur
        .minus(last)
        .mul(userXtokenBalance)
        .div(ACC_REWARD_PER_XTOKEN_PRECISION)
        .plus(pending)
        .div(Math.pow(10, decimals))
        .toString();
      totalPendingRewardAmounts[rewardType] = totalPending;
    }

    return totalPendingRewardAmounts;
  }

  private collectReward(tx: Transaction) {
    if (this.poolLabel.assetA.name === 'SUI') {
      for (const reward of this.parentPoolObject.rewardInfos) {
        const rewardType = '0x' + reward.rewardCoinType;
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::collect_reward`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else if (this.poolLabel.assetB.name === 'SUI') {
      for (const reward of this.parentPoolObject.rewardInfos) {
        const rewardType = '0x' + reward.rewardCoinType;
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::collect_reward`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else {
      for (const reward of this.parentPoolObject.rewardInfos) {
        const rewardType = '0x' + reward.rewardCoinType;
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::collect_reward`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      }
    }
  }

  private getUserRewards(tx: Transaction): TransactionResult[] {
    this.collectReward(tx);
    const rewardsList = this.parentPoolObject.rewardInfos.map((ele) => {
      return '0x' + ele.rewardCoinType;
    });
    rewardsList.push(this.poolLabel.assetA.type);
    rewardsList.push(this.poolLabel.assetB.type);

    const rewards: TransactionResult[] = [];
    if (this.poolLabel.assetA.name === 'SUI') {
      for (const rewardType of [...new Set(rewardsList)]) {
        const balance = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_pool::get_user_rewards_v4`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(this.receiptObjects[0].id),
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        const coin = tx.moveCall({
          target: '0x2::coin::from_balance',
          typeArguments: [rewardType],
          arguments: [balance!],
        });
        rewards.push(coin);
      }
    } else if (this.poolLabel.assetB.name === 'SUI') {
      for (const rewardType of [...new Set(rewardsList)]) {
        const balance = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_pool::get_user_rewards_v3`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(this.receiptObjects[0].id),
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        const coin = tx.moveCall({
          target: '0x2::coin::from_balance',
          typeArguments: [rewardType],
          arguments: [balance!],
        });
        rewards.push(coin);
      }
    } else {
      for (const rewardType of [...new Set(rewardsList)]) {
        const balance = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_v3`,
          typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type, rewardType],
          arguments: [
            tx.object(this.receiptObjects[0].id),
            tx.object(VERSIONS.AUTOBALANCE_LP),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        const coin = tx.moveCall({
          target: '0x2::coin::from_balance',
          typeArguments: [rewardType],
          arguments: [balance!],
        });
        rewards.push(coin);
      }
    }
    return rewards;
  }

  /**
   * Build a manual rebalance transaction for this AutobalanceLp pool.
   *
   * Uses `rebalance_v2` which embeds autocompound internally — no separate
   * reward-collection call is required before invoking this method.
   */
  async rebalanceLp(
    tx: Transaction,
    rebalanceCap: string,
    lowerTick: string,
    upperTick: string,
    loops: number,
    context: StrategyContext,
    swap_using_bluefin?: boolean,
  ): Promise<void> {
    const poolName = this.poolLabel.poolName;
    const coinAType = this.poolLabel.assetA.type;
    const coinBType = this.poolLabel.assetB.type;
    const coinAName = this.poolLabel.assetA.name;
    const coinBName = this.poolLabel.assetB.name;

    const lo = toTwosComplementU32(Number(lowerTick));
    const hi = toTwosComplementU32(Number(upperTick));

    const [blueInfo, suiInfo, deepInfo] = await context.getCoinsBySymbols(['BLUE', 'SUI', 'DEEP']);
    const blueType = blueInfo.coinType;
    const suiType = suiInfo.coinType;
    const deepType = deepInfo.coinType;

    const blueSuiPool = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin');
    const deepSuiPool = await context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin');

    // All autobalance update_pool calls share this simplified argument structure
    // (no cetus_config, no external swap pools — just version, pool, investor, distributor, config, parent, clock)
    const addUpdatePool = (poolModule: string, updateFn: string) => {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::${poolModule}::${updateFn}`,
        typeArguments: [coinAType, coinBType],
        arguments: [
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(this.poolLabel.poolId),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    };

    if (
      poolName === 'BLUEFIN-AUTOBALANCE-SUI-USDC' ||
      poolName === 'BLUEFIN-AUTOBALANCE-SUI-USDC-175' ||
      poolName === 'BLUEFIN-AUTOBALANCE-SUI-LBTC'
    ) {
      // SUI is coinA — alphafi_bluefin_sui_first_investor::rebalance_v2<SUI, coinB, BLUE, SUI>
      // cetus_pool = CetusPool<coinB, SUI>
      const cetusCoinBSui = await context.getPoolIdBySymbolsAndProtocol(coinBName, 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_first_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusCoinBSui),
          tx.object(blueSuiPool),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_sui_first_pool', 'update_pool_v4');
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-BLUE-SUI') {
      // BLUE-SUI is special: reward coin is DEEP (not BLUE), so _bluefin_sui_pool = Pool<DEEP, SUI>
      // cetus_pool = CetusPool<BLUE, SUI>
      const cetusBlueSui = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, deepType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusBlueSui),
          tx.object(deepSuiPool),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_sui_second_pool', 'update_pool_v3');
    } else if (
      poolName === 'BLUEFIN-AUTOBALANCE-DEEP-SUI' ||
      poolName === 'BLUEFIN-AUTOBALANCE-DEEP-SUI-175' ||
      poolName === 'BLUEFIN-AUTOBALANCE-WAL-SUI'
    ) {
      // SUI is coinB — alphafi_bluefin_sui_second_investor::rebalance_v2<coinA, SUI, BLUE>
      // cetus_pool = CetusPool<coinA, SUI>, _bluefin_sui_pool = Pool<BLUE, SUI>
      const cetusCoinASui = await context.getPoolIdBySymbolsAndProtocol(coinAName, 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_sui_second_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusCoinASui),
          tx.object(blueSuiPool),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_sui_second_pool', 'update_pool_v3');
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-DEEP-BLUE') {
      // DEEP-BLUE: reward coin is BLUE (same as coinB)
      // cetus_pool = CetusPool<BLUE, DEEP>, _cetus_sui_pool = CetusPool<BLUE, SUI>
      const cetusBlueDeep = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'DEEP', 'cetus');
      const cetusBlueSui = await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusBlueDeep),
          tx.object(blueSuiPool),
          tx.object(cetusBlueSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_type_1_pool', 'update_pool_v3');
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC-ZERO-ZERO') {
      // Uses the dedicated autocompound BLUE-SUI pool (different fee tier) instead of the standard one
      // cetus_pool = CetusPool<USDC, SUIUSDT>, _cetus_sui_pool = CetusPool<USDC, SUI>
      const cetusUsdcSuiusdt = await context.getPoolIdBySymbolsAndProtocol(
        'USDC',
        'SUIUSDT',
        'cetus',
      );
      const cetusUsdcSui = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusUsdcSuiusdt),
          tx.object(await context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
          tx.object(cetusUsdcSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_type_1_pool', 'update_pool_v3');
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-XBTC-SUIBTC') {
      // XBTC-SUIBTC: cetus pool is SUIBTC-XBTC; bluefin/cetus SUI pools are not in use
      const cetusSuibtcXbtc = await context.getPoolIdBySymbolsAndProtocol(
        'SUIBTC',
        'XBTC',
        'cetus',
      );
      const cetusSuibtcSui = await context.getPoolIdBySymbolsAndProtocol('SUIBTC', 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusSuibtcXbtc),
          tx.object(blueSuiPool), // not in use by Move function
          tx.object(cetusSuibtcSui), // not in use by Move function
          tx.object(STSUI.LST_INFO), // not in use by Move function
          tx.object(SUI_SYSTEM_STATE), // not in use by Move function
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_type_1_pool', 'update_pool_v3');
    } else if (
      poolName === 'BLUEFIN-AUTOBALANCE-USDT-USDC' ||
      poolName === 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC' ||
      poolName === 'BLUEFIN-AUTOBALANCE-WAL-USDC'
    ) {
      // type-1 USDC-pair pools — alphafi_bluefin_type_1_investor::rebalance_v2<coinA, USDC, BLUE, SUI>
      // cetus_pool = CetusPool<USDC, coinA>, _cetus_sui_pool = CetusPool<USDC, SUI>
      const cetusUsdcCoinA = await context.getPoolIdBySymbolsAndProtocol(
        'USDC',
        coinAName,
        'cetus',
      );
      const cetusUsdcSui = await context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus');
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_bluefin_type_1_investor::rebalance_v2`,
        typeArguments: [coinAType, coinBType, blueType, suiType],
        arguments: [
          tx.object(this.poolLabel.investorId),
          tx.object(rebalanceCap),
          tx.object(VERSIONS.AUTOBALANCE_LP),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.pure.u32(lo),
          tx.pure.u32(hi),
          tx.pure.u32(loops),
          tx.object(this.poolLabel.parentPoolId),
          tx.object(cetusUsdcCoinA),
          tx.object(blueSuiPool),
          tx.object(cetusUsdcSui),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.pure.bool(swap_using_bluefin ?? false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      addUpdatePool('alphafi_bluefin_type_1_pool', 'update_pool_v3');
    }
  }
  private normalizeRewardType(rewardType: string): string {
    if (rewardType.startsWith('0x')) {
      return rewardType;
    }
    return `0x${rewardType}`;
  }

  /** Get the Move module name for this pool's autobalance-lp variant. */
  private getPoolModule(): string {
    if (this.poolLabel.assetA.name === 'SUI') return 'alphafi_bluefin_sui_first_pool';
    if (this.poolLabel.assetB.name === 'SUI') return 'alphafi_bluefin_sui_second_pool';
    return 'alphafi_bluefin_type_1_pool';
  }

  /** Get the versioned `update_pool` entry function for this pool variant. */
  private getUpdatePoolFn(): string {
    return this.poolLabel.assetA.name === 'SUI' ? 'update_pool_v4' : 'update_pool_v3';
  }
}

/** GraphQL JSON shape of a Move `VecMap<K, V>` return value. */
interface MoveVecMapJson {
  contents: Array<{ key: string; value: string }>;
}

/** Narrow a `SimulationReturnValue.value.json` blob to a `VecMap` shape. */
function isVecMapJson(json: unknown): json is MoveVecMapJson {
  return (
    typeof json === 'object' &&
    json !== null &&
    Array.isArray((json as { contents?: unknown }).contents)
  );
}

/**
 * AutobalanceLp Pool object data structure
 */
export interface AutobalanceLpPoolObject {
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
 * AutobalanceLp Parent Pool object data structure
 */
export interface AutobalanceLpParentPoolObject {
  coinA: string;
  coinB: string;
  currentSqrtPrice: string;
  currentTickIndex: number;
  id: string;
  liquidity: string;
  rewardInfos: {
    rewardCoinType: string;
    totalReward: string;
  }[];
}

/**
 * AutobalanceLp Receipt object data structure
 */
export interface AutobalanceLpReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: StringMap[];
  owner: string;
  name: string;
  pendingRewards: StringMap[];
  poolId: string;
  xTokenBalance: string;
}

export interface UserAutoBalanceRewardAmounts {
  [key: string]: string;
}

/**
 * AutobalanceLp Pool Label configuration
 */
export interface AutobalanceLpPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'AutobalanceLp';
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
