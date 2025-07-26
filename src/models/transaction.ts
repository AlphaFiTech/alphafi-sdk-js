import { Transaction } from "@mysten/sui/transactions";
import { Blockchain } from "./blockchain.js";
import { BluefinTransactions } from "./transactionProtocolModels/bluefin.js";
import { NaviTransactions } from "./transactionProtocolModels/navi.js";
import { CetusTransactions } from "./transactionProtocolModels/cetus.js";
import { poolDetailsMap } from "../common/maps.js";
import { ClaimOptions, DepositOptions, WithdrawOptions } from "../core/index.js";
import { ClaimRewardsTransactions } from "./transactionProtocolModels/claimRewards.js";
import { BucketTransactions } from "./transactionProtocolModels/bucket.js";
import { NaviLoopingTransactions } from "./transactionProtocolModels/naviLooping.js";

/**
 * Types for liquidity calculations
 */
export interface LiquidityResult {
  coinAmountA: bigint;
  coinAmountB: bigint;
}

export interface CommonInvestorFields {
  content: {
    fields: {
      lower_tick: string;
      upper_tick: string;
    };
  };
}

export interface ClmmPool {
  content: {
    fields: {
      current_sqrt_price: string;
    };
  };
}

/**
 * Main transaction manager that orchestrates all protocol-specific transaction builders
 */
export class TransactionManager {
  private bluefin: BluefinTransactions;
  private navi: NaviTransactions;
  private cetus: CetusTransactions;
  private claimRewardsTransactions: ClaimRewardsTransactions;
  private bucketTransactions: BucketTransactions;
  private naviLoopingTransactions: NaviLoopingTransactions;

  constructor(private address: string, private blockchain: Blockchain, private poolUtils: PoolUtils) {
    this.bluefin = new BluefinTransactions(address, blockchain, poolUtils);
    this.navi = new NaviTransactions(address, blockchain);
    this.cetus = new CetusTransactions(address, blockchain);
    this.bucketTransactions = new BucketTransactions(address, blockchain, poolUtils);
    this.blockchain = blockchain;
    this.claimRewardsTransactions = new ClaimRewardsTransactions(address, blockchain, poolUtils);
    this.naviLoopingTransactions = new NaviLoopingTransactions(address, blockchain, poolUtils);
  }

