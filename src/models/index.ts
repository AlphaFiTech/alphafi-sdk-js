/**
 * Model definitions for the AlphaFi SDK
 */

/**
 * Base interface for API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Export transaction models
export {
  TransactionManager,
  type LiquidityResult,
  type CommonInvestorFields,
  type ClmmPool,
} from './transaction.js';
export { BluefinTransactions } from './transactionProtocolModels/bluefin.js';
export { NaviTransactions } from './transactionProtocolModels/navi.js';
export { CetusTransactions } from './transactionProtocolModels/cetus.js';
export { BucketTransactions } from './transactionProtocolModels/bucket.js';
export { ClaimRewardsTransactions } from './transactionProtocolModels/claimRewards.js';
export { NaviLoopingTransactions } from './transactionProtocolModels/naviLooping.js';
export { AlphaTransactions } from './transactionProtocolModels/alpha.js';
export { ZapDepositTransactions } from './transactionProtocolModels/zapDeposit.js';
export { Blockchain } from './blockchain.js';

// Export utility models
export { PoolUtils } from './pool.js';

// Export management models
export { APRManager } from './apr.js';
export { AdminManager } from './admin.js';

// Export additional models
