import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';

export class AlphaTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.address = address;
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
  }

  /**
   * Deposit ALPHA tokens into the ALPHA pool
   * @param amount - Amount to deposit in smallest unit
   * @returns Transaction ready for signing and execution
   */
  async depositAlphaTx(amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMapByPoolName['ALPHA'];

    // Get receipts for ALPHA pool
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);

    // Fetch ALPHA coins from the user's wallet
    const coin = await this.transactionUtils.getCoinFromWallet(
      tx,
      this.address,
      poolinfo.assetTypes[0],
    );
    const [depositCoin] = tx.splitCoins(coin, [amount]);

    // Transfer remaining coins back to user
    tx.transferObjects([coin], this.address);

    // Handle receipt creation
    const someReceipt = await this.transactionUtils.getReceiptObject(
      tx,
      poolinfo.receipt.type,
      receipt?.id,
    );

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
    const tx = new Transaction();
    const poolinfo = poolDetailsMapByPoolName['ALPHA'];

    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);

    if (!receipt) {
      throw new Error('No ALPHA Receipt found for withdrawal');
    }

    tx.moveCall({
      target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphapool::user_withdraw`,
      typeArguments: [getConf().ALPHA_COIN_TYPE],
      arguments: [
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        tx.object(getConf().ALPHA_POOL),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.pure.u64(xTokens),
        tx.object(getConf().CLOCK_PACKAGE_ID),
        tx.pure.bool(withdrawFromLocked),
      ],
    });

    return tx;
  }
}
