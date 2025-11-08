/**
 * AutobalanceLp Strategy Implementation
 * Autobalance liquidity pool strategy for dual-asset pools with automatic rebalancing
 * Based on alphafi-sdk-rust/src/strategies/autobalance_lp.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

// ===== AutobalanceLp Strategy Class =====

/**
 * AutobalanceLp Strategy for dual-asset liquidity pools with automatic rebalancing
 */
export class AutobalanceLpStrategy extends BaseStrategy<
  AutobalanceLpPoolObject,
  AutobalanceLpInvestorObject,
  AutobalanceLpParentPoolObject,
  AutobalanceLpReceiptObject
> {
  private poolLabel: AutobalanceLpPoolLabel;
  private poolObject: AutobalanceLpPoolObject;
  private investorObject: AutobalanceLpInvestorObject;
  private parentPoolObject?: AutobalanceLpParentPoolObject;

  constructor(
    poolLabel: AutobalanceLpPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject?: any,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    if (parentPoolObject) {
      this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
    }
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for AutobalanceLp strategy (xtoken to underlying token ratio)
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
      lpBreakdown: {
        token1Amount: new Decimal(0),
        token2Amount: new Decimal(0),
        totalLiquidity: new Decimal(0),
      },
      parentLpBreakdown: {
        token1Amount: new Decimal(0),
        token2Amount: new Decimal(0),
        totalLiquidity: new Decimal(0),
      },
      currentLPPoolPrice: new Decimal(0),
      positionRange: { lowerPrice: new Decimal(0), upperPrice: new Decimal(0) },
    };
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): AutobalanceLpPoolObject {
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
    }, 'Failed to parse AutobalanceLp pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): AutobalanceLpInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        emergency_balance_a: this.getStringField(fields, 'emergency_balance_a'),
        emergency_balance_b: this.getStringField(fields, 'emergency_balance_b'),
        free_balance_a: this.getStringField(fields, 'free_balance_a'),
        free_balance_b: this.getStringField(fields, 'free_balance_b'),
        free_rewards: {
          id: this.getStringField(fields.free_rewards || {}, 'id'),
          size: this.getStringField(fields.free_rewards || {}, 'size'),
        },
        id: this.getStringField(fields, 'id'),
        is_emergency: this.getBooleanField(fields, 'is_emergency', false),
        lower_tick: this.getNumberField(fields, 'lower_tick'),
        minimum_swap_amount: this.getStringField(fields, 'minimum_swap_amount'),
        performance_fee: this.getStringField(fields, 'performance_fee'),
        performance_fee_max_cap: this.getStringField(fields, 'performance_fee_max_cap'),
        upper_tick: this.getNumberField(fields, 'upper_tick'),
      };
    }, 'Failed to parse AutobalanceLp investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): AutobalanceLpParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        coin_a: this.getStringField(fields, 'coin_a'),
        coin_b: this.getStringField(fields, 'coin_b'),
        current_sqrt_price: this.getStringField(fields, 'current_sqrt_price'),
        current_tick_index: this.getNumberField(fields, 'current_tick_index'),
        id: this.getStringField(fields, 'id'),
        liquidity: this.getStringField(fields, 'liquidity'),
      };
    }, 'Failed to parse AutobalanceLp parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): AutobalanceLpReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          image_url: this.getStringField(fields, 'image_url'),
          last_acc_reward_per_xtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          name: this.getStringField(fields, 'name'),
          pending_rewards: this.parseVecMap(fields.pending_rewards || {}),
          pool_id: this.getStringField(fields, 'pool_id'),
          xtoken_balance: this.getStringField(fields, 'xtoken_balance'),
        };
      }, `Failed to parse AutobalanceLp receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * AutobalanceLp Pool object data structure
 */
export interface AutobalanceLpPoolObject {
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
 * AutobalanceLp Investor object data structure
 */
export interface AutobalanceLpInvestorObject {
  emergency_balance_a: string;
  emergency_balance_b: string;
  free_balance_a: string;
  free_balance_b: string;
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  is_emergency: boolean;
  lower_tick: number;
  minimum_swap_amount: string;
  performance_fee: string;
  performance_fee_max_cap: string;
  upper_tick: number;
}

/**
 * AutobalanceLp Parent Pool object data structure (underlying protocol pool)
 */
export interface AutobalanceLpParentPoolObject {
  coin_a: string;
  coin_b: string;
  current_sqrt_price: string;
  current_tick_index: number;
  id: string;
  liquidity: string;
}

/**
 * AutobalanceLp Receipt object data structure
 */
export interface AutobalanceLpReceiptObject {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: KeyValuePair[];
  name: string;
  pending_rewards: KeyValuePair[];
  pool_id: string;
  xtoken_balance: string;
}

// ===== Pool Label =====

/**
 * Event types configuration for AutobalanceLp strategy
 */
export interface AutobalanceLpEventTypes {
  autocompound_event_type: string;
  rebalance_event_type: string;
  liquidity_change_event_type: string;
  after_transaction_event_type?: string;
}

/**
 * AutobalanceLp Pool Label - Configuration for AutobalanceLp strategy pools
 */
export interface AutobalanceLpPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'AutobalanceLp';
  parent_protocol: ProtocolType;
  parent_pool_id: string;
  investor_id: string;
  receipt: NameType;
  asset_a: NameType;
  asset_b: NameType;
  events: AutobalanceLpEventTypes;
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
