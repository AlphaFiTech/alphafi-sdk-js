/**
 * SingleAssetLooping Strategy Implementation
 * Single asset looping strategy for leveraged positions on single assets
 * Based on alphafi-sdk-rust/src/strategies/single_asset_looping.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

// ===== SingleAssetLooping Strategy Class =====

/**
 * SingleAssetLooping Strategy for leveraged positions on single assets
 */
export class SingleAssetLoopingStrategy extends BaseStrategy<
  SingleAssetLoopingPoolObject,
  SingleAssetLoopingInvestorObject,
  never, // SingleAssetLooping doesn't have parent pool objects
  SingleAssetLoopingReceiptObject
> {
  private poolLabel: SingleAssetLoopingPoolLabel;
  private poolObject: SingleAssetLoopingPoolObject;
  private investorObject: SingleAssetLoopingInvestorObject;
  private receiptObjects: SingleAssetLoopingReceiptObject[];
  private context: StrategyContext;

  constructor(
    poolLabel: SingleAssetLoopingPoolLabel,
    poolObject: any,
    investorObject: any,
    receiptObjects: any[],
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.receiptObjects = this.parseReceiptObjects(receiptObjects);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for SingleAssetLooping strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokensInvested);
    const xtokenSupply = new Decimal(this.poolObject.xTokenSupply);

    if (xtokenSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(xtokenSupply);
  }

  /**
   * Stubbed getData similar to Rust get_data; returns zero/empty placeholders
   */
  async getData(): Promise<PoolData> {
    const [alphafi, parent] = await Promise.all([this.getTvl(), this.getParentTvl()]);
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr: this.context.getAprData(this.poolLabel.poolId),
      tvl: {
        alphafi,
        parent,
      },
    };
  }

  /**
   * Compute TVL in quote currency using coin price data.
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const decimals = await this.context.getCoinDecimals(coinType);
    const price = await this.context.getCoinPrice(coinType);
    const currentDebtToSupplyRatio = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const scaling = new Decimal(10).pow(20);
    const adjustedTokensInvested = new Decimal(this.poolObject.tokensInvested).mul(
      new Decimal(1).minus(currentDebtToSupplyRatio.div(scaling)),
    );

    const tokenAmount = adjustedTokensInvested.div(new Decimal(10).pow(decimals));
    const usdValue = tokenAmount.mul(price);

    return { tokenAmount, usdValue };
  }

  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const coinType = this.poolLabel.asset.type;
    const price = await this.context.getCoinPrice(coinType);
    if (protocol === 'Alphalend') {
      const tokenAmount = this.context.getAlphaLendTvl(coinType);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Navi') {
      const tokenAmountUsd = this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Compute user's current pool balance for SingleAssetLooping.
   * Matches single_asset_looping.rs behavior.
   */
  async getBalance(): Promise<{ tokenAmount: Decimal; usdValue: Decimal }> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [exchangeRate, tokenDecimals, tokenPrice] = await Promise.all([
      Promise.resolve(this.exchangeRate()),
      this.context.getCoinDecimals(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    const tokens = xTokens.mul(exchangeRate);
    const amount = tokens.div(new Decimal(10).pow(tokenDecimals));
    return { tokenAmount: amount, usdValue: amount.mul(tokenPrice) };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SingleAssetLoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        investorId: this.getStringField(fields, 'investor_id'),
        maxSupply: this.getStringField(fields, 'max_supply'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        rewards: (() => {
          // Parse rewards PoolRewardsInfo { id, size }
          const rewardsId =
            (this.getNestedField(fields, 'rewards.fields.id.id') as string | undefined) || '';
          const rewardsSize =
            (this.getNestedField(fields, 'rewards.fields.size') as string | undefined) || '';
          return { id: String(rewardsId), size: String(rewardsSize) };
        })(),
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply:
          this.getStringField(fields, 'xtoken_supply') ||
          this.getStringField(fields, 'xTokenSupply'),
      };
    }, 'Failed to parse SingleAssetLooping pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): SingleAssetLoopingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        assetLtv: this.getStringField(fields, 'asset_ltv'),
        curDebt: this.getStringField(fields, 'cur_debt'),
        currentDebtToSupplyRatio:
          this.getStringField(fields, 'current_debt_to_supply_ratio') ||
          (fields.current_debt_to_supply_ratio?.fields?.value as string) ||
          this.getStringField(fields.current_debt_to_supply_ratio?.fields ?? {}, 'value') ||
          '0',
        freeRewards: (() => {
          const idVal =
            (this.getNestedField(fields, 'free_rewards.fields.id.id') as string | undefined) || '';
          const sizeVal =
            (this.getNestedField(fields, 'free_rewards.fields.size') as string | undefined) || '';
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        marketId: this.getStringField(fields, 'market_id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        positionCap: {
          clientAddress: this.getNestedField(fields, 'position_cap.fields.client_address') || '',
          id:
            (this.getNestedField(fields, 'position_cap.fields.id.id') as string | undefined) || '',
          imageUrl: this.getNestedField(fields, 'position_cap.fields.image_url') || '',
          positionId: this.getNestedField(fields, 'position_cap.fields.position_id') || '',
        },
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokensDeposited:
          this.getStringField(fields, 'tokens_deposited') ||
          this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse SingleAssetLooping investor object');
  }

  /**
   * Parse parent pool object from blockchain response (not applicable for SingleAssetLooping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('SingleAssetLooping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SingleAssetLoopingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          imageUrl: this.getStringField(fields, 'image_url'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          xTokenBalance:
            this.getStringField(fields, 'xtoken_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse SingleAssetLooping receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * SingleAssetLooping Pool object data structure
 */
export interface SingleAssetLoopingPoolObject {
  accRewardsPerXtoken: KeyValuePair[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  investorId: string;
  maxSupply: string;
  name: string;
  paused: boolean;
  rewards: {
    id: string;
    size: string;
  };
  tokensInvested: string;
  withdrawFeeMaxCap: string;
  withdrawalFee: string;
  xTokenSupply: string;
}

/**
 * SingleAssetLooping Investor object data structure
 */
export interface SingleAssetLoopingInvestorObject {
  assetLtv: string;
  curDebt: string;
  currentDebtToSupplyRatio: string;
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  marketId: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  performanceFee: string;
  positionCap: {
    clientAddress: string;
    id: string;
    imageUrl: string;
    positionId: string;
  };
  safeBorrowPercentage: string;
  tokensDeposited: string;
}

/**
 * SingleAssetLooping Receipt object data structure
 */
export interface SingleAssetLoopingReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: KeyValuePair[];
  name: string;
  owner: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  xTokenBalance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * SingleAssetLooping Pool Label - Configuration for SingleAssetLooping strategy pools
 */
export interface SingleAssetLoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'SingleAssetLooping';
  parentProtocol: ProtocolType;
  investorId: string;
  receipt: NameType;
  asset: NameType;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
