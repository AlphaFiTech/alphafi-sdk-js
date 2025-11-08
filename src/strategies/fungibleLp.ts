/**
 * FungibleLp Strategy Implementation
 * Fungible liquidity pool strategy for dual-asset pools with fungible tokens
 * Based on alphafi-sdk-rust/src/strategies/fungible_lp.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, StrategyType, ProtocolType, NameType } from './strategy.js';
import { PoolData } from '../models/types.js';

// ===== FungibleLp Strategy Class =====

/**
 * FungibleLp Strategy for dual-asset liquidity pools with fungible tokens
 */
export class FungibleLpStrategy extends BaseStrategy<
  FungibleLpPoolObject,
  FungibleLpInvestorObject,
  FungibleLpParentPoolObject,
  never // FungibleLp doesn't have receipts
> {
  private poolLabel: FungibleLpPoolLabel;
  private poolObject: FungibleLpPoolObject;
  private investorObject: FungibleLpInvestorObject;
  private parentPoolObject?: FungibleLpParentPoolObject;

  constructor(
    poolLabel: FungibleLpPoolLabel,
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
   * Get the exchange rate for FungibleLp strategy (fungible token to underlying token ratio)
   * Exchange rate = tokens_invested / treasury_cap.total_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokens_invested || '0');
    const totalSupply = new Decimal(this.poolObject.treasury_cap.total_supply || '0');

    if (totalSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(totalSupply);
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
  parsePoolObject(response: any): FungibleLpPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        image_url: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        treasury_cap: {
          id: this.getStringField(fields.treasury_cap || {}, 'id'),
          total_supply: this.getStringField(fields.treasury_cap || {}, 'total_supply'),
        },
        tokens_invested: this.getStringField(fields, 'tokens_invested'),
      };
    }, 'Failed to parse FungibleLp pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): FungibleLpInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        emergency_balance_a: this.getStringField(fields, 'emergency_balance_a'),
        emergency_balance_b: this.getStringField(fields, 'emergency_balance_b'),
        free_balance_a: this.getStringField(fields, 'free_balance_a'),
        free_balance_b: this.getStringField(fields, 'free_balance_b'),
        id: this.getStringField(fields, 'id'),
        is_emergency: this.getBooleanField(fields, 'is_emergency', false),
        lower_tick: this.getNumberField(fields, 'lower_tick'),
        upper_tick: this.getNumberField(fields, 'upper_tick'),
      };
    }, 'Failed to parse FungibleLp investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): FungibleLpParentPoolObject {
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
    }, 'Failed to parse FungibleLp parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses (not applicable for FungibleLp)
   */
  parseReceiptObjects(_responses: any[]): never {
    throw new Error('FungibleLp strategy does not have receipts');
  }
}

// ===== Types =====

/**
 * FungibleLp Pool object data structure
 */
export interface FungibleLpPoolObject {
  id: string;
  image_url: string;
  name: string;
  paused: boolean;
  treasury_cap: {
    id: string;
    total_supply: string;
  };
  tokens_invested: string;
}

/**
 * FungibleLp Investor object data structure
 */
export interface FungibleLpInvestorObject {
  emergency_balance_a: string;
  emergency_balance_b: string;
  free_balance_a: string;
  free_balance_b: string;
  id: string;
  is_emergency: boolean;
  lower_tick: number;
  upper_tick: number;
}

/**
 * FungibleLp Parent Pool object data structure (underlying protocol pool)
 */
export interface FungibleLpParentPoolObject {
  coin_a: string;
  coin_b: string;
  current_sqrt_price: string;
  current_tick_index: number;
  id: string;
  liquidity: string;
}

// ===== Pool Label =====

/**
 * Event types configuration for FungibleLp strategy
 */
export interface FungibleLpEventTypes {
  autocompound_event_type: string;
  rebalance_event_type: string;
  liquidity_change_event_type: string;
}

/**
 * FungibleLp Pool Label - Configuration for FungibleLp strategy pools
 */
export interface FungibleLpPoolLabel {
  pool_id: string;
  package_id: string;
  package_number: number;
  strategy_type: 'FungibleLp';
  parent_protocol: ProtocolType;
  parent_pool_id: string;
  investor_id: string;
  fungible_coin: NameType;
  asset_a: NameType;
  asset_b: NameType;
  events: FungibleLpEventTypes;
  is_active: boolean;
  pool_name: string;
  is_native: boolean;
}
