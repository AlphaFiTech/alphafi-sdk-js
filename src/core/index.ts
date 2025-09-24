/**
 * Core functionality for the AlphaFi SDK
 */

import { SuiClient } from '@mysten/sui/client';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { Transaction } from '@mysten/sui/transactions';
import { Protocol } from '../models/protocol.js';
import { Portfolio } from '../models/portfolio.js';

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
 * Options for withdraw operations
 */
export interface WithdrawOptions {
  poolId: string;
  xTokens: bigint;
}

/**
 * Options for claim operations
 */
export interface ClaimOptions {
  poolId?: number;
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
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    return this.transactionManager.deposit(options);
  }

  /**
   * Withdraw assets from a DeFi pool
   * @param options - Withdraw configuration options
   * @returns Promise<TransactionResult> - Transaction result with gas estimate
   */
  async withdraw(options: WithdrawOptions): Promise<Transaction> {
    return this.transactionManager.withdraw(options);
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
}
