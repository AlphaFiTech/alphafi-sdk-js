/**
 * Environment Configuration for AlphaFi SDK Testing
 * 
 * Copy this file and rename it to env.config.local.ts for your local testing.
 * Set your actual values in the local file and add it to .gitignore
 */

declare const process: {
  env: Record<string, string | undefined>;
};

export interface TestConfig {
  // Network Configuration
  network: 'mainnet' | 'testnet' | 'devnet';
  
  // Private Key (Base64 encoded)
  privateKeyB64: string;
  
  // Test Pool IDs
  bluefinPoolId: number;
  naviPoolId: number;
  cetusPoolId: number;
  
  // Test Amounts (in smallest unit)
  depositAmounts: {
    sui: string;
    usdc: string;
    usdt: string;
  };
  
  // Test Configuration
  dryRun: boolean;
  verbose: boolean;
  skipBalanceCheck: boolean;
}

// Default test configuration
export const defaultTestConfig: TestConfig = {
  network: 'mainnet',
  privateKeyB64: process.env.PK_B64 || '',
  
  // Example Pool IDs - replace with actual IDs
  bluefinPoolId: 45,
  naviPoolId: 2, 
  cetusPoolId: 3,
  
  depositAmounts: {
    sui: '1000000',    // 1 SUI
    usdc: '1000000',      // 0.1 USDC
    usdt: '1000000',      // 1 USDT
  },
  
  dryRun: false,          // Set to false to execute real transactions
  verbose: true,
  skipBalanceCheck: false,
};

// Load configuration from environment variables
export function loadConfig(): TestConfig {
    console.log(process.env.TEST_BLUEFIN_POOL_ID);
  return {
    network: (process.env.NETWORK as any) || defaultTestConfig.network,
    privateKeyB64: process.env.PK_B64 || defaultTestConfig.privateKeyB64,
    
    bluefinPoolId: parseInt(process.env.TEST_BLUEFIN_POOL_ID || '') || defaultTestConfig.bluefinPoolId,
    naviPoolId: parseInt(process.env.TEST_NAVI_POOL_ID || '') || defaultTestConfig.naviPoolId,
    cetusPoolId: parseInt(process.env.TEST_CETUS_POOL_ID || '') || defaultTestConfig.cetusPoolId,
    
    depositAmounts: {
      sui: process.env.TEST_DEPOSIT_AMOUNT_SUI || defaultTestConfig.depositAmounts.sui,
      usdc: process.env.TEST_DEPOSIT_AMOUNT_USDC || defaultTestConfig.depositAmounts.usdc,
      usdt: process.env.TEST_DEPOSIT_AMOUNT_USDT || defaultTestConfig.depositAmounts.usdt,
    },
    
    dryRun: process.env.DRY_RUN === 'false' ? false : true,
    verbose: process.env.VERBOSE_LOGGING !== 'false',
    skipBalanceCheck: process.env.SKIP_BALANCE_CHECK === 'true',
  };
} 