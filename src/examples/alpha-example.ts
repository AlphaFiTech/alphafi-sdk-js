import { AlphaFiSDK, AlphaFiSDKConfig } from "../core/index.js";
import { SuiClient } from "@mysten/sui/client";
import { SuiNetwork } from "../models/types.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { AlphaTransactions } from "../models/transactionProtocolModels/alpha.js";
import { Blockchain } from "../models/blockchain.js";
import { PoolUtils } from "../models/pool.js";

async function main() {
  try {
    // Initialize the SDK configuration
    const network = (process.env.NETWORK === "mainnet" ? "mainnet" : "testnet") as SuiNetwork;
    const privateKeyBase64 = process.env.PRIVATE_KEY_BASE64;
    
    if (!privateKeyBase64) {
      throw new Error("PRIVATE_KEY_BASE64 environment variable is required");
    }

    console.log(`🚀 Initializing AlphaFi SDK for ${network}...`);
    
    // Create keypair from base64 private key
    const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    const address = keypair.getPublicKey().toSuiAddress();
    
    // Create SUI client
    const client = new SuiClient({
      url: network === "mainnet" 
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443"
    });
    
    // Initialize SDK
    const config: AlphaFiSDKConfig = {
      client,
      network,
      address
    };
    const sdk = new AlphaFiSDK(config);

    console.log(`✅ SDK initialized successfully!`);
    console.log(`📍 Wallet Address: ${address}`);

    // Initialize ALPHA transactions
    const blockchain = new Blockchain(client, network);
    const poolUtils = new PoolUtils(blockchain, client);
    const alphaTransactions = new AlphaTransactions(address, blockchain, poolUtils);

    // Example 1: Get ALPHA pool information
    console.log("\n1️⃣ Getting ALPHA pool information...");
    try {
      const poolInfo = alphaTransactions.getAlphaPoolInfo();
      console.log("ALPHA Pool Info:", {
        poolId: poolInfo.poolId,
        poolName: poolInfo.poolName,
        strategyType: poolInfo.strategyType,
        protocol: poolInfo.protocol
      });
    } catch (error) {
      console.log(`❌ Error getting pool info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 2: Check user's ALPHA balances
    console.log("\n2️⃣ Checking ALPHA balances...");
    
    // Check wallet balance
    const walletBalance = await alphaTransactions.getAvailableAlphaBalance();
    console.log(`Available ALPHA in wallet: ${walletBalance}`);
    
    // Check staked balance
    const stakedBalance = await alphaTransactions.getUserAlphaBalance();
    console.log(`Staked ALPHA balance: ${stakedBalance}`);
    
    // Check if user has deposits
    const hasDeposits = await alphaTransactions.hasAlphaDeposits();
    console.log(`Has ALPHA deposits: ${hasDeposits}`);

    // Example 3: Create a deposit transaction (if user has ALPHA)
    console.log("\n3️⃣ Creating ALPHA deposit transaction...");
    if (parseFloat(walletBalance) > 0) {
      try {
        const depositAmount = Math.min(parseFloat(walletBalance) * 0.1, 1000000).toString(); // Deposit 10% or 1 ALPHA, whichever is smaller
        console.log(`Creating deposit transaction for ${depositAmount} ALPHA...`);
        
        const depositTx = await alphaTransactions.depositAlphaTx(depositAmount);
        console.log("✅ ALPHA deposit transaction created successfully");
        console.log("Transaction preview:");
        console.log(`  - Amount: ${depositAmount} ALPHA (smallest units)`);
        console.log(`  - Pool: ALPHA staking pool`);
        
        // Dry run the transaction
        console.log("\nRunning dry run...");
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await depositTx.build({ client }),
        });
        
        if (dryRunResult.effects.status.status === "success") {
          console.log("✅ Dry run successful - transaction would succeed");
          console.log(`⛽ Estimated gas cost: ${dryRunResult.effects.gasUsed.computationCost}`);
        } else {
          console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        }
        
      } catch (error) {
        console.log(`❌ Failed to create deposit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log("ℹ️ No ALPHA tokens found in wallet for deposit");
    }

    // Example 4: Create a withdrawal transaction (if user has staked ALPHA)
    console.log("\n4️⃣ Creating ALPHA withdrawal transaction...");
    if (hasDeposits && parseFloat(stakedBalance) > 0) {
      try {
        const withdrawAmount = Math.floor(parseFloat(stakedBalance) * 0.1).toString(); // Withdraw 10% of staked balance
        console.log(`Creating withdrawal transaction for ${withdrawAmount} xALPHA...`);
        
        // Test withdrawal from unlocked amount
        const withdrawTx = await alphaTransactions.withdrawAlphaTx(withdrawAmount, false);
        console.log("✅ ALPHA withdrawal transaction created successfully");
        console.log("Transaction preview:");
        console.log(`  - xTokens: ${withdrawAmount}`);
        console.log(`  - Withdraw from locked: false`);
        
        // Dry run the transaction
        console.log("\nRunning dry run...");
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await withdrawTx.build({ client }),
        });
        
        if (dryRunResult.effects.status.status === "success") {
          console.log("✅ Dry run successful - transaction would succeed");
          console.log(`⛽ Estimated gas cost: ${dryRunResult.effects.gasUsed.computationCost}`);
        } else {
          console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        }
        
      } catch (error) {
        console.log(`❌ Failed to create withdrawal transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log("ℹ️ User has no ALPHA deposits to withdraw from");
    }

    // Example 5: Advanced ALPHA operations
    console.log("\n5️⃣ Advanced ALPHA operations...");
    
    // Show estimated rewards
    const estimatedRewards = await alphaTransactions.getEstimatedRewards();
    console.log(`Estimated rewards: ${estimatedRewards}`);
    
    // Show withdrawal options
    console.log("\nWithdrawal options:");
    console.log("- withdrawFromLocked: false (default) - withdraw from unlocked amount");
    console.log("- withdrawFromLocked: true - withdraw from locked/vesting amount");
    
    // Example of locked withdrawal (if user wants to test)
    if (hasDeposits && parseFloat(stakedBalance) > 0) {
      console.log("\nExample locked withdrawal transaction:");
      try {
        const lockedWithdrawAmount = "1000"; // Small amount for testing
        const lockedWithdrawTx = await alphaTransactions.withdrawAlphaTx(lockedWithdrawAmount, true);
        console.log("✅ Locked withdrawal transaction created successfully");
        console.log(`  - Amount: ${lockedWithdrawAmount} xALPHA from locked balance`);
      } catch (error) {
        console.log(`❌ Locked withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Example 6: ALPHA staking best practices
    console.log("\n6️⃣ ALPHA staking best practices...");
    console.log("📚 Best practices for ALPHA staking:");
    console.log("1. Stake ALPHA to earn protocol fees and rewards");
    console.log("2. xALPHA represents your staked position");
    console.log("3. Rewards accrue automatically to your staked position");
    console.log("4. Consider the unlock period when withdrawing");
    console.log("5. Locked withdrawals may have different conditions");
    
    console.log("\n💡 ALPHA Tokenomics:");
    console.log("- ALPHA is the native governance and utility token");
    console.log("- Staking ALPHA earns protocol fees from all AlphaFi strategies");
    console.log("- xALPHA is the receipt token representing staked ALPHA");
    console.log("- The exchange rate between ALPHA and xALPHA increases over time");

    console.log("\n🎉 ALPHA example completed successfully!");

  } catch (error) {
    console.error("❌ Error in ALPHA example:", error);
  }
}

// Example helper function to calculate optimal deposit amount
async function calculateOptimalAlphaDeposit(alphaTransactions: AlphaTransactions, maxPercentage: number = 50) {
  try {
    console.log(`\n🔍 Calculating optimal ALPHA deposit (max ${maxPercentage}% of wallet)...`);
    
    const walletBalance = await alphaTransactions.getAvailableAlphaBalance();
    const walletBalanceNum = parseFloat(walletBalance);
    
    if (walletBalanceNum === 0) {
      console.log("No ALPHA tokens available for deposit");
      return "0";
    }
    
    const maxDepositAmount = Math.floor(walletBalanceNum * (maxPercentage / 100));
    
    console.log("Deposit calculation:");
    console.log(`  Wallet balance: ${walletBalance} ALPHA`);
    console.log(`  Max percentage: ${maxPercentage}%`);
    console.log(`  Recommended deposit: ${maxDepositAmount} ALPHA`);
    
    return maxDepositAmount.toString();
    
  } catch (error) {
    console.error("Error calculating optimal deposit:", error);
    return "0";
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as alphaExample, calculateOptimalAlphaDeposit }; 