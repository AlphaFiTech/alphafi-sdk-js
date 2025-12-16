/**
 * AlphaFi SDK - A comprehensive DeFi toolkit for the Sui blockchain.
 * Provides easy access to lending, LP farming, leveraged yield farming, and more.
 */
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';
import {
  depositSingleAssetTxb,
  depositDoubleAssetTxb,
  PoolName,
  withdrawTxb,
  coinAmountToXTokensSingleAsset,
  coinAmountToXTokensDoubleAsset,
  getAmounts,
  fetchVoloExchangeRate,
  getInvestor,
  NaviInvestor,
  zapDepositTxb,
  zapDepositQuoteTxb,
  getReceipts,
  claimRewardTxb,
  getDoubleAssetVaultBalance,
  depositAlphaTx,
  initiateWithdrawAlpha,
  claimWithdrawAlphaTx,
  claimAirdropTx,
  getSlushUserTotalXtokens,
} from '@alphafi/alphafi-sdk-upstream';
import { Decimal } from 'decimal.js';
import { stSuiExchangeRate, getConf as getStSuiConf } from '@alphafi/stsui-sdk';
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
 * Supports multiple DeFi strategies
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
  // private transactionManager: TransactionManager;
  private protocol: Protocol;
  private portfolio: Portfolio;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: AlphaFiSDKConfig) {
    this.config = config;
    this.strategyContext = new StrategyContext(config.network, config.suiClient);

    this.protocol = new Protocol(this.strategyContext);
    this.portfolio = new Portfolio(this.protocol, this.strategyContext);
  }

  async ensureInitialized(userAddress?: string) {
    if (this.isInitialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.init(userAddress);
    return this.initializationPromise;
  }

  private async init(userAddress?: string) {
    await this.strategyContext.init(userAddress);
    this.isInitialized = true;
  }

  /**
   * Get comprehensive data for all available DeFi pools.
   *
   * @param strategiesType - Optional array to filter by strategy types (e.g., ['Lending', 'Lp'])
   * @returns Map of pool ID to pool data (APY, TVL, supported assets, etc.)
   */
  async getPoolsData(strategiesType?: StrategyType[]): Promise<Map<string, PoolData>> {
    await this.ensureInitialized();
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
    await this.ensureInitialized(address);
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
    await this.ensureInitialized(options.address);
    const poolLabel = this.strategyContext.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (poolLabel.strategyType === 'Lyf') {
      const tx = await zapDepositTxb(
        options.amount,
        false,
        poolLabel.poolName as PoolName,
        0.005,
        options.address,
      );
      if (!tx) {
        throw new Error(`Failed to create LYF SUI deposit transaction`);
      }
      return tx;
    } else if (poolLabel.strategyType === 'AlphaVault') {
      return await depositAlphaTx(
        options.amount.toString(),
        options.address,
        this.config.suiClient,
      );
    } else if (
      poolLabel.strategyType === 'Lending' ||
      poolLabel.strategyType === 'Looping' ||
      poolLabel.strategyType === 'SingleAssetLooping'
    ) {
      return await depositSingleAssetTxb(
        poolLabel.poolName as PoolName,
        options.address,
        options.amount.toString(),
      );
    } else if (
      poolLabel.strategyType === 'Lp' ||
      poolLabel.strategyType === 'FungibleLp' ||
      poolLabel.strategyType === 'AutobalanceLp'
    ) {
      return await depositDoubleAssetTxb(
        poolLabel.poolName as PoolName,
        options.address,
        options.amount.toString(),
        options.isAmountA ?? false,
      );
    }
    throw new Error(`Unsupported pool type for pool ${options.poolId}`);
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
    await this.ensureInitialized();
    const poolLabel = this.strategyContext.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (
      poolLabel.strategyType === 'AlphaVault' ||
      poolLabel.strategyType === 'Lending' ||
      poolLabel.strategyType === 'Looping' ||
      poolLabel.strategyType === 'SingleAssetLooping' ||
      poolLabel.strategyType === 'Lyf'
    ) {
      throw new Error(`Pool with ID ${options.poolId} is not a double asset pool`);
    } else if (
      poolLabel.strategyType === 'Lp' ||
      poolLabel.strategyType === 'FungibleLp' ||
      poolLabel.strategyType === 'AutobalanceLp'
    ) {
      return await getAmounts(
        poolLabel.poolName as PoolName,
        options.isAmountA,
        options.amount,
        false,
      );
    }
    throw new Error(`Unsupported pool type for pool ${options.poolId}`);
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
    await this.ensureInitialized(options.address);
    const poolLabel = this.strategyContext.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    let xTokens = '0';
    if (options.withdrawMax) {
      if (poolLabel.poolName.toString().includes('ALPHALEND-SLUSH')) {
        xTokens = await getSlushUserTotalXtokens(poolLabel.poolName as PoolName, options.address);
      } else {
        const receipt = await getReceipts(poolLabel.poolName as PoolName, options.address, true);
        if (!receipt) {
          throw new Error(`Receipt with ID ${poolLabel.poolId} not found`);
        }
        xTokens = receipt[0].content.fields.xTokenBalance;
      }
    } else if (
      poolLabel.strategyType === 'Looping' ||
      poolLabel.strategyType === 'SingleAssetLooping'
    ) {
      const decimals =
        poolLabel.parentProtocol === 'Navi'
          ? 9 -
            (poolLabel.strategyType === 'Looping'
              ? await this.strategyContext.getCoinDecimals(poolLabel.supplyAsset.type)
              : await this.strategyContext.getCoinDecimals(poolLabel.asset.type))
          : 0;
      let withdrawCoin2Tokens = new Decimal(options.amount).mul(10 ** decimals);

      if (poolLabel.poolName === 'NAVI-LOOP-SUI-VSUI') {
        const voloExchRate = await fetchVoloExchangeRate(true);
        withdrawCoin2Tokens = withdrawCoin2Tokens.div(parseFloat(voloExchRate.data.exchangeRate));
      } else if (poolLabel.poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
        const suiTostSuiExchangeRate = await stSuiExchangeRate(getStSuiConf().LST_INFO, true);
        withdrawCoin2Tokens = withdrawCoin2Tokens.div(suiTostSuiExchangeRate);
      }

      const investor_details = (await getInvestor(
        poolLabel.poolName as PoolName,
        true,
      )) as NaviInvestor;
      const debtToSupplyRatio = new Decimal(
        investor_details.content.fields.current_debt_to_supply_ratio,
      );
      const normalisedDebtToSupplyRatio = new Decimal(1).minus(
        new Decimal(debtToSupplyRatio).div(1e20),
      );

      options.amount = new Decimal(withdrawCoin2Tokens)
        .div(normalisedDebtToSupplyRatio)
        .floor()
        .toString();
      xTokens = await coinAmountToXTokensSingleAsset(
        options.amount,
        poolLabel.poolName as PoolName,
      );
    } else if (poolLabel.strategyType === 'Lyf') {
      const receipt = await getReceipts(poolLabel.poolName as PoolName, options.address, true);
      const xTokenBalance = new Decimal(receipt[0].content.fields.xTokenBalance);
      const exchangeRate = await stSuiExchangeRate(getStSuiConf().LST_INFO, true);
      const balance = await getDoubleAssetVaultBalance(
        options.address,
        poolLabel.poolName as PoolName,
      );
      const totalSuiTokens = new Decimal(balance?.coinA ?? 0)
        .mul(exchangeRate)
        .add(new Decimal(balance?.coinB ?? 0));

      xTokens = new Decimal(xTokenBalance)
        .mul(options.amount)
        .div(totalSuiTokens)
        .floor()
        .toString();
    } else if (poolLabel.strategyType === 'AlphaVault' || poolLabel.strategyType === 'Lending') {
      const decimals =
        poolLabel.parentProtocol === 'Navi'
          ? 9 - (await this.strategyContext.getCoinDecimals(poolLabel.asset.type))
          : 0;
      options.amount = new Decimal(options.amount).mul(10 ** decimals).toString();
      xTokens = await coinAmountToXTokensSingleAsset(
        options.amount,
        poolLabel.poolName as PoolName,
      );
    } else if (
      poolLabel.strategyType === 'Lp' ||
      poolLabel.strategyType === 'FungibleLp' ||
      poolLabel.strategyType === 'AutobalanceLp'
    ) {
      xTokens = await coinAmountToXTokensDoubleAsset(
        options.amount,
        poolLabel.poolName as PoolName,
        options.isAmountA ?? true,
      );
    }

    return await withdrawTxb(xTokens.toString(), poolLabel.poolName as PoolName, options.address);
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
    await this.ensureInitialized();
    const poolLabel = this.strategyContext.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    return await zapDepositQuoteTxb(
      options.inputCoinAmount,
      options.isInputA,
      poolLabel.poolName as PoolName,
      options.slippage,
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
    await this.ensureInitialized(options.address);
    const poolLabel = this.strategyContext.poolLabels.get(options.poolId);
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
}
