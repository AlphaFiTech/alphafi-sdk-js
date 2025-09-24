import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';

export class NaviLoopingTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
  }

  // NAVI Looping Deposit
  async depositNaviLoopingTx(poolId: string, amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const poolName = poolinfo.poolName;
    const pool_token: string = poolinfo.assetTypes[0];

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const coin = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token);
    const [depositCoin] = tx.splitCoins(coin, [amount]);
    tx.transferObjects([coin], this.address);

    if (poolName === 'NAVI-LOOP-HASUI-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_hasui_sui_pool::user_deposit`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_HASUI_POOL),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['HASUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-SUI-VSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_sui_vsui_pool::user_deposit`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_VSUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-SUI-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_deposit`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_STSUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['STSUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_usdc_usdt_pool::user_deposit`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_USDC_POOL),
          tx.object(getConf().NAVI_USDT_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['USDC-USDT']),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-USDT-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_usdt_usdc_pool::user_deposit`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoin,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_USDT_POOL),
          tx.object(getConf().NAVI_USDC_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['USDT-USDC']),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }

  // NAVI Looping Withdraw
  async withdrawNaviLoopingTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    const alphaReceipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );

    if (!receipt) throw new Error('No receipt found!');

    let alpha_receipt = await this.transactionUtils.getReceiptObject(
      tx,
      getConf().ALPHA_POOL_RECEIPT,
      alphaReceipt?.id,
    );

    if (poolName === 'NAVI-LOOP-HASUI-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_hasui_sui_pool::user_withdraw_v2`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
          tx.object(poolinfo.poolId),
          tx.pure.u64(xTokens),
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_HASUI_POOL),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['HASUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-SUI-VSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_sui_vsui_pool::user_withdraw_v2`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
          tx.object(poolinfo.poolId),
          tx.pure.u64(xTokens),
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_VSUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-SUI-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_withdraw_v2`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
          tx.object(poolinfo.poolId),
          tx.pure.u64(xTokens),
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_SUI_POOL),
          tx.object(getConf().NAVI_STSUI_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['STSUI-SUI']),
          tx.object(getConf().HAEDEL_STAKING),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_usdc_usdt_pool::user_withdraw_v2`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
          tx.object(poolinfo.poolId),
          tx.pure.u64(xTokens),
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_USDC_POOL),
          tx.object(getConf().NAVI_USDT_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['USDC-USDT']),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'NAVI-LOOP-USDT-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_navi_usdt_usdc_pool::user_withdraw_v2`,
        arguments: [
          tx.object(getConf().ALPHA_2_VERSION),
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
          tx.object(poolinfo.poolId),
          tx.pure.u64(xTokens),
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().PRICE_ORACLE),
          tx.object(getConf().NAVI_STORAGE),
          tx.object(getConf().NAVI_USDT_POOL),
          tx.object(getConf().NAVI_USDC_POOL),
          tx.object(getConf().NAVI_INCENTIVE_V3),
          tx.object(getConf().NAVI_INCENTIVE_V2),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(TransactionUtils.cetusPoolMap['USDT-USDC']),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }
}
