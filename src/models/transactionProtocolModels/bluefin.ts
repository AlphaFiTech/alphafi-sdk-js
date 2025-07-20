import { Transaction } from "@mysten/sui/transactions";
import { getConf } from "../../common/constants.js";
import { poolDetailsMap } from "../../common/maps.js";
import { Blockchain } from "../blockchain.js";
import { coinsList } from "../../common/coinsList.ts";
import { CoinStruct } from "@mysten/sui/client";
import { PoolUtils } from "../pool.js";

export class BluefinTransactions {
  constructor(private address: string, private blockchain: Blockchain, private poolUtils: PoolUtils) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }



  // Bluefin Deposit Type 1
  async depositBluefinSuiFirstTx(amount: string, poolId: number): Promise<Transaction> {
    console.log("Depositing Bluefin SUI First tx", amount, poolId);
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];
    
    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }
    
    console.log("Pool info", poolinfo);
    
    // Get the coin types - handle both single and double asset types
    let pool_token1: string;
    let pool_token2: string;
    
    if ('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes) {
      pool_token1 = poolinfo.assetTypes.token1;
      pool_token2 = poolinfo.assetTypes.token2;
    } else {
      throw new Error("This pool does not support double asset operations");
    }

    const coin1Name = pool_token1.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    const coin2Name = pool_token2.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    
    // Derive pool name from poolinfo or coin names
    const poolName = poolinfo.poolName || `BLUEFIN-${coin1Name}-${coin2Name}`;
    console.log("Pool name", poolName);
    console.log("Coin 1 name", coin1Name);
    console.log("Coin 2 name", coin2Name);  
    
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);
    console.log("Receipt", receipt);
    console.log("Pool ID", poolId);
    console.log("Address", this.address);
    
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

    // Handle coin fetching and splitting for deposit
    // For Bluefin pools, we typically need both tokens
    let depositCoinA: any;
    let depositCoinB: any;

    // Fetch coins of the second token type (typically the non-SUI token)
    let coins1: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;
    
    console.log(`Fetching coins for ${coin2Name} (${coinsList[coin2Name]?.type || pool_token2})`);

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType: coinsList[coin2Name]?.type,
          cursor: currentCursor,
        });

        coins1 = coins1.concat(response.data);

        // Check if there's a next page
        if (response.hasNextPage && response.nextCursor) {
          currentCursor = response.nextCursor;
        } else {
          // No more pages available
          break;
        }
      } while (true);
      
      console.log(`Found ${coins1.length} coins of type ${coin2Name}`);
    } catch (error) {
      console.log(`Error fetching coins: ${error}`);
      // Continue with empty coins array - will handle in next step
    }

    // Simple amount calculation - using imported getAmounts function
    const amounts = await this.poolUtils.getAmounts(poolId, true, amount);
    const amount1 = amounts[0];
    const amount2 = amounts[1];
    
    console.log(`Calculated amounts: ${coin1Name}=${amount1}, ${coin2Name}=${amount2}`);

    // Handle coin splitting based on available coins
    if (coins1.length >= 1) {
      // Create intermediate coin1 variable like in original
      console.log("Splitting coins where coin 1 is not SUI", coins1);
      let coin1: any;
      [coin1] = tx.splitCoins(tx.object(coins1[0].coinObjectId), [0]);
      tx.mergeCoins(
        coin1,
        coins1.map((c) => c.coinObjectId),
      );
      [depositCoinB] = tx.splitCoins(coin1, [amount2]);
      
      // Transfer the remaining coin1 back to the user (this prevents UnusedValueWithoutDrop error)
      tx.transferObjects([coin1], this.address);
    } else {
      // If no coins of second type, assume it's SUI or create zero coin
      if (coin2Name === "SUI") {
        console.log("Splitting SUI coins where coin 2 is SUI");
        [depositCoinB] = tx.splitCoins(tx.gas, [amount2]);
      } else {
        throw new Error(`No ${coin2Name} coins found in wallet for deposit`);
      }
    }

    // Handle first token (typically SUI)
    if (coin1Name === "SUI") {
      console.log("Splitting SUI coins where coin 1 is SUI");
      [depositCoinA] = tx.splitCoins(tx.gas, [amount1]);
    } else {
      // For non-SUI first tokens, would need similar logic as above
      throw new Error(`Complex deposits with ${coin1Name} as first token not yet implemented`);
    }

    console.log("Pool name", poolName);
    console.log("Deposit coin A", depositCoinA);
    console.log("Deposit coin B", depositCoinB);
    // Pool-specific deposit logic
    if (poolName === "BLUEFIN-SUI-USDC") {
      console.log("Depositing Bluefin SUI USDC");
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList["BLUE"]?.type,
          coinsList["SUI"].type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === "BLUEFIN-SUI-BUCK") {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList["BLUE"]?.type,
          coinsList["SUI"].type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUI_BUCK_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BUCK_SUI_CETUS_POOL_ID), // cetusPoolMap["BUCK-SUI"]
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === "BLUEFIN-SUI-AUSD") {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList["BLUE"]?.type,
          coinsList["SUI"].type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUI_AUSD_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().AUSD_SUI_CETUS_POOL_ID), // cetusPoolMap["AUSD-SUI"]
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === "BLUEFIN-AUTOBALANCE-SUI-USDC") {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList["BLUE"]?.type,
          coinsList["SUI"].type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === "BLUEFIN-AUTOBALANCE-SUI-LBTC") {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v3`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList["BLUE"]?.type,
          coinsList["SUI"].type,
          coinsList["DEEP"]?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUI_LBTC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL), // bluefinPoolMap["DEEP-SUI"]
          tx.object(getConf().LBTC_SUI_CETUS_POOL_ID), // cetusPoolMap["LBTC-SUI"]
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      // Fallback to generic implementation
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList["BLUE"]?.type || "0x0000000000000000000000000000000000000000000000000000000000000000::blue::BLUE",
          coinsList["SUI"].type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUIUSDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SUIUSDT_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }

  // Example: Withdraw Type 1
  async withdrawBluefinSuiFirstTx(xTokens: string, poolId: number): Promise<Transaction> {
    console.log("Withdrawing Bluefin SUI First tx", xTokens, poolId);
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];
    
    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }
    
    // Get the coin types - handle both single and double asset types
    let pool_token1: string;
    let pool_token2: string;
    
    if ('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes) {
      pool_token1 = poolinfo.assetTypes.token1;
      pool_token2 = poolinfo.assetTypes.token2;
    } else {
      throw new Error("This pool does not support double asset operations");
    }

    const coin1Name = pool_token1.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    const coin2Name = pool_token2.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    
    // Derive pool name from poolinfo or coin names
    const poolName = poolinfo.poolName || `BLUEFIN-${coin1Name}-${coin2Name}`;
    console.log("Pool name", poolName);

    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);
    const alphaReceipt: any[] = await this.blockchain.getReceipts(1, this.address); // Pool ID 1 is ALPHA
    console.log("Bluefin receipts", receipt, receipt[0], receipt[0].id);
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
          typeArguments: [alphaReceipt[0].type],
          arguments: [tx.object(alphaReceipt[0].id)],
        });
      }

      // Use different argument patterns based on pool type, similar to deposit function
      if (poolName === "BLUEFIN-SUI-USDC") {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList["BLUE"]?.type,
            coinsList["SUI"].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt[0].id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === "BLUEFIN-SUI-BUCK") {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList["BLUE"]?.type,
            coinsList["SUI"].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt[0].id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().BLUEFIN_SUI_BUCK_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().BUCK_SUI_CETUS_POOL_ID), // cetusPoolMap["BUCK-SUI"]
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === "BLUEFIN-AUTOBALANCE-SUI-USDC") {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList["BLUE"]?.type,
            coinsList["SUI"].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
            tx.object(receipt[0].id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().USDC_SUI_CETUS_POOL_ID), // cetusPoolMap["USDC-SUI"]
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else if (poolName === "BLUEFIN-AUTOBALANCE-SUI-LBTC") {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v3`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList["BLUE"]?.type,
            coinsList["SUI"].type,
            coinsList["DEEP"]?.type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
            tx.object(receipt[0].id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().BLUEFIN_SUI_LBTC_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().BLUEFIN_DEEP_SUI_POOL), // bluefinPoolMap["DEEP-SUI"]
            tx.object(getConf().LBTC_SUI_CETUS_POOL_ID), // cetusPoolMap["LBTC-SUI"]
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // Fallback to generic implementation for type 1 pools
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
          typeArguments: [
            pool_token1,
            pool_token2,
            coinsList["BLUE"]?.type || "0x0000000000000000000000000000000000000000000000000000000000000000::blue::BLUE",
            coinsList["SUI"].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt[0].id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().BLUEFIN_SUIUSDT_USDC_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().USDC_SUIUSDT_CETUS_POOL_ID),
            tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else {
      throw new Error("No receipt found!");
    }
    return tx;
  }

  // Example: Withdraw Fungible
  // async withdrawFungible(xTokens: string, poolName: PoolName): Promise<Transaction> {
  //   const tx = new Transaction();
  //   const pool1 = doubleAssetPoolCoinMap[poolName].coin1;
  //   const pool2 = doubleAssetPoolCoinMap[poolName].coin2;
  //   const poolinfo = poolInfo[poolName];
  //   const ftCoin = await getCoinObject(poolinfo.receiptType, this.address, tx);

  //   if (ftCoin) {
  //     const ftCoinsToBurn = tx.splitCoins(ftCoin, [xTokens]);
  //     tx.moveCall({
  //       target: `${poolinfo.packageId}::alphafi_bluefin_stsui_sui_ft_pool::user_withdraw`,
  //       typeArguments: [
  //         coinsList[pool1].type,
  //         coinsList[pool2].type,
  //         poolinfo.receiptType,
  //         coinsList["BLUE"].type,
  //       ],
  //       arguments: [
  //         tx.object(getConf().ALPHA_FUNGIBLE_VERSION),
  //         ftCoinsToBurn,
  //         tx.object(poolinfo.poolId),
  //         tx.object(getConf().ALPHA_DISTRIBUTOR),
  //         tx.object(poolinfo.investorId),
  //         tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
  //         tx.object(getConf().BLUEFIN_STSUI_SUI_POOL),
  //         tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
  //         tx.object(getConf().LST_INFO),
  //         tx.object(getConf().SUI_SYSTEM_STATE),
  //         tx.object(getConf().CLOCK_PACKAGE_ID),
  //       ],
  //     });
  //     tx.transferObjects([ftCoin], this.address);
  //   } else {
  //     throw new Error("No ftCoin found!");
  //   }
  //   return tx;
  // }

  // Add more methods for other Bluefin pool actions as needed...
}