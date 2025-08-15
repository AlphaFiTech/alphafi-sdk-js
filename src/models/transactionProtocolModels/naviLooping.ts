import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList } from '../../common/coinsList.js';
import { CoinStruct } from '@mysten/sui/client';
import { PoolUtils } from '../pool.js';

export class NaviLoopingTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Main deposit function for Navi Looping pools
   * Routes to specific pool implementation based on pool name
   * @param amount - Amount to deposit in smallest unit
   * @param poolId - Pool ID for the Navi Looping pool
   * @returns Transaction ready for signing and execution
   */
  async depositNaviLoopingTx(amount: string, poolId: number): Promise<Transaction> {
    console.log('Depositing Navi Looping', amount, poolId);
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('NAVI-LOOP')) {
      throw new Error(`Pool ${poolId} is not a Navi Looping pool`);
    }

    console.log('Pool info', poolinfo);
    const poolName = poolinfo.poolName;

    // Route to specific implementation based on pool name
    if (poolName === 'NAVI-LOOP-HASUI-SUI') {
      return this.naviHasuiSuiLoopDepositTx(amount, poolId);
    } else if (poolName === 'NAVI-LOOP-SUI-VSUI') {
      return this.naviSuiVsuiLoopDepositTx(amount, poolId);
    } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
      return this.naviUsdcUsdtLoopDepositTx(amount, poolId);
    } else if (poolName === 'NAVI-LOOP-USDT-USDC') {
      return this.naviUsdtUsdcLoopDepositTx(amount, poolId);
    } else if (poolName === 'NAVI-LOOP-SUI-STSUI') {
      return this.naviSuiStsuiLoopDepositTx(amount, poolId);
    } else {
      throw new Error(`Unsupported Navi Looping pool: ${poolName}`);
    }
  }

  /**
   * Main withdraw function for Navi Looping pools
   * Routes to specific pool implementation based on pool name
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolId - Pool ID for the Navi Looping pool
   * @returns Transaction ready for signing and execution
   */
  async withdrawNaviLoopingTx(xTokens: string, poolId: number): Promise<Transaction> {
    console.log('Withdrawing Navi Looping', xTokens, poolId);
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    if (!poolinfo.poolName?.includes('NAVI-LOOP')) {
      throw new Error(`Pool ${poolId} is not a Navi Looping pool`);
    }

    console.log('Pool info', poolinfo);
    const poolName = poolinfo.poolName;

    // Route to specific implementation based on pool name
    if (poolName === 'NAVI-LOOP-HASUI-SUI') {
      return this.naviHasuiSuiLoopWithdrawTx(xTokens, poolId);
    } else if (poolName === 'NAVI-LOOP-SUI-VSUI') {
      return this.naviSuiVsuiLoopWithdrawTx(xTokens, poolId);
    } else if (poolName === 'NAVI-LOOP-USDC-USDT') {
      return this.naviUsdcUsdtLoopWithdrawTx(xTokens, poolId);
    } else if (poolName === 'NAVI-LOOP-USDT-USDC') {
      return this.naviUsdtUsdcLoopWithdrawTx(xTokens, poolId);
    } else if (poolName === 'NAVI-LOOP-SUI-STSUI') {
      return this.naviSuiStsuiLoopWithdrawTx(xTokens, poolId);
    } else {
      throw new Error(`Unsupported Navi Looping pool: ${poolName}`);
    }
  }

  /**
   * Helper function to update price feeds for Navi oracle
   * This is required before any looping operations
   * @param tx - Transaction to add price updates to
   * @param supplyCoinType - Supply coin type for price update
   * @param borrowCoinType - Borrow coin type for price update
   */
  private updatePriceFeeds(tx: Transaction, supplyCoinType: string, borrowCoinType: string): void {
    // Note: This is a simplified version. In a full implementation, you would:
    // 1. Import the updateSingleTokenPrice function from naviOracle
    // 2. Get price feed info from naviPriceFeedMap
    // 3. Call updateSingleTokenPrice for both supply and borrow coins

    console.log(`Updating price feeds for ${supplyCoinType} and ${borrowCoinType}`);

    // Placeholder for price feed updates
    // updateSingleTokenPrice(naviPriceFeedMap[supplyCoinType].pythPriceInfo, naviPriceFeedMap[supplyCoinType].feedId, tx);
    // updateSingleTokenPrice(naviPriceFeedMap[borrowCoinType].pythPriceInfo, naviPriceFeedMap[borrowCoinType].feedId, tx);
  }

  /**
   * HASUI-SUI Looping Deposit Transaction
   * @param amount - Amount to deposit
   * @param poolId - Pool ID
   * @returns Transaction
   */
  private async naviHasuiSuiLoopDepositTx(amount: string, poolId: number): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Update price feeds
    this.updatePriceFeeds(tx, 'HASUI', 'SUI');

    // Get coin type for HASUI
    let hasuiCoinType: string;
    if ('token' in poolinfo.assetTypes) {
      hasuiCoinType = poolinfo.assetTypes.token as string;
    } else {
      throw new Error('HASUI-SUI loop pool does not have single asset type configuration');
    }

    const coinName = hasuiCoinType.split('::').pop()?.toUpperCase() || 'HASUI';

    // Get receipts for this pool
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);

    // Fetch HASUI coins from the user's wallet
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType: coinsList[coinName]?.type || hasuiCoinType,
          cursor: currentCursor,
        });

        coins = coins.concat(response.data);

        if (response.hasNextPage && response.nextCursor) {
          currentCursor = response.nextCursor;
        } else {
          break;
        }
      } while (true);
    } catch (error) {
      throw new Error(
        `Failed to fetch ${coinName} coins: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    if (coins.length < 1) {
      throw new Error(`No ${coinName} coins found in wallet for deposit`);
    }

    // Handle coin splitting and merging
    const [coin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins.map((c) => c.coinObjectId),
    );
    const [depositCoin] = tx.splitCoins(coin, [amount]);

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

    // TODO: Add reward collection logic here
    // This would involve calling getAvailableRewards and processing NAVX/VSUI rewards

    // Execute the deposit
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
        tx.object(getConf().HASUI_SUI_CETUS_POOL_ID), // cetusPoolMap["HASUI-SUI"]
        tx.object(getConf().HAEDEL_STAKING),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer remaining coins back to user
    tx.transferObjects([coin], this.address);

    console.log('HASUI-SUI looping deposit transaction created successfully');
    return tx;
  }

  /**
   * HASUI-SUI Looping Withdraw Transaction
   * @param xTokens - Amount of xTokens to withdraw
   * @param poolId - Pool ID
   * @returns Transaction
   */
  private async naviHasuiSuiLoopWithdrawTx(xTokens: string, poolId: number): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    // Update price feeds
    this.updatePriceFeeds(tx, 'HASUI', 'SUI');

    // Get receipts for this pool
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);

    if (!receipt) {
      throw new Error(`No ${poolinfo.poolName} Receipt found for withdrawal`);
    }

    // Get ALPHA receipt
    const alphaReceipt = await this.blockchain.getReceipt("1", this.address);

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

    // TODO: Add reward collection logic here

    // Execute the withdrawal
    const [hasuiCoin] = tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_navi_hasui_sui_pool::user_withdraw_v2`,
      arguments: [
        tx.object(getConf().ALPHA_2_VERSION),
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(poolDetailsMap[1].poolId), // ALPHA pool
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
        tx.object(getConf().HASUI_SUI_CETUS_POOL_ID), // cetusPoolMap["HASUI-SUI"]
        tx.object(getConf().HAEDEL_STAKING),
        tx.object(getConf().SUI_SYSTEM_STATE),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    // Transfer the withdrawn HASUI to the user
    tx.moveCall({
      target: `0x2::transfer::public_transfer`,
      typeArguments: [`0x2::coin::Coin<${coinsList['HASUI']?.type}>`],
      arguments: [hasuiCoin, tx.pure.address(this.address)],
    });

    console.log('HASUI-SUI looping withdrawal transaction created successfully');
    return tx;
  }

  // Placeholder methods for other looping pairs - these would be implemented similarly
  private async naviSuiVsuiLoopDepositTx(amount: string, poolId: number): Promise<Transaction> {
    throw new Error('SUI-VSUI looping deposit not yet implemented');
  }

  private async naviSuiVsuiLoopWithdrawTx(xTokens: string, poolId: number): Promise<Transaction> {
    throw new Error('SUI-VSUI looping withdraw not yet implemented');
  }

  private async naviUsdcUsdtLoopDepositTx(amount: string, poolId: number): Promise<Transaction> {
    throw new Error('USDC-USDT looping deposit not yet implemented');
  }

  private async naviUsdcUsdtLoopWithdrawTx(xTokens: string, poolId: number): Promise<Transaction> {
    throw new Error('USDC-USDT looping withdraw not yet implemented');
  }

  private async naviUsdtUsdcLoopDepositTx(amount: string, poolId: number): Promise<Transaction> {
    throw new Error('USDT-USDC looping deposit not yet implemented');
  }

  private async naviUsdtUsdcLoopWithdrawTx(xTokens: string, poolId: number): Promise<Transaction> {
    throw new Error('USDT-USDC looping withdraw not yet implemented');
  }

  private async naviSuiStsuiLoopDepositTx(amount: string, poolId: number): Promise<Transaction> {
    throw new Error('SUI-STSUI looping deposit not yet implemented');
  }

  private async naviSuiStsuiLoopWithdrawTx(xTokens: string, poolId: number): Promise<Transaction> {
    throw new Error('SUI-STSUI looping withdraw not yet implemented');
  }

  /**
   * Get user's xToken balance for a Navi Looping pool
   * @param poolId - Pool ID for the Navi Looping pool
   * @returns Promise<string> - xToken balance as string
   */
  async getUserNaviLoopingBalance(poolId: number): Promise<string> {
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);

    if (!receipt) {
      return '0';
    }

    return receipt.xTokenBalance?.toString() || '0';
  }

  /**
   * Check if user has any deposits in a Navi Looping pool
   * @param poolId - Pool ID for the Navi Looping pool
   * @returns Promise<boolean> - True if user has deposits
   */
  async hasDeposits(poolId: number): Promise<boolean> {
    const receipt = await this.blockchain.getReceipt(poolId.toString(), this.address);
    return !!receipt;
  }

  /**
   * Get pool information specific to Navi Looping protocol
   * @param poolId - Pool ID for the Navi Looping pool
   * @returns Pool information object
   */
  getNaviLoopingPoolInfo(poolId: number) {
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    if (!poolinfo.poolName?.includes('NAVI-LOOP')) {
      throw new Error(`Pool ${poolId} is not a Navi Looping pool`);
    }

    return {
      poolId: poolinfo.poolId,
      poolName: poolinfo.poolName,
      strategyType: poolinfo.strategyType,
      packageId: poolinfo.packageId,
      investorId: poolinfo.investorId,
      receiptType: poolinfo.receipt.type,
      assetTypes: poolinfo.assetTypes,
      protocol: 'navi-looping',
    };
  }
}
