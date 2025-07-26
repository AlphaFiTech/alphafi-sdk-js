import { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { getConf } from '../../common/constants.js';
import { poolDetailsMap } from '../../common/maps.js';
import { Blockchain } from '../blockchain.js';
import { coinsList } from '../../common/coins.js';
import { CoinStruct } from '@mysten/sui/client';
import { PoolUtils } from '../pool.js';

export interface ZapDepositOptions {
  inputCoinName: string;
  inputCoinAmount: number;
  poolId: number;
  slippage: number; // 0.01 --> 1%, 0.001 --> 0.1%
}

export interface SwapResult {
  tx: Transaction;
  coinOut: TransactionObjectArgument | undefined;
  remainingLSTCoin: TransactionObjectArgument | undefined;
  amountOut: string;
}

export class ZapDepositTransactions {
  constructor(
    private address: string,
    private blockchain: Blockchain,
    private poolUtils: PoolUtils,
  ) {
    this.blockchain = blockchain;
    this.poolUtils = poolUtils;
  }

  /**
   * Main zap deposit function - swaps input token to pool tokens and deposits
   * @param options - Zap deposit configuration options
   * @returns Transaction ready for signing and execution
   */
  async zapDepositTx(options: ZapDepositOptions): Promise<Transaction> {
    console.log('Creating zap deposit transaction', options);

    const { inputCoinName, inputCoinAmount, poolId, slippage } = options;
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found in poolDetailsMap`);
    }

    // Check if this is a dual asset pool that supports zap deposits
    if (!('tokenA' in poolinfo.assetTypes && 'tokenB' in poolinfo.assetTypes)) {
      throw new Error(`Pool ${poolId} is not a dual asset pool - zap deposits not supported`);
    }

    console.log('Pool info', poolinfo);

    const tx = new Transaction();

    // Get receipts for this pool
    const receipt: any[] = await this.blockchain.getReceipts(poolId, this.address);

    // Get input coins from wallet
    const inputCoins = await this.getInputCoins(inputCoinName, inputCoinAmount);

    if (inputCoins.length === 0) {
      throw new Error(`No ${inputCoinName} coins found in wallet`);
    }

    // Prepare input coin
    const [inputCoin] = tx.splitCoins(tx.object(inputCoins[0].coinObjectId), [0]);
    tx.mergeCoins(
      inputCoin,
      inputCoins.map((c) => c.coinObjectId),
    );
    const [swapCoin] = tx.splitCoins(inputCoin, [inputCoinAmount.toString()]);

    // Transfer remaining coins back to user
    tx.transferObjects([inputCoin], this.address);

    // Handle receipt creation
    let someReceipt: any;
    if (receipt.length === 0) {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [poolinfo.receipt.type],
        arguments: [],
      });
    } else {
      [someReceipt] = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receipt[0].type],
        arguments: [tx.object(receipt[0].id)],
      });
    }

    // Perform zap logic based on pool type
    if (poolinfo.strategyType === 'CETUS') {
      return this.zapDepositCetus(tx, someReceipt, poolinfo, swapCoin, inputCoinName, slippage);
    } else if (poolinfo.strategyType === 'BLUEFIN') {
      return this.zapDepositBluefin(tx, someReceipt, poolinfo, swapCoin, inputCoinName, slippage);
    } else {
      throw new Error(`Zap deposits not supported for strategy type: ${poolinfo.strategyType}`);
    }
  }

  /**
   * Handle zap deposit for Cetus pools
   * @param tx - Transaction to build on
   * @param someReceipt - Pool receipt
   * @param poolinfo - Pool information
   * @param inputCoin - Input coin for swapping
   * @param inputCoinName - Name of input coin
   * @param slippage - Slippage tolerance
   * @returns Transaction with zap deposit logic
   */
  private async zapDepositCetus(
    tx: Transaction,
    someReceipt: any,
    poolinfo: any,
    inputCoin: TransactionObjectArgument,
    inputCoinName: string,
    slippage: number,
  ): Promise<Transaction> {
    console.log('Processing Cetus zap deposit');

    // Get target token types for the pool
    const tokenAType = poolinfo.assetTypes.tokenA;
    const tokenBType = poolinfo.assetTypes.tokenB;

    // Create zero coins for both target tokens initially
    const [coinA] = tx.moveCall({
      target: '0x2::coin::zero',
      typeArguments: [tokenAType],
      arguments: [],
    });

    const [coinB] = tx.moveCall({
      target: '0x2::coin::zero',
      typeArguments: [tokenBType],
      arguments: [],
    });

    // TODO: Implement swapping logic here
    // This would involve:
    // 1. Determine optimal split of input coin
    // 2. Swap portions to tokenA and tokenB
    // 3. Use 7k gateway or other DEX integrations

    // For now, use placeholder logic
    console.log('TODO: Implement Cetus swap logic for zap deposit');

    // Deposit into Cetus pool
    tx.moveCall({
      target: `${poolinfo.packageId}::alphafi_cetus_sui_pool::user_deposit`,
      typeArguments: [tokenAType, tokenBType],
      arguments: [
        tx.object(getConf().VERSION),
        someReceipt,
        tx.object(poolinfo.poolId),
        coinA,
        coinB,
        tx.object(poolinfo.investorId),
        tx.object(getConf().ALPHA_DISTRIBUTOR),
        tx.object(getConf().CETUS_GLOBAL_CONFIG_ID),
        tx.object(poolinfo.poolId), // Cetus pool object
        tx.object(getConf().CLOCK_PACKAGE_ID),
      ],
    });

    console.log('Cetus zap deposit transaction prepared');
    return tx;
  }

  /**
   * Handle zap deposit for Bluefin pools
   * @param tx - Transaction to build on
   * @param someReceipt - Pool receipt
   * @param poolinfo - Pool information
   * @param inputCoin - Input coin for swapping
   * @param inputCoinName - Name of input coin
   * @param slippage - Slippage tolerance
   * @returns Transaction with zap deposit logic
   */
  private async zapDepositBluefin(
    tx: Transaction,
    someReceipt: any,
    poolinfo: any,
    inputCoin: TransactionObjectArgument,
    inputCoinName: string,
    slippage: number,
  ): Promise<Transaction> {
    console.log('Processing Bluefin zap deposit');

    // Get target token types for the pool
    const tokenAType = poolinfo.assetTypes.tokenA;
    const tokenBType = poolinfo.assetTypes.tokenB;

    // Create zero coins for both target tokens initially
    const [coinA] = tx.moveCall({
      target: '0x2::coin::zero',
      typeArguments: [tokenAType],
      arguments: [],
    });

    const [coinB] = tx.moveCall({
      target: '0x2::coin::zero',
      typeArguments: [tokenBType],
      arguments: [],
    });

    // TODO: Implement swapping logic here
    // This would involve:
    // 1. Determine optimal split of input coin
    // 2. Swap portions to tokenA and tokenB
    // 3. Use 7k gateway or other DEX integrations

    // For now, use placeholder logic
    console.log('TODO: Implement Bluefin swap logic for zap deposit');

    // Deposit into Bluefin pool based on pool type
    if (poolinfo.poolName?.includes('SUI')) {
      // SUI-based pool
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_sui_first_pool::user_deposit`,
        typeArguments: [tokenAType, tokenBType],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          coinA,
          coinB,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.poolId), // Bluefin pool object
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      // Generic Bluefin pool
      tx.moveCall({
        target: `${poolinfo.packageId}::alphafi_bluefin_type_1_pool::user_deposit`,
        typeArguments: [tokenAType, tokenBType],
        arguments: [
          tx.object(getConf().VERSION),
          someReceipt,
          tx.object(poolinfo.poolId),
          coinA,
          coinB,
          tx.object(poolinfo.investorId),
          tx.object(getConf().ALPHA_DISTRIBUTOR),
          tx.object(getConf().BLUEFIN_GLOBAL_CONFIG),
          tx.object(poolinfo.poolId), // Bluefin pool object
          tx.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });
    }

    console.log('Bluefin zap deposit transaction prepared');
    return tx;
  }

  /**
   * Get input coins from user's wallet
   * @param coinName - Name of the coin to fetch
   * @param amount - Amount needed
   * @returns Array of coin structs
   */
  private async getInputCoins(coinName: string, amount: number): Promise<CoinStruct[]> {
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;

    // Get coin type from coinsList or use the coinName directly if it's a full type
    const coinType = coinsList[coinName]?.type || coinName;

    try {
      do {
        const response = await this.blockchain.client.getCoins({
          owner: this.address,
          coinType,
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

    return coins;
  }

  /**
   * Estimate the optimal amounts for zap deposit
   * @param options - Zap deposit options
   * @returns Estimated amounts for tokenA and tokenB
   */
  async getZapEstimate(options: ZapDepositOptions): Promise<{
    estimatedAmountA: string;
    estimatedAmountB: string;
    swapRequired: boolean;
  }> {
    console.log('Getting zap deposit estimate', options);

    const { inputCoinName, inputCoinAmount, poolId } = options;
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    // TODO: Implement actual estimation logic
    // This would involve:
    // 1. Get current pool ratios
    // 2. Calculate optimal split of input token
    // 3. Get swap quotes from DEX
    // 4. Return estimated final amounts

    return {
      estimatedAmountA: (inputCoinAmount * 0.5).toString(),
      estimatedAmountB: (inputCoinAmount * 0.5).toString(),
      swapRequired: true,
    };
  }

  /**
   * Check if a pool supports zap deposits
   * @param poolId - Pool ID to check
   * @returns boolean indicating if zap deposits are supported
   */
  isZapDepositSupported(poolId: number): boolean {
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      return false;
    }

    // Zap deposits are supported for dual asset pools (Cetus and Bluefin)
    const supportedStrategies = ['CETUS', 'BLUEFIN'];
    const isDualAsset = 'tokenA' in poolinfo.assetTypes && 'tokenB' in poolinfo.assetTypes;

    return supportedStrategies.includes(poolinfo.strategyType) && isDualAsset;
  }

  /**
   * Get supported input tokens for zap deposits
   * @returns Array of supported coin names
   */
  getSupportedInputTokens(): string[] {
    return [
      'SUI',
      'USDC',
      'USDT',
      'WETH',
      'HASUI',
      'VSUI',
      'STSUI',
      'CETUS',
      'NAVX',
      'ALPHA',
      'BUCK',
    ];
  }

  /**
   * Calculate slippage tolerance in basis points
   * @param percentage - Slippage percentage (e.g., 1 for 1%)
   * @returns Slippage in decimal format (e.g., 0.01 for 1%)
   */
  calculateSlippage(percentage: number): number {
    return percentage / 100;
  }

  /**
   * Get minimum amounts after slippage
   * @param amountA - Amount of token A
   * @param amountB - Amount of token B
   * @param slippage - Slippage tolerance
   * @returns Minimum amounts considering slippage
   */
  getMinimumAmounts(
    amountA: string,
    amountB: string,
    slippage: number,
  ): {
    minAmountA: string;
    minAmountB: string;
  } {
    const minAmountA = (Number(amountA) * (1 - slippage)).toString();
    const minAmountB = (Number(amountB) * (1 - slippage)).toString();

    return { minAmountA, minAmountB };
  }

  /**
   * Get pool information for zap deposits
   * @param poolId - Pool ID
   * @returns Pool information relevant to zap deposits
   */
  getZapPoolInfo(poolId: number) {
    const poolinfo = poolDetailsMap[poolId];

    if (!poolinfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    return {
      poolId: poolinfo.poolId,
      poolName: poolinfo.poolName,
      strategyType: poolinfo.strategyType,
      assetTypes: poolinfo.assetTypes,
      supportsZap: this.isZapDepositSupported(poolId),
      protocol: poolinfo.strategyType.toLowerCase(),
    };
  }
}