  /**
   * Get the appropriate protocol transaction handler
   */
  getProtocolHandler(protocol: string) {
    switch (protocol.toLowerCase()) {
      case 'bluefin':
        return this.bluefin;
      case 'navi':
        return this.navi;
      case 'cetus':
        return this.cetus;
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * Generic deposit method that routes to the appropriate protocol
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    try {
      let protocol = poolDetailsMap[options.poolId].parentProtocolName.toLowerCase();
      if (
        protocol === 'navi' &&
        this.poolUtils.categorizeNaviPool(poolDetailsMap[options.poolId]) === 'looping'
      ) {
        protocol = 'navi-looping';
      } else if (
        protocol === 'navi' &&
        this.poolUtils.categorizeNaviPool(poolDetailsMap[options.poolId]) === 'single-asset'
      ) {
        protocol = 'navi';
      }
      switch (protocol) {
        case 'bluefin':
          return this.bluefin.depositBluefinSuiFirstTx(options.amount, options.poolId);
        case 'navi':
          return this.navi.depositNaviTx(options.amount, options.poolId);
        case 'cetus':
          return this.cetus.depositCetusTx(options.amount, options.poolId, options?.isAmountA);
        case 'bucket':
          return this.bucketTransactions.depositBucketTx(options.amount, options.poolId);
        case 'navi-looping':
          return this.naviLoopingTransactions.depositNaviLoopingTx(options.amount, options.poolId);
        default:
          throw new Error(`Unknown protocol: ${protocol}`);
      }
    } catch (error) {
      throw new Error(`Deposit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Withdraw assets from a pool
   * @param options - Withdraw configuration options
   * @returns Transaction result with gas estimate and pool information
   */

  /*
async withdraw(options: WithdrawOptions): Promise<TransactionResult> {
  try {
    // Validate pool exists
    const poolInfo = this.getPoolInfo(options.poolId);
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    // Calculate xTokens if percentage is provided
    let xTokens = options.xTokens;
    if (options.percentage !== undefined) {
      xTokens = await this.calculateXTokensFromPercentage(options.poolId, options.percentage);
    }

    // Determine protocol from pool information
    const protocol = this.getProtocolFromPool(options.poolId);

    // Create the withdraw transaction
    const transaction = await this.transactionManager.withdraw(
      protocol,
      xTokens,
      options.poolId
    );

    // Estimate gas if not dry run
    let gasEstimate: number | undefined;
    if (!options.dryRun) {
      gasEstimate = await this.transactionManager.getEstimatedGasBudget(transaction);
    }

    return {
      transaction,
      gasEstimate,
      poolInfo: {
        poolId: poolInfo.poolId,
        poolName: poolInfo.poolName,
        protocol,
        strategyType: poolInfo.strategyType,
      },
    };
  } catch (error) {
    throw new Error(`Withdraw failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
  */

  /**
   * Generic withdraw method that routes to the appropriate protocol
   */
  async withdraw(options: WithdrawOptions): Promise<Transaction> {
    try {
      let protocol = poolDetailsMap[options.poolId].parentProtocolName.toLowerCase();
      if (
        protocol === 'navi' &&
        this.poolUtils.categorizeNaviPool(poolDetailsMap[options.poolId]) === 'looping'
      ) {
        protocol = 'navi-looping';
      } else if (
        protocol === 'navi' &&
        this.poolUtils.categorizeNaviPool(poolDetailsMap[options.poolId]) === 'single-asset'
      ) {
        protocol = 'navi';
      }
      switch (protocol.toLowerCase()) {
        case 'bluefin':
          return this.bluefin.withdrawBluefinSuiFirstTx(options.xTokens, options.poolId);
        case 'navi':
          return this.navi.withdrawNaviTx(options.xTokens, options.poolId);
        case 'cetus':
          return this.cetus.withdrawCetusTx(options.xTokens, options.poolId);
        case 'bucket':
          return this.bucketTransactions.withdrawBucketTx(options.xTokens, options.poolId);
        case 'navi-looping':
          return this.naviLoopingTransactions.withdrawNaviLoopingTx(
            options.xTokens,
            options.poolId,
          );
        default:
          throw new Error(`Unknown protocol: ${protocol}`);
      }
    } catch (error) {
      throw new Error(`Withdraw failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generic claim method that routes to the appropriate protocol
   */
  async claim(options: ClaimOptions): Promise<Transaction> {
    try {
      switch (options.poolId) {
        case 1: // ALPHA pool
          return this.claimRewardsTransactions.claimRewardsForSpecificPool(options.poolId);
        case 2: // BLUEFIN pool
          return this.claimRewardsTransactions.claimRewardsForSpecificPool(options.poolId);
        case 3: // NAVI pool
          return this.claimRewardsTransactions.claimRewardsForSpecificPool(options.poolId);
        case 4: // CETUS pool
          return this.claimRewardsTransactions.claimRewardsForSpecificPool(options.poolId);
        default:
          return this.claimRewardsTransactions.claimAllRewardsTx();
      }
    } catch (error) {
      throw new Error(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all available protocols
   */
  getAvailableProtocols(): string[] {
    return ['bluefin', 'navi', 'cetus'];
  }

  /**
   * Check if a protocol is supported
   */
  isProtocolSupported(protocol: string): boolean {
    return this.getAvailableProtocols().includes(protocol.toLowerCase());
  }

  /**
   * Get estimated gas budget for a transaction
   */
  async getEstimatedGasBudget(tx: Transaction): Promise<number | undefined> {
    try {
      const simResult = await this.blockchain.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.address,
      });
      return (
        Number(simResult.effects.gasUsed.computationCost) +
        Number(simResult.effects.gasUsed.nonRefundableStorageFee) +
        1e8
      );
    } catch (err) {
      console.error(`Error estimating transaction gasBudget`, err);
      return undefined;
    }
  }
}
