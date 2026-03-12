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
  TransactionObjectArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel, LpStrategy } from './lp.js';
import { CetusSwap } from '../models/swap.js';
import {
  ALPHAFI_SWAPPER_PACKAGE_ID,
  BLUEFIN_STRATEGY_PACKAGE_ID,
  Cetus_math_package_id,
  CETUS_STRATEGY_PACKAGE_ID,
} from '../utils/constants.js';
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
}

/**
 * Options for zap deposit quote (simulation)
 */
//inputCoinAmount, isInputA, coinTypeA, coinTypeB, slippage
export interface ZapDepositQuoteOptions {
  /** Amount of input coin */
  inputCoinAmount: bigint;
  /** Whether the input coin is token A (true) or token B (false) */
  isInputA: boolean;
  /** Pool name */
  // poolName: PoolName;
  /** Slippage tolerance */
  slippage: number;
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
   * Get the underlying strategy's pool label
   */
  getPoolLabel(): LpPoolLabel | any {
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
    // Get swap quote from Cetus Swap Gateway
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

    // Execute the swap transaction
    const swapResult = await swapGateway.cetusSwapTokensTxb(
      quoteResponse,
      params.slippage,
      params.coinIn,
      params.address,
      params.tx,
    );

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
  async getAmounts(isInputA: boolean, liquidity: string): Promise<[string, string]> {
    // This would call into the pool's logic to calculate amounts
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
    const { inputCoinAmount, isInputA } = options;
    const poolDetails = this.getPoolLabel();
    const coinTypeA = poolDetails.assetA.type;
    const coinTypeB = poolDetails.assetB.type;
    // Get current tick index from LP strategy
    const currentTickIndex = this.lpStrategy.getCurrentTickIndex() >> 0;
    // const current_sqrt_price = await this.getCurrentSqrtPrice(tx);
    const lowerTick = this.getInvestorObject().lowerTick >> 0;
    const upperTick = this.getInvestorObject().upperTick >> 0;
    // Handle edge cases where current tick is outside position range

    if (currentTickIndex >= upperTick) {
      // Price is too high - only need token B
      if (isInputA) {
        return [inputCoinAmount.toString(), '0'];
      } else {
        // Swap B to A
        const quoteResponse = await this.swapContext.getCetusSwapQuote(
          coinTypeB,
          coinTypeA,
          inputCoinAmount.toString(),
          true,
        );
        if (!quoteResponse) {
          throw new Error('Error fetching quote for zap deposit');
        }
        return [quoteResponse.amountOut.toString(), '0'];
      }
    } else if (currentTickIndex < lowerTick) {
      // Price is too low - only need token A
      if (isInputA) {
        // Need to swap all input A to B
        const quoteResponse = await this.swapContext.getCetusSwapQuote(
          coinTypeA,
          coinTypeB,
          inputCoinAmount.toString(),
          true,
        );
        if (!quoteResponse) {
          throw new Error('Error fetching quote for zap deposit');
        }
        return ['0', quoteResponse.amountOut.toString()];
      } else {
        // Already have B, no swap needed
        return ['0', inputCoinAmount.toString()];
      }
    }

    // Normal case: tick is within range, need both tokens
    // Get initial ratio from pool using the actual input amount
    let [amountA, amountB] = (await this.getAmounts(isInputA, inputCoinAmount.toString())).map(
      (a) => new Decimal(a),
    );
    // Convert one side to the other to get everything in terms of the input coin
    // This tells us the ratio of how to split our input
    if (isInputA) {
      // Convert amountA to equivalent B to get total in terms of B
      const quoteResponse = await this.swapContext.getCetusSwapQuote(
        coinTypeA,
        coinTypeB,
        amountA.toString(),
        true,
      );
      if (!quoteResponse) {
        throw new Error('Error fetching quote for zap deposit');
      }
      amountA = new Decimal(quoteResponse.amountOut.toString());
    } else {
      // Convert amountB to equivalent A to get total in terms of A
      const quoteResponse = await this.swapContext.getCetusSwapQuote(
        coinTypeB,
        coinTypeA,
        amountB.toString(),
        true,
      );
      if (!quoteResponse) {
        throw new Error('Error fetching quote for zap deposit');
      }
      amountB = new Decimal(quoteResponse.amountOut.toString());
    }

    // Calculate total amount in terms of the OTHER token (after conversion)
    const totalAmount = amountA.add(amountB);
    const inputAmount = new Decimal(inputCoinAmount.toString());

    // Calculate how much input to swap to get the other token
    let inputCoinToSwap: Decimal;
    if (isInputA) {
      // We have A, need to swap some A to get B
      // Proportion: amountB / (amountA_converted_to_B + amountB)
      inputCoinToSwap = inputAmount.mul(amountB).div(totalAmount).floor();
    } else {
      // We have B, need to swap some B to get A
      // Proportion: amountA / (amountB_converted_to_A + amountA)
      inputCoinToSwap = inputAmount.mul(amountA).div(totalAmount).floor();
    }
    // Get quote for the swap to find out how much of the other token we'll get
    const swapQuote = await this.swapContext.getCetusSwapQuote(
      isInputA ? coinTypeA : coinTypeB,
      isInputA ? coinTypeB : coinTypeA,
      inputCoinToSwap.toString(),
      true,
    );

    if (!swapQuote) {
      throw new Error('Error fetching quote for zap deposit swap');
    }
    // Calculate the final amounts after swap
    // These are the amounts that will be used in getAmounts to get the final ratio
    const swappedAmount = new Decimal(swapQuote.amountOut.toString());

    // Get the actual deposit amounts based on the swapped amount
    let [finalAmountA, finalAmountB] = (
      await this.getAmounts(!isInputA, swappedAmount.toString())
    ).map((a) => new Decimal(a));

    // Important: The amounts from getAmounts are ideal ratios, but we need to ensure
    // they don't exceed what we actually have available after the swap
    const remainingInput = inputAmount.sub(inputCoinToSwap);

    if (isInputA) {
      // We have: remainingInput of A, and swappedAmount of B
      // Ensure finalAmountA doesn't exceed what we have
      if (finalAmountA.gt(remainingInput)) {
        // Scale down both amounts proportionally
        const scaleFactor = remainingInput.div(finalAmountA);
        finalAmountA = remainingInput;
        finalAmountB = finalAmountB.mul(scaleFactor);
      }
      // Ensure finalAmountB doesn't exceed what we swapped to
      if (finalAmountB.gt(swappedAmount)) {
        const scaleFactor = swappedAmount.div(finalAmountB);
        finalAmountB = swappedAmount;
        finalAmountA = finalAmountA.mul(scaleFactor);
      }
    } else {
      // We have: swappedAmount of A, and remainingInput of B
      // Ensure finalAmountA doesn't exceed what we swapped to
      if (finalAmountA.gt(swappedAmount)) {
        const scaleFactor = swappedAmount.div(finalAmountA);
        finalAmountA = swappedAmount;
        finalAmountB = finalAmountB.mul(scaleFactor);
      }
      // Ensure finalAmountB doesn't exceed what we have
      if (finalAmountB.gt(remainingInput)) {
        const scaleFactor = remainingInput.div(finalAmountB);
        finalAmountB = remainingInput;
        finalAmountA = finalAmountA.mul(scaleFactor);
      }
    }
    // Return [amountA, amountB] - these represent the amounts after optimal split
    // Note: These are estimates; split_coins_in_ratio on-chain will do final adjustment
    return [finalAmountA.floor().toString(), finalAmountB.floor().toString()];
  }

  /**
   * Execute a zap deposit transaction
   * Handles the complete flow of swapping and depositing into an LP pool
   *
   * @param tx - Transaction builder
   * @param options - Deposit options
   * @returns Promise that resolves when transaction is built
   */
  async zapDepositTxb(tx: Transaction, options: ZapDepositOptions): Promise<Transaction> {
    const { inputCoinAmount, isInputA, slippage, address } = options;
    const poolDetails = this.getPoolLabel();
    const coinTypeA = poolDetails.assetA.type;
    const coinTypeB = poolDetails.assetB.type;
    const parentPoolId = this.getPoolLabel().parentPoolId;
    // Get the input coin from user's wallet
    const coinObject = await this.context.blockchain.getCoinObject(
      tx,
      isInputA ? coinTypeA : coinTypeB,
      address,
    );

    // Calculate optimal amounts
    const [quoteAmountA, quoteAmountB] = await this.getZapDepositQuote({
      inputCoinAmount,
      isInputA,
      slippage,
    });
    // Split input coin into deposit and swap portions
    const [depositCoin] = isInputA
      ? tx.splitCoins(coinObject, [quoteAmountA])
      : tx.splitCoins(coinObject, [quoteAmountB]);

    const amountToSwap = isInputA
      ? BigInt(inputCoinAmount) - BigInt(quoteAmountA)
      : BigInt(inputCoinAmount) - BigInt(quoteAmountB);

    let swappedCoin: TransactionObjectArgument | undefined;
    // Execute swap to get the other token
    if (parseFloat(amountToSwap.toString()) > 0) {
      const [swapCoin] = tx.splitCoins(coinObject, [amountToSwap.toString()]);

      swappedCoin = await this.zapSwap({
        tx,
        address,
        slippage,
        tokenIn: isInputA ? coinTypeA : coinTypeB,
        tokenOut: isInputA ? coinTypeB : coinTypeA,
        amountIn: amountToSwap.toString(),
        coinIn: swapCoin,
        parentPoolId,
      });
    } else {
      if (
        (isInputA && coinTypeB === '0x2::sui::SUI') ||
        (!isInputA && coinTypeA === '0x2::sui::SUI')
      ) {
        swappedCoin = tx.splitCoins(tx.gas, [0]);
      } else {
        const coinObject = await this.context.blockchain.getCoinObject(
          tx,
          isInputA ? coinTypeB : coinTypeA,
          address,
        );
        swappedCoin = tx.splitCoins(coinObject, [0]);
      }
    }

    if (!swappedCoin) {
      throw new Error('Swap failed during zap deposit');
    }

    // Now we have both tokens in optimal ratio
    const [coinAFinal, coinBFinal] = isInputA
      ? [depositCoin, swappedCoin]
      : [swappedCoin, depositCoin];

    const actualDepositCoins = await this.fetchActualDepositCoins(coinAFinal, coinBFinal, tx);
    // Execute the actual LP deposit using the strategy's deposit method
    await this.lpStrategy.deposit(
      tx,
      {
        poolId: parentPoolId,
        address: address,
        amount: isInputA ? BigInt(quoteAmountA) : BigInt(quoteAmountB),
        isAmountA: isInputA,
      },
      [actualDepositCoins[0], actualDepositCoins[1]],
    );

    // Transfer remaining coins back to user
    tx.transferObjects([actualDepositCoins[2], actualDepositCoins[3], coinObject], address);

    return tx;
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

  /**
   * Get current tick index from the pool by executing a dev inspect transaction
   * @returns The actual tick index value from on-chain
   */
  async getCurrentTickIndex(tx?: Transaction): Promise<TransactionResult> {
    const txb = tx ? tx : new Transaction();
    const strategyPackageId = await this.fetchStrategyPackageId();
    const poolLabel = this.getPoolLabel();

    const currentTickIndexI32 = txb.moveCall({
      target: `${strategyPackageId}::pool::current_tick_index`,
      typeArguments: [poolLabel.assetA.type, poolLabel.assetB.type],
      arguments: [txb.object(poolLabel.parentPoolId)],
    });

    return txb.moveCall({
      target: `${Cetus_math_package_id}::i32::as_u32`,
      arguments: [currentTickIndexI32],
    });
  }

  /**
   * Get current sqrt price from the pool by executing a dev inspect transaction
   * @returns The actual sqrt price value from on-chain
   */
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

  async fetchActualDepositCoins(
    coinAFinal: TransactionObjectArgument,
    coinBFinal: TransactionObjectArgument,
    tx: Transaction,
  ): Promise<TransactionResult> {
    const current_tick_index = await this.getCurrentTickIndex(tx);
    const current_sqrt_price = await this.getCurrentSqrtPrice(tx);
    const lower_tick = this.getInvestorObject().lowerTick;
    const upper_tick = this.getInvestorObject().upperTick;

    // Get coin types - both LP strategies have this
    const coinTypes = this.lpStrategy.fetchCoinTypes();

    return tx.moveCall({
      target: `${ALPHAFI_SWAPPER_PACKAGE_ID}::alphafi_swapper_utils::split_coins_in_ratio`,
      typeArguments: [coinTypes[0], coinTypes[1]],
      arguments: [
        current_tick_index,
        current_sqrt_price,
        coinAFinal,
        coinBFinal,
        tx.pure.u32(lower_tick),
        tx.pure.u32(upper_tick),
      ],
    });
  }
}

/**
 * Pool label type for Zap Deposit operations
 * Note: Zap deposits work with existing LP pools, so they don't have their own pool labels
 */
export type ZapDepositPoolLabel = never;
