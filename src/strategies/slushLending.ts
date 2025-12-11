/**
 * Slush Lending Strategy Implementation
 * Mirrors the Lending strategy but targets slush lending pools.
 * Pattern based on alphafi-sdk-rust slush_lending strategy.
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, ProtocolType, NameType } from './strategy.js';
import { PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

// ===== Slush Lending Strategy Class =====

export class SlushLendingStrategy extends BaseStrategy<
  SlushLendingPoolObject,
  never,
  never,
  SlushLendingReceiptObject
> {
  private poolLabel: SlushLendingPoolLabel;
  private poolObject: SlushLendingPoolObject;
  private receiptObjects: SlushLendingReceiptObject[];
  private context: StrategyContext;

  constructor(
    poolLabel: SlushLendingPoolLabel,
    poolObject: any,
    receiptObjects: any[],
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.receiptObjects = this.parseReceiptObjects(receiptObjects);
    this.context = context;
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Slush Lending strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
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
   * Compute data (APR/TVL) similar to Rust get_data
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
   * Compute TVL in quote currency using coin price data.
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
   * Compute parent TVL based on parent protocol.
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
   * Compute the user's current pool balance for Slush Lending strategy.
   * Uses exchangeRate to convert xTokens to underlying, scaled by 1e9 and priced.
   */
  async getBalance(): Promise<{ tokenAmount: Decimal; usdValue: Decimal }> {
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

  // ===== Parsing Functions =====

  parsePoolObject(response: any): SlushLendingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply:
          this.getStringField(fields, 'x_token_supply') ||
          this.getStringField(fields, 'xtoken_supply') ||
          this.getStringField(fields, 'xTokenSupply'),
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        interestBasedRewardsData: {
          rewardBalance: this.getStringField(
            fields?.interest_based_rewards_data?.fields ?? fields.interest_based_rewards_data,
            'reward_balance',
          ),
          lastUpdatedTimestamp: this.getStringField(
            fields?.interest_based_rewards_data?.fields ?? fields.interest_based_rewards_data,
            'last_updated_timestamp',
          ),
          rewardShareFromInterestBps: this.getStringField(
            fields?.interest_based_rewards_data?.fields ?? fields.interest_based_rewards_data,
            'reward_share_from_interest_bps',
          ),
        },
        timeBasedRewardsData: {
          rewardBalance: this.getStringField(
            fields?.time_based_rewards_data?.fields ?? fields.time_based_rewards_data,
            'reward_balance',
          ),
          startTime: this.getStringField(
            fields?.time_based_rewards_data?.fields ?? fields.time_based_rewards_data,
            'start_time',
          ),
          endTime: this.getStringField(
            fields?.time_based_rewards_data?.fields ?? fields.time_based_rewards_data,
            'end_time',
          ),
          rewardPerMs: this.getStringField(
            fields?.time_based_rewards_data?.fields ?? fields.time_based_rewards_data,
            'reward_per_ms',
          ),
          lastUpdatedTimestamp: this.getStringField(
            fields?.time_based_rewards_data?.fields ?? fields.time_based_rewards_data,
            'last_updated_timestamp',
          ),
        },
        positionCount: this.getStringField(fields, 'position_count'),
        positionsTableId: this.getStringField(fields, 'positions_table_id'),
        feeCollected: this.getStringField(fields, 'fee_collected'),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        investor: {
          id: this.getStringField(fields?.investor?.fields ?? fields.investor, 'id'),
          marketId: this.getStringField(fields?.investor?.fields ?? fields.investor, 'market_id'),
        },
        paused: this.getBooleanField(fields, 'paused', false),
      };
    }, 'Failed to parse Slush Lending pool object');
  }

  parseInvestorObject(_: any): never {
    throw new Error('Investor object not used for SlushLending');
  }

  parseParentPoolObject(_: any): never {
    throw new Error('Parent pool object not used for SlushLending');
  }

  parseReceiptObjects(responses: any[]): SlushLendingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          positionCapId: this.getStringField(fields, 'position_cap_id'),
          poolId: this.getStringField(fields, 'pool_id'),
          coinType: this.getStringField(fields, 'coin_type'),
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

// ===== Types =====

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

export interface SlushLendingReceiptObject {
  id: string;
  positionCapId: string;
  poolId: string;
  coinType: string;
  principal: string;
  xTokens: string;
}

// ===== Pool Label =====

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
