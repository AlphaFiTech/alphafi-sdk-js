import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList, coinsListByType } from '../../common/coinsList.ts';
import { PoolUtils } from '../pool.js';

export class BluefinTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
    this.address = address;
  }

  // Bluefin Deposit Type 1
  async depositBluefinSuiFirstTx(
    amount: string,
    poolId: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Get the coin types - handle both single and double asset types
    let pool_token1: string = poolinfo.assetTypes[0];
    let pool_token2: string = poolinfo.assetTypes[1];
    const coin1Name = coinsListByType[pool_token1].name;
    const coin2Name = coinsListByType[pool_token2].name;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);

    // Handle receipt creation for deposit
    let someReceipt: any;
    if (!receipt) {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt.type],
        arguments: [tx.object(receipt.id)],
      });
    }

    // Simple amount calculation - using imported getAmounts function
    const [amount1, amount2] = await this.poolUtils.getAmounts(poolId, isAmountA, amount);
    const coin1 = await this.poolUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.poolUtils.getCoinFromWallet(tx, this.address, pool_token2);
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);

    tx.transferObjects([coin1, coin2], this.address);
    const poolName = poolinfo.poolName;

    // Pool-specific deposit logic
    if (poolName === 'BLUEFIN-SUI-USDC') {
      console.log('Depositing Bluefin SUI USDC');
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
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
    } else if (poolName === 'BLUEFIN-SUI-BUCK') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
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
    } else if (poolName === 'BLUEFIN-SUI-AUSD') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
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
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-SUI-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
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
    } else if (poolName === 'BLUEFIN-AUTOBALANCE-SUI-LBTC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v3`,
        typeArguments: [
          coinsList[coin1Name]?.type || pool_token1,
          coinsList[coin2Name]?.type || pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
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
          coinsList['BLUE']?.type ||
            '0x0000000000000000000000000000000000000000000000000000000000000000::blue::BLUE',
          coinsList['SUI'].type,
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
  async withdrawBluefinSuiFirstTx(xTokens: string, poolId: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    // Get the coin types - handle both single and double asset types
    let pool_token1: string = poolinfo.assetTypes[0];
    let pool_token2: string = poolinfo.assetTypes[1];
    const coin1Name = coinsListByType[pool_token1].name;
    const coin2Name = coinsListByType[pool_token2].name;

    // Derive pool name from poolinfo or coin names
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    const alphaReceipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );

    if (receipt) {
      let alpha_receipt: any;
      if (!alphaReceipt) {
        [alpha_receipt] = tx.moveCall({
          target: `0x1::option::none`,
          typeArguments: [getConf().ALPHA_POOL_RECEIPT],
          arguments: [],
        });
      } else {
        [alpha_receipt] = tx.moveCall({
          target: `0x1::option::some`,
          typeArguments: [alphaReceipt.type],
          arguments: [tx.object(alphaReceipt.id)],
        });
      }

      // Use different argument patterns based on pool type, similar to deposit function
      if (poolName === 'BLUEFIN-SUI-USDC') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList['BLUE']?.type,
            coinsList['SUI'].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
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
      } else if (poolName === 'BLUEFIN-SUI-BUCK') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList['BLUE']?.type,
            coinsList['SUI'].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
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
      } else if (poolName === 'BLUEFIN-AUTOBALANCE-SUI-USDC') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v2`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList['BLUE']?.type,
            coinsList['SUI'].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
            tx.object(receipt.id),
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
      } else if (poolName === 'BLUEFIN-AUTOBALANCE-SUI-LBTC') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_withdraw_v3`,
          typeArguments: [
            coinsList[coin1Name]?.type || pool_token1,
            coinsList[coin2Name]?.type || pool_token2,
            coinsList['BLUE']?.type,
            coinsList['SUI'].type,
            coinsList['DEEP']?.type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
            tx.object(receipt.id),
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
            coinsList['BLUE']?.type ||
              '0x0000000000000000000000000000000000000000000000000000000000000000::blue::BLUE',
            coinsList['SUI'].type,
          ],
          arguments: [
            tx.object(getConf().ALPHA_4_VERSION),
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
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
      throw new Error('No receipt found!');
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
