// import { Transaction, TransactionResult } from '@mysten/sui/transactions';
// import { getConf } from '../../common/constants.js';
// import { poolDetailsMapByPoolName } from '../../common/maps.js';
// import { Blockchain } from '../blockchain.js';
// import { TransactionUtils } from './utils.js';
// import { coinsList } from '../../common/coinsList.js';
// import { ReceiptType } from '../../utils/parsedTypes.js';

// export class ClaimRewardsTransactions {
//   constructor(
//     private address: string,
//     private blockchain: Blockchain,
//     private transactionUtils: TransactionUtils,
//   ) {
//     this.blockchain = blockchain;
//     this.transactionUtils = transactionUtils;
//     this.address = address;
//   }

//   /**
//    * Main claim rewards transaction builder
//    * This function iterates through all pools and claims rewards for each one
//    */
//   async claimAllRewardsTx(): Promise<Transaction> {
//     const tx = new Transaction();
//     const receiptMap = await this.blockchain.getMultiReceipt(this.address);

//     // Get ALPHA receipt for the alpha_receipt parameter
//     const alphaReceipt = receiptMap.get(poolDetailsMapByPoolName['ALPHA'].poolId);
//     let alpha_receipt = this.transactionUtils.getReceiptObject(
//       tx,
//       getConf().ALPHA_POOL_RECEIPT,
//       alphaReceipt?.[0]?.id,
//     );

//     // Get all pool names from poolDetailsMapByPoolName
//     const poolNames = Object.keys(poolDetailsMapByPoolName);

//     for (const poolName of poolNames) {
//       const poolinfo = poolDetailsMapByPoolName[poolName];

//       // Skip pools without valid poolId
//       if (!poolinfo || !poolinfo.poolId || poolinfo.poolId === '') {
//         continue;
//       }

//       // Skip ALPHA pool as it's handled separately
//       if (poolName === 'ALPHA') {
//         continue;
//       }

//       try {
//         alpha_receipt = await this.claimRewardsForPool(tx, poolName, alpha_receipt, receiptMap);
//       } catch (error) {
//         console.warn(`Failed to claim rewards for pool ${poolName}:`, error);
//         // Continue with other pools even if one fails
//       }
//     }

//     // Final transfer receipt option call
//     tx.moveCall({
//       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::transfer_receipt_option`,
//       arguments: [tx.object(getConf().VERSION), alpha_receipt],
//     });

//     return tx;
//   }

//   /**
//    * Claim rewards for a specific pool
//    */
//   private async claimRewardsForPool(
//     tx: Transaction,
//     poolName: string,
//     alpha_receipt: TransactionResult,
//     allReceipts: Map<string, ReceiptType[]>,
//   ): Promise<TransactionResult> {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (!poolinfo) {
//       throw new Error(`Pool ${poolName} not found`);
//     }

//     // Get receipts for this pool
//     const receipts: ReceiptType[] = allReceipts.get(poolinfo.poolId) || [];
//     if (receipts.length === 0) {
//       return alpha_receipt;
//     }

//     // Handle different pool types based on package number and protocol
//     if (poolinfo.packageNumber === 9) {
//       return this.claimPackage9Rewards(tx, poolName, receipts, alpha_receipt);
//     } else if (poolinfo.packageNumber === 8) {
//       return this.claimPackage8Rewards(tx, poolName, receipts, alpha_receipt);
//     } else if (poolinfo.packageNumber === 5) {
//       return this.claimPackage5Rewards(tx, poolName, receipts, alpha_receipt);
//     } else if (poolinfo.packageNumber === 4 || poolinfo.packageNumber === 6) {
//       return this.claimPackage4And6Rewards(tx, poolName, receipts, alpha_receipt);
//     } else if (poolinfo.packageNumber === 3) {
//       return this.claimPackage3Rewards(tx, poolName, receipts, alpha_receipt);
//     } else if (poolinfo.packageNumber === 2) {
//       return this.claimPackage2Rewards(tx, poolName, receipts, alpha_receipt);
//     } else {
//       return this.claimDefaultPackageRewards(tx, poolName, receipts, alpha_receipt);
//     }
//   }

