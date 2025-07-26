/**
 * AlphaFi SDK Withdraw Testing Script
 *
 * This script tests withdraw functionality for all supported protocols:
 * - Bluefin (DEX with concentrated liquidity)
 * - Navi (Lending protocol)
 * - Cetus (AMM DEX)
 *
 * Usage:
 * 1. Set up environment variables (see env.config.ts)
 * 2. Run: npx ts-node scripts/testWithdraws.ts
 *
 * Note: This test requires existing deposits/receipts to withdraw from.
 * Make sure you have active positions before running withdraw tests.
 */

import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { fromB64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';

declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit: (code?: number) => never;
};

import { Blockchain } from '../src/models/blockchain.js';
import { TransactionManager } from '../src/models/transaction.js';
import { loadConfig, TestConfig } from './env.config.js';
import { PoolUtils } from '../src/models/pool.js';

// Extended config interface for withdraw tests
interface WithdrawTestConfig extends TestConfig {
  withdrawAmounts: {
    xTokens: string; // Amount of xTokens to withdraw
    percentage: number; // Percentage of total position to withdraw (0-100)
  };
  receiptIds?: string[45]; // Specific receipt IDs to withdraw from
  testPartialWithdraw: boolean; // Test partial withdrawals
  testFullWithdraw: boolean; // Test full withdrawals
}

// Utility function to get SuiClient based on network
function getSuiClient(network: string): SuiClient {
  const networkUrls = {
    mainnet: 'https://fullnode.mainnet.sui.io/',
    testnet: 'https://fullnode.testnet.sui.io/',
    devnet: 'https://fullnode.devnet.sui.io/',
  };

  const url = networkUrls[network as keyof typeof networkUrls] || networkUrls.devnet;

  return new SuiClient({ url });
}

// Setup function to initialize wallet and clients
function setupTestEnvironment(config: WithdrawTestConfig) {
  if (!config.privateKeyB64) {
    throw new Error('Private key not configured. Set PK_B64 environment variable.');
  }

  const keypair = Ed25519Keypair.fromSecretKey(fromB64(config.privateKeyB64).slice(1));
  const address = keypair.getPublicKey().toSuiAddress();
  const suiClient = getSuiClient(config.network);
  const blockchain = new Blockchain(suiClient, config.network);
  const poolUtils = new PoolUtils(blockchain, suiClient);
  const transactionManager = new TransactionManager(address, blockchain, poolUtils);

  return { keypair, address, suiClient, blockchain, transactionManager };
}

// Test class for organized withdraw testing
class WithdrawTester {
  private config: WithdrawTestConfig;
  private keypair: Ed25519Keypair;
  private address: string;
  private suiClient: SuiClient;
  private blockchain: Blockchain;
  private transactionManager: TransactionManager;

