/**
 * Core functionality for the AlphaFi SDK
 */

import { SuiClient } from '@mysten/sui/client';
import { SuiNetwork } from '../models/types.js';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { PoolUtils } from '../models/pool.js';
import { AdminManager } from '../models/admin.js';
import { Transaction } from '@mysten/sui/transactions';
import { PoolDetails } from '../common/maps.js';

/**
 * Configuration options for the AlphaFi SDK
 */
export interface AlphaFiSDKConfig {
  client: SuiClient;
  network: SuiNetwork;
  address: string;
}

/**
 * Options for deposit operations
 */
export interface DepositOptions {
  poolId: number;
  amount: string;
  isAmountA?: boolean; // For Cetus pools that support dual assets
  dryRun?: boolean;
}

/**
 * Options for withdraw operations
 */
export interface WithdrawOptions {
  poolId: number;
  xTokens: string;
  percentage?: number; // Alternative to xTokens - withdraw percentage of balance
  dryRun?: boolean;
}

/**
 * Options for claim operations
 */
export interface ClaimOptions {
  poolId?: number;
  dryRun?: boolean;
}

/**
 * Result of a transaction operation
 */
export interface TransactionResult {
  transaction: Transaction;
  gasEstimate?: number;
  poolInfo?: {
    poolId: number;
    poolName: string;
    protocol: string;
    strategyType: string;
  };
}

/**
 * Pool information response
 */
export interface PoolInfo {
  poolId: number;
  poolName: string;
  protocol: string;
  strategyType: string;
  assetTypes: any;
  packageId: string;
  receiptType: string;
}

/**
 * Main AlphaFi SDK class providing a simple facade for DeFi operations
 * This is the primary entry point for users of the AlphaFi SDK
 */
export class AlphaFiSDK {
  private config: AlphaFiSDKConfig;
  private transactionManager: TransactionManager;
  private blockchain: Blockchain;
  private poolUtils: PoolUtils;
  private adminManager: AdminManager;
  // private address: string;

  constructor(config: AlphaFiSDKConfig) {
    this.config = config;

    // Initialize core components
    this.blockchain = new Blockchain(config.client, config.network);
    this.poolUtils = new PoolUtils(this.blockchain, config.client);
    this.adminManager = new AdminManager(config.client, this.poolUtils, this.blockchain);

    // Initialize the transaction facade
    this.transactionManager = new TransactionManager(
      config.address,
      this.blockchain,
      this.poolUtils,
    );
    //this.transactionManager = new TransactionManager(config.address, new Blockchain(config.client, config.network), new PoolUtils(new Blockchain(config.client, config.network), config.client));
    //this.poolUtils = new PoolUtils(new Blockchain(config.client, config.network), config.client);
  }

  /**
   * Deposit assets into a DeFi pool
   * @param options - Deposit configuration options
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   *
   * @example
   * ```typescript
   * const result = await sdk.deposit({
   *   poolId: 45,
   *   amount: "1000000", // 1 SUI (in smallest unit)
   *   dryRun: false
   * });
   * console.log(`Gas estimate: ${result.gasEstimate}`);
   * ```
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    return this.transactionManager.deposit(options);
  }

  /**
   * Withdraw assets from a DeFi pool
   * @param options - Withdraw configuration options
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   *
   * @example
   * ```typescript
   * // Withdraw specific amount of xTokens
   * const result = await sdk.withdraw({
   *   poolId: 45,
   *   xTokens: "500000",
   *   dryRun: false
   * });
   *
   * // Or withdraw percentage of balance
   * const result = await sdk.withdraw({
   *   poolId: 45,
   *   xTokens: "0", // Will be calculated from percentage
   *   percentage: 50, // Withdraw 50% of balance
   *   dryRun: false
   * });
   * ```
   */
  async withdraw(options: WithdrawOptions): Promise<Transaction> {
    return this.transactionManager.withdraw(options);
  }

  /**
   * Claim rewards from a DeFi pool
   * @param options - Claim configuration options
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   *
   * @example
   * ```typescript
   * const result = await sdk.claim({
   *   poolId: 1, // ALPHA pool typically supports claims
   *   dryRun: false
   * });
   * ```
   */
  async claim(options: ClaimOptions): Promise<Transaction> {
    return this.transactionManager.claim(options);
  }

  /**
   * Get information about a specific pool
   * @param poolId - The pool ID to get information for
   * @returns PoolInfo | null - Pool information or null if not found
   *
   * @example
   * ```typescript
   * const poolInfo = sdk.getPoolInfo(45);
   * if (poolInfo) {
   *   console.log(`Pool: ${poolInfo.poolName}`);
   *   console.log(`Protocol: ${poolInfo.protocol}`);
   *   console.log(`Strategy: ${poolInfo.strategyType}`);
   * }
   * ```
   */
  getPoolInfo(poolId: number): PoolDetails | null {
    return this.poolUtils.getPoolInfo(poolId);
  }

  /**
   * Get all available pools
   * @returns PoolInfo[] - Array of all pool information
   *
   * @example
   * ```typescript
   * const allPools = sdk.getAllPools();
   * console.log(`Found ${allPools.length} pools`);
   * allPools.forEach(pool => {
   *   console.log(`${pool.poolId}: ${pool.poolName} (${pool.protocol})`);
   * });
   * ```
   */
  getAllPools(): PoolDetails[] {
    return this.poolUtils.getAllPools();
  }

  /**
   * Get user's receipts for all pools
   * @returns Promise - Array of user receipts
   *
   * @example
   * ```typescript
   * const receipts = await sdk.getUserReceipts();
   * console.log(`User has ${receipts.length} receipts`);
   * ```
   */
  async getReceipts(poolId: number) {
    return this.blockchain.getReceipts(poolId, this.config.address);
  }

  /**
   * Get the configured network
   * @returns SuiNetwork - The network configuration
   */
  getNetwork(): SuiNetwork {
    return this.config.network;
  }

  /**
   * Get admin manager for administrative functions
   * @returns AdminManager - The admin manager instance
   *
   * @example
   * ```typescript
   * const adminManager = sdk.getAdminManager();
   * const currentTick = await adminManager.getCurrentTick("CETUS-SUI-USDC");
   * const weights = await adminManager.getPoolsWeightDistribution("ALPHA");
   * ```
   */
  getAdminManager(): AdminManager {
    return this.adminManager;
  }

  /**
   * Get pool utilities for pool-related operations
   * @returns PoolUtils - The pool utilities instance
   *
   * @example
   * ```typescript
   * const poolUtils = sdk.getPoolUtils();
   * const isDoubleAsset = poolUtils.isDoubleAssetPool(45);
   * const allPools = poolUtils.getAllPools();
   * ```
   */
  getPoolUtils(): PoolUtils {
    return this.poolUtils;
  }
}
