/**
 * SingleAssetLooping Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction } from '@mysten/sui/transactions';

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
  private receiptObjects: SingleAssetLoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: SingleAssetLoopingPoolLabel,
    poolObject: any,
    investorObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
  }

  getPoolLabel(): SingleAssetLoopingPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(receipts: any[]) {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Get alpha mining data including pool and receipt information
   */
  protected getAlphaMiningData(): AlphaMiningData {
    const receipt = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;

    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: this.poolObject.accRewardsPerXtoken,
      xTokenSupply: this.poolObject.xTokenSupply,
      receipt: receipt
        ? {
            lastAccRewardPerXtoken: receipt.lastAccRewardPerXtoken,
            pendingRewards: receipt.pendingRewards,
            xTokenBalance: receipt.xTokenBalance,
          }
        : null,
    };
  }

  /**
   * Get the exchange rate for xtoken to underlying token ratio
   * Adjusted for current debt-to-supply ratio in leveraged single-asset position
   */
  exchangeRate(): Decimal {
    const currentDebtToSupplyRatio = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const tokensInvested = new Decimal(this.investorObject.tokensDeposited).mul(
      new Decimal(1).minus(currentDebtToSupplyRatio.div(new Decimal(10).pow(20))),
    );
    const xtokenSupply = new Decimal(this.poolObject.xTokenSupply);

    if (xtokenSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
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
        alphafi,
        parent,
      },
    };
  }

  /**
   * Calculate total value locked adjusted for leveraged position
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

  /**
   * Calculate parent protocol TVL based on protocol type (Alphalend/Navi)
   */
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
   * Calculate user's current pool balance from xToken balance
   * Includes leverage adjustment for single-asset position
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
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
          const rewardsId = this.getNestedField(fields, 'rewards.id');
          const rewardsSize = this.getNestedField(fields, 'rewards.size');
          return { id: String(rewardsId), size: String(rewardsSize) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
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
        currentDebtToSupplyRatio: this.getStringField(fields, 'current_debt_to_supply_ratio'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        marketId: this.getStringField(fields, 'market_id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        positionCap: {
          clientAddress: this.getNestedField(fields, 'position_cap.client_address'),
          id: this.getNestedField(fields, 'position_cap.id'),
          imageUrl: this.getNestedField(fields, 'position_cap.image_url'),
          positionId: this.getNestedField(fields, 'position_cap.position_id'),
        },
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokensDeposited: this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse SingleAssetLooping investor object');
  }

  /**
   * Parse parent pool object (not applicable for SingleAssetLooping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('SingleAssetLooping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SingleAssetLoopingReceiptObject[] {
    return responses
      .map((response, index) => {
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
          };
        }, `Failed to parse SingleAssetLooping receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    return tx;
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    return tx;
  }

  async claimRewards(tx: Transaction, poolId: string, address: string) {
    return tx;
  }
}

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
}

/**
 * SingleAssetLooping Pool Label configuration
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
