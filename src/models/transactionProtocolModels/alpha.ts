import { Transaction } from "@mysten/sui/transactions";
import { getConf } from "../../common/constants.js";
import { poolDetailsMap } from "../../common/maps.js";
import { Blockchain } from "../blockchain.js";
import { coinsList } from "../../common/coinsList.ts";
import { CoinStruct } from "@mysten/sui/client";
import { PoolUtils } from "../pool.js";

export class AlphaTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Deposit ALPHA tokens into the ALPHA pool
   * @param amount - Amount to deposit in smallest unit
   * @returns Transaction ready for signing and execution
   */
  async depositAlphaTx(amount: string): Promise<Transaction> {
    console.log('Depositing ALPHA', amount);
    const tx = new Transaction();

    // ALPHA pool is typically pool ID 1
    const alphaPoolId = 1;
    const poolinfo = poolDetailsMap[alphaPoolId];

    if (!poolinfo) {
      throw new Error(`ALPHA pool with ID ${alphaPoolId} not found in poolDetailsMap`);
    }

    if (poolinfo.poolName !== 'ALPHA') {
      throw new Error(`Pool ${alphaPoolId} is not the ALPHA pool`);
    }

    console.log('Pool info', poolinfo);

    // Get receipts for ALPHA pool
    const receipt: any[] = await this.blockchain.getReceipts(alphaPoolId, this.address);

    // Fetch ALPHA coins from the user's wallet
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType: getConf().ALPHA_COIN_TYPE,
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
        `Failed to fetch ALPHA coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    if (coins.length < 1) {
      throw new Error('No ALPHA Coins found in wallet for deposit');
    }

    // Handle coin splitting and merging
    const [coin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins.map((c) => c.coinObjectId),
    );
    const [depositCoin] = tx.splitCoins(coin, [amount]);

    // Transfer remaining coins back to user
    tx.transferObjects([coin], this.address);

    // Handle receipt creation
    if (receipt.length === 0) {
      const [newReceipt] = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [getConf().ALPHA_POOL_RECEIPT],
        arguments: [],
      });

      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::user_deposit`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().VERSION),
          newReceipt,
          tx.object(getConf().ALPHA_POOL),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          depositCoin,
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      const [someReceipt] = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [getConf().ALPHA_POOL_RECEIPT],
        arguments: [tx.object(receipt[0].id)],
      });

      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::user_deposit`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(getConf().ALPHA_POOL),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          depositCoin,
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    console.log('ALPHA deposit transaction created successfully');
    return tx;
  }

  /**
   * Withdraw ALPHA tokens from the ALPHA pool
   * @param xTokens - Amount of xTokens to withdraw
   * @param withdrawFromLocked - Whether to withdraw from locked amount
   * @returns Transaction ready for signing and execution
   */
  async withdrawAlphaTx(
    xTokens: string,
    withdrawFromLocked: boolean = false,
  ): Promise<Transaction> {
    console.log('Withdrawing ALPHA', xTokens, 'withdrawFromLocked:', withdrawFromLocked);
    const tx = new Transaction();

    // ALPHA pool is typically pool ID 1
    const alphaPoolId = 1;
    const receipt: any[] = await this.blockchain.getReceipts(alphaPoolId, this.address);

    if (receipt.length === 0) {
      throw new Error('No ALPHA Receipt found for withdrawal');
    }

    tx.moveCall({
      target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::user_withdraw`,
      typeArguments: [getConf().ALPHA_COIN_TYPE],
      arguments: [
        tx.object(getConf().VERSION),
        tx.object(receipt[0].id),
        tx.object(getConf().ALPHA_POOL),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.pure.u64(xTokens),
        tx.object(getConf().CLOCK_PACKAGE_ID),
        tx.pure.bool(withdrawFromLocked),
      ],
    });

    console.log('ALPHA withdrawal transaction created successfully');
    return tx;
  }

  /**
   * Get user's xToken balance for the ALPHA pool
   * @returns Promise<string> - xToken balance as string
   */
  async getUserAlphaBalance(): Promise<string> {
    const alphaPoolId = 1;
    const receipt = await this.blockchain.getReceipts(alphaPoolId, this.address);

    if (receipt.length === 0) {
      return '0';
    }

    return receipt[0].xTokenBalance?.toString() || '0';
  }

  /**
   * Check if user has any deposits in the ALPHA pool
   * @returns Promise<boolean> - True if user has deposits
   */
  async hasAlphaDeposits(): Promise<boolean> {
    const alphaPoolId = 1;
    const receipt = await this.blockchain.getReceipts(alphaPoolId, this.address);
    return receipt.length > 0;
  }

  /**
   * Get pool information specific to ALPHA protocol
   * @returns Pool information object
   */
  getAlphaPoolInfo() {
    const alphaPoolId = 1;
    const poolinfo = poolDetailsMap[alphaPoolId];

    if (!poolinfo) {
      throw new Error(`ALPHA pool with ID ${alphaPoolId} not found`);
    }

    if (poolinfo.poolName !== 'ALPHA') {
      throw new Error(`Pool ${alphaPoolId} is not the ALPHA pool`);
    }

    return {
      poolId: poolinfo.poolId,
      poolName: poolinfo.poolName,
      strategyType: poolinfo.strategyType,
      packageId: poolinfo.packageId,
      receiptType: poolinfo.receipt.type,
      assetTypes: poolinfo.assetTypes,
      protocol: 'alpha',
    };
  }

  /**
   * Get estimated rewards available for claiming
   * @returns Promise<string> - Estimated rewards amount
   */
  async getEstimatedRewards(): Promise<string> {
    // Note: This would require implementing rewards calculation logic
    // For now, return placeholder
    console.log('Getting estimated ALPHA rewards...');
    return '0';
  }

  /**
   * Get user's available ALPHA coin balance in wallet
   * @returns Promise<string> - Available ALPHA balance
   */
  async getAvailableAlphaBalance(): Promise<string> {
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;
    let totalBalance = BigInt(0);

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType: getConf().ALPHA_COIN_TYPE,
          cursor: currentCursor,
        });

        coins = coins.concat(response.data);

        if (response.hasNextPage && response.nextCursor) {
          currentCursor = response.nextCursor;
        } else {
          break;
        }
      } while (true);

      // Sum up all coin balances
      coins.forEach((coin) => {
        totalBalance += BigInt(coin.balance);
      });

      return totalBalance.toString();
    } catch (error) {
      console.error('Error fetching ALPHA balance:', error);
      return '0';
    }
  }
}
