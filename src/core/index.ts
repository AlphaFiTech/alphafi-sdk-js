/**
 * Core functionality for the AlphaFi SDK
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
  ClaimOptions,
  DepositOptions,
  EstimateLpAmountsOptions,
  WithdrawOptions,
  ZapDepositOptions,
  ZapDepositQuoteOptions,
} from './types.js';
import { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';

// Re-export types for external use
export type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';

/**
 * Main AlphaFi SDK class providing a simple facade for DeFi operations
 * This is the primary entry point for users of the AlphaFi SDK
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

    // Initialize core components
    this.protocol = new Protocol(this.strategyContext);
    this.portfolio = new Portfolio(this.protocol, this.strategyContext);

    // Initialize the transaction facade
    // this.transactionManager = new TransactionManager(config.address, this.blockchain);
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

  async getAllPoolsData(address?: string): Promise<Map<string, PoolData>> {
    await this.ensureInitialized(address);
    return this.protocol.getAllPoolsData();
  }

  async getUserPortfolio(address: string): Promise<UserPortfolioData> {
    await this.ensureInitialized(address);
    return this.portfolio.getUserPortfolio(address);
  }

  /**
   * Deposit assets into a DeFi pool
   * @param options - Deposit configuration options
   * @returns Promise<TransactionResult> - Transaction result
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
   * Estimate lp amounts for a DeFi pool
   * @param options - Estimate lp amounts configuration options
   * @returns Promise<[string, string]> - coin amounts
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
   * Withdraw assets from a DeFi pool
   * @param options - Withdraw configuration options
   * @returns Promise<TransactionResult> - Transaction result
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

  async initiateWithdrawAlpha(options: WithdrawOptions): Promise<Transaction> {
    return await initiateWithdrawAlpha(
      options.amount.toString(),
      options.withdrawMax,
      options.address,
      this.config.suiClient,
    );
  }

  async claimWithdrawAlpha(ticketId: string, address: string): Promise<Transaction> {
    return await claimWithdrawAlphaTx(ticketId, address, this.config.suiClient);
  }

  async claimAirdrop(address: string, transferToWallet: boolean): Promise<Transaction> {
    return await claimAirdropTx(address, this.config.suiClient, transferToWallet);
  }

  /**
   * Get zap deposit quote for a DeFi pool
   * @param options - Zap deposit quote configuration options
   * @returns Promise<[string, string] | undefined> - quote
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
   * Zap deposit into a DeFi pool
   * @param options - Zap deposit configuration options
   * @returns Promise<Transaction | undefined> - transaction
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
   * Claim rewards from a DeFi pool
   * @param options - Claim configuration options
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   */
  async claim(options: ClaimOptions): Promise<Transaction> {
    return await claimRewardTxb(options.address);
    // return this.transactionManager.claim({
    //   poolId: options.poolId,
    // });
  }

  async getCetusSwapQuote(
    from: string,
    target: string,
    amount: string,
  ): Promise<RouterDataV3 | undefined> {
    const swap = new CetusSwap(this.config.network);
    return await swap.getCetusSwapQuote(from, target, amount);
  }

  async cetusSwapTokensTxb(router: RouterDataV3, slippage: number): Promise<Transaction> {
    const swap = new CetusSwap(this.config.network);
    return await swap.cetusSwapTokensTxb(router, slippage);
  }
}
