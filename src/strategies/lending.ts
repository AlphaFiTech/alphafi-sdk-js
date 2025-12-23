/**
 * Lending Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Lending Strategy for single-asset pools with lending protocol integration
 */
export class LendingStrategy extends BaseStrategy<
  LendingPoolObject,
  LendingInvestorObject,
  LendingParentPoolObject,
  LendingReceiptObject
> {
  private poolLabel: LendingPoolLabel;
  private poolObject: LendingPoolObject;
  private investorObject: LendingInvestorObject;
  private parentPoolObject: LendingParentPoolObject;
  private receiptObjects: LendingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LendingPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  getPoolLabel(): LendingPoolLabel {
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
   * Calculated as tokens_invested / xtoken_supply
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
   * Calculate total value locked using current asset price
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const price = await this.context.getCoinPrice(coinType);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(new Decimal(10).pow(9));
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL based on protocol type (Bucket/Navi/Alphalend)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const price = await this.context.getCoinPrice(this.poolLabel.asset.type);
    if (protocol === 'Bucket') {
      const tokenAmount = this.context.getBucketTvl();
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Navi') {
      const tokenAmountUsd = this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    } else if (protocol === 'Alphalend') {
      const tokenAmount = this.context.getAlphaLendTvl(this.poolLabel.asset.type);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Converts xTokens to underlying tokens via exchange rate
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [price, exchangeRate] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      Promise.resolve(this.exchangeRate()),
    ]);
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(9));
    return { tokenAmount: tokens, usdValue: tokens.mul(price) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LendingPoolObject {
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
    }, 'Failed to parse Lending pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LendingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        naviAccCap: (() => {
          const idVal = this.getNestedField(fields, 'navi_acc_cap.id');
          const ownerVal = this.getNestedField(fields, 'navi_acc_cap.owner');
          return { id: String(idVal), owner: String(ownerVal) };
        })(),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        tokensDeposited: this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse Lending investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): LendingParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        balance: this.getStringField(fields, 'balance'),
        decimal: this.getNumberField(fields, 'decimal'),
        id: this.getStringField(fields, 'id'),
        treasuryBalance: this.getStringField(fields, 'treasury_balance'),
      };
    }, 'Failed to parse Lending parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LendingReceiptObject[] {
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
        }, `Failed to parse Lending receipt object at index ${index}`);
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
 * Lending Pool object data structure
 */
export interface LendingPoolObject {
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
 * Lending Investor object data structure
 */
export interface LendingInvestorObject {
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  naviAccCap: {
    id: string;
    owner: string;
  };
  performanceFee: string;
  tokensDeposited: string;
}

/**
 * Lending Parent Pool object data structure
 */
export interface LendingParentPoolObject {
  balance: string;
  decimal: number;
  id: string;
  treasuryBalance: string;
}

/**
 * Lending Receipt object data structure
 */
export interface LendingReceiptObject {
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
 * Lending Pool Label configuration
 */
export interface LendingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Lending';
  parentProtocol: ProtocolType;
  parentPoolId: string;
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
