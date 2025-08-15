import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList } from '../../common/coinsList.js';
import { PoolUtils } from '../pool.js';

// Types for Alphalend pools
export type AlphalendPoolName = 'ALPHALEND-LOOP-SUI-STSUI' | 'ALPHALEND-SINGLE-LOOP-TBTC';

// Alphalend client interface (to be replaced with actual SDK when available)
interface AlphalendClient {
  updatePrices(txb: Transaction, coinTypes: string[]): Promise<void>;
}

export class AlphalendTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Create a mock Alphalend client for development
   * In production, this should be replaced with the actual AlphalendClient from @alphafi/alphalend-sdk
   */
  private createAlphalendClient(): AlphalendClient {
    return {
      updatePrices: async (txb: Transaction, coinTypes: string[]): Promise<void> => {
        // Mock implementation - in production this would use the real AlphalendClient
        console.log('Mock alphalend client updatePrices called with coin types:', coinTypes);
      },
    };
  }

  /**
   * Get coin object from user's wallet
   * @param coinType - The coin type to fetch
   * @param address - User address
   * @param txb - Transaction block
   * @returns Coin object
   */
  private async getCoinObject(coinType: string, address: string, txb: Transaction): Promise<any> {
    const coins = await this.blockchain.client.getCoins({
      owner: address,
      coinType: coinType,
    });

    if (coins.data.length === 0) {
      throw new Error(`No coins of type ${coinType} found`);
    }

    return txb.object(coins.data[0].coinObjectId);
  }

  /**
   * Deposit into Alphalend looping pools
   * @param amount - Amount to deposit in smallest unit
   * @param poolId - Pool ID for the Alphalend pool
   * @returns Transaction ready for signing and execution
   */
  async depositAlphalendTx(amount: string, poolId: string): Promise<Transaction> {
    console.log('Depositing into Alphalend pool', amount, poolId);
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('ALPHALEND')) {
      throw new Error(`Pool ${poolId} is not an Alphalend protocol pool`);
    }

    const poolName = poolinfo.poolName as AlphalendPoolName;

    if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
      return this.alphalendSuiStsuiLoopDepositTx(amount, poolinfo);
    } else if (poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
      return this.alphalendSingleLoopDepositTx(amount, poolinfo);
    } else {
      throw new Error(`Unsupported Alphalend pool: ${poolName}`);
    }
  }

  /**
   * Withdraw from Alphalend looping pools
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolId - Pool ID for the Alphalend pool
   * @returns Transaction ready for signing and execution
   */
  async withdrawAlphalendTx(xTokens: string, poolId: string): Promise<Transaction> {
    console.log('Withdrawing from Alphalend pool', xTokens, poolId);
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('ALPHALEND')) {
      throw new Error(`Pool ${poolId} is not an Alphalend protocol pool`);
    }

    const poolName = poolinfo.poolName as AlphalendPoolName;

    if (poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
      return this.alphalendSuiStsuiLoopWithdrawTx(xTokens, poolinfo);
    } else if (poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
      return this.alphalendSingleLoopWithdrawTx(xTokens, poolinfo);
    } else {
      throw new Error(`Unsupported Alphalend pool: ${poolName}`);
    }
  }

  /**
   * Deposit into ALPHALEND-LOOP-SUI-STSUI pool
   * @param amount - Amount to deposit
   * @param poolinfo - Pool information
   * @returns Transaction
   */
  private async alphalendSuiStsuiLoopDepositTx(amount: string, poolinfo: any): Promise<Transaction> {
    const C = getConf();
    const txb = new Transaction();
    const alphalendClient = this.createAlphalendClient();

    // Update prices for STSUI and SUI
    await alphalendClient.updatePrices(txb, [coinsList['STSUI'].type, '0x2::sui::SUI']);

    // Get receipt for this pool
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId.toString(), this.address);

    // Handle receipt creation
    let someReceipt: any;
    if (!receipt) {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt.type],
        arguments: [txb.object(receipt.id)],
      });
    }

    // Split coins for deposit
    const [depositCoin] = txb.splitCoins(txb.gas, [amount]);

    // Collect rewards with one swap (ALPHA)
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
      typeArguments: [coinsList['ALPHA'].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object('0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa'), // ALPHA-STSUI pool
        txb.object(C.BLUEFIN_GLOBAL_CONFIG),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with no swap
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Collect rewards with two swaps (BLUE)
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
      typeArguments: [coinsList['BLUE'].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.LST_INFO),
        txb.object(C.SUI_SYSTEM_STATE),
        txb.object('0x0254747f5ca059a1972cd7f6016485d51392a3fde608107b93bbaebea550f703'), // BLUE-SUI pool
        txb.object(C.CETUS_GLOBAL_CONFIG_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Execute user deposit
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_deposit_v3`,
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(C.VERSION),
        someReceipt,
        txb.object(poolinfo.poolId),
        depositCoin,
        txb.object(poolinfo.investorId),
        txb.object(C.ALPHA_DISTRIBUTOR),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.LST_INFO),
        txb.object(C.SUI_SYSTEM_STATE),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    return txb;
  }

  /**
   * Deposit into ALPHALEND-SINGLE-LOOP-TBTC pool
   * @param amount - Amount to deposit
   * @param poolinfo - Pool information
   * @returns Transaction
   */
  private async alphalendSingleLoopDepositTx(amount: string, poolinfo: any): Promise<Transaction> {
    const C = getConf();
    const txb = new Transaction();
    const alphalendClient = this.createAlphalendClient();

    // Get the supply coin for this looping pool
    const coinName = poolinfo.loopingPoolCoinMap?.supplyCoin || 'TBTC';

    // Update prices
    await alphalendClient.updatePrices(txb, [coinsList[coinName].type]);

    // Get receipt for this pool
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId.toString(), this.address);

    // Handle receipt creation
    let someReceipt: any;
    if (!receipt) {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = txb.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt.type],
        arguments: [txb.object(receipt.id)],
      });
    }

    // Handle coin preparation
    let totalCoin: any;
    if (coinName === 'SUI') {
      totalCoin = txb.gas;
    } else {
      totalCoin = await this.getCoinObject(coinsList[coinName].type, this.address, txb);
    }

    const [depositCoin] = txb.splitCoins(totalCoin, [amount]);

    // Collect and swap rewards for TBTC pools
    if (poolinfo.poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
      // Collect and swap rewards for ALPHA-STSUI
      txb.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['ALPHA'].type, coinsList['STSUI'].type],
        arguments: [
          txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
          txb.object(poolinfo.investorId),
          txb.object(C.LENDING_PROTOCOL_ID),
          txb.object('0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa'), // ALPHA-STSUI pool
          txb.object(C.BLUEFIN_GLOBAL_CONFIG),
          txb.pure.bool(true),
          txb.pure.bool(false),
          txb.object(C.CLOCK_PACKAGE_ID),
        ],
      });

      // Collect and swap rewards for STSUI-SUI
      txb.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['STSUI'].type, coinsList['SUI'].type],
        arguments: [
          txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
          txb.object(poolinfo.investorId),
          txb.object(C.LENDING_PROTOCOL_ID),
          txb.object('0x06d8af9e6afd27262db436f0d37b304a041f710c3ea1fa4c3a9bab36b3569d23'), // STSUI-SUI pool
          txb.object(C.BLUEFIN_GLOBAL_CONFIG),
          txb.pure.bool(true),
          txb.pure.bool(true),
          txb.object(C.CLOCK_PACKAGE_ID),
        ],
      });

      // Continue with other pool swaps...
      txb.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['BLUE'].type, coinsList['SUI'].type],
        arguments: [
          txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
          txb.object(poolinfo.investorId),
          txb.object(C.LENDING_PROTOCOL_ID),
          txb.object('0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cee681cf4a2'), // BLUE-SUI pool
          txb.object(C.BLUEFIN_GLOBAL_CONFIG),
          txb.pure.bool(true),
          txb.pure.bool(true),
          txb.object(C.CLOCK_PACKAGE_ID),
        ],
      });
    }

    // Execute user deposit
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::user_deposit`,
      typeArguments: [coinsList[coinName].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
        txb.object(C.VERSION),
        someReceipt,
        txb.object(poolinfo.poolId),
        depositCoin,
        txb.object(poolinfo.investorId),
        txb.object(C.ALPHA_DISTRIBUTOR),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer remaining coins back to user
    if (coinName !== 'SUI') {
      txb.transferObjects([totalCoin], this.address);
    }

    return txb;
  }

  /**
   * Withdraw from ALPHALEND-LOOP-SUI-STSUI pool
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolinfo - Pool information
   * @returns Transaction
   */
  private async alphalendSuiStsuiLoopWithdrawTx(xTokens: string, poolinfo: any): Promise<Transaction> {
    const C = getConf();
    const txb = new Transaction();
    const alphalendClient = this.createAlphalendClient();

    // Get receipts for this pool
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);

    if (!receipt) {
      throw new Error('No ALPHALEND-LOOP-SUI-STSUI Receipt found for withdrawal');
    }

    // Get ALPHA receipt
    const alphaReceipt = await this.blockchain.getReceipt('1', this.address); // Pool ID 1 is ALPHA

    // Update prices
    await alphalendClient.updatePrices(txb, [coinsList['STSUI'].type, '0x2::sui::SUI']);

    // Handle alpha receipt
    let alpha_receipt: any;
    if (!alphaReceipt) {
      [alpha_receipt] = txb.moveCall({
        target: `0x1::option::none`,
        typeArguments: [C.ALPHA_POOL_RECEIPT],
        arguments: [],
      });
    } else {
      [alpha_receipt] = txb.moveCall({
        target: `0x1::option::some`,
        typeArguments: [alphaReceipt.type],
        arguments: [txb.object(alphaReceipt.id)],
      });
    }

    // Collect rewards before withdrawal
    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
      typeArguments: [coinsList['ALPHA'].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.BLUEFIN_ALPHA_STSUI_POOL),
        txb.object(C.BLUEFIN_GLOBAL_CONFIG),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
      typeArguments: [coinsList['BLUE'].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(poolinfo.investorId),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.LST_INFO),
        txb.object(C.SUI_SYSTEM_STATE),
        txb.object(C.BLUE_SUI_CETUS_POOL_ID),
        txb.object(C.CETUS_GLOBAL_CONFIG_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Execute user withdrawal
    const [stsuiCoin] = txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_sui_stsui_pool::user_withdraw_v3`,
      arguments: [
        txb.object(C.ALPHA_5_VERSION),
        txb.object(C.VERSION),
        txb.object(receipt.id),
        alpha_receipt,
        txb.object(C.ALPHA_POOL),
        txb.object(poolinfo.poolId),
        txb.pure.u64(xTokens),
        txb.object(poolinfo.investorId),
        txb.object(C.ALPHA_DISTRIBUTOR),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.LST_INFO),
        txb.object(C.SUI_SYSTEM_STATE),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer withdrawn SUI to user
    txb.moveCall({
      target: `0x2::transfer::public_transfer`,
      typeArguments: [`0x2::coin::Coin<${coinsList['SUI'].type}>`],
      arguments: [stsuiCoin, txb.pure.address(this.address)],
    });

    return txb;
  }

  /**
   * Withdraw from ALPHALEND-SINGLE-LOOP-TBTC pool
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolinfo - Pool information
   * @returns Transaction
   */
  private async alphalendSingleLoopWithdrawTx(xTokens: string, poolinfo: any): Promise<Transaction> {
    const C = getConf();
    const txb = new Transaction();
    const alphalendClient = this.createAlphalendClient();

    // Get the supply coin for this looping pool
    const coinName = poolinfo.loopingPoolCoinMap?.supplyCoin || 'TBTC';

    // Get receipt for this pool
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId.toString(), this.address);

    if (!receipt) {
      throw new Error(`No ${poolinfo.poolName} Receipt found for withdrawal`);
    }

    // Get ALPHA receipt
    const alphaReceipt = await this.blockchain.getReceipt('1', this.address);

    // Update prices
    await alphalendClient.updatePrices(txb, [coinsList[coinName].type]);

    // Handle alpha receipt
    let alpha_receipt: any;
    if (!alphaReceipt) {
      [alpha_receipt] = txb.moveCall({
        target: `0x1::option::none`,
        typeArguments: [C.ALPHA_POOL_RECEIPT],
        arguments: [],
      });
    } else {
      [alpha_receipt] = txb.moveCall({
        target: `0x1::option::some`,
        typeArguments: [alphaReceipt.type],
        arguments: [txb.object(alphaReceipt.id)],
      });
    }

    // Collect and swap rewards before withdrawal (similar to deposit)
    if (poolinfo.poolName === 'ALPHALEND-SINGLE-LOOP-TBTC') {
      // Simplified reward collection - only the essential ones
      txb.moveCall({
        target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [coinsList['TBTC'].type, coinsList['ALPHA'].type, coinsList['STSUI'].type],
        arguments: [
          txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
          txb.object(poolinfo.investorId),
          txb.object(C.LENDING_PROTOCOL_ID),
          txb.object('0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa'), // ALPHA-STSUI pool
          txb.object(C.BLUEFIN_GLOBAL_CONFIG),
          txb.pure.bool(true),
          txb.pure.bool(false),
          txb.object(C.CLOCK_PACKAGE_ID),
        ],
      });
    }

    // Execute user withdrawal
    const [coin] = txb.moveCall({
      target: `${poolinfo.packageId}::alphafi_alphalend_single_loop_pool::user_withdraw`,
      typeArguments: [coinsList[coinName].type],
      arguments: [
        txb.object(C.ALPHA_5_VERSION), // Using ALPHA_5_VERSION instead
        txb.object(C.VERSION),
        txb.object(receipt.id),
        alpha_receipt,
        txb.object(C.ALPHA_POOL),
        txb.object(poolinfo.poolId),
        txb.pure.u64(xTokens),
        txb.object(poolinfo.investorId),
        txb.object(C.ALPHA_DISTRIBUTOR),
        txb.object(C.LENDING_PROTOCOL_ID),
        txb.object(C.CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer withdrawn coin to user
    txb.transferObjects([coin], this.address);

    return txb;
  }

  /**
   * Check if user has any deposits in the Alphalend pool
   * @param poolId - Pool ID for the Alphalend pool
   * @returns Promise<boolean> - True if user has deposits
   */
  async hasDeposits(poolId: number): Promise<boolean> {
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);
    return !!receipt;
  }

  /**
   * Get user's xToken balance for the Alphalend pool
   * @param poolId - Pool ID for the Alphalend pool
   * @returns Promise<string> - xToken balance as string
   */
  async getUserAlphalendBalance(poolId: number): Promise<string> {
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);

    if (!receipt) {
      return '0';
    }

    // Extract balance from receipt if available
    return receipt.xTokenBalance?.toString() || '0';
  }
}