import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';
import { coinsList, coinsListByType } from '../../common/coinsList.js';
// import { getAvailableRewards } from 'navi-sdk/dist/libs/PTB/V3.js';

export class NaviTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
  }

  // NAVI Single Asset Pool Deposit
  async depositNaviTx(poolId: string, amount: string): Promise<Transaction> {
    const tx = new Transaction();
    // const poolinfo = poolDetailsMap[poolId];

    // if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    // const pool_token: string = poolinfo.assetTypes[0];
    // const coinName = coinsListByType[pool_token].name;
    // const poolName = poolinfo.poolName;

    // const receipt = await this.blockchain.getReceipt(poolId, this.address);
    // let someReceipt = await this.transactionUtils.getReceiptObject(
    //   tx,
    //   poolinfo.receipt.type,
    //   receipt?.id,
    // );

    // this.updateSingleTokenPrice(
    //   TransactionUtils.naviPriceFeedMap[coinName].pythPriceInfo,
    //   TransactionUtils.naviPriceFeedMap[coinName].feedId,
    //   tx,
    // );

    // if (coinName === 'SUI') {
    //   const [depositCoin] = tx.splitCoins(tx.gas, [amount]);
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_SUI_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : []) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_one_swap_bluefin`,
    //           typeArguments: [coinsList[coinName].type, coinsList['NAVX'].type],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_one_swap`,
    //           typeArguments: [coinsList[coinName].type, coinsList['VSUI'].type],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       someReceipt,
    //       tx.object(poolinfo.poolId),
    //       depositCoin,
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else {
    //   // Handle non-SUI coins - get coins from wallet
    //   const coin = await this.transactionUtils.getCoinFromWallet(tx, this.address, pool_token);
    //   const [depositCoin] = tx.splitCoins(coin, [amount]);
    //   tx.transferObjects([coin], this.address);

    //   if (coinName == 'VSUI') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_VSUI_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : []) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'WETH' || coinName == 'USDT') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : []) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['WUSDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['WUSDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'WUSDC') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : []) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['USDC'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(TransactionUtils.bluefinPoolMap['NAVX-USDC']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-USDC`]),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin_v2`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['USDC'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(TransactionUtils.bluefinPoolMap['VSUI-USDC']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-USDC`]),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'USDC') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : []) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'USDY') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : []) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['WUSDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_LATEST_PACKAGE_ID
    //             }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['WUSDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().VERSION),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'AUSD' || coinName == 'ETH') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_three_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['USDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['USDC-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`USDC-${coinName}`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (poolName === 'NAVI-NS') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_NS_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //             typeArguments: [coinsList[coinName].type, coinsList['NAVX'].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //             typeArguments: [coinsList[coinName].type, coinsList['DEEP'].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['DEEP-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['NS'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NS_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${
    //         getConf().ALPHA_3_LATEST_PACKAGE_ID
    //       }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //       typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(poolinfo.poolId),
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V1),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().NAVI_NS_FUNDS_POOL),
    //         tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //         tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //         tx.object(TransactionUtils.cetusPoolMap['NS-SUI']),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (poolName === 'NAVI-NAVX') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_NAVX_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${
    //         getConf().ALPHA_3_LATEST_PACKAGE_ID
    //       }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //       typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(poolinfo.poolId),
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V1),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().NAVI_NAVX_FUNDS_POOL),
    //         tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //         tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //         tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (poolName === 'NAVI-STSUI') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_STSUI_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['STSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${poolinfo.packageId}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList['STSUI'].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_STSUI_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${
    //         getConf().ALPHA_3_LATEST_PACKAGE_ID
    //       }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //       typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(poolinfo.poolId),
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V1),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().NAVI_STSUI_FUNDS_POOL),
    //         tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //         tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //         tx.object(TransactionUtils.cetusPoolMap['STSUI-SUI']),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (poolName === 'NAVI-SUIBTC') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_SUIBTC_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['NAVX'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //               tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['DEEP'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //               tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //               tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::update_pool`,
    //       typeArguments: [
    //         coinsList[coinName].type,
    //         coinsList['VSUI'].type,
    //         coinsList['NAVX'].type,
    //         coinsList['DEEP'].type,
    //       ],
    //       arguments: [
    //         tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //         tx.object(poolinfo.poolId),
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V1),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().NAVI_NAVX_FUNDS_POOL),
    //         tx.object(getConf().NAVI_DEEP_FUNDS_POOL),
    //         tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //         tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //         tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
    //         tx.object(TransactionUtils.bluefinPoolMap['SUI-SUIBTC']),
    //         tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //         tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //       ],
    //     });
    //     tx.moveCall({
    //       target: `${
    //         getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //       }::alphafi_navi_pool_v2::user_deposit_v2`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (poolName === 'NAVI-SUIUSDT') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       getConf().NAVI_SUIUSDT_ACCOUNT_ADDRESS,
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_three_swaps`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['USDC'].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //               tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap['USDC-SUI']),
    //               tx.object(TransactionUtils.cetusPoolMap[`USDC-${coinName}`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'WAL') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //         ? claimableRewards[coinsList[coinName].type.substring(2)]
    //         : [
    //             { reward_coin_type: coinsList['WAL'].type.substring(2) },
    //             { reward_coin_type: coinsList['VSUI'].type.substring(2) },
    //           ]) {
    //         if (reward.reward_coin_type === coinsList['WAL'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_WAL_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //               tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else if (coinName == 'DEEP') {
    //     const claimableRewards = await getAvailableRewards(
    //       this.blockchain.client,
    //       TransactionUtils.loopingAccountAddresses[poolName],
    //     );
    //     if (claimableRewards) {
    //       for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //         if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //             typeArguments: [coinsList[coinName].type],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //           tx.moveCall({
    //             target: `${
    //               getConf().ALPHA_3_LATEST_PACKAGE_ID
    //             }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //             typeArguments: [
    //               coinsList[coinName].type,
    //               coinsList['SUI'].type,
    //               coinsList['VSUI'].type,
    //             ],
    //             arguments: [
    //               tx.object(getConf().ALPHA_3_VERSION),
    //               tx.object(poolinfo.investorId),
    //               tx.object(getConf().NAVI_STORAGE),
    //               tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //               tx.object(getConf().NAVI_INCENTIVE_V3),
    //               tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //               tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //               tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //               tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //               tx.object(getConf().CLOCK_PACKAGE_ID),
    //             ],
    //           });
    //         }
    //       }
    //     }
    //     tx.moveCall({
    //       target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_deposit`,
    //       typeArguments: [coinsList[coinName].type],
    //       arguments: [
    //         tx.object(getConf().ALPHA_3_VERSION),
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V3),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   } else {
    //     tx.moveCall({
    //       target: `${
    //         getConf().ALPHA_LATEST_PACKAGE_ID
    //       }::alphafi_navi_pool::user_deposit_with_two_swaps`,
    //       typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //       arguments: [
    //         tx.object(getConf().VERSION),
    //         someReceipt,
    //         tx.object(poolinfo.poolId),
    //         depositCoin,
    //         tx.object(poolinfo.investorId),
    //         tx.object(getConf().ALPHA_DISTRIBUTOR),
    //         tx.object(getConf().PRICE_ORACLE),
    //         tx.object(getConf().NAVI_STORAGE),
    //         tx.object(poolinfo.parentPoolId),
    //         tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //         tx.object(getConf().NAVI_INCENTIVE_V1),
    //         tx.object(getConf().NAVI_INCENTIVE_V2),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //         tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //         tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //         tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //         tx.object(getConf().CLOCK_PACKAGE_ID),
    //       ],
    //     });
    //   }
    // }
    return tx;
  }

  // NAVI Withdraw
  async withdrawNaviTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    // const poolinfo = poolDetailsMap[poolId];

    // if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    // const pool_token: string = poolinfo.assetTypes[0];
    // const poolName = poolinfo.poolName;
    // const coinName = coinsListByType[pool_token].name;

    // const receipt = await this.blockchain.getReceipt(poolId, this.address);
    // const alphaReceipt = await this.blockchain.getReceipt(
    //   poolDetailsMapByPoolName['ALPHA'].poolId,
    //   this.address,
    // );

    // if (!receipt) throw new Error('No receipt found!');

    // let alpha_receipt = await this.transactionUtils.getReceiptObject(
    //   tx,
    //   getConf().ALPHA_POOL_RECEIPT,
    //   alphaReceipt?.id,
    // );
    // this.updateSingleTokenPrice(
    //   TransactionUtils.naviPriceFeedMap[coinName].pythPriceInfo,
    //   TransactionUtils.naviPriceFeedMap[coinName].feedId,
    //   tx,
    // );

    // if (coinName == 'SUI') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_SUI_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : []) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_one_swap_bluefin`,
    //           typeArguments: [coinsList[coinName].type, coinsList['NAVX'].type],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_one_swap`,
    //           typeArguments: [coinsList[coinName].type, coinsList['VSUI'].type],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'VSUI') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_VSUI_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : []) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'WETH' || coinName == 'USDT') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['WUSDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['WUSDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'WUSDC') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : []) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['CETUS'].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['CETUS-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-CETUS`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['CETUS'].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['CETUS-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-CETUS`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'USDC') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : []) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'USDY') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['WUSDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_LATEST_PACKAGE_ID
    //           }::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['WUSDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().VERSION),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['WUSDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-WUSDC`]),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_navi_pool::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'AUSD' || coinName == 'ETH') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['USDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['USDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`USDC-${coinName}`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (poolName === 'NAVI-NS') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_NS_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //           typeArguments: [coinsList[coinName].type, coinsList['NAVX'].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //           typeArguments: [coinsList[coinName].type, coinsList['DEEP'].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['DEEP-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['NS'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NS_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${
    //       getConf().ALPHA_3_LATEST_PACKAGE_ID
    //     }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //     typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(poolinfo.poolId),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V1),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().NAVI_NS_FUNDS_POOL),
    //       tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //       tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //       tx.object(TransactionUtils.cetusPoolMap['NS-SUI']),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (poolName === 'NAVI-NAVX') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_NAVX_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${
    //       getConf().ALPHA_3_LATEST_PACKAGE_ID
    //     }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //     typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(poolinfo.poolId),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V1),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().NAVI_NAVX_FUNDS_POOL),
    //       tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //       tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //       tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (poolName === 'NAVI-STSUI') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_STSUI_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['STSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${poolinfo.packageId}::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList['STSUI'].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_STSUI_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${
    //       getConf().ALPHA_3_LATEST_PACKAGE_ID
    //     }::alphafi_navi_pool_v2::update_pool_with_two_swaps_v2`,
    //     typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(poolinfo.poolId),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V1),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().NAVI_STSUI_FUNDS_POOL),
    //       tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //       tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //       tx.object(TransactionUtils.cetusPoolMap['STSUI-SUI']),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (poolName === 'NAVI-SUIBTC') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_SUIBTC_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['NAVX'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['NAVX-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['DEEP'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`SUI-${coinName}`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::update_pool`,
    //     typeArguments: [
    //       coinsList[coinName].type,
    //       coinsList['VSUI'].type,
    //       coinsList['NAVX'].type,
    //       coinsList['DEEP'].type,
    //     ],
    //     arguments: [
    //       tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //       tx.object(poolinfo.poolId),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V1),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().NAVI_NAVX_FUNDS_POOL),
    //       tx.object(getConf().NAVI_DEEP_FUNDS_POOL),
    //       tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //       tx.object(TransactionUtils.cetusPoolMap['NAVX-SUI']),
    //       tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
    //       tx.object(TransactionUtils.bluefinPoolMap['SUI-SUIBTC']),
    //       tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //       tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //     ],
    //   });
    //   tx.moveCall({
    //     target: `${
    //       getConf().ALPHA_NAVI_V2_LATEST_PACKAGE_ID
    //     }::alphafi_navi_pool_v2::user_withdraw_v2`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_NAVI_V2_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (poolName === 'NAVI-SUIUSDT') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     getConf().NAVI_SUIUSDT_ACCOUNT_ADDRESS,
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['NAVX'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_NAVX_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_three_swaps`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['USDC'].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //             tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap['USDC-SUI']),
    //             tx.object(TransactionUtils.cetusPoolMap[`USDC-${coinName}`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }

    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'WAL') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]
    //       ? claimableRewards[coinsList[coinName].type.substring(2)]
    //       : [
    //           { reward_coin_type: coinsList['WAL'].type.substring(2) },
    //           { reward_coin_type: coinsList['VSUI'].type.substring(2) },
    //         ]) {
    //       if (reward.reward_coin_type === coinsList['WAL'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_WAL_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else if (coinName == 'DEEP') {
    //   const claimableRewards = await getAvailableRewards(
    //     this.blockchain.client,
    //     TransactionUtils.loopingAccountAddresses[poolName],
    //   );
    //   if (claimableRewards) {
    //     for (const reward of claimableRewards[coinsList[coinName].type.substring(2)]) {
    //       if (reward.reward_coin_type === coinsList['DEEP'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_no_swap`,
    //           typeArguments: [coinsList[coinName].type],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_DEEP_REWARDS_POOL),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       } else if (reward.reward_coin_type === coinsList['VSUI'].type.substring(2)) {
    //         tx.moveCall({
    //           target: `${
    //             getConf().ALPHA_3_LATEST_PACKAGE_ID
    //           }::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
    //           typeArguments: [
    //             coinsList[coinName].type,
    //             coinsList['SUI'].type,
    //             coinsList['VSUI'].type,
    //           ],
    //           arguments: [
    //             tx.object(getConf().ALPHA_3_VERSION),
    //             tx.object(poolinfo.investorId),
    //             tx.object(getConf().NAVI_STORAGE),
    //             tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //             tx.object(getConf().NAVI_INCENTIVE_V3),
    //             tx.object(getConf().NAVI_VSUI_REWARDS_POOL),
    //             tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
    //             tx.object(TransactionUtils.bluefinPoolMap['VSUI-SUI']),
    //             tx.object(TransactionUtils.bluefinPoolMap[`${coinName}-SUI`]),
    //             tx.object(getConf().CLOCK_PACKAGE_ID),
    //           ],
    //         });
    //       }
    //     }
    //   }
    //   tx.moveCall({
    //     target: `${getConf().ALPHA_3_LATEST_PACKAGE_ID}::alphafi_navi_pool_v2::user_withdraw`,
    //     typeArguments: [coinsList[coinName].type],
    //     arguments: [
    //       tx.object(getConf().ALPHA_3_VERSION),
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V3),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // } else {
    //   tx.moveCall({
    //     target: `${
    //       getConf().ALPHA_LATEST_PACKAGE_ID
    //     }::alphafi_navi_pool::user_withdraw_with_two_swaps`,
    //     typeArguments: [coinsList[coinName].type, coinsList['SUI'].type, coinsList['VSUI'].type],
    //     arguments: [
    //       tx.object(getConf().VERSION),
    //       tx.object(receipt.id),
    //       alpha_receipt,
    //       tx.object(getConf().ALPHA_POOL),
    //       tx.object(poolinfo.poolId),
    //       tx.pure.u64(xTokens),
    //       tx.object(poolinfo.investorId),
    //       tx.object(getConf().ALPHA_DISTRIBUTOR),
    //       tx.object(getConf().PRICE_ORACLE),
    //       tx.object(getConf().NAVI_STORAGE),
    //       tx.object(poolinfo.parentPoolId),
    //       tx.pure.u8(Number(TransactionUtils.naviAssetMap[coinName])),
    //       tx.object(getConf().NAVI_INCENTIVE_V1),
    //       tx.object(getConf().NAVI_INCENTIVE_V2),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().NAVI_VSUI_FUNDS_POOL),
    //       tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
    //       tx.object(TransactionUtils.cetusPoolMap['VSUI-SUI']),
    //       tx.object(TransactionUtils.cetusPoolMap[`${coinName}-SUI`]),
    //       tx.object(getConf().CLOCK_PACKAGE_ID),
    //     ],
    //   });
    // }

    return tx;
  }

  updateSingleTokenPrice(pythPriceInfo: string, feedId: string, tx: Transaction) {
    tx.moveCall({
      target:
        '0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83::oracle_pro::update_single_price',
      arguments: [
        tx.object(getConf().CLOCK_PACKAGE_ID),
        tx.object(getConf().NAVI_ORACLE_CONFIG),
        tx.object(getConf().PRICE_ORACLE),
        tx.object(getConf().SUPRA_ORACLE_HOLDER),
        tx.object(pythPriceInfo),
        tx.pure.address(feedId),
      ],
    });
  }
}
