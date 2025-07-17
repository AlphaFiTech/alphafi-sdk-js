import { AlphaFiSDK, AlphaFiSDKConfig } from "../core/index.js";
import { SuiClient } from "@mysten/sui/client";
import { SuiNetwork } from "../models/types.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NaviLoopingTransactions } from "../models/transactionProtocolModels/naviLooping.js";
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

    // Initialize Navi Looping transactions manually
    const blockchain = new Blockchain(client, network);
    const poolUtils = new PoolUtils(blockchain, client);
    const naviLoopingTransactions = new NaviLoopingTransactions(address, blockchain, poolUtils);

    // Example 1: Discover available Navi Looping pools
    console.log("\n1️⃣ Discovering Navi Looping pools...");
    const allPools = sdk.getAllPools();
    const naviLoopingPools = allPools.filter(pool => 
      pool.poolName?.includes("NAVI-LOOP")
    );

    console.log(`Found ${naviLoopingPools.length} Navi Looping pools:`);
    naviLoopingPools.forEach(pool => {
      console.log(`  - Pool ${pool.poolId}: ${pool.poolName}`);
    });

    if (naviLoopingPools.length === 0) {
      console.log("❌ No Navi Looping pools found");
      return;
    }

    // Use the first Navi Looping pool for examples
    const testPool = naviLoopingPools[0];
    console.log(`\nUsing pool for examples: ${testPool.poolName} (ID: ${testPool.poolId})`);

    // Example 2: Get pool information
    console.log("\n2️⃣ Getting Navi Looping pool information...");
    const poolInfo = naviLoopingTransactions.getNaviLoopingPoolInfo(Number(testPool.poolId));
    console.log("Pool Info:", {
      poolName: poolInfo.poolName,
      strategyType: poolInfo.strategyType,
      protocol: poolInfo.protocol,
      poolId: poolInfo.poolId
    });

    // Example 3: Check user balance
    console.log("\n3️⃣ Checking user Navi Looping balance...");
    const userBalance = await naviLoopingTransactions.getUserNaviLoopingBalance(Number(testPool.poolId));
    console.log(`User xToken balance: ${userBalance}`);

    const hasDeposits = await naviLoopingTransactions.hasDeposits(Number(testPool.poolId));
    console.log(`User has deposits: ${hasDeposits}`);

    // Example 4: Create a deposit transaction (dry run)
    console.log("\n4️⃣ Creating Navi Looping deposit transaction...");
    try {
      const depositAmount = "1000000"; // 1 token (assuming 6 decimals)
      console.log(`Creating deposit transaction for ${depositAmount} base units...`);
      
      const depositTx = await naviLoopingTransactions.depositNaviLoopingTx(depositAmount, Number(testPool.poolId));
      console.log("✅ Navi Looping deposit transaction created successfully");
      console.log("Transaction preview:");
      console.log(`  - Target: ${testPool.poolName}`);
      console.log(`  - Amount: ${depositAmount} base units`);
      console.log(`  - Pool ID: ${testPool.poolId}`);
      
      // Dry run the transaction
      console.log("\nRunning dry run...");
      const dryRunResult = await client.dryRunTransactionBlock({
        transactionBlock: await depositTx.build({ client }),
      });
      
      if (dryRunResult.effects.status.status === "success") {
        console.log("✅ Dry run successful - transaction would succeed");
      } else {
        console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
      }
      
    } catch (error) {
      console.log(`❌ Failed to create deposit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // If it's a specific pool type not implemented, show which one
      if (error instanceof Error && error.message.includes("not yet implemented")) {
        console.log("💡 This pool type requires specific implementation - check the naviLooping.ts file");
      }
    }

    // Example 5: Create a withdrawal transaction (if user has deposits)
    console.log("\n5️⃣ Creating Navi Looping withdrawal transaction...");
    if (hasDeposits && parseFloat(userBalance) > 0) {
      try {
        const withdrawAmount = Math.floor(parseFloat(userBalance) * 0.1).toString(); // Withdraw 10% of balance
        console.log(`Creating withdrawal transaction for ${withdrawAmount} xTokens...`);
        
        const withdrawTx = await naviLoopingTransactions.withdrawNaviLoopingTx(withdrawAmount, Number(testPool.poolId));
        console.log("✅ Navi Looping withdrawal transaction created successfully");
        console.log("Transaction preview:");
        console.log(`  - Target: ${testPool.poolName}`);
        console.log(`  - xTokens: ${withdrawAmount}`);
        console.log(`  - Pool ID: ${testPool.poolId}`);
        
        // Dry run the transaction
        console.log("\nRunning dry run...");
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await withdrawTx.build({ client }),
        });
        
        if (dryRunResult.effects.status.status === "success") {
          console.log("✅ Dry run successful - transaction would succeed");
        } else {
          console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        }
        
      } catch (error) {
        console.log(`❌ Failed to create withdrawal transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log("ℹ️ User has no deposits to withdraw from");
    }

    // Example 6: Advanced operations - showing supported pools
    console.log("\n6️⃣ Advanced Navi Looping operations...");
    
    console.log("\nSupported Navi Looping pool types:");
    const supportedPools = [
      "NAVI-LOOP-HASUI-SUI",
      "NAVI-LOOP-SUI-VSUI", 
      "NAVI-LOOP-USDC-USDT",
      "NAVI-LOOP-USDT-USDC",
      "NAVI-LOOP-SUI-STSUI"
    ];
    
    supportedPools.forEach(poolName => {
      const matchingPool = naviLoopingPools.find(p => p.poolName === poolName);
      if (matchingPool) {
        console.log(`  ✅ ${poolName} - Pool ID: ${matchingPool.poolId}`);
      } else {
        console.log(`  ❌ ${poolName} - Not found in current pools`);
      }
    });

    // Example 7: Batch operations (concept)
    console.log("\n7️⃣ Batch operations concept...");
    console.log("For batch operations, you can:");
    console.log("1. Create multiple transactions using different pool IDs");
    console.log("2. Combine deposit/withdrawal operations");
    console.log("3. Execute them sequentially or in parallel");
    
    // Show how to check multiple pools
    if (naviLoopingPools.length > 1) {
      console.log("\nChecking balances across all Navi Looping pools:");
      for (const pool of naviLoopingPools.slice(0, 3)) { // Check first 3 pools
        try {
          const balance = await naviLoopingTransactions.getUserNaviLoopingBalance(Number(pool.poolId));
          console.log(`  ${pool.poolName}: ${balance} xTokens`);
        } catch (error) {
          console.log(`  ${pool.poolName}: Error checking balance`);
        }
      }
    }

    console.log("\n🎉 Navi Looping example completed successfully!");
    console.log("\n💡 Tips:");
    console.log("- Navi Looping involves leveraged positions with supply/borrow pairs");
    console.log("- Always check your position health and liquidation risks");
    console.log("- Start with small amounts when testing");
    console.log("- Monitor rewards from NAVI protocol integration");

  } catch (error) {
    console.error("❌ Error in Navi Looping example:", error);
  }
}

// Example helper function to estimate deposit requirements
async function estimateNaviLoopingDeposit(naviLoopingTransactions: NaviLoopingTransactions, poolId: number, amount: string) {
  try {
    console.log(`\n🔍 Estimating Navi Looping deposit for pool ${poolId}...`);
    
    const poolInfo = naviLoopingTransactions.getNaviLoopingPoolInfo(poolId);
    
    console.log("Pool details:");
    console.log(`  Name: ${poolInfo.poolName}`);
    console.log(`  Strategy: ${poolInfo.strategyType}`);
    
    // Note: In a full implementation, you would:
    // 1. Calculate leverage ratios
    // 2. Estimate borrow amounts
    // 3. Show projected APY/rewards
    // 4. Calculate liquidation thresholds
    
    console.log(`Estimated deposit: ${amount} base units`);
    console.log("⚠️  This is a simplified estimation. Please verify all parameters before depositing.");
    
  } catch (error) {
    console.error("Error estimating deposit:", error);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as naviLoopingExample, estimateNaviLoopingDeposit }; 