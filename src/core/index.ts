/**
 * Core functionality for the AlphaFi SDK
 */

import { SuiClient } from '@mysten/sui/client';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../common/maps.js';
import {
  depositSingleAssetTxb,
  depositDoubleAssetTxb,
  PoolName,
  withdrawTxb,
  coinAmountToXTokensSingleAsset,
  coinAmountToXTokensDoubleAsset,
  getAmounts,
  coinsList,
  loopingPoolCoinMap,
  fetchVoloExchangeRate,
  getInvestor,
  NaviInvestor,
  zapDepositTxb,
  zapDepositQuoteTxb,
  getAlphaFiReceipts,
  initiateWithdrawAlphaTxb,
  claimAirdropTxb,
  claimWithdrawAlphaTxb
} from '@alphafi/alphafi-sdk-upstream';
import { Decimal } from 'decimal.js';
import { conf, CONF_ENV } from 'src/common/constants.js';
import { AlphaFiReceipt } from 'src/models/alphafiReceipt.js';
import { AlphaPoolType } from 'src/utils/parsedTypes.js';
import { AlphaTransactions } from 'src/models/transactionProtocolModels/alpha.js';
import { TransactionUtils } from 'src/models/transactionProtocolModels/utils.js';

/**
 * Configuration options for the AlphaFi SDK
 */
export interface AlphaFiSDKConfig {
  client: SuiClient;
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
  private transactionManager: TransactionManager;
  private blockchain: Blockchain;
  private protocol: Protocol;
  private portfolio: Portfolio;
  // private address: string;

  constructor(config: AlphaFiSDKConfig) {
    this.config = config;

    // Initialize core components
    this.blockchain = new Blockchain(config.client, config.network);
    this.protocol = new Protocol(config.client, config.network);
    this.portfolio = new Portfolio(this.protocol, this.blockchain, config.client, config.address);

    // Initialize the transaction facade
    this.transactionManager = new TransactionManager(config.address, this.blockchain);
  }

