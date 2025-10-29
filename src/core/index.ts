/**
 * Core functionality for the AlphaFi SDK
 */

import { SuiClient } from '@mysten/sui/client';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';
import { poolDetailsMap } from '../common/maps.js';
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
} from '@alphafi/alphafi-sdk-upstream';
import { Decimal } from 'decimal.js';
import { ZapDepositOptions } from 'src/models/transactionProtocolModels/zapDeposit.js';

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
      return await depositSingleAssetTxb(
        poolInfo.poolName as PoolName,
        this.config.address,
        options.amount.toString(),
      );
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

  async getAllPoolsData() {
    const pools = await this.blockchain.getMultiPool();
  }

  async zapDeposit(options: ZapDepositOptions): Promise<Transaction> {
    return this.transactionManager.zapDepositTx(options);
  }

  async getZapEstimate(options: ZapDepositOptions): Promise<{
    estimatedAmountA: string;
    estimatedAmountB: string;
    swapRequired: boolean;
  }> {
    return this.transactionManager.getZapEstimate(options);
  }
}
