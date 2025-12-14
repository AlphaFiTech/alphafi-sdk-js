/**
 * Looping Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

/**
 * Looping Strategy for leveraged positions with automated compounding
 */
export class LoopingStrategy extends BaseStrategy<
  LoopingPoolObject,
  LoopingInvestorObject,
  never, // Looping doesn't have parent pool objects
  LoopingReceiptObject
> {
  private poolLabel: LoopingPoolLabel;
  private poolObject: LoopingPoolObject;
  private investorObject: LoopingInvestorObject;
  private receiptObjects: LoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LoopingPoolLabel,
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

  getPoolLabel(): LoopingPoolLabel {
    return this.poolLabel;
  }

  updateReceipts(receipts: any[]): void {
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
   * Adjusted for current debt-to-supply ratio in leveraged positions
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
   * Accounts for debt-to-supply ratio and protocol-specific scaling
   */
  async getTvl(): Promise<SingleTvl> {
    const supplyType = this.poolLabel.supplyAsset.type;
    const userDepositType = this.poolLabel.userDepositAsset.type;
    const cdsr = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    let tokensInvested = new Decimal(this.poolObject.tokensInvested).mul(
      new Decimal(1).minus(cdsr.div(new Decimal(10).pow(20))),
    );

    if (this.poolLabel.parentProtocol === 'Navi') {
      tokensInvested = tokensInvested.div(new Decimal(10).pow(9));
    } else {
      const supplyDecimals =
        (await this.context.coinInfoProvider.getCoinByType(supplyType))?.decimals ?? 9;
      tokensInvested = tokensInvested.div(new Decimal(10).pow(supplyDecimals));
    }

    const supplyPrice = await this.context.getCoinPrice(supplyType);
    const userDepositPrice = await this.context.getCoinPrice(userDepositType);

    const tokenAmount = tokensInvested.mul(supplyPrice).div(userDepositPrice);
    const usdValue = tokensInvested.mul(userDepositPrice);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL based on protocol type (Navi/Alphalend)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const coinType = this.poolLabel.supplyAsset.type;
    const price = await this.context.getCoinPrice(coinType);
    if (protocol === 'Navi') {
      const tokenAmountUsd = this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    } else if (protocol === 'Alphalend') {
      const tokenAmount = this.context.getAlphaLendTvl(coinType);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Includes leverage adjustment and protocol-specific scaling
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const exchangeRate = this.exchangeRate();
    let tokens = xTokens.mul(exchangeRate);

    if (this.poolLabel.parentProtocol === 'Navi') {
      tokens = tokens.div(new Decimal(10).pow(9));
    } else {
      const supplyDecimals = await this.context.getCoinDecimals(this.poolLabel.supplyAsset.type);
      tokens = tokens.div(new Decimal(10).pow(supplyDecimals));
    }

    const [supplyPrice, userDepositPrice] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.supplyAsset.type),
      this.context.getCoinPrice(this.poolLabel.userDepositAsset.type),
    ]);
    const amount = tokens.mul(supplyPrice).div(userDepositPrice);
    return { tokenAmount: amount, usdValue: amount.mul(userDepositPrice) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        rewards: (() => {
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
      };
    }, 'Failed to parse Looping pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LoopingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        currentDebtToSupplyRatio: this.getStringField(fields, 'current_debt_to_supply_ratio'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        loops: this.getStringField(fields, 'loops'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        naviAccCap: {
          id: this.getNestedField(fields, 'navi_acc_cap.id'),
          owner: this.getNestedField(fields, 'navi_acc_cap.owner'),
        },
        performanceFee: this.getStringField(fields, 'performance_fee'),
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokensDeposited:
          this.getStringField(fields, 'tokens_deposited') ||
          this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse Looping investor object');
  }

  /**
   * Parse parent pool object (not applicable for Looping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('Looping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LoopingReceiptObject[] {
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
            xTokenBalance: this.getStringField(fields, 'xTokenBalance'),
          };
        }, `Failed to parse Looping receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }
}

/**
 * Looping Pool object data structure
 */
export interface LoopingPoolObject {
  accRewardsPerXtoken: KeyValuePair[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
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
 * Looping Investor object data structure
 */
export interface LoopingInvestorObject {
  currentDebtToSupplyRatio: string;
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  loops: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  naviAccCap: {
    id: string;
    owner: string;
  };
  performanceFee: string;
  safeBorrowPercentage: string;
  tokensDeposited: string;
}

/**
 * Looping Receipt object data structure
 */
export interface LoopingReceiptObject {
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
 * Looping Pool Label configuration
 */
export interface LoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Looping';
  parentProtocol: ProtocolType;
  investorId: string;
  receipt: NameType;
  supplyAsset: NameType;
  borrowAsset: NameType;
  userDepositAsset: NameType;
  userWithdrawAsset: NameType;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
    checkRatioEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
