import { Transaction } from '@mysten/sui/transactions';
import { Blockchain } from './blockchain.js';
import { BluefinTransactions } from './transactionProtocolModels/bluefin.js';
// import { NaviTransactions } from './transactionProtocolModels/navi.js';
import { CetusTransactions } from './transactionProtocolModels/cetus.js';
import { BucketTransactions } from './transactionProtocolModels/bucket.js';
// import { NaviLoopingTransactions } from './transactionProtocolModels/naviLooping.js';
import { AlphaLendTransactions } from './transactionProtocolModels/alphalend.js';
import { ClaimRewardsTransactions } from './transactionProtocolModels/claimRewards.js';
import { TransactionUtils } from './transactionProtocolModels/utils.js';
import { PoolDetails, poolDetailsMap } from '../common/maps.js';
import { ClaimOptions, DepositOptions, WithdrawOptions } from '../core/index.js';
import { coinsList } from '../common/coinsList.js';

/**
 * Main transaction manager that orchestrates all protocol-specific transaction builders
 */
export class TransactionManager {
  private bluefin: BluefinTransactions;
  //  private navi: NaviTransactions;
  private cetus: CetusTransactions;
  private bucketTransactions: BucketTransactions;
  // private naviLoopingTransactions: NaviLoopingTransactions;
  private alphaLendTransactions: AlphaLendTransactions;
  private claimRewardsTransactions: ClaimRewardsTransactions;
  private transactionUtils: TransactionUtils;

  constructor(
    private address: string,
    private blockchain: Blockchain,
  ) {
    this.transactionUtils = new TransactionUtils(blockchain);
    this.bluefin = new BluefinTransactions(address, blockchain, this.transactionUtils);
    //  this.navi = new NaviTransactions(address, blockchain, this.transactionUtils);
    this.cetus = new CetusTransactions(address, blockchain, this.transactionUtils);
    this.bucketTransactions = new BucketTransactions(address, blockchain, this.transactionUtils);
    //  this.naviLoopingTransactions = new NaviLoopingTransactions(
    //   address,
    //   blockchain,
    //   this.transactionUtils,
    // );
    this.alphaLendTransactions = new AlphaLendTransactions(
      address,
      blockchain,
      this.transactionUtils,
    );
    this.claimRewardsTransactions = new ClaimRewardsTransactions(
      address,
      blockchain,
      this.transactionUtils,
    );
  }

