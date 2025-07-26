import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList } from '../../common/coins.js';
import { CoinStruct } from '@mysten/sui/client';
import { PoolUtils } from '../pool.js';

export class BucketTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Deposit BUCK tokens into the Bucket protocol pool
   * @param amount - Amount to deposit in smallest unit
   * @param poolId - Pool ID for the Bucket pool
   * @returns Transaction ready for signing and execution
   */
  async depositBucketTx(amount: string, poolId: number): Promise<Transaction> {
    console.log('Depositing Bucket BUCK', amount, poolId);
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('BUCKET')) {
      throw new Error(`Pool ${poolId} is not a Bucket protocol pool`);
    }

    console.log('Pool info', poolinfo);

    // Get the coin type for BUCK
    let bucketCoinType: string;
    if ('token' in poolinfo.assetTypes) {
      bucketCoinType = poolinfo.assetTypes.token;
    } else {
      throw new Error('Bucket pool does not have single asset type configuration');
    }

    const coinName = bucketCoinType.split('::').pop()?.toUpperCase() || 'BUCK';
    console.log('Coin name', coinName);

    // Get receipts for this pool
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);
    console.log('Receipt', receipt);
    console.log('Pool ID', poolId);
    console.log('Address', this.address);

    // Fetch BUCK coins from the user's wallet
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;

    console.log(`Fetching coins for ${coinName} (${coinsList[coinName]?.type || bucketCoinType})`);

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType: coinsList[coinName]?.type || bucketCoinType,
          cursor: currentCursor,
        });

        coins = coins.concat(response.data);

        // Check if there's a next page
        if (response.hasNextPage && response.nextCursor) {
          currentCursor = response.nextCursor;
        } else {
          // No more pages available
          break;
        }
      } while (true);

      console.log(`Found ${coins.length} coins of type ${coinName}`);
    } catch (error) {
      console.log(`Error fetching coins: ${error}`);
      throw new Error(
        `Failed to fetch ${coinName} coins: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    if (coins.length < 1) {
      throw new Error(`No ${coinName} coins found in wallet for deposit`);
    }

    // Handle coin splitting and merging
    const [coin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins.map((c) => c.coinObjectId),
    );
    const [depositCoin] = tx.splitCoins(coin, [amount]);

    // Handle receipt creation for deposit
    let someReceipt: any;
    if (receipt.length === 0) {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt[0].type],
        arguments: [tx.object(receipt[0].id)],
      });
    }

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

    // Transfer remaining coins back to user
    tx.transferObjects([coin], this.address);

    console.log('Bucket deposit transaction created successfully');
    return tx;
  }

  /**
   * Withdraw BUCK tokens from the Bucket protocol pool
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolId - Pool ID for the Bucket pool
   * @returns Transaction ready for signing and execution
   */
  async withdrawBucketTx(xTokens: string, poolId: number): Promise<Transaction> {
    console.log('Withdrawing Bucket BUCK', xTokens, poolId);
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('BUCKET')) {
      throw new Error(`Pool ${poolId} is not a Bucket protocol pool`);
    }

    console.log('Pool info', poolinfo);

    // Get receipts for this pool
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);

    if (receipt.length === 0) {
      throw new Error(`No ${poolinfo.poolName} Receipt found for withdrawal`);
    }

    // Get ALPHA receipt for the alpha_receipt parameter
    const alphaReceipt: any[] = await this.blockchain.getReceipts(1, this.address); // Pool ID 1 is typically ALPHA

    let alpha_receipt: any;
    if (alphaReceipt.length === 0) {
      [alpha_receipt] = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [getConf().ALPHA_POOL_RECEIPT],
        arguments: [],
      });
    } else {
      [alpha_receipt] = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [alphaReceipt[0].type],
        arguments: [tx.object(alphaReceipt[0].id)],
      });
    }

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
        tx.object(receipt[0].id),
        alpha_receipt,
        tx.object(poolDetailsMap[1].poolId), // ALPHA pool
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

    console.log('Bucket withdrawal transaction created successfully');
    return tx;
  }

  /**
   * Get user's xToken balance for the Bucket pool
   * @param poolId - Pool ID for the Bucket pool
   * @returns Promise<string> - xToken balance as string
   */
  async getUserBucketBalance(poolId: number): Promise<string> {
    const receipt = await this.blockchain.getReceipts(poolId, this.address);

    if (receipt.length === 0) {
      return '0';
    }

    // Extract balance from receipt if available
    return receipt[0].xTokenBalance?.toString() || '0';
  }

  /**
   * Check if user has any deposits in the Bucket pool
   * @param poolId - Pool ID for the Bucket pool
   * @returns Promise<boolean> - True if user has deposits
   */
  async hasDeposits(poolId: number): Promise<boolean> {
    const receipt = await this.blockchain.getReceipts(poolId, this.address);
    return receipt.length > 0;
  }

  /**
   * Get estimated withdrawal amount for given xTokens
   * @param poolId - Pool ID for the Bucket pool
   * @param xTokens - Amount of xTokens to withdraw
   * @returns Promise<string> - Estimated BUCK amount to receive
   */
  async getEstimatedWithdrawalAmount(poolId: number, xTokens: string): Promise<string> {
    // This would require pool state information to calculate accurately
    // For now, return a placeholder implementation
    console.log(`Estimating withdrawal for pool ${poolId}, xTokens: ${xTokens}`);

    // In a real implementation, you would:
    // 1. Get pool state from the blockchain
    // 2. Calculate the current exchange rate
    // 3. Apply any fees
    // 4. Return the estimated amount

    return xTokens; // Placeholder - 1:1 ratio
  }

  /**
   * Get pool information specific to Bucket protocol
   * @param poolId - Pool ID for the Bucket pool
   * @returns Pool information object
   */
  getBucketPoolInfo(poolId: number) {
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    if (!poolinfo.poolName?.includes('BUCKET')) {
      throw new Error(`Pool ${poolId} is not a Bucket protocol pool`);
    }

    return {
      poolId: poolinfo.poolId,
      poolName: poolinfo.poolName,
      strategyType: poolinfo.strategyType,
      packageId: poolinfo.packageId,
      investorId: poolinfo.investorId,
      receiptType: poolinfo.receipt.type,
      assetTypes: poolinfo.assetTypes,
      protocol: 'bucket',
    };
  }
}
