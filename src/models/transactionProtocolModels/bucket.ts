import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList } from '../../common/coinsList.js';
import { TransactionUtils } from './utils.js';

export class BucketTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
  }

  /**
   * Deposit BUCK tokens into the Bucket protocol pool
   * @param amount - Amount to deposit in smallest unit
   * @param poolId - Pool ID for the Bucket pool
   * @returns Transaction ready for signing and execution
   */
  async depositBucketTx(poolId: string, amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    // Get the coin type for BUCK - handle single asset type
    let bucketCoinType: string = poolinfo.assetTypes[0];
    const receipt = await this.blockchain.getReceipt(poolId, this.address);

    // Handle receipt creation for deposit using optimized pattern
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    // Use optimized coin handling
    const coin = await this.transactionUtils.getCoinFromWallet(tx, this.address, bucketCoinType);
    const [depositCoin] = tx.splitCoins(coin, [amount]);
    tx.transferObjects([coin], this.address);

    // Collect and convert rewards to BUCK
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_bucket_investor_v1::collect_and_convert_reward_to_buck`,
      arguments: [
        tx.object(getConf().ALPHA_3_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().BUCKET_PROTOCOL),
        tx.object(getConf().FOUNTAIN),
        tx.object(getConf().BLUEFIN_SUI_USDC_POOL), // bluefinPoolMap["SUI-USDC"]
        tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Execute the deposit
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_bucket_pool_v1::user_deposit`,
      arguments: [
        tx.object(getConf().ALPHA_3_VERSION),
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        depositCoin,
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().BUCKET_PROTOCOL),
        tx.object(getConf().FOUNTAIN),
        tx.object(getConf().FLASK),
        tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  /**
   * Withdraw BUCK tokens from the Bucket protocol pool
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolId - Pool ID for the Bucket pool
   * @returns Transaction ready for signing and execution
   */
  async withdrawBucketTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    const alphaReceipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );

    if (!receipt) {
      throw new Error(`No ${poolinfo.poolName} Receipt found for withdrawal`);
    }

    // Use optimized receipt handling
    let alpha_receipt = await this.transactionUtils.getReceiptObject(
      tx,
      getConf().ALPHA_POOL_RECEIPT,
      alphaReceipt?.id,
    );

    // Collect and convert rewards to BUCK before withdrawal
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_bucket_investor_v1::collect_and_convert_reward_to_buck`,
      arguments: [
        tx.object(getConf().ALPHA_3_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().BUCKET_PROTOCOL),
        tx.object(getConf().FOUNTAIN),
        tx.object(getConf().BLUEFIN_SUI_USDC_POOL), // bluefinPoolMap["SUI-USDC"]
        tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Execute the withdrawal
    const [buck] = tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_bucket_pool_v1::user_withdraw`,
      arguments: [
        tx.object(getConf().ALPHA_3_VERSION),
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(poolDetailsMapByPoolName['ALPHA'].poolId), // ALPHA pool
        tx.object(poolinfo.poolId),
        tx.pure.u64(xTokens),
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().BUCKET_PROTOCOL),
        tx.object(getConf().FOUNTAIN),
        tx.object(getConf().FLASK),
        tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer the withdrawn BUCK to the user
    tx.moveCall({
      target: `0x2::transfer::public_transfer`,
      typeArguments: [`0x2::coin::Coin<${coinsList['BUCK']?.type}>`],
      arguments: [buck, tx.pure.address(this.address)],
    });

    return tx;
  }
}
