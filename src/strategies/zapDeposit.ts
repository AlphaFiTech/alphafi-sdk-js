/**
 * Zap Deposit Strategy
 *
 * Enables single-token deposits into dual-asset LP pools by automatically:
 * 1. Swapping a portion of input tokens to achieve the optimal ratio
 * 2. Depositing both assets into the liquidity pool
 */

import { Decimal } from 'decimal.js';
import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel, LpStrategy } from './lp.js';
import { CetusSwap } from 'src/models/swap.js';
import { BLUEFIN_STRATEGY_PACKAGE_ID, CETUS_STRATEGY_PACKAGE_ID } from 'src/utils/constants.js';
// import { PoolName } from '../core/types.js';

/**
 * Options for zap deposit operations
 */
export interface ZapDepositOptions {
  /** Amount of input coin to deposit */
  inputCoinAmount: bigint;
  /** Whether the input coin is token A (true) or token B (false) */
  isInputA: boolean;
  /** Pool name to deposit into */
  // poolName: PoolName;
  /** Slippage tolerance as decimal (e.g., 0.01 = 1%) */
  slippage: number;
  /** User's wallet address */
  address: string;
  /** Coin type strings for the pool's assets */
  coinTypeA: string;
  coinTypeB: string;
  /** Parent pool ID for routing swaps */
  parentPoolId: string;
  /** Current pool state */
  currentTickIndex: number;
  currentSqrtPrice: string;
  lowerTick: number;
  upperTick: number;
}

/**
 * Options for zap deposit quote (simulation)
 */
export interface ZapDepositQuoteOptions {
  /** Amount of input coin */
  inputCoinAmount: bigint;
  /** Whether the input coin is token A (true) or token B (false) */
  isInputA: boolean;
  /** Pool name */
  // poolName: PoolName;
  /** Slippage tolerance */
  slippage: number;
  /** Coin type strings */
  coinTypeA: string;
  coinTypeB: string;
  /** Parent pool ID */
  parentPoolId: string;
  /** Pool tick information */
  currentTickIndex: number;
  currentSqrtPrice: string;
  lowerTick: number;
  upperTick: number;
}

/**
 * Result of coin split in optimal ratio
 */
export interface CoinsInRatioResult {
  coinA: TransactionObjectArgument;
  coinB: TransactionObjectArgument;
  remCoinA: TransactionObjectArgument;
  remCoinB: TransactionObjectArgument;
  coinAVal: TransactionObjectArgument;
  coinBVal: TransactionObjectArgument;
  remCoinAVal: TransactionObjectArgument;
  remCoinBVal: TransactionObjectArgument;
}

/**
 * Swap parameters for zap operations
 */
export interface ZapSwapParams {
  tx: Transaction;
  address: string;
  // poolName: PoolName;
  slippage: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  coinIn: TransactionObjectArgument;
  parentPoolId: string;
}

/**
 * Zap Deposit Strategy
 *
 * Provides utility functions for single-token deposits into dual-asset LP pools
 */
/**
 * ZapDepositStrategy - Utility class for single-token deposits into LP pools
 *
 * This is not a full strategy implementation but a helper that works with
 * existing LP strategies to enable single-token entry into dual-asset pools.
 */
export class ZapDepositStrategy {
  private lpStrategy: LpStrategy;
  private context: StrategyContext;
  private swapContext: CetusSwap;

  constructor(lpStrategy: LpStrategy, context: StrategyContext, swapContext: CetusSwap) {
    this.lpStrategy = lpStrategy;
    this.context = context;
    this.swapContext = swapContext;
  }

  /**
   * Get the underlying LP strategy's pool label
   */
  getPoolLabel(): LpPoolLabel {
    return this.lpStrategy.getPoolLabel();
  }

  /**
   * Get the underlying LP strategy's pool object
   */
  private getPoolObject(): any {
    return (this.lpStrategy as any).poolObject;
  }

  /**
   * Get the underlying LP strategy's investor object
   */
  private getInvestorObject(): any {
    return (this.lpStrategy as any).investorObject;
  }

  /**
   * Get the underlying LP strategy's parent pool object
   */
  private getParentPoolObject(): any {
    return (this.lpStrategy as any).parentPoolObject;
  }

