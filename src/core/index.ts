/**
 * AlphaFi SDK - A comprehensive DeFi toolkit for the Sui blockchain.
 * Provides easy access to lending, LP farming, leveraged yield farming, and more.
 *
 * All data is lazily loaded on-demand with automatic caching.
 */
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';
import { StrategyContext } from '../models/strategyContext.js';
import { CetusSwap } from '../models/swap.js';
import type { AlphaFiReceipt, PoolBalance, PoolData, UserPortfolioData } from '../models/types.js';
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
} from './types.js';
import { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';
import { Strategy, StrategyType } from '../strategies/strategy.js';
import { LEGACY_ALPHA_POOL_RECEIPT, PACKAGE_IDS, VERSIONS } from '../utils/constants.js';
import { AlphaVaultStrategy } from '../strategies/alphaVault.js';

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
    this.strategyContext = new StrategyContext(config.network, config.suiClient, config.apiBaseUrl);
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
   * Get data for a single pool.
   *
   * @param poolId - The ID of the pool to get data for
   * @returns Pool data including APR, TVL, LP breakdown, parent LP breakdown, current LP pool price, and position range
   */
  async getSinglePoolData(poolId: string): Promise<PoolData> {
    const strategy = await this.protocol.getSinglePoolStrategy(poolId);
    return strategy.getData();
  }

  /**
   * Get balance for a single pool.
   *
   * @param address - The address of the user to get balance for
   * @param poolId - The ID of the pool to get balance for
   * @returns Pool balance including token amounts and USD value
   */
  async getUserSinglePoolBalance(address: string, poolId: string): Promise<PoolBalance> {
    const strategy = await this.portfolio.getPoolStrategy(address, poolId);
    return strategy.getBalance(address);
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
    const strategy = await this.portfolio.getPoolStrategy(options.address, options.poolId);
    await strategy.deposit(tx, options);
    return tx;
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
    const tx = new Transaction();
    const strategy = (await this.portfolio.getPoolStrategy(
      options.address,
      '0x06a4922346ae433e9a2fff4db900d760e0cbfdef748f48385f430ef4d042a6f8',
    )) as AlphaVaultStrategy;
    await strategy.withdraw(tx, options);
    return tx;
  }

  /**
   * Complete ALPHA token withdrawal using previously created ticket.
   *
   * @param options - Withdrawal claim configuration with ticket ID and user address
   * @returns Transaction to claim the withdrawn ALPHA tokens
   */
  async claimWithdrawAlpha(options: ClaimWithdrawAlphaOptions): Promise<Transaction> {
    const tx = new Transaction();
    const strategy = (await this.portfolio.getPoolStrategy(
      options.address,
      '0x06a4922346ae433e9a2fff4db900d760e0cbfdef748f48385f430ef4d042a6f8',
    )) as AlphaVaultStrategy;
    await strategy.claimWithdraw(tx, options.ticketId, options.address);
    return tx;
  }

  /**
   * Claim available airdrop tokens.
   *
   * @param options - Airdrop claim configuration with user address and transfer preference
   * @returns Transaction to claim airdrop rewards
   */
  async claimAirdrop(options: ClaimAirdropOptions): Promise<Transaction> {
    const tx = new Transaction();
    const strategy = (await this.portfolio.getPoolStrategy(
      options.address,
      '0x06a4922346ae433e9a2fff4db900d760e0cbfdef748f48385f430ef4d042a6f8',
    )) as AlphaVaultStrategy;
    await strategy.claimAirdrop(tx, options.address, options.transferToWallet);
    return tx;
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
    const tx = new Transaction();
    const alphaReceipt = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [LEGACY_ALPHA_POOL_RECEIPT],
      arguments: [],
    });
    let strategies = new Map<string, Strategy>();

    if (options.poolId) {
      strategies.set(
        options.poolId,
        await this.portfolio.getPoolStrategy(options.address, options.poolId),
      );
    } else {
      strategies = await this.portfolio.getAllPoolStrategies(options.address);
    }
    strategies.forEach((strategy) => {
      strategy.claimRewards(tx, alphaReceipt);
    });
    tx.moveCall({
      target: `${PACKAGE_IDS.ALPHA_LATEST}::alphapool::transfer_receipt_option`,
      arguments: [tx.object(VERSIONS.ALPHA_VERSIONS[1]), alphaReceipt],
    });

    return tx;
  }

  /**
   * Vote on a proposal.
   *
   * @param voteIndex - The index of the vote to cast
   * @param proposalId - The ID of the proposal to vote on
   * @returns Transaction object ready for signing and execution
   */
  async vote(voteIndex: number, proposalId: string): Promise<Transaction | undefined> {
    const tx = new Transaction();
    if (voteIndex === undefined) {
      console.error('Vote index is undefined');
      return undefined;
    }

    tx.moveCall({
      target: `0x79729faced2e6294254e555424184f71c8c043a1dbe3447b88613704a7276710::governance::vote`,
      arguments: [tx.object(proposalId), tx.pure.u8(voteIndex), tx.object('0x6')],
    });

    return tx;
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
   * Get all AlphaFi receipts for a user address.
   *
   * @param userAddress - User's wallet address
   * @returns Parsed AlphaFi receipt objects
   */
  async getAlphaFiReceipts(userAddress: string): Promise<AlphaFiReceipt[]> {
    return this.strategyContext.getAlphaFiReceipts(userAddress);
  }

  /**
   * Get AlphaFi positions grouped by pool ID, derived from user receipts.
   *
   * @param userAddress - User's wallet address
   * @returns Map of pool ID to position objects
   */
  async getPositionsFromAlphaFiReceipts(userAddress: string): Promise<Map<string, any[]>> {
    return this.strategyContext.getPositionsFromAlphaFiReceipts(userAddress);
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
