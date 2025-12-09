/**
 * Strategy Base Class and Interface
 * Contains both the Strategy interface and BaseStrategy implementation with parsing utilities
 */

import { Decimal } from 'decimal.js';
import { SingleTvl, DoubleTvl } from '../models/types.js';

export interface KeyValuePair {
  key: string;
  value: string;
}

// ===== Common Pool Label Types =====

export type StrategyType =
  | 'AlphaVault'
  | 'Lp'
  | 'FungibleLp'
  | 'AutobalanceLp'
  | 'Lending'
  | 'SlushLending'
  | 'Looping'
  | 'SingleAssetLooping'
  | 'Lyf';

export type ProtocolType = 'AlphaFi' | 'Navi' | 'Alphalend' | 'Cetus' | 'Bluefin' | 'Bucket';

export interface NameType {
  name: string;
  type: string;
}

// Forward declarations for pool label types (will be imported from individual strategy files)
export type LpPoolLabel = import('./lp.js').LpPoolLabel;
export type AlphaPoolLabel = import('./alpha.js').AlphaPoolLabel;
export type AutobalanceLpPoolLabel = import('./autobalanceLp.js').AutobalanceLpPoolLabel;
export type FungibleLpPoolLabel = import('./fungibleLp.js').FungibleLpPoolLabel;
export type LendingPoolLabel = import('./lending.js').LendingPoolLabel;
export type SlushLendingPoolLabel = import('./slushLending.js').SlushLendingPoolLabel;
export type LoopingPoolLabel = import('./looping.js').LoopingPoolLabel;
export type SingleAssetLoopingPoolLabel =
  import('./singleAssetLooping.js').SingleAssetLoopingPoolLabel;
export type LyfPoolLabel = import('./lyf.js').LyfPoolLabel;

/**
 * Union type containing all strategy-specific pool label types
 * Similar to PoolLabelEnum in the Rust SDK
 */
export type PoolLabel =
  | LpPoolLabel
  | AlphaPoolLabel
  | AutobalanceLpPoolLabel
  | FungibleLpPoolLabel
  | LendingPoolLabel
  | SlushLendingPoolLabel
  | LoopingPoolLabel
  | SingleAssetLoopingPoolLabel
  | LyfPoolLabel;

/**
 * Strategy interface that all strategies must implement
 */
export interface Strategy<TPool = any, TInvestor = any, TParentPool = any, TReceipt = any> {
  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): TPool;

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): TInvestor;

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): TParentPool;

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): TReceipt[];

  /**
   * Get the exchange rate for the strategy (xtoken to underlying token ratio)
   */
  exchangeRate(): Decimal;

  /**
   * Compute the TVL (and parent TVL if applicable) for the strategy.
   */
  getTvl(): Promise<SingleTvl | DoubleTvl>;
  getParentTvl(): Promise<SingleTvl | DoubleTvl>;
}

/**
 * Base Strategy class with built-in parsing utilities
 * All strategies should extend this class
 */
export abstract class BaseStrategy<TPool = any, TInvestor = any, TParentPool = any, TReceipt = any>
  implements Strategy<TPool, TInvestor, TParentPool, TReceipt>
{
  abstract parsePoolObject(response: any): TPool;
  abstract parseInvestorObject(response: any): TInvestor;
  abstract parseParentPoolObject(response: any): TParentPool;
  abstract parseReceiptObjects(responses: any[]): TReceipt[];
  abstract exchangeRate(): Decimal;
  abstract getTvl(): Promise<SingleTvl | DoubleTvl>;
  abstract getParentTvl(): Promise<SingleTvl | DoubleTvl>;

  // ===== Parsing Helper Methods =====

  /**
   * Helper function to get string field from JSON with validation
   */
  protected getStringField(fieldsJson: any, fieldName: string): string {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'string') {
      return value;
    }
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return '';
  }

  /**
   * Helper function to get boolean field from JSON with default value
   */
  protected getBooleanField(fieldsJson: any, fieldName: string, defaultValue: boolean): boolean {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'boolean') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Helper function to get number field from JSON
   */
  protected getNumberField(fieldsJson: any, fieldName: string): number {
    const value = fieldsJson?.[fieldName];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Helper function to parse VecMap structures from Move objects into KeyValuePair format
   */
  protected parseVecMap(vecMapField: any): KeyValuePair[] {
    if (!vecMapField || typeof vecMapField !== 'object') {
      return [];
    }

    const contents = vecMapField.fields?.contents;
    if (!Array.isArray(contents)) {
      return [];
    }

    return contents
      .map((entry: any) => {
        const key = entry?.fields?.key?.fields?.name || entry?.fields?.key;
        const value = entry?.fields?.value;

        if (typeof key === 'string' && typeof value === 'string') {
          return { key, value };
        }
        return null;
      })
      .filter((item: any): item is KeyValuePair => item !== null);
  }

  /**
   * Helper function to convert ASCII array from JSON to string
   */
  protected asciiToString(asciiArray: any): string {
    if (Array.isArray(asciiArray)) {
      try {
        const bytes = asciiArray.map((n: any) => {
          const num = typeof n === 'number' ? n : parseInt(n);
          if (num < 0 || num > 255) {
            throw new Error('ASCII value out of range');
          }
          return num;
        });
        return String.fromCharCode(...bytes);
      } catch (error) {
        console.error('Error converting ASCII array to string:', error);
        return '';
      }
    }
    return '';
  }

  /**
   * Helper function to extract fields from various response formats
   */
  protected extractFields(response: any): any {
    return response.fields || response.content?.fields || response;
  }

  /**
   * Helper function to safely parse nested object fields
   */
  protected getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper function to parse object with error handling
   */
  protected safeParseObject<T>(parseFunction: () => T, errorMessage: string): T {
    try {
      return parseFunction();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error}`);
    }
  }
}
