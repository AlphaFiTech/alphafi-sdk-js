import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { PoolUtils } from '../pool.ts';
import { coinsListByType } from 'src/common/coinsList.ts';

export class CetusTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.address = address;
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  // CETUS Double Asset Pool Deposit
  async depositCetusTx(amount: string, poolId: string, isAmountA: boolean): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    const coin1 = poolinfo.assetTypes[0];
    const coin2 = poolinfo.assetTypes[1];
    const coin1Name = coinsListByType[coin1].name;
    const coin2Name = coinsListByType[coin2].name;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);

    // Handle receipt creation
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

    // Simple implementation for SUI pairs
    if (coin2Name === 'SUI') {
      // For now, only support coin1-SUI pairs with SUI as the second token
      const [depositCoinA] = tx.splitCoins(tx.gas, [amount]); // Using gas for SUI
      const [depositCoinB] = tx.splitCoins(tx.gas, [amount]); // This should be calculated properly

      if (poolinfo.poolName === 'ALPHA-SUI') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_deposit`,
          typeArguments: [coin1, coin2],
          arguments: [
            tx.object(getConf().VERSION),
            someReceipt,
            tx.object(poolinfo.poolId),
            depositCoinA,
            depositCoinB,
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            tx.object(getConf().CETUS_SUI_CETUS_POOL_ID), // This should come from cetusPoolMap
            tx.object(poolinfo.parentPoolId),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // General CETUS pool deposit
        tx.moveCall({
          target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_deposit`,
          typeArguments: [coin1, coin2],
          arguments: [
            tx.object(getConf().VERSION),
            someReceipt,
            tx.object(poolinfo.poolId),
            depositCoinA,
            depositCoinB,
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            tx.object(poolinfo.parentPoolId), // This should come from cetusPoolMap
            tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
            tx.object(poolinfo.parentPoolId),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      }
    } else {
      throw new Error(
        `Complex CETUS deposits not yet implemented for ${coin1Name}-${coin2Name}. Please use the main SDK for full functionality.`,
      );
    }

    return tx;
  }

  // CETUS Withdraw
  async withdrawCetusTx(xTokens: string, poolId: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    const coin1 = poolinfo.assetTypes[0];
    const coin2 = poolinfo.assetTypes[1];

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

      if (poolinfo.poolName === 'ALPHA-SUI') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
          typeArguments: [coin1, coin2],
          arguments: [
            tx.object(getConf().VERSION),
            tx.object(receipt.id),
            alpha_receipt,
            tx.object(getConf().ALPHA_POOL),
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.pure.u128(xTokens),
            tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
            tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
            tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
            tx.object(poolinfo.parentPoolId),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        // Handle different pool types based on package version or pool configuration
        if (
          poolinfo.packageNumber === 1 &&
          (poolinfo.poolName === 'WUSDC-WBTC' ||
            poolinfo.poolName === 'USDC-USDT' ||
            poolinfo.poolName === 'USDC-WUSDC' ||
            poolinfo.poolName === 'USDC-ETH')
        ) {
          tx.moveCall({
            target: `${
              getConf().ALPHA_LATEST_PACKAGE_ID
            }::alphafi_cetus_pool_base_a::user_withdraw`,
            typeArguments: [coin1, coin2],
            arguments: [
              tx.object(getConf().VERSION),
              tx.object(receipt.id),
              alpha_receipt,
              tx.object(getConf().ALPHA_POOL),
              tx.object(poolinfo.poolId),
              tx.object(getConf().ALPHA_DISTRIBUTOR),
              tx.object(poolinfo.investorId),
              tx.pure.u128(xTokens),
              tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
              tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
              tx.object(poolinfo.parentPoolId), // Should come from cetusPoolMap
              tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
              tx.object(poolinfo.parentPoolId),
              tx.object(getConf().CLOCK_PACKAGE_ID),
            ],
          });
        } else {
          tx.moveCall({
            target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_withdraw`,
            typeArguments: [coin1, coin2],
            arguments: [
              tx.object(getConf().VERSION),
              tx.object(receipt.id),
              alpha_receipt,
              tx.object(getConf().ALPHA_POOL),
              tx.object(poolinfo.poolId),
              tx.object(getConf().ALPHA_DISTRIBUTOR),
              tx.object(poolinfo.investorId),
              tx.pure.u128(xTokens),
              tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
              tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
              tx.object(poolinfo.parentPoolId), // Should come from cetusPoolMap
              tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
              tx.object(poolinfo.parentPoolId),
              tx.object(getConf().CLOCK_PACKAGE_ID),
            ],
          });
        }
      }
    } else {
      throw new Error('No receipt found!');
    }

    return tx;
  }

  // Add more CETUS specific methods as needed...
}
