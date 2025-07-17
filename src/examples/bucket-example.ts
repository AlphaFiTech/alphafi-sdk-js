import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { AlphaFiSDK } from "../core/index.js";
import { SuiNetwork } from "../models/types.js";

/**
 * Example demonstrating how to use the Bucket protocol functionality
 * in the AlphaFi SDK facade architecture
 */
async function bucketExample() {
  // Initialize SUI client
  const client = new SuiClient({
    url: "https://fullnode.mainnet.sui.io:443",
  });

  // Create keypair from private key (you would use your own private key)
  const privateKeyBase64 = process.env.PRIVATE_KEY_BASE64!;
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKeyBase64, 'base64'));
  const address = keypair.getPublicKey().toSuiAddress();

  // Initialize AlphaFi SDK
  const sdk = new AlphaFiSDK({
    client,
    network: "mainnet" as SuiNetwork,
    address,
  });

  console.log("AlphaFi Bucket Protocol Example");
  console.log("===============================");
  console.log(`Wallet Address: ${address}`);

  try {
    // Example 1: Find Bucket pools
    console.log("\n1. Finding Bucket protocol pools:");
    const allPools = sdk.getAllPools();
    const bucketPools = allPools.filter(pool => 
      pool.poolName?.includes("BUCKET") || pool.strategyType?.includes("bucket")
    );
    
    console.log(`Found ${bucketPools.length} Bucket pools:`);
    bucketPools.forEach(pool => {
      console.log(`  - Pool ${pool.poolId}: ${pool.poolName} (${pool.strategyType})`);
    });

    if (bucketPools.length === 0) {
      console.log("No Bucket pools found. Please check pool configuration.");
      return;
    }

    // Use the first Bucket pool for examples
    const bucketPoolId = Number(bucketPools[0].poolId);
    console.log(`\nUsing pool ${bucketPoolId} for examples: ${bucketPools[0].poolName}`);

    // Example 2: Get Bucket pool information
    console.log("\n2. Getting Bucket pool information:");
    const bucketPoolInfo = sdk.getBucketPoolInfo(bucketPoolId);
    console.log(`Pool Name: ${bucketPoolInfo.poolName}`);
    console.log(`Strategy: ${bucketPoolInfo.strategyType}`);
    console.log(`Package ID: ${bucketPoolInfo.packageId}`);
    console.log(`Investor ID: ${bucketPoolInfo.investorId}`);
    console.log(`Receipt Type: ${bucketPoolInfo.receiptType}`);
    console.log(`Asset Types:`, bucketPoolInfo.assetTypes);

    // Example 3: Check user's current deposits
    console.log("\n3. Checking user's current deposits:");
    const hasDeposits = await sdk.hasBucketDeposits(bucketPoolId);
    console.log(`User has deposits: ${hasDeposits}`);
    
    if (hasDeposits) {
      const balance = await sdk.getBucketBalance(bucketPoolId);
      console.log(`Current xToken balance: ${balance}`);
    }

    // Example 4: Get user receipts
    console.log("\n4. Getting user receipts:");
    const receipts = await sdk.getReceipts(bucketPoolId);
    console.log(`Found ${receipts.length} receipts for Bucket pool`);
    
    if (receipts.length > 0) {
      console.log("Receipt details:", receipts[0]);
    }

    // Example 5: Create a deposit transaction (dry run)
    console.log("\n5. Creating Bucket deposit transaction:");
    const depositAmount = "1000000"; // 1 BUCK (assuming 6 decimals)
    
    try {
      const depositTransaction = await sdk.depositBucket(depositAmount, bucketPoolId);
      console.log("✓ Bucket deposit transaction created successfully");
      console.log(`Transaction blocks: ${depositTransaction.getData().commands.length}`);
      
      // Example: Get gas estimate (you would need to implement this in the SDK)
      console.log("To get gas estimate, you can use:");
      console.log(`
      const gasEstimate = await client.dryRunTransactionBlock({
        transactionBlock: depositTransaction.serialize(),
      });
      console.log("Gas estimate:", gasEstimate.effects.gasUsed);
      `);
      
    } catch (error) {
      console.log(`❌ Deposit transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log("This is likely because you don't have BUCK tokens or sufficient balance.");
    }

    // Example 6: Create a withdrawal transaction (dry run)
    if (hasDeposits) {
      console.log("\n6. Creating Bucket withdrawal transaction:");
      const withdrawAmount = "500000"; // Withdraw 500000 xTokens
      
      try {
        const withdrawTransaction = await sdk.withdrawBucket(withdrawAmount, bucketPoolId);
        console.log("✓ Bucket withdrawal transaction created successfully");
        console.log(`Transaction blocks: ${withdrawTransaction.getData().commands.length}`);
        
      } catch (error) {
        console.log(`❌ Withdrawal transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log("\n6. Skipping withdrawal example (no deposits found)");
    }

    // Example 7: Advanced Bucket operations
    console.log("\n7. Advanced Bucket operations:");
    const bucketTransactions = sdk.getBucketTransactions();
    
    if (hasDeposits) {
      const estimatedWithdrawal = await bucketTransactions.getEstimatedWithdrawalAmount(
        bucketPoolId, 
        "1000000"
      );
      console.log(`Estimated withdrawal for 1M xTokens: ${estimatedWithdrawal} BUCK`);
    }

    // Example 8: Transaction execution (commented out for safety)
    console.log("\n8. Transaction execution (dry run):");
    console.log("To execute a transaction, uncomment the following code:");
    console.log(`
    // Execute deposit transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: depositTransaction,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    console.log("Transaction executed:", result.digest);
    console.log("Gas used:", result.effects?.gasUsed);
    console.log("Events:", result.events);
    `);

    console.log("\n✅ Bucket protocol example completed successfully!");

  } catch (error) {
    console.error("❌ Error in Bucket protocol example:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }
}

/**
 * Advanced Bucket example with error handling and multiple operations
 */
async function advancedBucketExample() {
  const client = new SuiClient({
    url: "https://fullnode.mainnet.sui.io:443",
  });

  const privateKeyBase64 = process.env.PRIVATE_KEY_BASE64!;
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKeyBase64, 'base64'));
  const address = keypair.getPublicKey().toSuiAddress();

  const sdk = new AlphaFiSDK({
    client,
    network: "mainnet" as SuiNetwork,
    address,
  });

  console.log("\nAdvanced Bucket Protocol Example");
  console.log("================================");

  try {
    // Find all Bucket pools and check balances
    const allPools = sdk.getAllPools();
    const bucketPools = allPools.filter(pool => pool.poolName?.includes("BUCKET"));

    if (bucketPools.length === 0) {
      console.log("No Bucket pools found.");
      return;
    }

    console.log(`Found ${bucketPools.length} Bucket pools. Checking balances...`);

    for (const pool of bucketPools) {
      try {
        const poolId = Number(pool.poolId);
        const hasDeposits = await sdk.hasBucketDeposits(poolId);
        if (hasDeposits) {
          const balance = await sdk.getBucketBalance(poolId);
          console.log(`✓ Pool ${poolId} (${pool.poolName}): ${balance} xTokens`);
          
          // Create withdrawal transaction for pools with deposits
          const withdrawTx = await sdk.withdrawBucket(
            Math.floor(Number(balance) * 0.1).toString(), // Withdraw 10%
            poolId
          );
          console.log(`  → Created withdrawal transaction (${withdrawTx.getData().commands.length} commands)`);
        } else {
          console.log(`○ Pool ${poolId} (${pool.poolName}): No deposits`);
        }
      } catch (error) {
        console.log(`❌ Error checking pool ${pool.poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Demonstrate batch operations
    console.log("\nBatch operations example:");
    console.log("You could create multiple transactions and batch them:");
    console.log(`
    const transactions: Transaction[] = [];
    
    for (const pool of bucketPoolsWithDeposits) {
      const tx = await sdk.withdrawBucket("1000000", pool.poolId);
      transactions.push(tx);
    }
    
    // Execute all transactions in sequence
    for (const tx of transactions) {
      await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
    }
    `);

  } catch (error) {
    console.error("❌ Advanced Bucket example failed:", error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  bucketExample()
    .then(() => advancedBucketExample())
    .catch(console.error);
}

export { bucketExample, advancedBucketExample }; 