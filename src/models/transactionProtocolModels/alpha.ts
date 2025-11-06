import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { coinsList } from '@alphafi/alphafi-sdk-upstream';

export class AlphaTransactions {
  private alphalendClient: AlphalendClient;
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.address = address;
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.alphalendClient = new AlphalendClient('mainnet', this.blockchain.client);
  }

  /**
   * Create a new AlphaFi receipt object
   */
  private createAlphaFiReceipt(tx: Transaction) {
    return tx.moveCall({
      target: `${getConf().ALPHAFI_RECEIPT_PACKAGE_ID}::alphafi_receipt::create_alphafi_receipt_v2`,
      arguments: [tx.pure.string(getConf().ALPHAFI_RECEIPT_IMAGE_URL)],
    });
  }

  /**
   * Check if position is present in AlphaFi receipt
   */
  private isPositionPresent(
    alphafiReceipt: { position_pool_map: Array<{ key: string; value: { pool_id: string } }> },
    poolId: string,
  ): boolean {
    return alphafiReceipt.position_pool_map.some(
      (item) =>
        `0x${item.value.pool_id}` === poolId ||
        item.value.pool_id === poolId ||
        item.value.pool_id === `0x${poolId}`,
    );
  }

  /**
   * Deposit ALPHA tokens into the ALPHA Ember pool
   * @param amount - Amount to deposit in smallest unit
   * @returns Transaction ready for signing and execution
   */
  async depositAlphaTx(amount: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMapByPoolName['ALPHA'];

    // Fetch ALPHA coins from the user's wallet
    const coin = await this.transactionUtils.getCoinFromWallet(
      tx,
      this.address,
      poolinfo.assetTypes[0],
    );
    const [depositCoin] = tx.splitCoins(coin, [amount]);

    // Transfer remaining coins back to user
    tx.transferObjects([coin], this.address);

    // Get receipts
    const receipt = await this.blockchain.getReceipt(poolinfo.poolId, this.address);
    const alphafiReceipt = await this.blockchain.getAlphaFiReceipt(this.address);
    await this.alphalendClient.updatePrices(tx, [coinsList["ALPHA"].type, coinsList["SUI"].type, coinsList["ESUI"].type]);

    if (alphafiReceipt.length === 0) {
      // Create new AlphaFi receipt
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);

      // Convert alpha receipt to ember position if alpha receipt exists
      if (receipt) {
        tx.moveCall({
          target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
          typeArguments: [getConf().ALPHA_COIN_TYPE],
          arguments: [
            tx.object(getConf().ALPHA_EMBER_VERSION),
            tx.object(getConf().ALPHAFI_EMBER_POOL),
            alphafiReceiptObj,
            tx.object(receipt.id),
            tx.object(getConf().ALPHA_POOL),
          ],
        });
      }

      // Deposit to ember pool
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::user_deposit`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          alphafiReceiptObj,
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          depositCoin,
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${getConf().ALPHAFI_RECEIPT_PACKAGE_ID}::alphafi_receipt::transfer_receipt_to_new_owner`,
        arguments: [
          alphafiReceiptObj,
          tx.pure.address(this.address),
          tx.object(getConf().ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES),
        ]
      })
    } else {
      const existingReceipt = alphafiReceipt[0];

      // Convert alpha receipt to ember position if needed
      if (receipt) {
        const isPositionPresent = this.isPositionPresent(
          existingReceipt,
          getConf().ALPHAFI_EMBER_POOL,
        );

        if (!isPositionPresent) {
          tx.moveCall({
            target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
            typeArguments: [getConf().ALPHA_COIN_TYPE],
            arguments: [
              tx.object(getConf().ALPHA_EMBER_VERSION),
              tx.object(getConf().ALPHAFI_EMBER_POOL),
              tx.object(existingReceipt.id),
              tx.object(receipt.id),
              tx.object(getConf().ALPHA_POOL),
            ],
          });
        }
      }

      // Deposit to ember pool
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::user_deposit`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          tx.object(existingReceipt.id),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          depositCoin,
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }

  /**
   * Initiate withdrawal from ALPHA Ember pool
   * @param xTokens - Amount of xTokens to withdraw
   * @returns Transaction ready for signing and execution
   */
  async initiateWithdrawAlphaTx(xTokens: string): Promise<Transaction> {
    const tx = new Transaction();

    const receipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );
    const alphafiReceipt = await this.blockchain.getAlphaFiReceipt(this.address);
    await this.alphalendClient.updatePrices(tx, [coinsList["ALPHA"].type, coinsList["SUI"].type, coinsList["ESUI"].type]);
    if (alphafiReceipt.length === 0) {
      // Create new AlphaFi receipt
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);

      if (!receipt) {
        throw new Error('No alphafi receipt and no alpha receipt found');
      }

      // Convert alpha receipt to ember position
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          alphafiReceiptObj,
          tx.object(receipt.id),
          tx.object(getConf().ALPHA_POOL),
        ],
      });

      // Initiate withdrawal
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::user_initiate_withdraw`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          alphafiReceiptObj,
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          tx.pure.u64(xTokens),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${getConf().ALPHAFI_RECEIPT_PACKAGE_ID}::alphafi_receipt::transfer_receipt_to_new_owner`,
        arguments: [
          alphafiReceiptObj,
          tx.pure.address(this.address),
          tx.object(getConf().ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES),
        ]
      })
    } else {
      const existingReceipt = alphafiReceipt[0];
      const isPositionPresent = this.isPositionPresent(
        existingReceipt,
        getConf().ALPHAFI_EMBER_POOL,
      );

      if (!isPositionPresent && !receipt) {
        throw new Error('No position or old alpha receipt found');
      }

      // Convert alpha receipt to ember position if needed
      if (!isPositionPresent && receipt) {
        tx.moveCall({
          target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
          typeArguments: [getConf().ALPHA_COIN_TYPE],
          arguments: [
            tx.object(getConf().ALPHA_EMBER_VERSION),
            tx.object(getConf().ALPHAFI_EMBER_POOL),
            tx.object(existingReceipt.id),
            tx.object(receipt.id),
            tx.object(getConf().ALPHA_POOL),
          ],
        });
      }

      // Initiate withdrawal
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::user_initiate_withdraw`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          tx.object(existingReceipt.id),
          tx.object(getConf().LENDING_PROTOCOL_ID),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          tx.pure.u64(xTokens),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }

  /**
   * Claim withdrawal from ALPHA Ember pool
   * @param ticketId - ID of the withdrawal ticket to claim
   * @returns Transaction ready for signing and execution
   */
  async claimWithdrawAlphaTx(ticketId: string): Promise<Transaction> {
    const tx = new Transaction();

    const alphafiReceipt = await this.blockchain.getAlphaFiReceipt(this.address);

    if (alphafiReceipt.length === 0) {
      throw new Error('No Alphafi receipt found!');
    }
    await this.alphalendClient.updatePrices(tx, [coinsList["ALPHA"].type, coinsList["SUI"].type, coinsList["ESUI"].type]);
    let coin = tx.moveCall({
      target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::user_claim_withdraw`,
      typeArguments: [getConf().ALPHA_COIN_TYPE],
      arguments: [
        tx.object(getConf().ALPHA_EMBER_VERSION),
        tx.object(alphafiReceipt[0].id),
        tx.object(getConf().LENDING_PROTOCOL_ID),
        tx.object(getConf().ALPHAFI_EMBER_POOL),
        tx.pure.id(ticketId),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });
    tx.transferObjects([coin], this.address);
    return tx;
  }

  /**
   * Claim airdrop/rewards from ALPHA Ember pool
   * @returns Transaction ready for signing and execution
   */
  async claimAirdropTx(): Promise<Transaction> {
    const tx = new Transaction();
    let airdropCoin;
    const receipt = await this.blockchain.getReceipt(
      poolDetailsMapByPoolName['ALPHA'].poolId,
      this.address,
    );
    const alphafiReceipt = await this.blockchain.getAlphaFiReceipt(this.address);
    await this.alphalendClient.updatePrices(tx, [coinsList["ALPHA"].type, coinsList["SUI"].type, coinsList["ESUI"].type]);
    if (alphafiReceipt.length === 0) {
      // Create new AlphaFi receipt
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);

      if (!receipt) {
        throw new Error('No alphafi receipt and no alpha receipt found');
      }

      // Convert alpha receipt to ember position
      tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
        typeArguments: [getConf().ALPHA_COIN_TYPE],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
          alphafiReceiptObj,
          tx.object(receipt.id),
          tx.object(getConf().ALPHA_POOL),
        ],
      });

      // Get user rewards
      airdropCoin = tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::get_user_rewards`,
        typeArguments: [getConf().ALPHA_COIN_TYPE, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          alphafiReceiptObj,
          tx.object(getConf().ALPHAFI_EMBER_POOL),
        ],
      });

      tx.transferObjects([alphafiReceiptObj], this.address);
    } else {
      const existingReceipt = alphafiReceipt[0];
      const isPositionPresent = this.isPositionPresent(
        existingReceipt,
        getConf().ALPHAFI_EMBER_POOL,
      );

      if (!isPositionPresent && !receipt) {
        throw new Error('No position or old alpha receipt found');
      }

      // Convert alpha receipt to ember position if needed
      if (!isPositionPresent && receipt) {
        tx.moveCall({
          target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::convert_alpha_receipt_to_ember_position`,
          typeArguments: [getConf().ALPHA_COIN_TYPE],
          arguments: [
            tx.object(getConf().ALPHA_EMBER_VERSION),
            tx.object(getConf().ALPHAFI_EMBER_POOL),
            tx.object(existingReceipt.id),
            tx.object(receipt.id),
            tx.object(getConf().ALPHA_POOL),
          ],
        });
      }

      // Get user rewards
      airdropCoin = tx.moveCall({
        target: `${getConf().ALPHA_EMBER_LATEST_PACKAGE_ID}::alphafi_ember_pool::get_user_rewards`,
        typeArguments: [getConf().ALPHA_COIN_TYPE, coinsList['SUI'].type],
        arguments: [
          tx.object(getConf().ALPHA_EMBER_VERSION),
          tx.object(existingReceipt.id),
          tx.object(getConf().ALPHAFI_EMBER_POOL),
        ],
      });

    }
    tx.transferObjects([airdropCoin], this.address);
    return tx;
  }

}