/**
 * Core functionality for the AlphaFi SDK
 */

import { SuiClient } from '@mysten/sui/client';
import { Blockchain } from '../models/blockchain.js';
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
  PoolData,
  depositAlphaTx,
  initiateWithdrawAlpha,
  claimWithdrawAlphaTx,
  claimAirdropTx,
  getSlushUserTotalXtokens,
} from '@alphafi/alphafi-sdk-upstream';
import { Decimal } from 'decimal.js';
import { PoolLabel, StrategyType } from '../strategies/index.js';
import { stSuiExchangeRate, getConf as getStSuiConf } from '@alphafi/stsui-sdk';
import { StrategyContext } from '../models/strategy_context.js';
import { CoinInfoProvider } from '../models/coinInfoProvider.js';
import { CetusSwap, RouterDataV3 } from '../models/swap.js';

// Re-export types for external use
export type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';
/**
 * Configuration options for the AlphaFi SDK
 */
export interface AlphaFiSDKConfig {
  suiClient: SuiClient;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  address: string;
}

/**
 * Options for deposit operations
 */
export interface DepositOptions {
  poolId: string;
  amount: bigint;
  isAmountA?: boolean; // For double asset pools
}

/**
 * Options for estimate lp amounts operations
 */
export interface EstimateLpAmountsOptions {
  poolId: string;
  amount: string;
  isAmountA: boolean;
}

/**
 * Options for withdraw operations
 */
export interface WithdrawOptions {
  poolId: string;
  amount: string;
  isAmountA?: boolean;
  withdrawMax: boolean;
}

/**
 * Options for zap deposit operations
 */
export interface ZapDepositOptions {
  poolId: string;
  inputCoinAmount: bigint;
  isInputA: boolean;
  address: string;
  slippage: number;
}

/**
 * Options for zap deposit quote operations
 */
export interface ZapDepositQuoteOptions {
  poolId: string;
  inputCoinAmount: bigint;
  isInputA: boolean;
  slippage: number;
}

/**
 * Options for claim operations
 */
export interface ClaimOptions {
  poolId?: string;
}

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
  private poolLabels: Map<string, PoolLabel>;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: AlphaFiSDKConfig) {
    this.config = config;
    this.poolLabels = new Map<string, PoolLabel>();

    const blockchain = new Blockchain(config.suiClient, config.network);
    const coinInfoProvider = new CoinInfoProvider();
    this.strategyContext = new StrategyContext(blockchain, coinInfoProvider);

    // Initialize core components
    this.protocol = new Protocol(
      config.suiClient,
      config.network,
      this.strategyContext,
      this.poolLabels,
    );
    this.portfolio = new Portfolio(
      this.protocol,
      this.strategyContext.blockchain,
      config.suiClient,
      config.address,
    );

    // Initialize the transaction facade
    // this.transactionManager = new TransactionManager(config.address, this.blockchain);
  }

  async ensureInitialized() {
    if (this.isInitialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.init();
    return this.initializationPromise;
  }

  private async init() {
    await this.strategyContext.init();
    this.strategyContext.poolLabels.forEach((poolLabel) => {
      this.poolLabels.set(poolLabel.poolId, poolLabel);
    });
    this.isInitialized = true;
  }

  async getAllPoolsData(): Promise<PoolData[]> {
    await this.ensureInitialized();
    return await this.protocol.getAllPoolsData();
  }

  /**
   * Deposit assets into a DeFi pool
   * @param options - Deposit configuration options
   * @returns Promise<TransactionResult> - Transaction result
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    const poolLabel = this.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (poolLabel.strategyType === 'Lyf') {
      const tx = await zapDepositTxb(
        options.amount,
        false,
        poolLabel.poolName as PoolName,
        0.005,
        this.config.address,
      );
      if (!tx) {
        throw new Error(`Failed to create LYF SUI deposit transaction`);
      }
      return tx;
    } else if (poolLabel.strategyType === 'AlphaVault') {
      return await depositAlphaTx(
        options.amount.toString(),
        this.config.address,
        this.config.suiClient,
      );
    } else if (
      poolLabel.strategyType === 'Lending' ||
      poolLabel.strategyType === 'Looping' ||
      poolLabel.strategyType === 'SingleAssetLooping'
    ) {
      return await depositSingleAssetTxb(
        poolLabel.poolName as PoolName,
        this.config.address,
        options.amount.toString(),
      );
    } else if (
      poolLabel.strategyType === 'Lp' ||
      poolLabel.strategyType === 'FungibleLp' ||
      poolLabel.strategyType === 'AutobalanceLp'
    ) {
      return await depositDoubleAssetTxb(
        poolLabel.poolName as PoolName,
        this.config.address,
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
    const poolLabel = this.poolLabels.get(options.poolId);
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
    const poolLabel = this.poolLabels.get(options.poolId);
    if (!poolLabel) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    let xTokens = '0';
    if (options.withdrawMax) {
      if (poolLabel.poolName.toString().includes('ALPHALEND-SLUSH')) {
        xTokens = await getSlushUserTotalXtokens(
          poolLabel.poolName as PoolName,
          this.config.address,
        );
      } else {
        const receipt = await getReceipts(
          poolLabel.poolName as PoolName,
          this.config.address,
          true,
        );
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
      const receipt = await getReceipts(poolLabel.poolName as PoolName, this.config.address, true);
      const xTokenBalance = new Decimal(receipt[0].content.fields.xTokenBalance);
      const exchangeRate = await stSuiExchangeRate(getStSuiConf().LST_INFO, true);
      const balance = await getDoubleAssetVaultBalance(
        this.config.address,
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

    return await withdrawTxb(
      xTokens.toString(),
      poolLabel.poolName as PoolName,
      this.config.address,
    );
  }

  async initiateWithdrawAlpha(options: WithdrawOptions): Promise<Transaction> {
    return await initiateWithdrawAlpha(
      options.amount.toString(),
      options.withdrawMax,
      this.config.address,
      this.config.suiClient,
    );
  }

  async claimWithdrawAlpha(ticketId: string): Promise<Transaction> {
    return await claimWithdrawAlphaTx(ticketId, this.config.address, this.config.suiClient);
  }

  async claimAirdrop(): Promise<Transaction> {
    return await claimAirdropTx(this.config.address, this.config.suiClient);
  }

  /**
   * Get zap deposit quote for a DeFi pool
   * @param options - Zap deposit quote configuration options
   * @returns Promise<[string, string] | undefined> - quote
   */
  async zapDepositQuote(options: ZapDepositQuoteOptions): Promise<[string, string] | undefined> {
    const poolLabel = this.poolLabels.get(options.poolId);
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
    const poolLabel = this.poolLabels.get(options.poolId);
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
  async claim(_: ClaimOptions): Promise<Transaction> {
    return await claimRewardTxb(this.config.address);
    // return this.transactionManager.claim({
    //   poolId: options.poolId,
    // });
  }

  private parsePoolLabels(
    poolsJson:
      | readonly {
          strategy_type: StrategyType;
          data: any;
        }[]
      | {
          strategy_type: StrategyType;
          data: any;
        }[],
  ): PoolLabel[] {
    return poolsJson.map((entry) => {
      return {
        ...entry.data,
        strategy_type: entry.strategy_type as StrategyType,
      };
    });
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