  /**
   * Generic deposit method that routes to the appropriate protocol
   * Based on depositSingleAssetTxb and depositDoubleAssetTxb from alphafi-sdk
   */
  async deposit(options: DepositOptions): Promise<Transaction> {
    const poolInfo = poolDetailsMap[options.poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${options.poolId} not found`);
    }

    if (poolInfo.assetTypes.length === 1) {
      return this.depositSingleAsset(options, poolInfo);
    } else if (poolInfo.assetTypes.length === 2) {
      if (options.isAmountA === undefined) {
        throw new Error('isAmountA is required for double asset pools');
      }
      return this.depositDoubleAsset(options, poolInfo);
    } else {
      throw new Error(`Unsupported pool type for pool ${options.poolId}`);
    }
  }

  /**
   * Handle single asset deposits
   */
  private async depositSingleAsset(
    options: DepositOptions,
    poolInfo: PoolDetails,
  ): Promise<Transaction> {
    const protocol = poolInfo.parentProtocolName;
    const amountStr = options.amount.toString();

    switch (protocol) {
      case 'ALPHAFI':
        return this.alphaLendTransactions.depositAlphaLendSingleLoopTx(
          poolInfo.poolName,
          amountStr,
        );
      case 'BUCKET':
        return this.bucketTransactions.depositBucketTx(options.poolId.toString(), amountStr);
      //     case 'NAVI':
      // if (poolInfo.strategyType === 'DOUBLE-ASSET-LOOPING') {
      //   return this.naviLoopingTransactions.depositNaviLoopingTx(
      //     options.poolId.toString(),
      //     amountStr,
      //   );
      // } else {
      //   return this.navi.depositNaviTx(options.poolId.toString(), amountStr);
      // }
      case 'ALPHALEND':
        if (poolInfo.strategyType === 'DOUBLE-ASSET-LOOPING') {
          return this.alphaLendTransactions.depositAlphaLendLoopingTx(poolInfo.poolName, amountStr);
        } else if (poolInfo.strategyType === 'SINGLE-ASSET-LOOPING') {
          return this.alphaLendTransactions.depositAlphaLendSingleLoopTx(
            poolInfo.poolName,
            amountStr,
          );
        }
        break;
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }

    throw new Error(`Unsupported single asset deposit for protocol: ${protocol}`);
  }

  /**
   * Handle double asset deposits
   */
  private async depositDoubleAsset(
    options: DepositOptions,
    poolInfo: PoolDetails,
  ): Promise<Transaction> {
    const protocol = poolInfo.parentProtocolName;
    const [coinAType, coinBType] = poolInfo.assetTypes;
    const amountStr = options.amount.toString();

    switch (protocol) {
      case 'CETUS':
        if (coinAType === coinsList['CETUS'].type && coinBType === coinsList['SUI'].type) {
          return this.cetus.depositCetusSuiTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else if (coinBType === coinsList['SUI'].type) {
          return this.cetus.depositCetusAlphaSuiTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else {
          return this.cetus.depositCetusTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        }
      case 'BLUEFIN':
        if (poolInfo.poolName === 'BLUEFIN-FUNGIBLE-STSUI-SUI') {
          return this.bluefin.depositBluefinFungibleTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else if (
          poolInfo.poolName === 'BLUEFIN-NAVX-VSUI' ||
          poolInfo.poolName === 'BLUEFIN-ALPHA-USDC' ||
          poolInfo.poolName === 'BLUEFIN-BLUE-USDC'
        ) {
          return this.bluefin.depositBluefinType2Tx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else if (coinAType === coinsList['SUI'].type) {
          return this.bluefin.depositBluefinSuiFirstTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else if (coinBType === coinsList['SUI'].type) {
          return this.bluefin.depositBluefinSuiSecondTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else if (coinAType === coinsList['STSUI'].type || coinBType === coinsList['STSUI'].type) {
          return this.bluefin.depositBluefinStsuiTx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        } else {
          return this.bluefin.depositBluefinType1Tx(
            options.poolId.toString(),
            amountStr,
            options.isAmountA ?? false,
          );
        }
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * Get pool name by ID
   */
  private getPoolNameById(poolId: number): string {
    const poolInfo = poolDetailsMap[poolId];
    if (!poolInfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }
    return poolInfo.poolName;
  }

  /**
   * Generic withdraw method that routes to the appropriate protocol
   * Based on withdrawTxb from alphafi-sdk
   */
  async withdraw(options: {
    poolId: string;
    xTokens: string;
    isAmountA?: boolean;
    withdrawMax: boolean;
  }): Promise<Transaction> {
    try {
      const poolInfo = poolDetailsMap[options.poolId];
      if (!poolInfo) {
        throw new Error(`Pool with ID ${options.poolId} not found`);
      }

      const protocol = poolInfo.parentProtocolName;
      const xTokensStr = options.xTokens.toString();

      switch (protocol) {
        case 'CETUS':
          return this.withdrawCetus({ poolId: options.poolId, xTokens: xTokensStr }, poolInfo);
        case 'BLUEFIN':
          return this.withdrawBluefin({ poolId: options.poolId, xTokens: xTokensStr }, poolInfo);
        //  case 'NAVI':
        // if (poolInfo.strategyType === 'DOUBLE-ASSET-LOOPING') {
        //   return this.naviLoopingTransactions.withdrawNaviLoopingTx(
        //     options.poolId.toString(),
        //     xTokensStr,
        //   );
        // } else {
        //   return this.navi.withdrawNaviTx(options.poolId.toString(), xTokensStr);
        // }
        case 'BUCKET':
          return this.bucketTransactions.withdrawBucketTx(options.poolId.toString(), xTokensStr);
        case 'ALPHALEND':
          if (poolInfo.strategyType === 'DOUBLE-ASSET-LOOPING') {
            return this.alphaLendTransactions.withdrawAlphaLendLoopingTx(
              poolInfo.poolName,
              xTokensStr,
            );
          } else if (poolInfo.strategyType === 'SINGLE-ASSET-LOOPING') {
            return this.alphaLendTransactions.withdrawAlphaLendSingleLoopTx(
              poolInfo.poolName,
              xTokensStr,
            );
          }
          break;
        default:
          throw new Error(`Unknown protocol: ${protocol}`);
      }

      throw new Error(`Unsupported withdraw for protocol: ${protocol}`);
    } catch (error) {
      throw new Error(`Withdraw failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle Cetus withdrawals
   */
  private async withdrawCetus(
    options: {
      poolId: string;
      xTokens: string;
    },
    poolInfo: PoolDetails,
  ): Promise<Transaction> {
    const [coinAType, coinBType] = poolInfo.assetTypes;

    if (coinAType === coinsList['CETUS'].type && coinBType === coinsList['SUI'].type) {
      return this.cetus.withdrawCetusSuiTx(options.poolId, options.xTokens);
    } else if (coinBType === coinsList['SUI'].type) {
      return this.cetus.withdrawCetusAlphaSuiTx(options.poolId, options.xTokens);
    } else {
      return this.cetus.withdrawCetusTx(options.poolId, options.xTokens);
    }
  }

  /**
   * Handle Bluefin withdrawals
   */
  private async withdrawBluefin(
    options: {
      poolId: string;
      xTokens: string;
    },
    poolInfo: PoolDetails,
  ): Promise<Transaction> {
    const [coinAType, coinBType] = poolInfo.assetTypes;

    if (poolInfo.poolName === 'BLUEFIN-FUNGIBLE-STSUI-SUI') {
      return this.bluefin.withdrawBluefinFungibleTx(options.poolId, options.xTokens);
    } else if (
      poolInfo.poolName === 'BLUEFIN-NAVX-VSUI' ||
      poolInfo.poolName === 'BLUEFIN-ALPHA-USDC' ||
      poolInfo.poolName === 'BLUEFIN-BLUE-USDC'
    ) {
      return this.bluefin.withdrawBluefinType2Tx(options.poolId, options.xTokens);
    } else if (coinAType === coinsList['SUI'].type) {
      return this.bluefin.withdrawBluefinSuiFirstTx(options.poolId, options.xTokens);
    } else if (coinBType === coinsList['SUI'].type) {
      return this.bluefin.withdrawBluefinSuiSecondTx(options.poolId, options.xTokens);
    } else if (coinAType === coinsList['STSUI'].type || coinBType === coinsList['STSUI'].type) {
      return this.bluefin.withdrawBluefinStsuiTx(options.poolId, options.xTokens);
    } else {
      return this.bluefin.withdrawBluefinType1Tx(options.poolId, options.xTokens);
    }
  }

  /**
   * Generic claim method that routes to the appropriate protocol
   */
  async claim(options: ClaimOptions): Promise<Transaction> {
    try {
      if (options.poolId) {
        const poolName = this.getPoolNameById(options.poolId);
        return this.claimRewardsTransactions.claimRewardsForSpecificPool(poolName);
      } else {
        return this.claimRewardsTransactions.claimAllRewardsTx();
      }
    } catch (error) {
      throw new Error(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
