import { Transaction } from "@mysten/sui/transactions";
import { getConf } from "../../common/constants.js";
import { poolDetailsMap } from "../../common/maps.js";
import { Blockchain } from "../blockchain.js";
import { coinsList } from "../../common/coinsList.ts";
import { PoolUtils } from "../pool.js";

export class ClaimRewardsTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Main claim rewards transaction builder
   * This function iterates through all pools and claims rewards for each one
   */
  async claimAllRewardsTx(): Promise<Transaction> {
    console.log('Creating claim all rewards transaction for address:', this.address);
    const tx = new Transaction();

    // Get multi receipts to warm up the cache
    await this.blockchain.getMultiReceipt(this.address);

    // Get ALPHA receipt for the alpha_receipt parameter
    const alphaReceipt = await this.blockchain.getReceipts(1, this.address); // Pool ID 1 is typically ALPHA
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

    // Get all pool IDs from poolDetailsMap
    const poolIds = Object.keys(poolDetailsMap)
      .map(Number)
      .filter((id) => !isNaN(id));

    for (const poolId of poolIds) {
      const poolinfo = poolDetailsMap[poolId];

      // Skip pools without valid poolId
      if (!poolinfo || !poolinfo.poolId || poolinfo.poolId === '') {
        continue;
      }

      // Skip ALPHA pool (pool ID 1) as it's handled separately
      if (poolId === 1) {
        continue;
      }

      try {
        alpha_receipt = await this.claimRewardsForPool(tx, poolId, alpha_receipt);
      } catch (error) {
        console.warn(`Failed to claim rewards for pool ${poolId}:`, error);
        // Continue with other pools even if one fails
      }
    }

    return tx;
  }

  /**
   * Claim rewards for a specific pool
   */
  async claimRewardsForPool(tx: Transaction, poolId: number, alpha_receipt: any): Promise<any> {
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    console.log(`Claiming rewards for pool ${poolId}: ${poolinfo.poolName}`);

    // Get receipts for this pool
    const receipts = await this.blockchain.getReceipts(poolId, this.address);

    if (receipts.length === 0) {
      console.log(`No receipts found for pool ${poolId}, skipping`);
      return alpha_receipt;
    }

    // Determine pool strategy and call appropriate claim method
    const strategyType = poolinfo.strategyType;
    const poolName = poolinfo.poolName || `Pool-${poolId}`;

    // Handle different pool types based on package number and protocol
    if (poolinfo.packageId.includes('alphafi_navi_pool_v2')) {
      return this.claimNaviV2Rewards(tx, poolId, receipts, alpha_receipt);
    } else if (poolinfo.packageId.includes('alphafi_bluefin')) {
      return this.claimBluefinRewards(tx, poolId, receipts, alpha_receipt, poolName);
    } else if (poolinfo.packageId.includes('alphafi_navi')) {
      return this.claimNaviRewards(tx, poolId, receipts, alpha_receipt, poolName);
    } else if (poolinfo.packageId.includes('alphafi_cetus')) {
      return this.claimCetusRewards(tx, poolId, receipts, alpha_receipt, poolName);
    } else if (poolinfo.packageId.includes('alphafi_bucket')) {
      return this.claimBucketRewards(tx, poolId, receipts, alpha_receipt);
    } else {
      console.warn(`Unknown pool type for pool ${poolId}, skipping`);
      return alpha_receipt;
    }
  }

  /**
   * Claim rewards for Navi V2 pools
   */
  private claimNaviV2Rewards(
    tx: Transaction,
    poolId: number,
    receipts: any[],
    alpha_receipt: any,
  ): any {
    const poolinfo = poolDetailsMap[poolId];

    // Get single asset type for Navi pools
    let coinType: string;
    if ('token' in poolinfo.assetTypes) {
      coinType = poolinfo.assetTypes.token;
    } else {
      throw new Error(`Navi pool ${poolId} does not have single asset type`);
    }

    const coinName = coinType.split('::').pop()?.toUpperCase() || 'UNKNOWN';

    receipts.forEach((receipt) => {
      alpha_receipt = tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`,
        typeArguments: [coinsList[coinName]?.type || coinType],
        arguments: [
          tx.object(getConf().ALPHA_NAVI_V2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolinfo.poolId),
          tx.object(poolDetailsMap[1].poolId), // ALPHA pool
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    });

    return alpha_receipt;
  }

  /**
   * Claim rewards for Bluefin pools
   */
  private claimBluefinRewards(
    tx: Transaction,
    poolId: number,
    receipts: any[],
    alpha_receipt: any,
    poolName: string,
  ): any {
    const poolinfo = poolDetailsMap[poolId];

    // Get coin types for Bluefin pools
    let coinAType: string, coinBType: string;
    if ('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes) {
      coinAType = poolinfo.assetTypes.token1;
      coinBType = poolinfo.assetTypes.token2;
    } else {
      throw new Error(`Bluefin pool ${poolId} does not have double asset types`);
    }

    const coinAName = coinAType.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    const coinBName = coinBType.split('::').pop()?.toUpperCase() || 'UNKNOWN';

    receipts.forEach((receipt) => {
      // Determine the specific Bluefin pool type and call appropriate method
      if (
        poolName.includes('SUI-USDC') ||
        poolName.includes('SUI-BUCK') ||
        poolName.includes('SUI-AUSD')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (
        poolName.includes('USDT-USDC') ||
        poolName.includes('AUSD-USDC') ||
        poolName.includes('WBTC-USDC') ||
        poolName.includes('SEND-USDC') ||
        poolName.includes('SUIUSDT-USDC') ||
        poolName.includes('WAL-USDC')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (
        poolName.includes('ALPHA-USDC') ||
        poolName.includes('NAVX-VSUI') ||
        poolName.includes('BLUE-USDC')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (
        poolName.includes('BLUE-SUI') ||
        poolName.includes('WBTC-SUI') ||
        poolName.includes('DEEP-SUI')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('STSUI-SUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_stsui_sui_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (
        poolName.includes('STSUI-USDC') ||
        poolName.includes('STSUI-WSOL') ||
        poolName.includes('STSUI-ETH') ||
        poolName.includes('STSUI-BUCK') ||
        poolName.includes('STSUI-MUSD')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_STSUI_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('ALPHA-STSUI') || poolName.includes('WAL-STSUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_STSUI_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // Default Bluefin V2 type 1 pool
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    });

    return alpha_receipt;
  }

  /**
   * Claim rewards for Navi loop pools
   */
  private claimNaviRewards(
    tx: Transaction,
    poolId: number,
    receipts: any[],
    alpha_receipt: any,
    poolName: string,
  ): any {
    const poolinfo = poolDetailsMap[poolId];

    receipts.forEach((receipt) => {
      if (poolName.includes('USDT-USDC')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_usdt_usdc_pool::get_user_rewards_all`,
          arguments: [
            tx.object(getConf().ALPHA_5_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('SUI-STSUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::get_user_rewards_all`,
          arguments: [
            tx.object(getConf().ALPHA_5_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('SUI-VSUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_sui_vsui_pool::get_user_rewards_all`,
          arguments: [
            tx.object(getConf().ALPHA_2_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('USDC-USDT')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_native_usdc_usdt_pool::get_user_rewards_all`,
          arguments: [
            tx.object(getConf().ALPHA_2_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName.includes('HASUI-SUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_hasui_sui_pool::get_user_rewards_all`,
          arguments: [
            tx.object(getConf().ALPHA_2_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // Default Navi V2 single asset
        const coinType =
          'token' in poolinfo.assetTypes ? poolinfo.assetTypes.token : coinsList['SUI'].type;
        const coinName = coinType.split('::').pop()?.toUpperCase() || 'SUI';

        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`,
          typeArguments: [coinsList[coinName]?.type || coinType],
          arguments: [
            tx.object(getConf().ALPHA_3_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    });

    return alpha_receipt;
  }

  /**
   * Claim rewards for Cetus pools
   */
  private claimCetusRewards(
    tx: Transaction,
    poolId: number,
    receipts: any[],
    alpha_receipt: any,
    poolName: string,
  ): any {
    const poolinfo = poolDetailsMap[poolId];

    // Get coin types for Cetus pools
    let coinAType: string, coinBType: string;
    if ('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes) {
      coinAType = poolinfo.assetTypes.token1;
      coinBType = poolinfo.assetTypes.token2;
    } else {
      throw new Error(`Cetus pool ${poolId} does not have double asset types`);
    }

    const coinAName = coinAType.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    const coinBName = coinBType.split('::').pop()?.toUpperCase() || 'UNKNOWN';

    receipts.forEach((receipt) => {
      if (poolName.includes('SUI')) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (
        poolName.includes('WUSDC-WBTC') ||
        poolName.includes('USDC-USDT') ||
        poolName.includes('USDC-WUSDC') ||
        poolName.includes('USDC-ETH')
      ) {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_pool_base_a::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        alpha_receipt = tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_pool::get_user_rewards_all`,
          typeArguments: [
            coinsList[coinAName]?.type || coinAType,
            coinsList[coinBName]?.type || coinBType,
          ],
          arguments: [
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(poolinfo.poolId),
            tx.object(poolDetailsMap[1].poolId), // ALPHA pool
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    });

    return alpha_receipt;
  }

  /**
   * Claim rewards for Bucket pools
   */
  private claimBucketRewards(
    tx: Transaction,
    poolId: number,
    receipts: any[],
    alpha_receipt: any,
  ): any {
    const poolinfo = poolDetailsMap[poolId];

    receipts.forEach((receipt) => {
      alpha_receipt = tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bucket_pool_v1::get_user_rewards_all`,
        arguments: [
          tx.object(getConf().ALPHA_3_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolinfo.poolId),
          tx.object(poolDetailsMap[1].poolId), // ALPHA pool
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    });

    return alpha_receipt;
  }

  /**
   * Claim rewards for a specific pool by ID
   */
  async claimRewardsForSpecificPool(poolId: number): Promise<Transaction> {
    console.log(`Creating claim rewards transaction for pool ${poolId}`);
    const tx = new Transaction();

    // Get ALPHA receipt
    const alphaReceipt = await this.blockchain.getReceipts(1, this.address);
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

    // Claim rewards for the specific pool
    await this.claimRewardsForPool(tx, poolId, alpha_receipt);

    return tx;
  }
}
