import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';
import { coinsList, coinsListByType } from '../../common/coinsList.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';

export class AlphaLendTransactions {
  private alphalendClient: AlphalendClient;

  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
    this.alphalendClient = new AlphalendClient('mainnet', this.blockchain.client);
  }

  // AlphaLend Looping Deposit
  async depositAlphaLendLoopingTx(poolName: string, amount: string): Promise<Transaction> {
    const tx = new Transaction();

    if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
      return this.depositAlphaLendSuiStsuiLoopTx(amount);
    }

    throw new Error(`Unsupported AlphaLend looping pool: ${poolName}`);
  }

  // AlphaLend Looping Withdraw
  async withdrawAlphaLendLoopingTx(poolName: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();

    if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
      return this.withdrawAlphaLendSuiStsuiLoopTx(xTokens);
    }

    throw new Error(`Unsupported AlphaLend looping pool: ${poolName}`);
  }

  // AlphaLend Single Loop Deposit
  async depositAlphaLendSingleLoopTx(poolName: string, amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMapByPoolName[poolName];

    if (!poolinfo) throw new Error(`Pool ${poolName} not found in poolDetailsMap`);

    const coinType = poolinfo.assetTypes[0];
    const coinName = coinsListByType[coinType].type;

    // Update prices
    await this.alphalendClient.updatePrices(tx, [coinType]);

    // Get receipt
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);
    const someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    // Get coin for deposit
    let totalCoin = await this.transactionUtils.getCoinFromWallet(tx, this.address, coinType);
    const [depositCoin] = tx.splitCoins(totalCoin, [amount]);

    // Collect and swap rewards
    await this.collectAndSwapRewardsSingleLoop(poolName, tx);

    // Deposit
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::user_deposit`,
      typeArguments: [coinType],
      arguments: [
        tx.object(getConf().ALPHA_ALPHALEND_VERSION),
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        depositCoin,
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    tx.transferObjects([totalCoin], this.address);
    return tx;
  }

  // AlphaLend Single Loop Withdraw
  async withdrawAlphaLendSingleLoopTx(poolName: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMapByPoolName[poolName];

    if (!poolinfo) throw new Error(`Pool ${poolName} not found in poolDetailsMap`);

    const coinType = poolinfo.assetTypes[0];

    // Get receipts
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);
    const alphaReceipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );

    if (!receipt) throw new Error(`No receipt found for pool ${poolName}`);

    // Update prices
    await this.alphalendClient.updatePrices(tx, [coinType]);

    const alpha_receipt = await this.transactionUtils.getReceiptObject(
      tx,
      getConf().ALPHA_POOL_RECEIPT,
      alphaReceipt?.id,
    );

    // Collect and swap rewards
    await this.collectAndSwapRewardsSingleLoop(poolName, tx);

    // Withdraw
    const [coin] = tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::user_withdraw`,
      typeArguments: [coinType],
      arguments: [
        tx.object(getConf().ALPHA_ALPHALEND_VERSION),
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(getConf().ALPHA_POOL),
        tx.object(poolinfo.poolId),
        tx.pure.u64(xTokens),
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    tx.transferObjects([coin], this.address);
    return tx;
  }

  // Private helper methods
  private async depositAlphaLendSuiStsuiLoopTx(amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolName = 'ALPHALEND-LOOP-SUI-STSUI';
    const poolinfo = poolDetailsMapByPoolName[poolName];

    if (!poolinfo) throw new Error(`Pool ${poolName} not found in poolDetailsMap`);

    // Update prices
    await this.alphalendClient.updatePrices(tx, [coinsList['STSUI'].type, '0x2::sui::SUI']);

    // Get receipt
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);
    const someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

    const [depositCoin] = tx.splitCoins(tx.gas, [amount]);

    // Collect rewards with one swap
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
      typeArguments: [coinsList['ALPHA'].type],
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(TransactionUtils.bluefinPoolMap['ALPHA-STSUI']),
        tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with no swap
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with two swaps
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
      typeArguments: [coinsList['BLUE'].type],
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().LST_INFO),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(TransactionUtils.cetusPoolMap['BLUE-SUI']),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Deposit
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_deposit_v3`,
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        depositCoin,
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().LST_INFO),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  private async withdrawAlphaLendSuiStsuiLoopTx(xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolName = 'ALPHALEND-LOOP-SUI-STSUI';
    const poolinfo = poolDetailsMapByPoolName[poolName];

    if (!poolinfo) throw new Error(`Pool ${poolName} not found in poolDetailsMap`);

    // Get receipts
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);
    const alphaReceipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );

    if (!receipt) throw new Error(`No receipt found for pool ${poolName}`);

    // Update prices
    await this.alphalendClient.updatePrices(tx, [coinsList['STSUI'].type, '0x2::sui::SUI']);

    const alpha_receipt = await this.transactionUtils.getReceiptObject(
      tx,
      getConf().ALPHA_POOL_RECEIPT,
      alphaReceipt?.id,
    );

    // Collect rewards with one swap
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
      typeArguments: [coinsList['ALPHA'].type],
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(TransactionUtils.bluefinPoolMap['ALPHA-STSUI']),
        tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with no swap
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with two swaps
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
      typeArguments: [coinsList['BLUE'].type],
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(poolinfo.investorId),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().LST_INFO),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(TransactionUtils.cetusPoolMap['BLUE-SUI']),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Withdraw
    const [stsui_coin] = tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_withdraw_v3`,
      arguments: [
        tx.object(getConf().ALPHA_5_VERSION),
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(getConf().ALPHA_POOL),
        tx.object(poolinfo.poolId),
        tx.pure.u64(xTokens),
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().LST_INFO),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    tx.moveCall({
      target: `0x2::transfer::public_transfer`,
      typeArguments: [`0x2::coin::Coin<${coinsList['SUI'].type}>`],
      arguments: [stsui_coin, tx.pure.address(this.address)],
    });

    return tx;
  }

  private async collectAndSwapRewardsSingleLoop(poolName: string, tx: Transaction): Promise<void> {
    const poolinfo = poolDetailsMapByPoolName[poolName];

    if (!poolinfo) throw new Error(`Pool ${poolName} not found in poolDetailsMap`);

    if (poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
      // TBTC reward collection and swaps
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['ALPHA'].type, coinsList['STSUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['ALPHA-STSUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(false),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['STSUI'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['STSUI-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['BLUE'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['BLUE-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['DEEP'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['SUI'].type, coinsList['USDC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['SUI-USDC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['TBTC'].type, coinsList['USDC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['TBTC-USDC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'ALPHALEND-SINGLE-LOOP-SUIBTC') {
      // SUIBTC reward collection and swaps
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['SUIBTC'].type, coinsList['ALPHA'].type, coinsList['STSUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['ALPHA-STSUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(false),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['SUIBTC'].type, coinsList['BLUE'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['BLUE-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['SUIBTC'].type, coinsList['DEEP'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['SUIBTC'].type, coinsList['SUI'].type, coinsList['SUIBTC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['SUI-SUIBTC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else if (poolName === 'ALPHALEND-SINGLE-LOOP-XAUM') {
      // XAUM reward collection and swaps
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['XAUM'].type, coinsList['ALPHA'].type, coinsList['USDC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['ALPHA-USDC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['XAUM'].type, coinsList['DEEP'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['DEEP-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['XAUM'].type, coinsList['BLUE'].type, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['BLUE-SUI']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['XAUM'].type, coinsList['SUI'].type, coinsList['USDC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['SUI-USDC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['XAUM'].type, coinsList['XAUM'].type, coinsList['USDC'].type],
        arguments: [
          tx.object(getConf().ALPHA_ALPHALEND_VERSION),
          tx.object(poolinfo.investorId),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(TransactionUtils.bluefinPoolMap['XAUM-USDC']),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }
  }
}
