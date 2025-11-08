/**
 * Alpha Strategy Implementation
 * Single-asset pool strategy for SUI deposits with Alpha token rewards
 * Based on alphafi-sdk-rust/src/strategies/alpha.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

// ===== Alpha Strategy Class =====

/**
 * Alpha Strategy for single-asset pools with SUI deposits and Alpha token rewards
 */
export class AlphaStrategy extends BaseStrategy<
  AlphaPoolObject,
  never, // Alpha doesn't have investor objects
  never, // Alpha doesn't have parent pool objects
  AlphaReceiptObject
> {
  private poolLabel: AlphaPoolLabel;
  private poolObject: AlphaPoolObject;

  constructor(poolLabel: AlphaPoolLabel, poolObject: any) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Alpha strategy (xtoken to underlying token ratio)
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
  parsePoolObject(response: any): AlphaPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        acc_rewards_per_xtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        alpha_bal: this.getStringField(fields, 'alpha_bal'),
        deposit_fee: this.getStringField(fields, 'deposit_fee'),
        deposit_fee_max_cap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        image_url: this.getStringField(fields, 'image_url'),
        instant_withdraw_fee: this.getStringField(fields, 'instant_withdraw_fee'),
        instant_withdraw_fee_max_cap: this.getStringField(fields, 'instant_withdraw_fee_max_cap'),
        locked_period_in_ms: this.getStringField(fields, 'locked_period_in_ms'),
        locking_start_ms: this.getStringField(fields, 'locking_start_ms'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        performance_fee: this.getStringField(fields, 'performance_fee'),
        performance_fee_max_cap: this.getStringField(fields, 'performance_fee_max_cap'),
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
    }, 'Failed to parse Alpha pool object');
  }

  /**
   * Parse investor object from blockchain response (not applicable for Alpha)
   */
  parseInvestorObject(_response: any): never {
    throw new Error('Alpha strategy does not have investor objects');
  }

  /**
   * Parse parent pool object from blockchain response (not applicable for Alpha)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('Alpha strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): AlphaReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          image_url: this.getStringField(fields, 'image_url'),
          last_acc_reward_per_xtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          locked_balance: {
            id: this.getStringField(fields.locked_balance || {}, 'id'),
            size: this.getStringField(fields.locked_balance || {}, 'size'),
          },
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pending_rewards: this.parseVecMap(fields.pending_rewards || {}),
          pool_id: this.getStringField(fields, 'pool_id'),
          unlocked_xtokens: this.getStringField(fields, 'unlocked_xtokens'),
          xtoken_balance: this.getStringField(fields, 'xtoken_balance'),
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse Alpha receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * Alpha Pool object data structure
 */
export interface AlphaPoolObject {
  acc_rewards_per_xtoken: KeyValuePair[];
  alpha_bal: string;
  deposit_fee: string;
  deposit_fee_max_cap: string;
  id: string;
  image_url: string;
  instant_withdraw_fee: string;
  instant_withdraw_fee_max_cap: string;
  locked_period_in_ms: string;
  locking_start_ms: string;
  name: string;
  paused: boolean;
  performance_fee: string;
  performance_fee_max_cap: string;
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
 * Alpha Receipt object data structure
 */
export interface AlphaReceiptObject {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: KeyValuePair[];
  locked_balance: {
    id: string;
    size: string;
  };
  name: string;
  owner: string;
  pending_rewards: KeyValuePair[];
  pool_id: string;
  unlocked_xtokens: string;
  xtoken_balance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * Event types configuration for Alpha strategy
 */
export interface AlphaEventTypes {
  autocompound_event_type: string;
  liquidity_change_event_type: string;
  withdraw_v2_event_type: string;
  after_transaction_event_type: string;
}

/**
 * Alpha Pool Label - Configuration for Alpha strategy pools
 */
export interface AlphaPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'AlphaVault';
  parent_protocol: ProtocolType;
  receipt: NameType;
  asset: NameType;
  events: AlphaEventTypes;
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
