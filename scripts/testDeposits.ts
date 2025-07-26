/**
 * AlphaFi SDK Deposit Testing Script
 *
 * This script tests deposit functionality for all supported protocols:
 * - Bluefin (DEX with concentrated liquidity)
 * - Navi (Lending protocol)
 * - Cetus (AMM DEX)
 *
 * Usage:
 * 1. Set up environment variables (see env.config.ts)
 * 2. Run: npx ts-node scripts/testDeposits.ts
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
function setupTestEnvironment(config: TestConfig) {
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

// Test class for organized testing
class DepositTester {
  private config: TestConfig;
  private keypair: Ed25519Keypair;
  private address: string;
  private suiClient: SuiClient;
  private blockchain: Blockchain;
  private transactionManager: TransactionManager;

  constructor(config: TestConfig) {
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
      console.log('Executing transaction in dry run mode', this.config.dryRun);
      if (this.config.dryRun || false) {
        this.log(`DRY RUN: Would execute ${description}`);

        // In dry run mode, we can still inspect the transaction
        try {
          // Set the sender before building the transaction
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

        // Set the sender before execution
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

  async testBluefinDeposit(): Promise<boolean> {
    this.log('=== Testing Bluefin Deposit ===');

    try {
      console.log('Depositing Bluefin', this.config.depositAmounts.sui, this.config.bluefinPoolId);
      this.log(
        `Creating deposit transaction for pool ${this.config.bluefinPoolId} with amount ${this.config.depositAmounts.sui}`,
      );

      const txb = await this.transactionManager.deposit(
        'bluefin',
        this.config.depositAmounts.sui,
        this.config.bluefinPoolId,
      );

      console.log('Bluefin Txb', txb);
      this.log('Transaction created successfully, executing...');
      return await this.executeTransaction(
        txb,
        `Bluefin deposit (Pool ${this.config.bluefinPoolId}, Amount: ${this.config.depositAmounts.sui})`,
      );
    } catch (error) {
      this.log(`Bluefin deposit test failed: ${error}`, 'error');
      if (error instanceof Error) {
        this.log(`Error stack: ${error.stack}`, 'error');
      }
      return false;
    }
  }

  async testNaviDeposit(): Promise<boolean> {
    this.log('=== Testing Navi Deposit ===');

    try {
      const txb = await this.transactionManager.deposit(
        'navi',
        this.config.depositAmounts.usdc,
        this.config.naviPoolId,
      );

      return await this.executeTransaction(
        txb,
        `Navi deposit (Pool ${this.config.naviPoolId}, Amount: ${this.config.depositAmounts.usdc})`,
      );
    } catch (error) {
      this.log(`Navi deposit test failed: ${error}`, 'error');
      return false;
    }
  }

  async testCetusDeposit(): Promise<boolean> {
    this.log('=== Testing Cetus Deposit ===');

    try {
      const txb = await this.transactionManager.deposit(
        'cetus',
        this.config.depositAmounts.sui,
        this.config.cetusPoolId,
        { isAmountA: true }, // Use asset A (SUI)
      );

      return await this.executeTransaction(
        txb,
        `Cetus deposit (Pool ${this.config.cetusPoolId}, Amount: ${this.config.depositAmounts.sui})`,
      );
    } catch (error) {
      this.log(`Cetus deposit test failed: ${error}`, 'error');
      return false;
    }
  }

  async testGenericDepositInterface(): Promise<boolean> {
    this.log('=== Testing Generic Deposit Interface ===');

    try {
      // Test Bluefin through generic interface
      const bluefinTxb = await this.transactionManager.deposit(
        'bluefin',
        this.config.depositAmounts.sui,
        this.config.bluefinPoolId,
      );
      console.log('Bluefin Txb', bluefinTxb);
      const bluefinSuccess = await this.executeTransaction(bluefinTxb, 'Generic Bluefin deposit');

      // Test Navi through generic interface
      const naviTxb = await this.transactionManager.deposit(
        'navi',
        this.config.depositAmounts.usdc,
        this.config.naviPoolId,
      );

      const naviSuccess = await this.executeTransaction(naviTxb, 'Generic Navi deposit');

      // Test Cetus through generic interface
      const cetusTxb = await this.transactionManager.deposit(
        'cetus',
        this.config.depositAmounts.sui,
        this.config.cetusPoolId,
        { isAmountA: true },
      );

      const cetusSuccess = await this.executeTransaction(cetusTxb, 'Generic Cetus deposit');

      return bluefinSuccess && naviSuccess && cetusSuccess;
    } catch (error) {
      this.log(`Generic deposit interface test failed: ${error}`, 'error');
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    this.log('Starting AlphaFi SDK Deposit Tests');
    this.log(`Network: ${this.config.network}`);
    this.log(`Dry Run Mode: ${this.config.dryRun}`);
    this.log('=====================================');

    await this.checkBalance();

    const results = {
      bluefin: await this.testBluefinDeposit(),
      //   navi: await this.testNaviDeposit(),
      //   cetus: await this.testCetusDeposit(),
      //   generic: await this.testGenericDepositInterface(),
    };

    this.log('=====================================');
    this.log('Test Results Summary:');
    this.log(`Bluefin Deposit: ${results.bluefin ? '✅ PASS' : '❌ FAIL'}`);
    // this.log(`Navi Deposit: ${results.navi ? '✅ PASS' : '❌ FAIL'}`);
    // this.log(`Cetus Deposit: ${results.cetus ? '✅ PASS' : '❌ FAIL'}`);
    // this.log(`Generic Interface: ${results.generic ? '✅ PASS' : '❌ FAIL'}`);

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    this.log(`Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      this.log('🎉 All tests passed!');
    } else {
      this.log('⚠️  Some tests failed. Check the logs above for details.', 'warn');
    }
  }
}

// Main execution function
async function main() {
  console.log('Starting tests');
  try {
    const config = loadConfig();

    // Validate configuration
    if (!config.privateKeyB64) {
      console.error('❌ Error: PK_B64 environment variable is required');
      console.error('Please set your private key in the environment or .env file');
      process.exit(1);
    }

    const tester = new DepositTester(config);
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch(console.error);
}

export { DepositTester, loadConfig };
