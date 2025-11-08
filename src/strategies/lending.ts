/**
 * Lending Strategy Implementation
 * Lending strategy for single-asset pools with lending protocol integration
 * Based on alphafi-sdk-rust/src/strategies/lending.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

// ===== Lending Strategy Class =====

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
  private parentPoolObject?: LendingParentPoolObject;

  constructor(
    poolLabel: LendingPoolLabel,
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
   * Get the exchange rate for Lending strategy (xtoken to underlying token ratio)
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
  parsePoolObject(response: any): LendingPoolObject {
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
    }, 'Failed to parse Lending pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LendingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        free_rewards: {
          id: this.getStringField(fields.free_rewards || {}, 'id'),
          size: this.getStringField(fields.free_rewards || {}, 'size'),
        },
        id: this.getStringField(fields, 'id'),
        max_cap_performance_fee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimum_swap_amount: this.getStringField(fields, 'minimum_swap_amount'),
        navi_acc_cap: {
          id: this.getStringField(fields.navi_acc_cap || {}, 'id'),
          owner: this.getStringField(fields.navi_acc_cap || {}, 'owner'),
        },
        performance_fee: this.getStringField(fields, 'performance_fee'),
        tokens_deposited: this.getStringField(fields, 'tokens_deposited'),
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
        treasury_balance: this.getStringField(fields, 'treasury_balance'),
      };
    }, 'Failed to parse Lending parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LendingReceiptObject[] {
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
      }, `Failed to parse Lending receipt object at index ${index}`);
    });
  }
}

// ===== Types =====

/**
 * Lending Pool object data structure
 */
export interface LendingPoolObject {
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
 * Lending Investor object data structure
 */
export interface LendingInvestorObject {
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  max_cap_performance_fee: string;
  minimum_swap_amount: string;
  navi_acc_cap: {
    id: string;
    owner: string;
  };
  performance_fee: string;
  tokens_deposited: string;
}

/**
 * Lending Parent Pool object data structure
 */
export interface LendingParentPoolObject {
  balance: string;
  decimal: number;
  id: string;
  treasury_balance: string;
}

/**
 * Lending Receipt object data structure
 */
export interface LendingReceiptObject {
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
 * Event types configuration for Lending strategy
 */
export interface LendingEventTypes {
  autocompound_event_type: string;
  liquidity_change_event_type: string;
}

/**
 * Lending Pool Label - Configuration for Lending strategy pools
 */
export interface LendingPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'Lending';
  parent_protocol: ProtocolType;
  parent_pool_id: string;
  investor_id: string;
  receipt: NameType;
  asset: NameType;
  events: LendingEventTypes;
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
