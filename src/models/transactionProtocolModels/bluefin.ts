import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList, coinsListByType } from '../../common/coinsList.js';
import { TransactionUtils } from './utils.js';

export class BluefinTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
  }

  // Bluefin Deposit SUI First
  async depositBluefinSuiFirstTx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Get the coin types - handle both single and double asset types
    let pool_token1: string = poolinfo.assetTypes[0];
    let pool_token2: string = poolinfo.assetTypes[1];

    const receipt = await this.blockchain.getReceipt(poolId, this.address);

    // Handle receipt creation for deposit
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    // Simple amount calculation - using imported getAmounts function
    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolId, isAmountA, amount);
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token2);
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);

    tx.transferObjects([coin1, coin2], this.address);
    const poolName = poolinfo.poolName;

    // Pool-specific deposit logic
    if (poolName === 'BLUEFIN-SUI-USDC') {
      console.log('Depositing Bluefin SUI USDC');
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          pool_token1,
          pool_token2,
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

  // Bluefin Deposit SUI Second
  async depositBluefinSuiSecondTx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolId, isAmountA, amount);

    // coin1 corresponds to token1 in this pool variant
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token2);
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);

    // Return residuals back to user
    tx.transferObjects([coin1, coin2], this.address);

    if (poolName === 'BLUEFIN-BLUE-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['DEEP']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUE_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WBTC-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WBTC_SUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WBTC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-DEEP-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().DEEP_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName.startsWith('BLUEFIN-AUTOBALANCE-') && poolName.includes('SUI')) {
      // Autobalance SUI second pools use v3/v4 with reduced args as per L2 SDK
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_deposit_v3`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for depositBluefinSuiSecondTx: ${poolName}`);
    }

    return tx;
  }

  // Bluefin Deposit Type 1
  async depositBluefinType1Tx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolId, isAmountA, amount);
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token2);
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);
    tx.transferObjects([coin1, coin2], this.address);

    if (poolName === 'BLUEFIN-USDT-USDC') {
      // rewards collect-and-swap then deposit_v2
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_USDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_USDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_USDT_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-AUSD-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_AUSD_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_AUSD_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_AUSD_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WBTC-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_WBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_WBTC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-SEND-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SEND_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_SEND_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SEND_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_STSUI_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName.startsWith('BLUEFIN-AUTOBALANCE-')) {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v3`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-SUIUSDT-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SUIUSDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
    } else if (poolName === 'BLUEFIN-SUIBTC-USDC') {
      // V2 pools involve DEEP as a type arg
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SUIBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_SUIBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().USDC_SUIBTC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-LBTC-SUIBTC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_LBTC_SUIBTC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_SUIBTC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_LBTC_SUIBTC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().SUIBTC_LBTC_CETUS_POOL_ID),
          tx.object(getConf().SUIBTC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WAL-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_WAL_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WAL_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_WAL_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for depositBluefinType1Tx: ${poolName}`);
    }

    return tx;
  }

  // Bluefin Deposit Type 2
  async depositBluefinType2Tx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolName, isAmountA, amount);
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token2);

    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);
    tx.transferObjects([coin1, coin2], this.address);

    if (poolName === 'BLUEFIN-ALPHA-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_ALPHA_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ALPHA_USDC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-NAVX-VSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_NAVX_VSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().NAVX_VSUI_CETUS_POOL_ID),
          tx.object(getConf().VSUI_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-BLUE-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_deposit_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['DEEP']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_BLUE_USDC_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUE_USDC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-ETH') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_ETH_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().STSUI_ETH_CETUS_POOL_ID),
          tx.object(getConf().ETH_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-WSOL') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_WSOL_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().STSUI_WSOL_CETUS_POOL_ID),
          tx.object(getConf().WSOL_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for depositBluefinType2Tx: ${poolName}`);
    }
    return tx;
  }

  // Bluefin Deposit stSUI
  async depositBluefinStsuiTx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const receipt = await this.blockchain.getReceipt(poolId, this.address);
    let someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolName, isAmountA, amount);
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const coin2 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token2);

    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(coin2, [amount2]);
    tx.transferObjects([coin1, coin2], this.address);

    if (poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_STSUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-ALPHA-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_ALPHA_STSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ALPHA_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_ALPHA_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-WSOL') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_STSUI_WSOL_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WSOL_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_WSOL_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-ETH') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_STSUI_ETH_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ETH_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_ETH_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-BUCK') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_STSUI_BUCK_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BUCK_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_BUCK_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-MUSD') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_STSUI_MUSD_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().MUSD_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_MUSD_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WAL-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().BLUEFIN_WAL_STSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WAL_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_WAL_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for depositBluefinStsuiTx: ${poolName}`);
    }

    return tx;
  }

  // Bluefin Deposit Fungible
  async depositBluefinFungibleTx(
    poolId: string,
    amount: string,
    isAmountA: boolean,
  ): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const [amount1, amount2] = await this.transactionUtils.getAmounts(poolName, isAmountA, amount);
    const coin1 = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token1);
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(tx.gas, [amount2]);
    tx.transferObjects([coin1], this.address);

    if (poolName === 'BLUEFIN-FUNGIBLE-STSUI-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_sui_ft_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2, poolinfo.receipt.type, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_FUNGIBLE_VERSION),
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_STSUI_SUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for depositBluefinFungibleTx: ${poolName}`);
    }

    return tx;
  }

  // Withdraw SUI First
  async withdrawBluefinSuiFirstTx(poolId: string, xTokens: string): Promise<Transaction> {
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

  // Withdraw SUI Second
  async withdrawBluefinSuiSecondTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
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

    if (poolName === 'BLUEFIN-BLUE-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['DEEP']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUE_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WBTC-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WBTC_SUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WBTC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-DEEP-SUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().DEEP_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName.startsWith('BLUEFIN-AUTOBALANCE-') && poolName.includes('SUI')) {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::user_withdraw_v3`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          tx.object(receipt.id),
          tx.object(getConf().ALPHA_POOL),
          tx.object(poolinfo.poolId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.pure.u128(xTokens),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for withdrawBluefinSuiSecondTx: ${poolName}`);
    }

    return tx;
  }

  // Withdraw Type 1
  async withdrawBluefinType1Tx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
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

    if (poolName.startsWith('BLUEFIN-AUTOBALANCE-')) {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v3`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_AUTOBALANCE_VERSION),
          tx.object(receipt.id),
          tx.object(poolinfo.poolId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.pure.u128(xTokens),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-USDT-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_USDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_USDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_USDT_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-AUSD-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_AUSD_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_AUSD_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_AUSD_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WBTC-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_WBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_WBTC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-SEND-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SEND_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_SEND_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SEND_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_STSUI_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-SUIUSDT-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SUIUSDT_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
    } else if (poolName === 'BLUEFIN-SUIBTC-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_SUIBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
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
          tx.object(getConf().BLUEFIN_SUIBTC_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().USDC_SUIBTC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-LBTC-SUIBTC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_LBTC_SUIBTC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_SUIBTC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw`,
        typeArguments: [
          pool_token1,
          pool_token2,
          coinsList['BLUE']?.type,
          coinsList['SUI'].type,
          coinsList['DEEP']?.type,
        ],
        arguments: [
          tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
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
          tx.object(getConf().BLUEFIN_LBTC_SUIBTC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().SUIBTC_LBTC_CETUS_POOL_ID),
          tx.object(getConf().SUIBTC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WAL-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_investor::collect_and_swap_rewards_to_token_b_bluefin`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
        arguments: [
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_4_VERSION),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(getConf().BLUEFIN_WAL_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_WAL_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_WAL_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for withdrawBluefinType1Tx: ${poolName}`);
    }

    return tx;
  }

  // Withdraw Type 2
  async withdrawBluefinType2Tx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
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

    if (poolName === 'BLUEFIN-ALPHA-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_ALPHA_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ALPHA_USDC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-NAVX-VSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_NAVX_VSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().NAVX_VSUI_CETUS_POOL_ID),
          tx.object(getConf().VSUI_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-BLUE-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_withdraw_v2`,
        typeArguments: [pool_token1, pool_token2, coinsList['DEEP']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_BLUE_USDC_POOL),
          tx.object(getConf().BLUEFIN_DEEP_SUI_POOL),
          tx.object(getConf().BLUE_USDC_CETUS_POOL_ID),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-ETH') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_ETH_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().STSUI_ETH_CETUS_POOL_ID),
          tx.object(getConf().ETH_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-WSOL') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type, coinsList['SUI'].type],
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
          tx.object(getConf().BLUEFIN_STSUI_WSOL_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().STSUI_WSOL_CETUS_POOL_ID),
          tx.object(getConf().WSOL_SUI_CETUS_POOL_ID),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for withdrawBluefinType2Tx: ${poolName}`);
    }

    return tx;
  }

  // Withdraw stSUI
  async withdrawBluefinStsuiTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
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

    if (poolName === 'BLUEFIN-STSUI-USDC') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_STSUI_USDC_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().USDC_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_USDC_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-ALPHA-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_ALPHA_STSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ALPHA_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_ALPHA_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-WSOL') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_STSUI_WSOL_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WSOL_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_WSOL_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-ETH') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_STSUI_ETH_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().ETH_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_ETH_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-BUCK') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_STSUI_BUCK_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().BUCK_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_BUCK_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-STSUI-MUSD') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_STSUI_MUSD_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().MUSD_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_MUSD_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'BLUEFIN-WAL-STSUI') {
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2, coinsList['BLUE']?.type],
        arguments: [
          tx.object(getConf().ALPHA_STSUI_VERSION),
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
          tx.object(getConf().BLUEFIN_WAL_STSUI_POOL),
          tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
          tx.object(getConf().WAL_SUI_CETUS_POOL_ID),
          tx.object(getConf().BLUEFIN_SUI_WAL_POOL),
          tx.object(getConf().LST_INFO),
          tx.object(getConf().SUI_SYSTEM_STATE),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      throw new Error(`Unsupported pool for withdrawBluefinStsuiTx: ${poolName}`);
    }

    return tx;
  }

  // Withdraw Fungible
  async withdrawBluefinFungibleTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];
    const poolName = poolinfo.poolName;

    const ftCoin = await this.transactionUtils.getCoinFromWallet(
      tx,
      this.address,
      poolinfo.receipt.type,
    );

    if (ftCoin) {
      const ftCoinsToBurn = tx.splitCoins(ftCoin, [xTokens]);
      tx.transferObjects([ftCoin], this.address);

      if (poolName === 'BLUEFIN-FUNGIBLE-STSUI-SUI') {
        tx.moveCall({
          target: `${poolinfo.packageId}::alphafi_bluefin_stsui_sui_ft_pool::user_withdraw`,
          typeArguments: [pool_token1, pool_token2, poolinfo.receipt.type, coinsList['BLUE']?.type],
          arguments: [
            tx.object(getConf().ALPHA_FUNGIBLE_VERSION),
            ftCoinsToBurn,
            tx.object(poolinfo.poolId),
            tx.object(getConf().ALPHA_DISTRIBUTOR),
            tx.object(poolinfo.investorId),
            tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
            tx.object(getConf().BLUEFIN_STSUI_SUI_POOL),
            tx.object(getConf().BLUEFIN_BLUE_SUI_POOL),
            tx.object(getConf().LST_INFO),
            tx.object(getConf().SUI_SYSTEM_STATE),
            tx.object(getConf().CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        throw new Error(`Unsupported pool for withdrawBluefinFungibleTx: ${poolName}`);
      }
    } else {
      throw new Error('No ftCoin found!');
    }

    return tx;
  }
}