  constructor(config: WithdrawTestConfig) {
    this.config = config;
    const setup = setupTestEnvironment(config);
    this.keypair = setup.keypair;
    this.address = setup.address;
    this.suiClient = setup.suiClient;
    this.blockchain = setup.blockchain;
    this.transactionManager = setup.transactionManager;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      const prefix = level.toUpperCase().padEnd(5);
      console.log(`[${timestamp}] ${prefix}: ${message}`);
    }
  }

  private async checkBalance() {
    if (this.config.skipBalanceCheck) {
      this.log('Skipping balance check as requested');
      return;
    }

    try {
      const balance = await this.suiClient.getBalance({
        owner: this.address,
      });

      this.log(`Wallet Address: ${this.address}`);
      this.log(
        `SUI Balance: ${balance.totalBalance} MIST (${Number(balance.totalBalance) / 1e9} SUI)`,
      );

      if (Number(balance.totalBalance) < 1000000000) {
        // Less than 1 SUI
        this.log('Warning: Low SUI balance. You may need more SUI for gas fees.', 'warn');
      }
    } catch (error) {
      this.log(`Error checking balance: ${error}`, 'error');
    }
  }

  private async executeTransaction(txb: Transaction, description: string): Promise<boolean> {
    try {
      this.log(`Executing transaction in ${this.config.dryRun ? 'dry run' : 'live'} mode`);

      if (this.config.dryRun) {
        this.log(`DRY RUN: Would execute ${description}`);

        try {
          txb.setSender(this.address);

          const dryRunResult = await this.suiClient.dryRunTransactionBlock({
            transactionBlock: await txb.build({ client: this.suiClient }),
          });

          this.log(
            `Dry run successful. Gas used: ${
              dryRunResult.effects.gasUsed?.computationCost || 'unknown'
            }`,
          );
          return true;
        } catch (dryRunError) {
          this.log(`Dry run failed: ${dryRunError}`, 'error');
          return false;
        }
      } else {
        this.log(`Executing: ${description}`);

        txb.setSender(this.address);

        const result = await this.suiClient.signAndExecuteTransaction({
          signer: this.keypair,
          transaction: txb,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        if (result.effects?.status?.status === 'success') {
          this.log(`Transaction successful: ${result.digest}`);
          this.log(`Gas used: ${result.effects.gasUsed?.computationCost}`);
          return true;
        } else {
          this.log(`Transaction failed: ${result.effects?.status?.error}`, 'error');
          return false;
        }
      }
    } catch (error) {
      this.log(`Error executing transaction: ${error}`, 'error');
      return false;
    }
  }

  private async getReceipts(poolId: number): Promise<any[]> {
    try {
      this.log(`Fetching receipts for pool ${poolId}`);
      const receipts = await this.blockchain.getReceipts(poolId, this.address);
      this.log(`Found ${receipts.length} receipts for pool ${poolId}`);

      if (receipts.length === 0) {
        this.log(`No receipts found for pool ${poolId}. You need to deposit first.`, 'warn');
      }

      return receipts;
    } catch (error) {
      this.log(`Error fetching receipts: ${error}`, 'error');
      return [];
    }
  }

  private async calculateWithdrawAmount(receipts: any[], percentage: number): Promise<string> {
    if (receipts.length === 0) {
      throw new Error('No receipts available for withdrawal');
    }

    // Calculate total xToken balance
    let totalBalance = BigInt(0);
    for (const receipt of receipts) {
      if (receipt.xTokenBalance) {
        totalBalance += BigInt(receipt.xTokenBalance);
      }
    }

    this.log(`Total xToken balance: ${totalBalance.toString()}`);

    // Calculate withdraw amount based on percentage
    const withdrawAmount = (totalBalance * BigInt(percentage)) / BigInt(100);

    this.log(`Withdrawing ${percentage}% = ${withdrawAmount.toString()} xTokens`);

    return withdrawAmount.toString();
  }

  async testBluefinWithdraw(): Promise<boolean> {
    this.log('=== Testing Bluefin Withdraw ===');
    console.log('Bluefin pool id', this.config.bluefinPoolId);
    try {
      // Get receipts first
      const receipts = await this.getReceipts(this.config.bluefinPoolId);
      console.log('Bluefin receipts', receipts);
      if (receipts.length === 0) {
        this.log('No receipts found for Bluefin pool. Skipping withdraw test.', 'warn');
        return true; // Not a failure, just no receipts to withdraw
      }

      // Calculate withdraw amount
      const withdrawAmount = await this.calculateWithdrawAmount(
        receipts,
        this.config.withdrawAmounts.percentage,
      );

      this.log(
        `Creating withdraw transaction for pool ${this.config.bluefinPoolId} with amount ${withdrawAmount}`,
      );

      const txb = await this.transactionManager.withdraw(
        'bluefin',
        withdrawAmount,
        this.config.bluefinPoolId,
      );

      return await this.executeTransaction(
        txb,
        `Bluefin withdraw (Pool ${this.config.bluefinPoolId}, Amount: ${withdrawAmount})`,
      );
    } catch (error) {
      this.log(`Bluefin withdraw test failed: ${error}`, 'error');
      if (error instanceof Error) {
        this.log(`Error stack: ${error.stack}`, 'error');
      }
      return false;
    }
  }

  async testNaviWithdraw(): Promise<boolean> {
    this.log('=== Testing Navi Withdraw ===');

    try {
      const receipts = await this.getReceipts(this.config.naviPoolId);
      if (receipts.length === 0) {
        this.log('No receipts found for Navi pool. Skipping withdraw test.', 'warn');
        return true;
      }

      const withdrawAmount = await this.calculateWithdrawAmount(
        receipts,
        this.config.withdrawAmounts.percentage,
      );

      const txb = await this.transactionManager.withdraw(
        'navi',
        withdrawAmount,
        this.config.naviPoolId,
      );

      return await this.executeTransaction(
        txb,
        `Navi withdraw (Pool ${this.config.naviPoolId}, Amount: ${withdrawAmount})`,
      );
    } catch (error) {
      this.log(`Navi withdraw test failed: ${error}`, 'error');
      return false;
    }
  }

  async testCetusWithdraw(): Promise<boolean> {
    this.log('=== Testing Cetus Withdraw ===');

    try {
      const receipts = await this.getReceipts(this.config.cetusPoolId);
      if (receipts.length === 0) {
        this.log('No receipts found for Cetus pool. Skipping withdraw test.', 'warn');
        return true;
      }

      const withdrawAmount = await this.calculateWithdrawAmount(
        receipts,
        this.config.withdrawAmounts.percentage,
      );

      const txb = await this.transactionManager.withdraw(
        'cetus',
        withdrawAmount,
        this.config.cetusPoolId,
      );

      return await this.executeTransaction(
        txb,
        `Cetus withdraw (Pool ${this.config.cetusPoolId}, Amount: ${withdrawAmount})`,
      );
    } catch (error) {
      this.log(`Cetus withdraw test failed: ${error}`, 'error');
      return false;
    }
  }

  async testPartialWithdraw(): Promise<boolean> {
    if (!this.config.testPartialWithdraw) {
      this.log('Skipping partial withdraw test as requested');
      return true;
    }

    this.log('=== Testing Partial Withdraw (25%) ===');

    try {
      const receipts = await this.getReceipts(this.config.bluefinPoolId);
      if (receipts.length === 0) {
        this.log('No receipts found. Skipping partial withdraw test.', 'warn');
        return true;
      }

      const withdrawAmount = await this.calculateWithdrawAmount(receipts, 25);

      const txb = await this.transactionManager.withdraw(
        'bluefin',
        withdrawAmount,
        this.config.bluefinPoolId,
      );

      return await this.executeTransaction(txb, `Partial withdraw (25% of position)`);
    } catch (error) {
      this.log(`Partial withdraw test failed: ${error}`, 'error');
      return false;
    }
  }

  async testFullWithdraw(): Promise<boolean> {
    if (!this.config.testFullWithdraw) {
      this.log('Skipping full withdraw test as requested');
      return true;
    }

    this.log('=== Testing Full Withdraw (100%) ===');

    try {
      const receipts = await this.getReceipts(this.config.bluefinPoolId);
      if (receipts.length === 0) {
        this.log('No receipts found. Skipping full withdraw test.', 'warn');
        return true;
      }

      const withdrawAmount = await this.calculateWithdrawAmount(receipts, 100);

      const txb = await this.transactionManager.withdraw(
        'bluefin',
        withdrawAmount,
        this.config.bluefinPoolId,
      );

      return await this.executeTransaction(txb, `Full withdraw (100% of position)`);
    } catch (error) {
      this.log(`Full withdraw test failed: ${error}`, 'error');
      return false;
    }
  }

  async testReceiptValidation(): Promise<boolean> {
    this.log('=== Testing Receipt Validation ===');

    try {
      const receipts = await this.getReceipts(this.config.bluefinPoolId);

      if (receipts.length === 0) {
        this.log('No receipts found - this is expected if no deposits were made', 'info');
        return true;
      }

      // Validate receipt structure
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        this.log(`Receipt ${i + 1}:`);
        this.log(`  Object ID: ${receipt.objectId}`);
        this.log(`  xToken Balance: ${receipt.content?.fields?.xTokenBalance || 'N/A'}`);
        this.log(`  Pool ID: ${receipt.content?.fields?.pool_id || 'N/A'}`);
        this.log(`  Owner: ${receipt.content?.fields?.owner || 'N/A'}`);
      }

      return true;
    } catch (error) {
      this.log(`Receipt validation test failed: ${error}`, 'error');
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    this.log('Starting withdraw tests...');

    await this.checkBalance();

    const results = {
      receiptValidation: await this.testReceiptValidation(),
      bluefinWithdraw: await this.testBluefinWithdraw(),
      //   naviWithdraw: await this.testNaviWithdraw(),
      //   cetusWithdraw: await this.testCetusWithdraw(),
      //   partialWithdraw: await this.testPartialWithdraw(),
      //   fullWithdraw: await this.testFullWithdraw(),
    };

    // Summary
    this.log('=== Withdraw Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${test}: ${status}`);
    });

    const allPassed = Object.values(results).every((result) => result);
    if (allPassed) {
      this.log('All withdraw tests completed successfully! 🎉');
    } else {
      this.log('Some withdraw tests failed. Check the logs above for details.', 'warn');
    }
  }
}

// Extended configuration with withdraw-specific settings
function loadWithdrawConfig(): WithdrawTestConfig {
  const baseConfig = loadConfig();

  return {
    ...baseConfig,
    withdrawAmounts: {
      xTokens: process.env.TEST_WITHDRAW_XTOKENS || '1000000',
      percentage: parseInt(process.env.TEST_WITHDRAW_PERCENTAGE || '50'), // 50% by default
    },
    testPartialWithdraw: process.env.TEST_PARTIAL_WITHDRAW !== 'false',
    testFullWithdraw: process.env.TEST_FULL_WITHDRAW !== 'false',
  };
}

async function main() {
  try {
    console.log('=== AlphaFi SDK Withdraw Test Suite ===');

    const config = loadWithdrawConfig();
    console.log(`Network: ${config.network}`);
    console.log(`Dry Run: ${config.dryRun}`);
    console.log(`Withdraw Percentage: ${config.withdrawAmounts.percentage}%`);

    const tester = new WithdrawTester(config);
    await tester.runAllTests();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WithdrawTester, loadWithdrawConfig };
