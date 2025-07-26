import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap } from '../../common/maps.js';
// import { coinsList } from "../../common/coins.js";
import { Blockchain } from '../blockchain.js';

// Receipt type definition
interface Receipt {
  objectId: string;
  content: {
    type: string;
    fields: {
      name: string;
      xTokenBalance?: string;
      pool_id?: string;
      owner?: string;
      [key: string]: any;
    };
  };
}

// Simple naviAssetMap for now - this should be imported from the main SDK when available
const naviAssetMap: Record<string, number> = {
  SUI: 0,
  USDC: 1,
  USDT: 2,
  WETH: 3,
  WBTC: 4,
  VSUI: 5,
  HASUI: 6,
  STSUI: 7,
  NAVX: 8,
  NS: 9,
  DEEP: 10,
  WAL: 11,
  SUIBTC: 12,
  SUIUSDT: 13,
};

export class NaviTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
  ) {
    this.blockchain = blockchain;
  }

  /**
   * Get receipts for a specific pool without cache
   * @param poolId - The pool ID to get receipts for
   * @param address - The user address
   * @param suiClient - The Sui client instance
   * @returns Promise<Receipt[]> - Array of receipts
   */
  static async getReceiptsWithoutCache(
    poolId: number,
    address: string,
    suiClient: SuiClient,
  ): Promise<Receipt[]> {
    const poolinfo = poolDetailsMap[poolId];
    if (!poolinfo || !poolinfo.receipt || !poolinfo.receipt.type) {
      console.log(`No receipt type found for pool ${poolId}`);
      return [];
    }

    const receipts: Receipt[] = [];
    let currentCursor: string | null | undefined = null;

    while (true) {
      try {
        const paginatedObjects = await suiClient.getOwnedObjects({
          owner: address,
          cursor: currentCursor,
          filter: {
            StructType: poolinfo.receipt.type,
          },
          options: {
            showContent: true,
          },
        });

        // Traverse the current page data and push to receipts array
        paginatedObjects.data.forEach((obj) => {
          if (obj.data && obj.data.content && 'fields' in obj.data.content) {
            const receipt = obj.data as unknown as Receipt;
            if (receipt.content?.fields?.name === poolinfo.receipt.name) {
              receipts.push(receipt);
            }
          }
        });

        // Check if there's a next page
        if (paginatedObjects.hasNextPage && paginatedObjects.nextCursor) {
          currentCursor = paginatedObjects.nextCursor;
        } else {
          // No more pages available
          break;
        }
      } catch (error) {
        console.error(`Error fetching receipts for pool ${poolId}:`, error);
        break;
      }
    }

    return receipts;
  }

  // NAVI Single Asset Pool Deposit
  async depositNaviTx(amount: string, poolId: number): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Get the coin type - handle both single and double asset types
    let coin: string;
    if ('token' in poolinfo.assetTypes) {
      coin = poolinfo.assetTypes.token;
    } else if ('token1' in poolinfo.assetTypes) {
      coin = poolinfo.assetTypes.token1;
    } else {
      throw new Error('No coin type found for this pool');
    }

    // Extract coin name from type (assuming it's the last part after ::)
    const coinName = coin.split('::').pop()?.toUpperCase() || 'SUI';
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);

    // Handle receipt creation
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
        typeArguments: [receipt[0].content.type],
        arguments: [tx.object(receipt[0].objectId)],
      });
    }

    // Handle coin splitting for deposit
    if (coinName === 'SUI') {
      const [depositCoin] = tx.splitCoins(tx.gas, [amount]);

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_pool::user_deposit`,
        typeArguments: [coin],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(poolinfo.parentPoolId),
          tx.pure.u8(naviAssetMap[coinName] || 0),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      // For other coins, we'll need to implement getCoinObject method
      // For now, throw an error suggesting implementation
      throw new Error(
        `Non-SUI deposits not yet implemented for ${coinName}. Please use the main SDK for full functionality.`,
      );
    }

    return tx;
  }

  // NAVI Withdraw
  async withdrawNaviTx(xTokens: string, poolId: number): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Get the coin type - handle both single and double asset types
    let coin: string;
    if ('token' in poolinfo.assetTypes) {
      coin = poolinfo.assetTypes.token;
    } else if ('token1' in poolinfo.assetTypes) {
      coin = poolinfo.assetTypes.token1;
    } else {
      throw new Error('No coin type found for this pool');
    }

    const coinName = coin.split('::').pop()?.toUpperCase() || 'SUI';
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);
    const alphaReceipt: any[] = await this.blockchain.getReceipts(1, this.address); // Pool ID 1 is ALPHA

    if (receipt.length > 0) {
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
          typeArguments: [alphaReceipt[0].content.type],
          arguments: [tx.object(alphaReceipt[0].objectId)],
        });
      }

      // Handle different package versions
      if (poolinfo.packageNumber === 3) {
        tx.moveCall({
          target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
          typeArguments: [coin],
          arguments: [
            tx.object(getConf().ALPHA_3_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt[0].objectId),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.pure.u64(xTokens),
            tx.object(poolinfo.investorId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().PRICE_ORACLE),
            tx.object(getConf().NAVI_STORAGE),
            tx.object(poolinfo.parentPoolId),
            tx.pure.u8(naviAssetMap[coinName] || 0),
            tx.object(getConf().NAVI_INCENTIVE_V3),
            tx.object(getConf().NAVI_INCENTIVE_V2),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolinfo.packageNumber === 9) {
        tx.moveCall({
          target: `${
            getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
          }::alphafi_navi_pool_v2::user_withdraw_v2`,
          typeArguments: [coin],
          arguments: [
            tx.object(getConf().ALPHA_NAVI_V2_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt[0].objectId),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.pure.u64(xTokens),
            tx.object(poolinfo.investorId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().PRICE_ORACLE),
            tx.object(getConf().NAVI_STORAGE),
            tx.object(poolinfo.parentPoolId),
            tx.pure.u8(naviAssetMap[coinName] || 0),
            tx.object(getConf().NAVI_INCENTIVE_V3),
            tx.object(getConf().NAVI_INCENTIVE_V2),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        tx.moveCall({
          target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
          typeArguments: [coin],
          arguments: [
            tx.object(getConf().VERSION),
            tx.object(receipt[0].objectId),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.pure.u64(xTokens),
            tx.object(poolinfo.investorId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(getConf().PRICE_ORACLE),
            tx.object(getConf().NAVI_STORAGE),
            tx.object(poolinfo.parentPoolId),
            tx.pure.u8(naviAssetMap[coinName] || 0),
            tx.object(getConf().NAVI_INCENTIVE_V3),
            tx.object(getConf().NAVI_INCENTIVE_V2),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else {
      throw new Error('No receipt found!');
    }

    return tx;
  }

  // Add more NAVI specific methods as needed...
}