  /**
   * Execute a swap as part of zap deposit
   *
   * @param params - Swap parameters
   * @returns TransactionObjectArgument representing the output coin
   */
  async zapSwap(params: ZapSwapParams): Promise<TransactionObjectArgument | undefined> {
    console.log('[ZapDeposit] Executing zap swap', {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
    });

    // Get swap quote from 7k Gateway
    const swapGateway = this.swapContext;
    const quoteResponse = await swapGateway.getCetusSwapQuote(
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      true,
    );

    if (!quoteResponse) {
      console.error('[ZapDeposit] Failed to get swap quote');
      return undefined;
    }

    console.log('[ZapDeposit] Quote received:', {
      amountOut: quoteResponse.amountOut,
    });

    // Execute the swap transaction
    const swapResult = await swapGateway.cetusSwapTokensTxb(quoteResponse, params.slippage);

    return swapResult as TransactionObjectArgument;
  }

  /**
   * Split coins into optimal ratio for LP deposit
   * Uses the pool's current state to determine the correct proportions
   *
   * @param params - Parameters including coins and pool state
   * @returns Object containing split coins and their values
   */
  async getCoinsInRatio(params: {
    tx: Transaction;
    coinA: TransactionObjectArgument;
    coinB: TransactionObjectArgument;
    poolTokenA: string;
    poolTokenB: string;
    lowerTick: number;
    upperTick: number;
    currentTickIndex: number;
    currentSqrtPrice: string;
    swapperPackageId: string;
  }): Promise<CoinsInRatioResult> {
    const [coinA, coinB, remCoinA, remCoinB, coinAVal, coinBVal, remCoinAVal, remCoinBVal] =
      params.tx.moveCall({
        target: `${params.swapperPackageId}::alphafi_swapper_utils::get_total_balance_in_ratio_with_limit`,
        typeArguments: [params.poolTokenA, params.poolTokenB],
        arguments: [
          params.coinA,
          params.coinB,
          params.tx.pure.u32(params.lowerTick),
          params.tx.pure.u32(params.upperTick),
          params.tx.pure.u32(params.currentTickIndex),
          params.tx.pure.u128(params.currentSqrtPrice),
        ],
      });

    return {
      coinA,
      coinB,
      remCoinA,
      remCoinB,
      coinAVal,
      coinBVal,
      remCoinAVal,
      remCoinBVal,
    };
  }

  /**
   * Calculate the amounts of token A and B for a given liquidity amount
   *
   * @param poolName - Pool identifier
   * @param isInputA - Whether calculating for input A
   * @param liquidity - Liquidity amount as string
   * @returns Array of [amountA, amountB] as strings
   */
  async getAmounts(
    // poolName: PoolName,
    isInputA: boolean,
    liquidity: string,
  ): Promise<[string, string]> {
    // This would call into the pool's logic to calculate amounts
    // Implementation depends on the specific pool type (Cetus, Bluefin, etc.)
    // For now, returning a placeholder
    this.lpStrategy.getOtherAmount(liquidity, isInputA);
    return this.lpStrategy.getOtherAmount(liquidity, isInputA);
  }

