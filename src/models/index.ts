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
  type ClmmPool
} from "./transaction.js";
export { BluefinTransactions } from "./transactionProtocolModels/bluefin.js";
export { NaviTransactions } from "./transactionProtocolModels/navi.js";
export { CetusTransactions } from "./transactionProtocolModels/cetus.js";
export { Blockchain } from "./blockchain.js";

// Export additional models 