//   /**
//    * Package 9 rewards (Navi V2)
//    */
//   private claimPackage9Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolName === 'NAVI-SUIBTC') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`,
//           typeArguments: [poolinfo.assetTypes[0]],
//           arguments: [
//             tx.object(getConf().ALPHA_NAVI_V2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Package 8 rewards (Bluefin V2)
//    */
//   private claimPackage8Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolName === 'BLUEFIN-SUIBTC-USDC' || poolName === 'BLUEFIN-LBTC-SUIBTC') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`,
//           typeArguments: [poolinfo.assetTypes[0], poolinfo.assetTypes[1]],
//           arguments: [
//             tx.object(getConf().ALPHA_BLUEFIN_V2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Package 5 rewards (Navi V5)
//    */
//   private claimPackage5Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolName === 'NAVI-LOOP-USDT-USDC') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_usdt_usdc_pool::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_5_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_5_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Package 4 & 6 rewards (Bluefin V4)
//    */
//   private claimPackage4And6Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolinfo.parentProtocolName === 'BLUEFIN') {
//       const coinAType = poolinfo.assetTypes[0];
//       const coinBType = poolinfo.assetTypes[1];

//       if (
//         poolName === 'BLUEFIN-SUI-USDC' ||
//         poolName === 'BLUEFIN-SUI-BUCK' ||
//         poolName === 'BLUEFIN-SUI-AUSD'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_4_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (
//         poolName === 'BLUEFIN-USDT-USDC' ||
//         poolName === 'BLUEFIN-AUSD-USDC' ||
//         poolName === 'BLUEFIN-WBTC-USDC' ||
//         poolName === 'BLUEFIN-SEND-USDC' ||
//         poolName === 'BLUEFIN-SUIUSDT-USDC' ||
//         poolName === 'BLUEFIN-WAL-USDC'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_4_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (
//         poolName === 'BLUEFIN-ALPHA-USDC' ||
//         poolName === 'BLUEFIN-NAVX-VSUI' ||
//         poolName === 'BLUEFIN-BLUE-USDC'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_type_2_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_4_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (
//         poolName === 'BLUEFIN-BLUE-SUI' ||
//         poolName === 'BLUEFIN-WBTC-SUI' ||
//         poolName === 'BLUEFIN-DEEP-SUI'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_sui_second_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_4_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (poolName === 'BLUEFIN-STSUI-SUI') {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_stsui_sui_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_4_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (
//         poolName === 'BLUEFIN-STSUI-USDC' ||
//         poolName === 'BLUEFIN-STSUI-WSOL' ||
//         poolName === 'BLUEFIN-STSUI-ETH' ||
//         poolName === 'BLUEFIN-STSUI-BUCK' ||
//         poolName === 'BLUEFIN-STSUI-MUSD'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_stsui_first_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_STSUI_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (poolName === 'BLUEFIN-ALPHA-STSUI' || poolName === 'BLUEFIN-WAL-STSUI') {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_bluefin_stsui_second_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().ALPHA_STSUI_VERSION),
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       }
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Package 3 rewards (Navi V3 & Bucket)
//    */
//   private claimPackage3Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolinfo.parentProtocolName === 'NAVI') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`,
//           typeArguments: [poolinfo.assetTypes[0]],
//           arguments: [
//             tx.object(getConf().ALPHA_3_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolName === 'BUCKET-BUCK') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_bucket_pool_v1::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_3_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Package 2 rewards (Cetus & Navi V2)
//    */
//   private claimPackage2Rewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolName === 'CETUS-SUI') {
//       const [coinAType, coinBType] = poolinfo.assetTypes;
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::get_user_rewards_all`,
//           typeArguments: [coinAType, coinBType],
//           arguments: [
//             tx.object(getConf().ALPHA_2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolName === 'NAVI-LOOP-SUI-VSUI') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_sui_vsui_pool::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_native_usdc_usdt_pool::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolName === 'NAVI-LOOP-HASUI-SUI') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_hasui_sui_pool::get_user_rewards_all`,
//           arguments: [
//             tx.object(getConf().ALPHA_2_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Default package rewards (Cetus, Navi, AlphaLend)
//    */
//   private claimDefaultPackageRewards(
//     tx: Transaction,
//     poolName: string,
//     receipts: ReceiptType[],
//     alpha_receipt: TransactionResult,
//   ): TransactionResult {
//     const poolinfo = poolDetailsMapByPoolName[poolName];

