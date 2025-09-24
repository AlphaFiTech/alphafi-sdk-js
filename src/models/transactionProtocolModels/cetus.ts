import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { TransactionUtils } from './utils.js';

export class CetusTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private transactionUtils: TransactionUtils,
  ) {
    this.blockchain = blockchain;
    this.transactionUtils = transactionUtils;
    this.address = address;
  }

  // CETUS Alpha-SUI Pool Deposit
  async depositCetusAlphaSuiTx(
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
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(tx.gas, [amount2]);
    tx.transferObjects([coin1], this.address);

    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_deposit`,
      typeArguments: [pool_token1, pool_token2],
      arguments: [
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(poolinfo.investorId),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
        tx.object(poolinfo.parentPoolId),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  // CETUS SUI Pool Deposit
  async depositCetusSuiTx(
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
    const [depositCoinA] = tx.splitCoins(coin1, [amount1]);
    const [depositCoinB] = tx.splitCoins(tx.gas, [amount2]);
    tx.transferObjects([coin1], this.address);

    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_deposit`,
      typeArguments: [pool_token1, pool_token2],
      arguments: [
        tx.object(getConf().ALPHA_2_VERSION),
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        depositCoinA,
        depositCoinB,
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(poolinfo.investorId),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(poolinfo.parentPoolId),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  // CETUS General Pool Deposit
  async depositCetusTx(poolId: string, amount: string, isAmountA: boolean): Promise<Transaction> {
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

    if (
      poolName === 'WUSDC-WBTC' ||
      poolName === 'USDC-USDT' ||
      poolName === 'USDC-WUSDC' ||
      poolName === 'USDC-ETH'
    ) {
      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool_base_a::user_deposit`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_deposit`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          depositCoinA,
          depositCoinB,
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }

  // CETUS Alpha-SUI Pool Withdraw
  async withdrawCetusAlphaSuiTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];

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

    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
      typeArguments: [pool_token1, pool_token2],
      arguments: [
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(getConf().ALPHA_POOL),
        tx.object(poolinfo.poolId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(poolinfo.investorId),
        tx.pure.u128(xTokens),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
        tx.object(poolinfo.parentPoolId),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  // CETUS SUI Pool Withdraw
  async withdrawCetusSuiTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

    const pool_token1: string = poolinfo.assetTypes[0];
    const pool_token2: string = poolinfo.assetTypes[1];

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

    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_withdraw`,
      typeArguments: [pool_token1, pool_token2],
      arguments: [
        tx.object(getConf().ALPHA_2_VERSION),
        tx.object(getConf().VERSION),
        tx.object(receipt.id),
        alpha_receipt,
        tx.object(getConf().ALPHA_POOL),
        tx.object(poolinfo.poolId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(poolinfo.investorId),
        tx.pure.u128(xTokens),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
        tx.object(poolinfo.parentPoolId),
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    return tx;
  }

  // CETUS General Pool Withdraw
  async withdrawCetusTx(poolId: string, xTokens: string): Promise<Transaction> {
    const tx = new Transaction();
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);

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

    if (
      poolName === 'WUSDC-WBTC' ||
      poolName === 'USDC-USDT' ||
      poolName === 'USDC-WUSDC' ||
      poolName === 'USDC-ETH'
    ) {
      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool_base_a::user_withdraw`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(getConf().ALPHA_POOL),
          tx.object(poolinfo.poolId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.pure.u128(xTokens),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::alphafi_cetus_pool::user_withdraw`,
        typeArguments: [pool_token1, pool_token2],
        arguments: [
          tx.object(getConf().VERSION),
          tx.object(receipt.id),
          alpha_receipt,
          tx.object(getConf().ALPHA_POOL),
          tx.object(poolinfo.poolId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(poolinfo.investorId),
          tx.pure.u128(xTokens),
          tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
          tx.object(getConf().CETUS_REWARDER_GLOBAL_VAULT_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(getConf().CETUS_SUI_CETUS_POOL_ID),
          tx.object(poolinfo.parentPoolId),
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    return tx;
  }
}
