/**
 * SlushSingleAssetLooping Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, StringMap } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl, UserWithdrawalStatus } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  IMAGE_URLS,
  VERSIONS,
} from '../utils/constants.js';

/**
 * SlushSingleAssetLooping Strategy for leveraged positions with delayed withdrawals
 */
export class SlushSingleAssetLoopingStrategy extends BaseStrategy<
  SlushSingleAssetLoopingPoolObject,
  never, // Investor is embedded in PoolObject
  never,
  SlushSingleAssetLoopingReceiptObject
> {
  private poolLabel: SlushSingleAssetLoopingPoolLabel;
  private poolObject: SlushSingleAssetLoopingPoolObject;
  private receiptObjects: SlushSingleAssetLoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(poolLabel: SlushSingleAssetLoopingPoolLabel, poolObject: any, context: StrategyContext) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.context = context;
  }

  getPoolLabel(): SlushSingleAssetLoopingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset SlushSingleAssetLooping strategy');
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Returns alpha mining data - SlushSingleAssetLooping pools do not support alpha mining
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
   * Get the exchange rate for xtoken to underlying token ratio
   * Calculated as tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokensInvested);
    const xtokenSupply = new Decimal(this.poolObject.xTokenSupply);

    if (xtokenSupply.isZero()) {
      return new Decimal(1);
    }

    return tokensInvested.div(xtokenSupply);
  }

  /**
   * Get comprehensive pool data including TVL and APR information
   */
  async getData(): Promise<PoolData> {
    const [_alphafi, parent, apr] = await Promise.all([
      this.getTvl(),
      this.getParentTvl(),
      this.context.getAprData(this.poolLabel.poolId),
    ]);
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr,
      tvl: {
        alphafi: parent,
        parent,
      },
    };
  }

  /**
   * Calculate total value locked using current asset price
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const [price, decimals] = await Promise.all([
      this.context.getCoinPrice(coinType),
      this.context.getCoinDecimals(coinType),
    ]);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(
      new Decimal(10).pow(decimals),
    );
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL (Alphalend only)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    if (protocol !== 'Alphalend') {
      throw new Error(`Unsupported parent protocol for SlushSingleAssetLooping: ${protocol}`);
    }
    const [tokenAmount, price] = await Promise.all([
      this.context.getAlphaLendTvl(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    return { tokenAmount, usdValue: tokenAmount.mul(price) };
  }

  /**
   * Calculate user's current pool balance including delayed withdrawals
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    const [price, decimals] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      this.context.getCoinDecimals(this.poolLabel.asset.type),
    ]);

    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokens === '0') {
      const withdrawals = await this.getWithdrawalsStatus();
      return {
        tokenAmount: new Decimal(0),
        usdValue: new Decimal(0),
        withdrawals,
      };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokens);
    const exchangeRate = this.exchangeRate();
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(decimals));
    const withdrawals = await this.getWithdrawalsStatus();

    return {
      tokenAmount: tokens,
      usdValue: tokens.mul(price),
      withdrawals,
    };
  }

  /**
   * Get detailed status of delayed withdrawal requests
   */
  async getWithdrawalsStatus(): Promise<UserWithdrawalStatus[]> {
    if (this.receiptObjects.length === 0) return [];

    const decimals = await this.context.getCoinDecimals(this.poolLabel.asset.type);
    const currentTime = Date.now();

    return this.receiptObjects[0].withdrawRequests.map((req) => {
      const timeOfUnlock = parseInt(req.timeOfUnlock);
      // Status logic: 1 if current_time < time_of_unlock, otherwise 2 (matches requirements)
      const status = currentTime < timeOfUnlock ? 1 : 2;

      return {
        ticketId: req.id,
        tokenAmount: new Decimal(req.tokenAmount).div(new Decimal(10).pow(decimals)),
        status,
        withdrawalEtaTimestamp: timeOfUnlock,
      };
    });
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SlushSingleAssetLoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply: this.getNestedField(fields, 'x_token_supply.value') || this.getNestedField(fields, 'xTokenSupply.value'),
        tokensInvested: this.getStringField(fields, 'tokens_invested') || this.getStringField(fields, 'tokensInvested'),
        positionCount: this.getNestedField(fields, 'positions.size'),
        positionsTableId: this.getNestedField(fields, 'positions.id'),
        investor: {
          id: this.getStringField(fields.investor, 'id'),
          marketId: this.getStringField(fields.investor, 'market_id'),
        },
      };
    }, 'Failed to parse SlushSingleAssetLooping pool object');
  }

  /**
   * Parse investor object (not applicable as it is embedded in pool)
   */
  parseInvestorObject(_: any): never {
    throw new Error('Investor object embedded in pool for SlushSingleAssetLooping');
  }

  /**
   * Parse parent pool object (not applicable)
   */
  parseParentPoolObject(_: any): never {
    throw new Error('Parent pool object not used for SlushSingleAssetLooping');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SlushSingleAssetLoopingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        const withdrawRequests = (fields.withdraw_requests || []).map((req: any) => {
          const reqFields = this.extractFields(req);
          return {
            id: this.getStringField(reqFields, 'id'),
            timeOfRequest: this.getStringField(reqFields, 'time_of_request'),
            timeOfClaim: this.getStringField(reqFields, 'time_of_claim'),
            timeOfUnlock: this.getStringField(reqFields, 'time_of_unlock'),
            status: this.getNumberField(reqFields, 'status'),
            tokenAmount: this.getStringField(reqFields, 'token_amount'),
            xTokenAmount: this.getStringField(reqFields, 'x_token_amount'),
          };
        });

        return {
          id: this.getStringField(fields, 'id'),
          positionCapId: this.getStringField(fields, 'position_cap_id'),
          poolId: this.getStringField(fields, 'pool_id'),
          coinType: this.getNestedField(fields, 'coin_type.name'),
          principal: this.getStringField(fields, 'principal'),
          xTokens:
            this.getStringField(fields, 'xtokens') ||
            this.getStringField(fields, 'x_token_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          withdrawRequests,
        };
      }, `Failed to parse SlushSingleAssetLooping receipt object at index ${index}`);
    });
  }

  createPositionCap(tx: Transaction): TransactionResult {
    const urlBytes = Array.from(new TextEncoder().encode(IMAGE_URLS.SLUSH_POSITION_CAP));
    // module name provided: alphalend_slush_delayed_withdraw_loop_pool
    const target = `${this.poolLabel.packageId}::alphalend_slush_delayed_withdraw_loop_pool::create_position_cap`;
    const positionCap = tx.moveCall({
      target,
      arguments: [tx.pure.vector('u8', urlBytes)],
    });

    return positionCap;
  }

  private coinAmountToXToken(amount: string): string {
    const exchangeRate = this.exchangeRate();
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const alphalendClient = new AlphalendClient('mainnet', this.context.blockchain.suiClient);
    await alphalendClient.updatePrices(tx, [this.poolLabel.asset.type]);

    // Get coin object
    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      BigInt(options.amount),
    );

    const positionCaps = await this.context.getSlushPositionCaps(options.address);
    const target = `${this.poolLabel.packageId}::alphalend_slush_delayed_withdraw_loop_pool::user_deposit`;

    if (positionCaps.length === 0) {
      const positionCap: TransactionResult = this.createPositionCap(tx);
      tx.moveCall({
        target,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          positionCap,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.transferObjects([positionCap], options.address);
    } else {
      tx.moveCall({
        target,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(positionCaps[0].id),
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found for withdraw');
    }

    const alphalendClient = new AlphalendClient('mainnet', this.context.blockchain.suiClient);
    await alphalendClient.updatePrices(tx, [this.poolLabel.asset.type]);

    let xTokenAmount = this.coinAmountToXToken(options.amount);
    if (options.withdrawMax) {
      xTokenAmount = this.receiptObjects[0].xTokens;
    }

    const positionCaps = await this.context.getSlushPositionCaps(options.address);
    const target = `${this.poolLabel.packageId}::alphalend_slush_delayed_withdraw_loop_pool::user_initiate_withdraw`;

    tx.moveCall({
      target,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(positionCaps[0].id),
        tx.object(this.poolLabel.poolId),
        tx.pure.u64(xTokenAmount),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async claimWithdraw(tx: Transaction, withdrawRequestId: string, address: string) {
    const positionCaps = await this.context.getSlushPositionCaps(address);
    if (positionCaps.length === 0) {
      throw new Error('No position cap found for claim');
    }

    const target = `${this.poolLabel.packageId}::alphalend_slush_delayed_withdraw_loop_pool::user_claim_withdraw`;
    const coin = tx.moveCall({
      target,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(positionCaps[0].id),
        tx.object(this.poolLabel.poolId),
        tx.pure.id(withdrawRequestId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    tx.transferObjects([coin], address);
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

/**
 * SlushSingleAssetLooping Pool object data structure
 */
export interface SlushSingleAssetLoopingPoolObject {
  id: string;
  xTokenSupply: string;
  tokensInvested: string;
  positionCount: string;
  positionsTableId: string;
  investor: {
    id: string;
    marketId: string;
  };
}

/**
 * SlushSingleAssetLoopingUserWithdrawRequest - Used in SlushSingleAssetLoopingReceiptObject
 */
export interface SlushSingleAssetLoopingUserWithdrawRequest {
  id: string;
  timeOfRequest: string;
  timeOfClaim: string;
  timeOfUnlock: string;
  status: number;
  tokenAmount: string;
  xTokenAmount: string;
}

/**
 * SlushSingleAssetLooping Receipt object data structure
 */
export interface SlushSingleAssetLoopingReceiptObject {
  id: string;
  positionCapId: string;
  poolId: string;
  coinType: string;
  principal: string;
  xTokens: string;
  withdrawRequests: SlushSingleAssetLoopingUserWithdrawRequest[];
}

/**
 * SlushSingleAssetLooping Pool Label configuration
 */
export interface SlushSingleAssetLoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'SlushSingleAssetLooping';
  parentProtocol: ProtocolType;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
