/**
 * Looping Strategy Implementation
 * Looping strategy for leveraged positions with automated compounding
 * Based on alphafi-sdk-rust/src/strategies/looping.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

// ===== Looping Strategy Class =====

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

  constructor(poolLabel: LoopingPoolLabel, poolObject: any, investorObject: any) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for Looping strategy (xtoken to underlying token ratio)
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
  parsePoolObject(response: any): LoopingPoolObject {
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
    }, 'Failed to parse Looping pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LoopingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        current_debt_to_supply_ratio: this.getStringField(fields, 'current_debt_to_supply_ratio'),
        free_rewards: {
          id: this.getStringField(fields.free_rewards || {}, 'id'),
          size: this.getStringField(fields.free_rewards || {}, 'size'),
        },
        id: this.getStringField(fields, 'id'),
        loops: this.getStringField(fields, 'loops'),
        max_cap_performance_fee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimum_swap_amount: this.getStringField(fields, 'minimum_swap_amount'),
        navi_acc_cap: {
          id: this.getStringField(fields.navi_acc_cap || {}, 'id'),
          owner: this.getStringField(fields.navi_acc_cap || {}, 'owner'),
        },
        performance_fee: this.getStringField(fields, 'performance_fee'),
        safe_borrow_percentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokens_deposited: this.getStringField(fields, 'tokens_deposited'),
      };
    }, 'Failed to parse Looping investor object');
  }

  /**
   * Parse parent pool object from blockchain response (not applicable for Looping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('Looping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LoopingReceiptObject[] {
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
          type: this.getStringField(fields, 'type'),
        };
      }, `Failed to parse Looping receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * Looping Pool object data structure
 */
export interface LoopingPoolObject {
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
 * Looping Investor object data structure
 */
export interface LoopingInvestorObject {
  current_debt_to_supply_ratio: string;
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  loops: string;
  max_cap_performance_fee: string;
  minimum_swap_amount: string;
  navi_acc_cap: {
    id: string;
    owner: string;
  };
  performance_fee: string;
  safe_borrow_percentage: string;
  tokens_deposited: string;
}

/**
 * Looping Receipt object data structure
 */
export interface LoopingReceiptObject {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: KeyValuePair[];
  name: string;
  owner: string;
  pending_rewards: KeyValuePair[];
  pool_id: string;
  xtoken_balance: string;
  type: string;
}

// ===== Pool Label =====

/**
 * Looping Pool Label - Configuration for Looping strategy pools
 */
export interface LoopingPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'Looping';
  parent_protocol: ProtocolType;
  investor_id: string;
  receipt: NameType;
  supply_asset: NameType;
  borrow_asset: NameType;
  user_deposit_asset: NameType;
  user_withdraw_asset: NameType;
  events: {
    autocompound_event_type: string;
    liquidity_change_event_type: string;
    check_ratio_event_type: string;
  };
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
