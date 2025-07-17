import { AlphaFiSDK, AlphaFiSDKConfig } from "../core/index.js";
import { SuiClient } from "@mysten/sui/client";
import { SuiNetwork } from "../models/types.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { ZapDepositTransactions, ZapDepositOptions } from "../models/transactionProtocolModels/zapDeposit.js";
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

    // Initialize Zap Deposit transactions
    const blockchain = new Blockchain(client, network);
    const poolUtils = new PoolUtils(blockchain, client);
    const zapDepositTransactions = new ZapDepositTransactions(address, blockchain, poolUtils);

    // Example 1: Discover pools that support zap deposits
    console.log("\n1️⃣ Discovering pools that support zap deposits...");
    const allPools = sdk.getAllPools();
    const zapSupportedPools = allPools.filter(pool => 
      zapDepositTransactions.isZapDepositSupported(Number(pool.poolId))
    );

    console.log(`Found ${zapSupportedPools.length} pools supporting zap deposits:`);
    zapSupportedPools.forEach(pool => {
      console.log(`  - Pool ${pool.poolId}: ${pool.poolName} (${pool.strategyType})`);
    });

    if (zapSupportedPools.length === 0) {
      console.log("❌ No pools found that support zap deposits");
      return;
    }

    // Use the first zap-supported pool for examples
    const testPool = zapSupportedPools[0];
    console.log(`\nUsing pool for examples: ${testPool.poolName} (ID: ${testPool.poolId})`);

    // Example 2: Get zap pool information
    console.log("\n2️⃣ Getting zap deposit pool information...");
    const zapPoolInfo = zapDepositTransactions.getZapPoolInfo(Number(testPool.poolId));
    console.log("Zap Pool Info:", {
      poolId: zapPoolInfo.poolId,
      poolName: zapPoolInfo.poolName,
      strategyType: zapPoolInfo.strategyType,
      supportsZap: zapPoolInfo.supportsZap,
      protocol: zapPoolInfo.protocol,
      assetTypes: zapPoolInfo.assetTypes
    });

    // Example 3: Check supported input tokens
    console.log("\n3️⃣ Checking supported input tokens...");
    const supportedTokens = zapDepositTransactions.getSupportedInputTokens();
    console.log("Supported input tokens for zap deposits:");
    supportedTokens.forEach(token => {
      console.log(`  - ${token}`);
    });

    // Example 4: Calculate slippage and minimum amounts
    console.log("\n4️⃣ Understanding slippage calculations...");
    
    const slippageExamples = [0.5, 1, 2.5, 5]; // 0.5%, 1%, 2.5%, 5%
    slippageExamples.forEach(percentage => {
      const slippageDecimal = zapDepositTransactions.calculateSlippage(percentage);
      console.log(`${percentage}% slippage = ${slippageDecimal} (decimal)`);
    });

    // Example minimum amounts calculation
    const exampleAmountA = "1000000"; // 1 token A
    const exampleAmountB = "2000000"; // 2 token B
    const slippage = 0.01; // 1%
    
    const { minAmountA, minAmountB } = zapDepositTransactions.getMinimumAmounts(
      exampleAmountA, 
      exampleAmountB, 
      slippage
    );
    
    console.log(`\nMinimum amounts with ${slippage * 100}% slippage:`);
    console.log(`  Original A: ${exampleAmountA} → Minimum A: ${minAmountA}`);
    console.log(`  Original B: ${exampleAmountB} → Minimum B: ${minAmountB}`);

    // Example 5: Get zap deposit estimate
    console.log("\n5️⃣ Getting zap deposit estimate...");
    try {
      const zapOptions: ZapDepositOptions = {
        inputCoinName: "SUI",
        inputCoinAmount: 1000000, // 1 SUI
        poolId: Number(testPool.poolId),
        slippage: 0.01 // 1%
      };
      
      const estimate = await zapDepositTransactions.getZapEstimate(zapOptions);
      console.log("Zap deposit estimate:");
      console.log(`  Input: ${zapOptions.inputCoinAmount} ${zapOptions.inputCoinName}`);
      console.log(`  Estimated Token A: ${estimate.estimatedAmountA}`);
      console.log(`  Estimated Token B: ${estimate.estimatedAmountB}`);
      console.log(`  Swap required: ${estimate.swapRequired ? 'Yes' : 'No'}`);
      console.log("⚠️  Note: This uses placeholder estimation logic");
      
    } catch (error) {
      console.log(`❌ Failed to get zap estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 6: Create a zap deposit transaction
    console.log("\n6️⃣ Creating zap deposit transaction...");
    try {
      const zapOptions: ZapDepositOptions = {
        inputCoinName: "SUI",
        inputCoinAmount: 1000000, // 1 SUI in smallest units
        poolId: Number(testPool.poolId),
        slippage: 0.01 // 1%
      };
      
      console.log(`Creating zap deposit transaction...`);
      console.log(`  Input: ${zapOptions.inputCoinAmount} ${zapOptions.inputCoinName}`);
      console.log(`  Target pool: ${testPool.poolName}`);
      console.log(`  Slippage: ${zapOptions.slippage * 100}%`);
      
      const zapTx = await zapDepositTransactions.zapDepositTx(zapOptions);
      console.log("✅ Zap deposit transaction created successfully");
      
      // Dry run the transaction
      console.log("\nRunning dry run...");
      const dryRunResult = await client.dryRunTransactionBlock({
        transactionBlock: await zapTx.build({ client }),
      });
      
      if (dryRunResult.effects.status.status === "success") {
        console.log("✅ Dry run successful - zap deposit would succeed");
        console.log(`⛽ Estimated gas cost: ${dryRunResult.effects.gasUsed.computationCost}`);
      } else {
        console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        console.log("💡 This is expected as the transaction uses placeholder swap logic");
      }
      
    } catch (error) {
      console.log(`❌ Failed to create zap deposit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error && error.message.includes("TODO")) {
        console.log("💡 This error is expected - swap logic requires full implementation");
      }
    }

    // Example 7: Test different pool types
    console.log("\n7️⃣ Testing zap support across different pool types...");
    
    // Test each zap-supported pool
    zapSupportedPools.slice(0, 3).forEach(pool => { // Test first 3 pools
      try {
        const poolInfo = zapDepositTransactions.getZapPoolInfo(Number(pool.poolId));
        console.log(`\n${pool.poolName}:`);
        console.log(`  Strategy: ${poolInfo.strategyType}`);
        console.log(`  Supports Zap: ${poolInfo.supportsZap ? '✅' : '❌'}`);
        console.log(`  Asset Types:`, poolInfo.assetTypes);
      } catch (error) {
        console.log(`❌ Error checking pool ${pool.poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Example 8: Advanced zap operations
    console.log("\n8️⃣ Advanced zap deposit patterns...");
    
    console.log("📚 Zap deposit workflow:");
    console.log("1. User provides single input token (e.g., SUI)");
    console.log("2. System calculates optimal split for target pool ratio");
    console.log("3. Input token is swapped to required token pair");
    console.log("4. Swapped tokens are deposited into the target pool");
    console.log("5. User receives LP tokens/receipts for the position");
    
    console.log("\n🔧 Technical considerations:");
    console.log("- Slippage affects both swap and deposit operations");
    console.log("- Pool ratios determine optimal token split");
    console.log("- DEX routing affects swap efficiency");
    console.log("- Gas costs increase with complexity");
    
    console.log("\n💡 Best practices:");
    console.log("- Start with small amounts when testing");
    console.log("- Monitor slippage carefully in volatile markets");
    console.log("- Consider pool depth and liquidity");
    console.log("- Check token availability before zapping");

    // Example 9: Demonstrate different input tokens
    console.log("\n9️⃣ Testing different input tokens...");
    
    const testInputTokens = ["SUI", "USDC", "USDT"];
    for (const inputToken of testInputTokens) {
      console.log(`\n${inputToken} → ${testPool.poolName}:`);
      try {
        const estimate = await zapDepositTransactions.getZapEstimate({
          inputCoinName: inputToken,
          inputCoinAmount: 1000000,
          poolId: Number(testPool.poolId),
          slippage: 0.01
        });
        
        console.log(`  Estimated output A: ${estimate.estimatedAmountA}`);
        console.log(`  Estimated output B: ${estimate.estimatedAmountB}`);
        console.log(`  Swap needed: ${estimate.swapRequired ? 'Yes' : 'No'}`);
      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log("\n🎉 Zap Deposit example completed successfully!");
    console.log("\n⚠️  Important notes:");
    console.log("- This implementation uses placeholder swap logic");
    console.log("- Real implementation requires DEX integration (7k Gateway, etc.)");
    console.log("- Price feeds and optimal routing algorithms needed");
    console.log("- Thorough testing required before mainnet deployment");

  } catch (error) {
    console.error("❌ Error in Zap Deposit example:", error);
  }
}

// Example helper function to find optimal zap pools
async function findOptimalZapPools(
  zapDepositTransactions: ZapDepositTransactions,
  sdk: AlphaFiSDK,
  inputToken: string,
  targetAmount: number
) {
  try {
    console.log(`\n🔍 Finding optimal zap pools for ${inputToken}...`);
    
    const allPools = sdk.getAllPools();
    const zapPools = allPools.filter(pool => 
      zapDepositTransactions.isZapDepositSupported(Number(pool.poolId))
    );
    
    console.log(`Found ${zapPools.length} zap-compatible pools`);
    
    // Analyze each pool
    const poolAnalysis = [];
    for (const pool of zapPools) {
      try {
        const estimate = await zapDepositTransactions.getZapEstimate({
          inputCoinName: inputToken,
          inputCoinAmount: targetAmount,
          poolId: Number(pool.poolId),
          slippage: 0.01
        });
        
        poolAnalysis.push({
          pool: pool,
          estimate: estimate,
          efficiency: parseFloat(estimate.estimatedAmountA) + parseFloat(estimate.estimatedAmountB)
        });
      } catch (error) {
        // Skip pools that fail estimation
        console.log(`Skipping pool ${pool.poolId}: estimation failed`);
      }
    }
    
    // Sort by efficiency (placeholder metric)
    poolAnalysis.sort((a, b) => b.efficiency - a.efficiency);
    
    console.log("\nTop zap opportunities:");
    poolAnalysis.slice(0, 3).forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.pool.poolName}`);
      console.log(`   Strategy: ${analysis.pool.strategyType}`);
      console.log(`   Efficiency score: ${analysis.efficiency.toFixed(2)}`);
    });
    
    return poolAnalysis;
    
  } catch (error) {
    console.error("Error finding optimal zap pools:", error);
    return [];
  }
}

