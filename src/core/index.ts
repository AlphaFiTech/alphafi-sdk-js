/**
 * AlphaFi SDK - A comprehensive DeFi toolkit for the Sui blockchain.
 * Provides easy access to lending, LP farming, leveraged yield farming, and more.
 *
 * All data is lazily loaded on-demand with automatic caching.
 */
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';
import {
  PoolName,
  zapDepositTxb,
  zapDepositQuoteTxb,
  claimRewardTxb,
  initiateWithdrawAlpha,
  claimWithdrawAlphaTx,
  claimAirdropTx,
} from '@alphafi/alphafi-sdk-upstream';
import { StrategyContext } from '../models/strategyContext.js';
import { CetusSwap } from '../models/swap.js';
import type { PoolData, UserPortfolioData } from '../models/types.js';
import {
  AlphaFiSDKConfig,
  CetusSwapOptions,
  CetusSwapQuoteOptions,
  ClaimAirdropOptions,
  ClaimOptions,
  ClaimWithdrawAlphaOptions,
  DepositOptions,
  EstimateLpAmountsOptions,
  WithdrawOptions,
  ZapDepositOptions,
  ZapDepositQuoteOptions,
} from './types.js';
import { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';
import { StrategyType } from '../strategies/strategy.js';

// Re-export types for external use
export type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';

/**
 * Main AlphaFi SDK class - your gateway to DeFi on Sui.
 * Supports multiple DeFi strategies with lazy-loaded data.
 *
 * @example
 * ```typescript
 * const sdk = new AlphaFiSDK({ suiClient, network: 'mainnet' });
 * const pools = await sdk.getPoolsData();
 * const portfolio = await sdk.getUserPortfolio(userAddress);
 * ```
 */
export class AlphaFiSDK {
  private config: AlphaFiSDKConfig;
  private strategyContext: StrategyContext;
  private protocol: Protocol;
  private portfolio: Portfolio;

  constructor(config: AlphaFiSDKConfig) {
    this.config = config;
    this.strategyContext = new StrategyContext(config.network, config.suiClient);
    this.protocol = new Protocol(this.strategyContext);
    this.portfolio = new Portfolio(this.protocol, this.strategyContext);
  }

  /**
   * Get comprehensive data for all available DeFi pools.
   *
   * @param strategiesType - Optional array to filter by strategy types (e.g., ['Lending', 'Lp'])
   * @returns Map of pool ID to pool data (APY, TVL, supported assets, etc.)
   */
  async getPoolsData(strategiesType?: StrategyType[]): Promise<Map<string, PoolData>> {
    return this.protocol.getPoolsData(strategiesType);
  }

  /**
   * Get complete portfolio summary for a user address.
   *
   * @param address - User's wallet address
   * @param strategiesType - Optional array to filter by strategy types
   * @returns Portfolio data including net worth, aggregated APY, alpha rewards, and individual pool balances
   */
  async getUserPortfolio(
    address: string,
    strategiesType?: StrategyType[],
  ): Promise<UserPortfolioData> {
    return this.portfolio.getUserPortfolio(address, strategiesType);
  }

  /**
   * Deposit assets into a DeFi pool to start earning yield.
   *
   * Supports all pool types:
   * - Single-asset pools (Lending, Looping, Alpha Vaults): Deposit one token
   * - LP pools (Lp, AutobalanceLp, FungibleLp): Deposit tokens to provide liquidity
   * - LYF pools: Deposit SUI for leveraged yield farming
   *
   * @param options - Deposit configuration including pool ID, amount, and user address
   * @returns Transaction object ready for signing and execution
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    const poolLabel = await this.strategyContext.getPoolLabel(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    const tx = new Transaction();
    if (poolLabel.strategyType === 'Lyf') {
      const lyfTx = await zapDepositTxb(
        options.amount,
        false,
        poolLabel.poolName as PoolName,
        0.005,
        options.address,
      );
      if (!lyfTx) {
        throw new Error(`Failed to create LYF SUI deposit transaction`);
      }
      return lyfTx;
    } else {
      const strategy = await this.portfolio.getPoolStrategy(options.address, options.poolId);
      await strategy.deposit(tx, options);
      return tx;
    }
  }

  /**
   * Calculate required token amounts for balanced LP deposits.
   *
   * Given an amount of one token, calculates how much of the other token
   * is needed to maintain the pool's balance ratio.
   *
   * @param options - Pool ID, input amount, and which token the amount represents
   * @returns Tuple of [tokenA amount, tokenB amount] required for deposit
   */
  async estimateLpAmounts(options: EstimateLpAmountsOptions): Promise<[string, string]> {
    const strategy = await this.protocol.getSinglePoolStrategy(options.poolId);
    return strategy.getOtherAmount(options.amount, options.isAmountA);
  }

  /**
   * Withdraw assets from a DeFi pool.
   *
   * Supports partial or full withdrawals from any pool type.
   * For leveraged positions (Looping, LYF), automatically handles
   * deleveraging and debt repayment.
   *
   * @param options - Withdrawal configuration including amount or withdrawMax flag
   * @returns Transaction object ready for signing and execution
   */
  async withdraw(options: WithdrawOptions): Promise<Transaction> {
    const tx = new Transaction();
    const strategy = await this.portfolio.getPoolStrategy(options.address, options.poolId);
    await strategy.withdraw(tx, options);
    return tx;
  }

  /**
   * Initiate ALPHA token withdrawal (creates withdrawal ticket).
   * ALPHA withdrawals require a 2-step process due to unlock periods.
   *
   * @param options - Withdrawal configuration (amount and user address)
   * @returns Transaction to create withdrawal ticket
   */
  async initiateWithdrawAlpha(options: WithdrawOptions): Promise<Transaction> {
    return await initiateWithdrawAlpha(
      options.amount.toString(),
      options.withdrawMax,
      options.address,
      this.config.suiClient,
    );
  }

  /**
   * Complete ALPHA token withdrawal using previously created ticket.
   *
   * @param options - Withdrawal claim configuration with ticket ID and user address
   * @returns Transaction to claim the withdrawn ALPHA tokens
   */
  async claimWithdrawAlpha(options: ClaimWithdrawAlphaOptions): Promise<Transaction> {
    return await claimWithdrawAlphaTx(options.ticketId, options.address, this.config.suiClient);
  }

  /**
   * Claim available airdrop tokens.
   *
   * @param options - Airdrop claim configuration with user address and transfer preference
   * @returns Transaction to claim airdrop rewards
   */
  async claimAirdrop(options: ClaimAirdropOptions): Promise<Transaction> {
    return await claimAirdropTx(options.address, this.config.suiClient, options.transferToWallet);
  }

  /**
   * Get quote for zap deposit operation.
   *
   * Estimates how much LP tokens you'll receive when depositing a single token
   * that gets automatically swapped and balanced for LP provision.
   *
   * @param options - Input token amount, pool ID, and slippage tolerance
   * @returns Tuple of [expected tokenA out, expected tokenB out] or undefined if quote fails
   */
  async zapDepositQuote(options: ZapDepositQuoteOptions): Promise<[string, string] | undefined> {
    const poolLabel = await this.strategyContext.getPoolLabel(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    return await zapDepositQuoteTxb(
      options.inputCoinAmount,
      options.isInputA,
      poolLabel.poolName as PoolName,
    );
  }

  /**
   * Execute zap deposit: convert single token to balanced LP position.
   *
   * Automatically swaps your input token to achieve the proper balance
   * for LP provision, then deposits both tokens in one transaction.
   *
   * @param options - Input token details, pool ID, slippage, and user address
   * @returns Transaction object or undefined if zap fails
   */
  async zapDeposit(options: ZapDepositOptions): Promise<Transaction | undefined> {
    const poolLabel = await this.strategyContext.getPoolLabel(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    return await zapDepositTxb(
      options.inputCoinAmount,
      options.isInputA,
      poolLabel.poolName as PoolName,
      options.slippage,
      options.address,
    );
  }

  /**
   * Claim accumulated rewards from all pools.
   *
   * Collects all available rewards including:
   * - ALPHA mining rewards
   * - Pool-specific yield rewards
   * - Protocol incentives
   *
   * @param options - User address and optional pool filter
   * @returns Transaction to claim all available rewards
   */
  async claim(options: ClaimOptions): Promise<Transaction> {
    return await claimRewardTxb(options.address);
  }

  /**
   * Get quote for token swap via Cetus aggregator.
   *
   * @param options - Swap quote configuration with token types and amount
   * @returns Router data with swap path and expected output, or undefined if no route found
   */
  async getCetusSwapQuote(options: CetusSwapQuoteOptions): Promise<RouterDataV3 | undefined> {
    const swap = new CetusSwap(this.config.network);
    return await swap.getCetusSwapQuote(
      options.from,
      options.target,
      options.amount,
      options.byAmountIn,
    );
  }

  /**
   * Execute token swap using Cetus aggregator.
   *
   * @param options - Swap execution configuration with router data and slippage tolerance
   * @returns Transaction object ready for signing and execution
   */
  async cetusSwapTxb(options: CetusSwapOptions): Promise<Transaction> {
    const swap = new CetusSwap(this.config.network);
    return await swap.cetusSwapTokensTxb(options.router, options.slippage);
  }

  /**
   * Clear all cached data. Useful for forcing fresh data.
   */
  clearCaches(): void {
    this.strategyContext.clearAllCaches();
  }

  /**
   * Clear cached data for a specific user.
   * Call this after a user completes a transaction to refresh their portfolio.
   */
  clearUserCaches(userAddress: string): void {
    this.strategyContext.clearUserCaches(userAddress);
  }
}