//     if (poolinfo.parentProtocolName === 'CETUS') {
//       const [coinAType, coinBType] = poolinfo.assetTypes;

//       if (coinBType === coinsList['SUI'].type) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else if (
//         poolName === 'WUSDC-WBTC' ||
//         poolName === 'USDC-USDT' ||
//         poolName === 'USDC-WUSDC' ||
//         poolName === 'USDC-ETH'
//       ) {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_cetus_pool_base_a::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       } else {
//         receipts.forEach((receipt) => {
//           alpha_receipt = tx.moveCall({
//             target: `${poolinfo.packageId}::alphafi_cetus_pool::get_user_rewards_all`,
//             typeArguments: [coinAType, coinBType],
//             arguments: [
//               tx.object(getConf().VERSION),
//               tx.object(receipt.id),
//               alpha_receipt,
//               tx.object(poolinfo.poolId),
//               tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//               tx.object(getConf().ALPHA_DISTRIBUTOR),
//               tx.object(getConf().CLOCK_PACKAGE_ID),
//             ],
//           });
//         });
//       }
//     } else if (poolinfo.parentProtocolName === 'NAVI') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_navi_pool::get_user_rewards_all`,
//           typeArguments: [poolinfo.assetTypes[0]],
//           arguments: [
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     } else if (poolinfo.parentProtocolName === 'ALPHALEND') {
//       receipts.forEach((receipt) => {
//         alpha_receipt = tx.moveCall({
//           target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::get_user_rewards_all`,
//           typeArguments: [poolinfo.assetTypes[0]],
//           arguments: [
//             tx.object(getConf().ALPHA_ALPHALEND_VERSION),
//             tx.object(getConf().VERSION),
//             tx.object(receipt.id),
//             alpha_receipt,
//             tx.object(poolinfo.poolId),
//             tx.object(poolDetailsMapByPoolName['ALPHA'].poolId),
//             tx.object(getConf().ALPHA_DISTRIBUTOR),
//             tx.object(getConf().CLOCK_PACKAGE_ID),
//           ],
//         });
//       });
//     }

//     return alpha_receipt;
//   }

//   /**
//    * Claim rewards for a specific pool by name
//    */
//   async claimRewardsForSpecificPool(poolName: string): Promise<Transaction> {
//     const tx = new Transaction();

//     // Get ALPHA receipt
//     const receiptMap = await this.blockchain.getMultiReceipt(this.address);
//     const alphaReceipt = receiptMap.get(poolDetailsMapByPoolName['ALPHA'].poolId);
//     let alpha_receipt = await this.transactionUtils.getReceiptObject(
//       tx,
//       getConf().ALPHA_POOL_RECEIPT,
//       alphaReceipt?.[0]?.id,
//     );

//     // Claim rewards for the specific pool
//     alpha_receipt = await this.claimRewardsForPool(tx, poolName, alpha_receipt, receiptMap);

//     // Final transfer receipt option call
//     tx.moveCall({
//       target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::transfer_receipt_option`,
//       arguments: [tx.object(getConf().VERSION), alpha_receipt],
//     });

//     return tx;
//   }
// }
