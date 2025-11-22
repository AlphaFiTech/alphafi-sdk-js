/**
 * SingleAssetLooping Strategy Implementation
 * Single asset looping strategy for leveraged positions on single assets
 * Based on alphafi-sdk-rust/src/strategies/single_asset_looping.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

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

  constructor(poolLabel: SingleAssetLoopingPoolLabel, poolObject: any, investorObject: any) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for SingleAssetLooping strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokens_invested || '0');
    const xtokenSupply = new Decimal(this.poolObject.xtoken_supply || '0');

    if (xtokenSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(xtokenSupply);
  }

  /**
   * Stubbed getData similar to Rust get_data; returns zero/empty placeholders
   */
  async getData(): Promise<PoolData> {
    return {
      poolId: this.poolLabel.pool_id,
      apr: {
        baseApr: new Decimal(0),
        alphaMiningApr: new Decimal(0),
        apy: new Decimal(0),
        lastAutocompounded: new Date(0),
      },
      tvl: new Decimal(0),
      parentTvl: new Decimal(0),
    };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SingleAssetLoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        acc_rewards_per_xtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        deposit_fee: this.getStringField(fields, 'deposit_fee'),
        deposit_fee_max_cap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        image_url: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        rewards: {
          coinType:
            this.getStringField(fields.rewards || {}, 'coinType') ||
            this.getStringField(fields.rewards || {}, 'coin_type'),
          amount: this.getStringField(fields.rewards || {}, 'amount'),
          apr: this.getStringField(fields.rewards || {}, 'apr'),
        },
        tokens_invested: this.getStringField(fields, 'tokens_invested'),
        withdraw_fee_max_cap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawal_fee: this.getStringField(fields, 'withdrawal_fee'),
        xtoken_supply: this.getStringField(fields, 'xtoken_supply'),
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
        free_rewards: {
          id: this.getStringField(fields.free_rewards || {}, 'id'),
          size: this.getStringField(fields.free_rewards || {}, 'size'),
        },
        id: this.getStringField(fields, 'id'),
        performance_fee: this.getStringField(fields, 'performance_fee'),
        performance_fee_max_cap: this.getStringField(fields, 'performance_fee_max_cap'),
        tokens_deposited: this.getStringField(fields, 'tokens_deposited'),
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
          image_url: this.getStringField(fields, 'image_url'),
          last_acc_reward_per_xtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pending_rewards: this.parseVecMap(fields.pending_rewards || {}),
          pool_id: this.getStringField(fields, 'pool_id'),
          xtoken_balance: this.getStringField(fields, 'xtoken_balance'),
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
  acc_rewards_per_xtoken: KeyValuePair[];
  deposit_fee: string;
  deposit_fee_max_cap: string;
  id: string;
  image_url: string;
  name: string;
  paused: boolean;
  rewards: {
    coinType: string;
    amount: string;
    apr: string;
  };
  tokens_invested: string;
  withdraw_fee_max_cap: string;
  withdrawal_fee: string;
  xtoken_supply: string;
}

/**
 * SingleAssetLooping Investor object data structure
 */
export interface SingleAssetLoopingInvestorObject {
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  performance_fee: string;
  performance_fee_max_cap: string;
  tokens_deposited: string;
}

/**
 * SingleAssetLooping Receipt object data structure
 */
export interface SingleAssetLoopingReceiptObject {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: KeyValuePair[];
  name: string;
  owner: string;
  pending_rewards: KeyValuePair[];
  pool_id: string;
  xtoken_balance: string;
}

// ===== Pool Label =====

/**
 * SingleAssetLooping Pool Label - Configuration for SingleAssetLooping strategy pools
 */
export interface SingleAssetLoopingPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'SingleAssetLooping';
  parent_protocol: ProtocolType;
  investor_id: string;
  receipt: NameType;
  asset: NameType;
  events: {
    autocompound_event_type: string;
    liquidity_change_event_type: string;
  };
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