  /**
   * Get optimal swap amount for single-token deposit
   * Calculates how much of the input token should be swapped to achieve
   * the correct ratio for LP deposit
   *
   * @param options - Quote calculation options
   * @returns Array of [amountToDeposit, amountToSwap] for both tokens
   */
  async getZapDepositQuote(options: ZapDepositQuoteOptions): Promise<[string, string]> {
    console.log('[ZapDeposit] Calculating zap deposit quote', options);

    const { inputCoinAmount, isInputA, coinTypeA, coinTypeB, parentPoolId, slippage } = options;

    // Get initial ratio from pool
    let [amountA, amountB] = (await this.getAmounts(isInputA, '1000000001')).map(
      (a) => new Decimal(a),
    );

    // Convert to single coin perspective using swap quote
    const swapGateway = this.swapContext;

    if (isInputA) {
      const quoteResponse = await swapGateway.getCetusSwapQuote(
        coinTypeA,
        coinTypeB,
        amountA.toString(),
        true,
      );
      if (quoteResponse) {
        amountA = new Decimal(quoteResponse.amountOut.toString());
      }
    } else {
      const quoteResponse = await swapGateway.getCetusSwapQuote(
        coinTypeB,
        coinTypeA,
        amountB.toString(),
        true,
      );
      if (quoteResponse) {
        amountB = new Decimal(quoteResponse.amountOut.toString());
      }
    }

    // Calculate total in terms of input coin
    const totalAmount = isInputA ? amountA.add(amountB) : amountB.add(amountA);
    const inputAmount = new Decimal(inputCoinAmount.toString());

    // Calculate how much to swap
    let amountToSwap: Decimal;
    if (isInputA) {
      amountToSwap = inputAmount.mul(amountB).div(totalAmount);
    } else {
      amountToSwap = inputAmount.mul(amountA).div(totalAmount);
    }

    // Apply slippage buffer
    amountToSwap = amountToSwap.mul(new Decimal(1).add(slippage));

    const amountToDeposit = inputAmount.sub(amountToSwap);

    console.log('[ZapDeposit] Quote result:', {
      amountToDeposit: amountToDeposit.toString(),
      amountToSwap: amountToSwap.toString(),
    });

    return [amountToDeposit.floor().toString(), amountToSwap.floor().toString()];
  }

  /**
   * Execute a zap deposit transaction
   * Handles the complete flow of swapping and depositing into an LP pool
   *
   * @param tx - Transaction builder
   * @param options - Deposit options
   * @returns Promise that resolves when transaction is built
   */
  async executeZapDeposit(tx: Transaction, options: ZapDepositOptions): Promise<void> {
    console.log('[ZapDeposit] Executing zap deposit', options);

    const {
      inputCoinAmount,
      isInputA,
      slippage,
      address,
      coinTypeA,
      coinTypeB,
      parentPoolId,
      currentTickIndex,
      currentSqrtPrice,
      lowerTick,
      upperTick,
    } = options;

    // Get the input coin from user's wallet
    const coinObject = await this.context.blockchain.getCoinObject(
      tx,
      isInputA ? coinTypeA : coinTypeB,
      address,
    );

    // Calculate optimal amounts
    const [amountToDeposit, amountToSwap] = await this.getZapDepositQuote({
      inputCoinAmount,
      isInputA,
      slippage,
      coinTypeA,
      coinTypeB,
      parentPoolId,
      currentTickIndex,
      currentSqrtPrice,
      lowerTick,
      upperTick,
    });

    // Split input coin into deposit and swap portions
    const [depositCoin] = tx.splitCoins(coinObject, [amountToDeposit]);
    const [swapCoin] = tx.splitCoins(coinObject, [amountToSwap]);

    // Execute swap to get the other token
    const swappedCoin = await this.zapSwap({
      tx,
      address,
      slippage,
      tokenIn: isInputA ? coinTypeA : coinTypeB,
      tokenOut: isInputA ? coinTypeB : coinTypeA,
      amountIn: amountToSwap,
      coinIn: swapCoin,
      parentPoolId,
    });

    if (!swappedCoin) {
      throw new Error('Swap failed during zap deposit');
    }

    // Now we have both tokens in optimal ratio
    const [coinAFinal, coinBFinal] = isInputA
      ? [depositCoin, swappedCoin]
      : [swappedCoin, depositCoin];

    // Split coins into exact ratio for LP deposit
    const swapperPackageId = '0x50e09e94f9864e0cc85f95868fa68585482977d1fb714664cc895cd77c3de2aa'; //this.context.getConstants().ALPHAFI_SWAPPER_PACKAGE_ID;
    const coinsInRatio = await this.getCoinsInRatio({
      tx,
      coinA: coinAFinal,
      coinB: coinBFinal,
      poolTokenA: coinTypeA,
      poolTokenB: coinTypeB,
      lowerTick,
      upperTick,
      currentTickIndex,
      currentSqrtPrice,
      swapperPackageId,
    });

    // Execute the actual LP deposit using the strategy's deposit method
    await this.lpStrategy.deposit(tx, {
      poolId: parentPoolId,
      address: address,
      amount: BigInt(amountToDeposit),
      isAmountA: isInputA,
    });

    // Transfer remaining coins back to user
    tx.transferObjects([coinsInRatio.remCoinA, coinsInRatio.remCoinB], address);

    console.log('[ZapDeposit] Zap deposit transaction built successfully');
  }

