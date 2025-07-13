import { Transaction } from "@mysten/sui/transactions";
import { getConf } from "../../common/constants.js";
import { poolDetailsMap } from "../../common/maps.js";
// import { coinsList } from "../../common/coins.js";
import { Blockchain } from "../blockchain.js";

export class CetusTransactions {
  constructor(private address: string, private blockchain: Blockchain) {
    this.blockchain = blockchain;
  }

  // CETUS Double Asset Pool Deposit
  async depositCetusTx(amount: string, poolId: number, isAmountA: boolean = true): Promise<Transaction> {
    const txb = new Transaction();
    const poolinfo = poolDetailsMap[poolId];
    
    // Get the coin types - CETUS pools are double asset
    if (!('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes)) {
      throw new Error("This is not a double asset pool");
    }

    const coin1 = poolinfo.assetTypes.token1;
    const coin2 = poolinfo.assetTypes.token2;
    const coin1Name = coin1.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    const coin2Name = coin2.split('::').pop()?.toUpperCase() || 'UNKNOWN';
    
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);

    // Handle receipt creation
    let someReceipt: any;
    if (receipt.length === 0) {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt[0].content.type],
        arguments: [txb.object(receipt[0].objectId)],
      });
    }

    // Simple implementation for SUI pairs
    if (coin2Name === "SUI") {
      // For now, only support coin1-SUI pairs with SUI as the second token
      const [depositCoinA] = txb.splitCoins(txb.gas, [amount]); // Using gas for SUI
      const [depositCoinB] = txb.splitCoins(txb.gas, [amount]); // This should be calculated properly

      if (poolinfo.poolName === "ALPHA-SUI") {
        txb.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_deposit`,
          typeArguments: [coin1, coin2],
          arguments: [
            txb.object(getConf().VERSION),
            someReceipt,
            txb.object(poolinfo.poolId),
            depositCoinA,
            depositCoinB,
            txb.object(getConf().ALPHA_DISTRIBUTOR),
            txb.object(poolinfo.investorId),
            txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            txb.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            txb.object(getConf().CETUS_SUI_CETUS_POOL_ID), // This should come from cetusPoolMap
            txb.object(poolinfo.parentPoolId),
            txb.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // General CETUS pool deposit
        txb.moveCall({
          target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_deposit`,
          typeArguments: [coin1, coin2],
          arguments: [
            txb.object(getConf().VERSION),
            someReceipt,
            txb.object(poolinfo.poolId),
            depositCoinA,
            depositCoinB,
            txb.object(getConf().ALPHA_DISTRIBUTOR),
            txb.object(poolinfo.investorId),
            txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            txb.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            txb.object(poolinfo.parentPoolId), // This should come from cetusPoolMap
            txb.object(getConf().CETUS_SUI_CETUS_POOL_ID),
            txb.object(poolinfo.parentPoolId),
            txb.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else {
      throw new Error(`Complex CETUS deposits not yet implemented for ${coin1Name}-${coin2Name}. Please use the main SDK for full functionality.`);
    }

    return txb;
  }

  // CETUS Withdraw
  async withdrawCetusTx(xTokens: string, poolId: number): Promise<Transaction> {
    const txb = new Transaction();
    const poolinfo = poolDetailsMap[poolId];
    
    // Get the coin types
    if (!('token1' in poolinfo.assetTypes && 'token2' in poolinfo.assetTypes)) {
      throw new Error("This is not a double asset pool");
    }

    const coin1 = poolinfo.assetTypes.token1;
    const coin2 = poolinfo.assetTypes.token2;
    
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);
    const alphaReceipt: any[] = await this.blockchain.getReceipts(1, this.address); // Pool ID 1 is ALPHA

    if (receipt.length > 0) {
      let alpha_receipt: any;
      if (alphaReceipt.length === 0) {
        [alpha_receipt] = txb.moveCall({
          target: `0x1::option::none`,
          typeArguments: [getConf().ALPHA_POOL_RECEIPT],
          arguments: [],
        });
      } else {
        [alpha_receipt] = txb.moveCall({
          target: `0x1::option::some`,
          typeArguments: [alphaReceipt[0].content.type],
          arguments: [txb.object(alphaReceipt[0].objectId)],
        });
      }

      if (poolinfo.poolName === "ALPHA-SUI") {
        txb.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
          typeArguments: [coin1, coin2],
          arguments: [
            txb.object(getConf().VERSION),
            txb.object(receipt[0].objectId),
            alpha_receipt,
            txb.object(getConf().ALPHA_POOL),
            txb.object(poolinfo.poolId),
            txb.object(getConf().ALPHA_DISTRIBUTOR),
            txb.object(poolinfo.investorId),
            txb.pure.u128(xTokens),
            txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            txb.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            txb.object(getConf().CETUS_SUI_CETUS_POOL_ID),
            txb.object(poolinfo.parentPoolId),
            txb.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // Handle different pool types based on package version or pool configuration
        if (poolinfo.packageNumber === 1 && 
            (poolinfo.poolName === "WUSDC-WBTC" || 
             poolinfo.poolName === "USDC-USDT" || 
             poolinfo.poolName === "USDC-WUSDC" || 
             poolinfo.poolName === "USDC-ETH")) {
          txb.moveCall({
            target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool_base_a::user_withdraw`,
            typeArguments: [coin1, coin2],
            arguments: [
              txb.object(getConf().VERSION),
              txb.object(receipt[0].objectId),
              alpha_receipt,
              txb.object(getConf().ALPHA_POOL),
              txb.object(poolinfo.poolId),
              txb.object(getConf().ALPHA_DISTRIBUTOR),
              txb.object(poolinfo.investorId),
              txb.pure.u128(xTokens),
              txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
              txb.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
              txb.object(poolinfo.parentPoolId), // Should come from cetusPoolMap
              txb.object(getConf().CETUS_SUI_CETUS_POOL_ID),
              txb.object(poolinfo.parentPoolId),
              txb.object(getConf().CLOCK_PACKAGE_ID),
            ],
          });
        } else {
          txb.moveCall({
            target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_withdraw`,
            typeArguments: [coin1, coin2],
            arguments: [
              txb.object(getConf().VERSION),
              txb.object(receipt[0].objectId),
              alpha_receipt,
              txb.object(getConf().ALPHA_POOL),
              txb.object(poolinfo.poolId),
              txb.object(getConf().ALPHA_DISTRIBUTOR),
              txb.object(poolinfo.investorId),
              txb.pure.u128(xTokens),
              txb.object(getConf().CETUS_GLOBAL_CONFIG_ID),
              txb.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
              txb.object(poolinfo.parentPoolId), // Should come from cetusPoolMap
              txb.object(getConf().CETUS_SUI_CETUS_POOL_ID),
              txb.object(poolinfo.parentPoolId),
              txb.object(getConf().CLOCK_PACKAGE_ID),
            ],
          });
        }
      }
    } else {
      throw new Error("No receipt found!");
    }

    return txb;
  }

  // Add more CETUS specific methods as needed...
} 