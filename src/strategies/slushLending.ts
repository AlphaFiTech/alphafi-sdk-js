/**
 * SlushLending Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, NameType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

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
    const [alphafi, parent] = await Promise.all([this.getTvl(), this.getParentTvl()]);
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr: this.context.getAprData(this.poolLabel.poolId),
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
      Promise.resolve(this.context.getAlphaLendTvl(this.poolLabel.asset.type)),
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
  asset: NameType;
  events: {
    autocompoundEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
