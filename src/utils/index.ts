/**
 * Utility functions for the AlphaFi SDK
 */

/**
 * Example utility function
 */
export function formatAmount(amount: number, decimals: number = 8): string {
  return amount.toFixed(decimals);
}

// Export additional utility functions

// Export pool types
export { CetusPoolType, BluefinPoolType } from './poolTypes.js';
