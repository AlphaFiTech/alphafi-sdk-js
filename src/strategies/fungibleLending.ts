/**
 * FungibleLending Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, StringMap } from './strategy.js';
import { PoolData, PoolBalance, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { CLOCK_PACKAGE_ID, DEEPBOOK_CONFIG } from '../utils/constants.js';

/**
 * FungibleLending Strategy for dual-asset liquidity pools with fungible tokens
 */
export class FungibleLendingStrategy extends BaseStrategy<
  FungibleLendingPoolObject,
  never // FungibleLending doesn't have receipts
> {
  private poolLabel: FungibleLendingPoolLabel;
  private poolObject: FungibleLendingPoolObject;
  private xTokenBalance: Decimal = new Decimal(0);
  private context: StrategyContext;

  constructor(poolLabel: FungibleLendingPoolLabel, poolObject: any, context: StrategyContext) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.context = context;
  }

  getPoolLabel(): FungibleLendingPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(xTokenBalance: Decimal): void {
    this.xTokenBalance = xTokenBalance;
  }

  /**
   * Returns alpha mining data - FungibleLending pools do not support alpha mining
   */
  protected getAlphaMiningData(): AlphaMiningData {
    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: [],
      xTokenSupply: '0',
      receipt: null,
    };
  }

  /**
   * Get the exchange rate for fungible token to underlying token ratio
   * Calculated as tokens_invested / treasury_cap.total_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.totalDeposited).sub(
      new Decimal(this.poolObject.collectedFees),
    );
    const totalSupply = new Decimal(this.poolObject.totalLstSupply);

    if (totalSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(totalSupply);
  }

  /**
   * Get comprehensive pool data including TVL, LP breakdown, price, and position range
   */
  async getData(): Promise<PoolData> {
    const [alphafi, parent, apr] = await Promise.all([
      this.getTvl(),
      this.getParentTvl(),
      this.context.getAprData(this.poolLabel.poolId),
    ]);
    return {
      poolId: this.poolLabel.poolId,
      coinType: this.poolLabel.asset.type,
      poolName: this.poolLabel.poolName,
      apr,
      tvl: {
        alphafi,
        parent,
      },
    };
  }

  /**
   * Calculate total value locked using current asset prices and token amounts
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const price = await this.context.getCoinPrice(coinType);
    const decimals = await this.context.getCoinDecimals(coinType);
    const amount = new Decimal(this.poolObject.totalDeposited).div(Math.pow(10, decimals));
    const usdValue = amount.mul(price);
    return { tokenAmount: amount, usdValue };
  }

  /**
   * Calculate parent pool TVL from underlying protocol reserves
   */
  async getParentTvl(): Promise<SingleTvl> {
    return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
  }

  /**
   * Calculate user's current pool balance from fungible xToken balance
   * Uses wallet balance instead of receipts
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.xTokenBalance.isZero()) {
      return {
        tokenAmount: new Decimal(0),
        usdValue: new Decimal(0),
      };
    }

    const exchangeRate = this.exchangeRate();
    const coinType = this.poolLabel.asset.type;
    const decimals = await this.context.getCoinDecimals(coinType);
    const tokens = this.xTokenBalance.mul(exchangeRate).div(Math.pow(10, decimals));
    const price = await this.context.getCoinPrice(coinType);
    const usdValue = tokens.mul(price);
    return { tokenAmount: tokens, usdValue };
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('not supported');
  }

  private coinAmountToXToken(amount: string): string {
    const tokens = new Decimal(amount);
    const exchangeRate = this.exchangeRate();
    return tokens.div(exchangeRate).floor().toString();
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): FungibleLendingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        totalDeposited: this.getStringField(fields, 'total_deposited'),
        totalLstSupply: this.getStringField(fields, 'total_lst_supply'),
        id: this.getStringField(fields, 'id'),
        isPaused: this.getBooleanField(fields, 'is_paused', false),
        collectedFees: this.getStringField(fields, 'collected_fees'),
        depositLimit: this.getStringField(fields, 'deposit_limit'),
      };
    }, 'Failed to parse FungibleLending pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(_response: any): never {
    throw new Error('no investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('No parent pool needed');
  }

  /**
   * Parse receipt objects (not applicable for FungibleLending)
   */
  parseReceiptObjects(_responses: any[]): never {
    throw new Error('FungibleLending strategy does not have receipts');
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const amount = options.amount;
    if (amount === 0n) {
      throw new Error('cannot supply 0 amount');
    }

    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      BigInt(amount),
    );
    const lst = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_deepbook_pool::deposit`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(this.poolLabel.poolId),
        tx.object(DEEPBOOK_CONFIG.MARGIN_POOLS[this.poolLabel.asset.name]),
        tx.object(DEEPBOOK_CONFIG.MARGIN_REGISTRY),
        depositCoin,
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.transferObjects([lst], options.address);
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (options.amount === '0') {
      throw new Error('cannot withdraw zero');
    }
    if (this.xTokenBalance.isZero()) {
      throw new Error('No xToken balance found!');
    }

    let xTokenAmount = '0';
    if (options.withdrawMax) {
      xTokenAmount = this.xTokenBalance.toString();
    } else {
      xTokenAmount = this.coinAmountToXToken(options.amount.toString());
    }

    const withdrawFungibleCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.fungibleCoin.type,
      options.address,
      BigInt(xTokenAmount),
    );

    const coin = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_deepbook_pool::withdraw`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(this.poolLabel.poolId),
        tx.object(DEEPBOOK_CONFIG.MARGIN_POOLS[this.poolLabel.asset.name]),
        tx.object(DEEPBOOK_CONFIG.MARGIN_REGISTRY),
        withdrawFungibleCoin,
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.transferObjects([coin], options.address);
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

/**
 * FungibleLending Pool object data structure
 */
export interface FungibleLendingPoolObject {
  totalDeposited: string;
  collectedFees: string;
  id: string;
  isPaused: boolean;
  totalLstSupply: string;
  depositLimit: string;
}

/**
 * FungibleLending Pool Label configuration
 */
export interface FungibleLendingPoolLabel {
  poolId: string;
  packageId: string;
  strategyType: 'FungibleLending';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  fungibleCoin: StringMap;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