  async fetchStrategyPackageId(): Promise<string> {
    const poolLabel = this.getPoolLabel();
    if (poolLabel.parentProtocol === 'Cetus') {
      return CETUS_STRATEGY_PACKAGE_ID;
    } else if (poolLabel.parentProtocol === 'Bluefin') {
      return BLUEFIN_STRATEGY_PACKAGE_ID;
    }
    return '';
  }

  async getCurrentTickIndex(tx: Transaction): Promise<TransactionResult> {
    const strategyPackageId = await this.fetchStrategyPackageId();
    const poolLabel = this.getPoolLabel();
    return tx.moveCall({
      target: `${strategyPackageId}::pool::current_tick_index`,
      typeArguments: [poolLabel.assetA.type, poolLabel.assetB.type],
      arguments: [tx.object(poolLabel.parentPoolId)],
    });
  }

  async getCurrentSqrtPrice(tx: Transaction): Promise<TransactionResult> {
    const strategyPackageId = await this.fetchStrategyPackageId();
    const poolLabel = this.getPoolLabel();
    return tx.moveCall({
      target: `${strategyPackageId}::pool::current_sqrt_price`,
      typeArguments: [poolLabel.assetA.type, poolLabel.assetB.type],
      arguments: [tx.object(poolLabel.parentPoolId)],
    });
  }

  async getTicks(): Promise<{ lowerTick: number; upperTick: number }> {
    const investorObject = this.getInvestorObject();
    return {
      lowerTick: investorObject.lowerTick,
      upperTick: investorObject.upperTick,
    };
  }

  async zapdepositTx(
    txb: Transaction,
    currentTickIndex: number,
    currentSqrtPrice: bigint,
    lowerTick: number,
    upperTick: number,
    coinAObject: TransactionArgument,
    coinBObject: TransactionArgument,
  ) {
    /*
public fun split_coins_in_ratio<T, S>(
        current_tick_index_u32: u32,
        current_sqrt_price: u128,
        mut coin_a: Coin<T>,
        mut coin_b: Coin<S>,
        lower_tick_u32: u32,
        upper_tick_u32: u32,
        ctx: &mut TxContext
    ): (Coin<T>, Coin<S>, Coin<T>, Coin<S>){
    */

    /*
    current tick index = bluefin package : cetus package
    tx.moveCall({
      target: `${alphafiSwapperPackageId}::pool::current_tick_index`,
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

    current_sqrt_price

    lower tick n upper tick from bluefin/cetus investor




    */

    // const strategyPackageId = await this.fetchStategyPackageId();
    // const currentTickIndex = await this.getCurrentTickIndex(tx);
    // const currentSqrtPrice = await this.getCurrentSqrtPrice(tx);
    // const lowerTick = await this.getLowerTick(tx);
    // const upperTick = await this.getUpperTick(tx);
    const tx = txb ? txb : new Transaction();
    // tx.moveCall({
    //   target: `${alphafiSwapperPackageId}::alphafi_swapper_utils::split_coins_in_ratio`,
    //   typeArguments: [this.poolLabel.assetA.type, this.poolLabel.assetB.type],
    //   arguments: [
    //     tx.object(VERSIONS.AUTOBALANCE_LP),
    //     receiptOption,
    //     tx.object(this.poolLabel.poolId),
    //     depositCoinA,
    //     depositCoinB,
    //     tx.object(DISTRIBUTOR_OBJECT_ID),
    //     tx.object(this.poolLabel.investorId),
    //     tx.object(GLOBAL_CONFIGS.BLUEFIN),
    //     tx.object(this.poolLabel.parentPoolId),
    //     tx.object(CLOCK_PACKAGE_ID),
    //   ],
    // });
  }
}

/**
 * Pool label type for Zap Deposit operations
 * Note: Zap deposits work with existing LP pools, so they don't have their own pool labels
 */
export type ZapDepositPoolLabel = never;