  /**
   * Deposit assets into a DeFi pool
   * @param options - Deposit configuration options
   * @returns Promise<TransactionResult> - Transaction result
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (poolInfo.assetTypes.length === 1) {
      if(poolInfo.poolName === "ALPHA"){
        return await new AlphaTransactions(this.config.address, this.blockchain, new TransactionUtils(this.blockchain)).depositAlphaTx(options.amount.toString())
      }
      else{
        return await depositSingleAssetTxb(
          poolInfo.poolName as PoolName,
          this.config.address,
          options.amount.toString(),
        );
      }
    } else if (poolInfo.assetTypes.length === 2) {
      return await depositDoubleAssetTxb(
        poolInfo.poolName as PoolName,
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
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (poolInfo.assetTypes.length === 1) {
      throw new Error(`Pool with ID ${options.poolId} is not a double asset pool`);
    } else if (poolInfo.assetTypes.length === 2) {
      return await getAmounts(
        poolInfo.poolName as PoolName,
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
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    let xTokens = '0';
    if (options.withdrawMax) {
      const receipt = await this.blockchain.getReceipt(poolInfo.poolId, this.config.address);
      if (!receipt) {
        throw new Error(`Receipt with ID ${poolInfo.poolId} not found`);
      }
      xTokens = receipt.xTokenBalance;
    } else if (
      poolDetailsMap[options.poolId].strategyType === 'DOUBLE-ASSET-LOOPING' ||
      poolDetailsMap[options.poolId].strategyType === 'SINGLE-ASSET-LOOPING'
    ) {
      const decimals =
        poolDetailsMap[options.poolId].parentProtocolName === 'NAVI'
          ? 9 - coinsList[loopingPoolCoinMap[options.poolId].supplyCoin].expo
          : 0;
      let withdrawCoin2Tokens = new Decimal(options.amount).mul(10 ** decimals);

      if (poolDetailsMap[options.poolId].poolName === 'NAVI-LOOP-SUI-VSUI') {
        const voloExchRate = await fetchVoloExchangeRate(true);
        withdrawCoin2Tokens = withdrawCoin2Tokens.div(parseFloat(voloExchRate.data.exchangeRate));
      }

      const investor_details = (await getInvestor(
        poolDetailsMap[options.poolId].poolName as PoolName,
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
      xTokens = await coinAmountToXTokensSingleAsset(options.amount, poolInfo.poolName as PoolName);
    } else if (poolInfo.assetTypes.length === 1) {
      const decimals =
        poolDetailsMap[options.poolId].parentProtocolName === 'NAVI'
          ? 9 - coinsList[loopingPoolCoinMap[options.poolId].supplyCoin].expo
          : 0;
      options.amount = new Decimal(options.amount).mul(10 ** decimals).toString();
      xTokens = await coinAmountToXTokensSingleAsset(options.amount, poolInfo.poolName as PoolName);
    } else if (poolInfo.assetTypes.length === 2) {
      xTokens = await coinAmountToXTokensDoubleAsset(
        options.amount,
        poolInfo.poolName as PoolName,
        options.isAmountA ?? true,
      );
    }

    return await withdrawTxb(
      xTokens.toString(),
      poolInfo.poolName as PoolName,
      this.config.address,
    );
  }

  async initiateWithdrawAlpha(options: WithdrawOptions): Promise<Transaction> {
    let xtokens = 0;
    if(options.withdrawMax) {
      const alphafiReceipts = await this.blockchain.getAlphaFiReceipt(this.config.address);
      const receipt = await this.blockchain.getReceipt(
        poolDetailsMapByPoolName['ALPHA'].poolId,
        this.config.address,
      );
      if (alphafiReceipts.length === 0 && !receipt) {
        throw new Error(`No AlphaFi receipts or receit found for address ${this.config.address}`);
      }
      if(alphafiReceipts.length === 0 && receipt){
        xtokens = Number(receipt.xTokenBalance);
      }
      else{
        xtokens = Number(new AlphaFiReceipt(alphafiReceipts[0], this.blockchain).getTotalShares(conf[CONF_ENV].ALPHAFI_EMBER_POOL));
      }
    }
    else{
      const alphaPool = await this.blockchain.getPool(conf[CONF_ENV].ALPHAFI_EMBER_POOL) as AlphaPoolType;
      xtokens = (new Decimal(options.amount).div(new Decimal(alphaPool.current_exchange_rate).div(1e18))).toNumber();
    }
    return await new AlphaTransactions(this.config.address, this.blockchain, new TransactionUtils(this.blockchain)).initiateWithdrawAlphaTx(xtokens.toString())
  }

  async claimWithdrawAlpha(ticketId: string):Promise<Transaction>{
    return await new AlphaTransactions(this.config.address, this.blockchain, new TransactionUtils(this.blockchain)).claimWithdrawAlphaTx(ticketId)
  }

  async claimAirdrop():Promise<Transaction>{
    return await new AlphaTransactions(this.config.address, this.blockchain, new TransactionUtils(this.blockchain)).claimAirdropTx()
  }

  /**
   * Get zap deposit quote for a DeFi pool
   * @param options - Zap deposit quote configuration options
   * @returns Promise<[string, string] | undefined> - quote
   */
  async zapDepositQuote(options: ZapDepositQuoteOptions): Promise<[string, string] | undefined> {
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    return await zapDepositQuoteTxb(
      options.inputCoinAmount,
      options.isInputA,
      poolInfo.poolName as PoolName,
      options.slippage,
    );
  }

  /**
   * Zap deposit into a DeFi pool
   * @param options - Zap deposit configuration options
   * @returns Promise<Transaction | undefined> - transaction
   */
  async zapDeposit(options: ZapDepositOptions): Promise<Transaction | undefined> {
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    return await zapDepositTxb(
      options.inputCoinAmount,
      options.isInputA,
      poolInfo.poolName as PoolName,
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
    return this.transactionManager.claim({
      poolId: options.poolId,
    });
  }
}
