/**
 * SlushLending Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, StringMap } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  GLOBAL_CONFIGS,
  IMAGE_URLS,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';

/**
 * SlushLending Strategy for slush lending pools without alpha mining
 */
export class SlushLendingStrategy extends BaseStrategy<
  SlushLendingPoolObject,
  never,
  never,
  SlushLendingReceiptObject
> {
  private poolLabel: SlushLendingPoolLabel;
  private poolObject: SlushLendingPoolObject;
  private receiptObjects: SlushLendingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(poolLabel: SlushLendingPoolLabel, poolObject: any, context: StrategyContext) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.context = context;
  }

  getPoolLabel(): SlushLendingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset SlushLending strategy');
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Returns alpha mining data - SlushLending pools do not support alpha mining
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
      coinType: this.poolLabel.asset.type,
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
      throw new Error(`Unsupported parent protocol for SlushLending: ${protocol}`);
    }
    const [tokenAmount, price] = await Promise.all([
      this.context.getAlphaLendTvl(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    return { tokenAmount, usdValue: tokenAmount.mul(price) };
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Converts xTokens to underlying tokens via exchange rate
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokens === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokens);
    const [price, exchangeRate, decimals] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      Promise.resolve(this.exchangeRate()),
      this.context.getCoinDecimals(this.poolLabel.asset.type),
    ]);
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(decimals));
    return { tokenAmount: tokens, usdValue: tokens.mul(price) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SlushLendingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply: this.getNestedField(fields, 'xTokenSupply.value'),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        interestBasedRewardsData: {
          rewardBalance: this.getStringField(fields.interest_based_rewards_data, 'reward_balance'),
          lastUpdatedTimestamp: this.getStringField(
            fields.interest_based_rewards_data,
            'last_updated_timestamp',
          ),
          rewardShareFromInterestBps: this.getNestedField(
            fields.interest_based_rewards_data,
            'reward_share_from_interest_bps.value',
          ),
        },
        timeBasedRewardsData: {
          rewardBalance: this.getStringField(fields.time_based_rewards_data, 'reward_balance'),
          startTime: this.getStringField(fields.time_based_rewards_data, 'start_time'),
          endTime: this.getStringField(fields.time_based_rewards_data, 'end_time'),
          rewardPerMs: this.getNestedField(fields.time_based_rewards_data, 'reward_per_ms.value'),
          lastUpdatedTimestamp: this.getStringField(
            fields.time_based_rewards_data,
            'last_updated_timestamp',
          ),
        },
        positionCount: this.getNestedField(fields, 'positions.size'),
        positionsTableId: this.getNestedField(fields, 'positions.id'),
        feeCollected: this.getStringField(fields, 'fee_collected'),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        investor: {
          id: this.getStringField(fields.investor, 'id'),
          marketId: this.getStringField(fields.investor, 'market_id'),
        },
        paused: this.getBooleanField(fields, 'paused', false),
      };
    }, 'Failed to parse Slush Lending pool object');
  }

  /**
   * Parse investor object (not applicable for SlushLending)
   */
  parseInvestorObject(_: any): never {
    throw new Error('Investor object not used for SlushLending');
  }

  /**
   * Parse parent pool object (not applicable for SlushLending)
   */
  parseParentPoolObject(_: any): never {
    throw new Error('Parent pool object not used for SlushLending');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SlushLendingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

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
        };
      }, `Failed to parse Slush Lending receipt object at index ${index}`);
    });
  }

  createPositionCap(tx: Transaction): TransactionResult {
    const urlBytes = Array.from(new TextEncoder().encode(IMAGE_URLS.SLUSH_POSITION_CAP));
    const positionCap = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::create_position_cap`,
      arguments: [tx.pure.vector('u8', urlBytes)],
    });

    return positionCap;
  }

  private coinAmountToXToken(amount: string): string {
    const exchangeRate = this.exchangeRate();
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  private async collectAndSwapRewards(tx: Transaction) {
    const [alphaCoin, stsuiCoin, suiCoin, blueCoin, deepCoin, usdcCoin, walCoin] =
      await this.context.getCoinsBySymbols([
        'ALPHA',
        'stSUI',
        'SUI',
        'BLUE',
        'DEEP',
        'USDC',
        'WAL',
      ]);

    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [this.poolLabel.asset.type, alphaCoin.coinType, stsuiCoin.coinType],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'stSUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [this.poolLabel.asset.type, stsuiCoin.coinType, suiCoin.coinType],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
      typeArguments: [this.poolLabel.asset.type, blueCoin.coinType, suiCoin.coinType],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(this.poolLabel.poolId),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
        tx.object(GLOBAL_CONFIGS.BLUEFIN),
        tx.pure.bool(true),
        tx.pure.bool(true),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    if (this.poolLabel.asset.type !== deepCoin.coinType) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }

    if (this.poolLabel.asset.type === usdcCoin.coinType) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.type === walCoin.coinType) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, walCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('WAL', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.type === deepCoin.coinType) {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
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

    await this.collectAndSwapRewards(tx);

    const positionCaps = await this.context.getSlushPositionCaps(options.address);
    if (positionCaps.length === 0) {
      const positionCap: TransactionResult = this.createPositionCap(tx);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::user_deposit`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          positionCap,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.transferObjects([positionCap], options.address);
    } else {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphalend_slush_pool::user_deposit`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.SLUSH),
          tx.object(positionCaps[0].id),
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(SUI_SYSTEM_STATE),
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

    await this.collectAndSwapRewards(tx);

    const positionCaps = await this.context.getSlushPositionCaps(options.address);
    const [slushCoin] = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::user_withdraw`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.SLUSH),
        tx.object(positionCaps[0].id),
        tx.object(this.poolLabel.poolId),
        tx.pure.u64(xTokenAmount),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    tx.transferObjects([slushCoin], options.address);
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

/**
 * SlushLending Pool object data structure
 */
export interface SlushLendingPoolObject {
  id: string;
  xTokenSupply: string;
  tokensInvested: string;
  interestBasedRewardsData: {
    rewardBalance: string;
    lastUpdatedTimestamp: string;
    rewardShareFromInterestBps: string;
  };
  timeBasedRewardsData: {
    rewardBalance: string;
    startTime: string;
    endTime: string;
    rewardPerMs: string;
    lastUpdatedTimestamp: string;
  };
  positionCount: string;
  positionsTableId: string;
  feeCollected: string;
  depositFee: string;
  depositFeeMaxCap: string;
  withdrawalFee: string;
  withdrawFeeMaxCap: string;
  investor: {
    id: string;
    marketId: string;
  };
  paused: boolean;
}

/**
 * SlushLending Receipt object data structure
 */
export interface SlushLendingReceiptObject {
  id: string;
  positionCapId: string;
  poolId: string;
  coinType: string;
  principal: string;
  xTokens: string;
}

/**
 * SlushLending Pool Label configuration
 */
export interface SlushLendingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'SlushLending';
  parentProtocol: ProtocolType;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