// Example helper function to calculate gas-optimized zap strategy
function calculateGasOptimizedStrategy(
  zapOptions: ZapDepositOptions,
  zapDepositTransactions: ZapDepositTransactions
) {
  console.log(`\n🔍 Calculating gas-optimized zap strategy...`);
  
  const { inputCoinAmount, slippage } = zapOptions;
  
  // Strategy considerations
  console.log("Strategy factors:");
  console.log(`1. Input amount: ${inputCoinAmount}`);
  console.log(`2. Slippage tolerance: ${slippage * 100}%`);
  console.log(`3. Pool type and liquidity`);
  console.log(`4. Current market conditions`);
  
  // Recommendations
  console.log("\nRecommendations:");
  if (inputCoinAmount < 100000) {
    console.log("- Small amount: Consider direct deposit instead of zap");
  } else if (inputCoinAmount > 10000000) {
    console.log("- Large amount: Consider splitting into multiple transactions");
  } else {
    console.log("- Medium amount: Zap deposit is likely optimal");
  }
  
  if (slippage > 0.05) {
    console.log("- High slippage tolerance: Monitor for MEV attacks");
  } else if (slippage < 0.005) {
    console.log("- Low slippage tolerance: Transaction may fail in volatile markets");
  }
  
  return {
    recommended: inputCoinAmount >= 100000 && inputCoinAmount <= 10000000,
    risk: slippage > 0.05 ? "high" : slippage < 0.005 ? "low" : "medium",
    strategy: "zap"
  };
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as zapDepositExample, findOptimalZapPools, calculateGasOptimizedStrategy }; 