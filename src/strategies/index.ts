/**
 * Strategies module exports
 * Re-exports all strategy-related classes and interfaces
 */

// Base strategy and types
export * from './strategy.js';

// Strategy implementations
export * from './lp.js';
export * from './alphaVault.js';
export * from './autobalanceLp.js';
export * from './fungibleLp.js';
export * from './lending.js';
export * from './slushLending.js';
export * from './slushSingleAssetLooping.js';
export * from './looping.js';
export * from './singleAssetLooping.js';
export * from './lyf.js';

// Re-export commonly used types for convenience
export type {
  Strategy,
  StringMap,
  StrategyType,
  ProtocolType,
  PoolLabel,
  AlphaMiningData,
} from './strategy.js';
export { BaseStrategy, ALPHA_COIN_TYPE } from './strategy.js';

// Re-export pool label types
export type { LpPoolLabel } from './lp.js';
export type { AlphaVaultPoolLabel } from './alphaVault.js';
export type { AutobalanceLpPoolLabel } from './autobalanceLp.js';
export type { FungibleLpPoolLabel } from './fungibleLp.js';
export type { LendingPoolLabel } from './lending.js';
export type { SlushLendingPoolLabel } from './slushLending.js';
export type { LoopingPoolLabel } from './looping.js';
export type { SingleAssetLoopingPoolLabel } from './singleAssetLooping.js';
export type { LyfPoolLabel } from './lyf.js';

// Zap deposit utilities (not a strategy in the traditional sense)
export { ZapDepositStrategy } from './zapDeposit.js';
export type {
  ZapDepositOptions,
  ZapDepositQuoteOptions,
  ZapSwapParams,
  CoinsInRatioResult,
} from './zapDeposit.js';
export type { FungibleLendingPoolLabel } from './fungibleLending.js';
export type { SlushSingleAssetLoopingPoolLabel } from './slushSingleAssetLooping.js';
