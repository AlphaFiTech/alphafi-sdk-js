import { AlphaFiSDK, AlphaFiSDKConfig } from "../core/index.js";
import { SuiClient } from "@mysten/sui/client";
import { SuiNetwork } from "../models/types.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NaviOracleTransactions } from "../models/transactionProtocolModels/naviOracle.js";
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

    // Initialize Navi Oracle transactions
    const blockchain = new Blockchain(client, network);
    const poolUtils = new PoolUtils(blockchain, client);
    const naviOracleTransactions = new NaviOracleTransactions(address, blockchain, poolUtils);

    // Example 1: Get oracle configuration
    console.log("\n1️⃣ Getting Navi Oracle configuration...");
    const oracleConfig = naviOracleTransactions.getOracleConfig();
    console.log("Oracle Configuration:", {
      clockPackageId: oracleConfig.clockPackageId,
      naviOracleConfig: oracleConfig.naviOracleConfig,
      priceOracle: oracleConfig.priceOracle,
      supraOracleHolder: oracleConfig.supraOracleHolder
    });

    // Example 2: Validate price feed information
    console.log("\n2️⃣ Validating price feed information...");
    
    // Example price feed data (these would be real values in production)
    const examplePriceFeeds = [
      {
        name: "SUI",
        pythPriceInfo: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
        feedId: "0x0000000000000000000000000000000000000000000000000000000000000002"
      },
      {
        name: "USDC",
        pythPriceInfo: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
        feedId: "0x1111111111111111111111111111111111111111111111111111111111111111"
      },
      {
        name: "INVALID",
        pythPriceInfo: "invalid_id",
        feedId: "also_invalid"
      }
    ];

    examplePriceFeeds.forEach(feed => {
      const isValid = naviOracleTransactions.validatePriceFeed(feed.pythPriceInfo, feed.feedId);
      console.log(`${feed.name} price feed valid: ${isValid ? '✅' : '❌'}`);
    });

    // Example 3: Create single price update transaction
    console.log("\n3️⃣ Creating single price update transaction...");
    try {
      const validPriceFeed = examplePriceFeeds[0]; // Use SUI as example
      
      if (naviOracleTransactions.validatePriceFeed(validPriceFeed.pythPriceInfo, validPriceFeed.feedId)) {
        const priceUpdateTx = naviOracleTransactions.updateSingleTokenPrice(
          validPriceFeed.pythPriceInfo,
          validPriceFeed.feedId
        );
        
        console.log("✅ Single price update transaction created successfully");
        console.log(`Updated price for: ${validPriceFeed.name}`);
        
        // Dry run the transaction
        console.log("\nRunning dry run...");
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await priceUpdateTx.build({ client }),
        });
        
        if (dryRunResult.effects.status.status === "success") {
          console.log("✅ Dry run successful - price update would succeed");
          console.log(`⛽ Estimated gas cost: ${dryRunResult.effects.gasUsed.computationCost}`);
        } else {
          console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        }
      } else {
        console.log("❌ Invalid price feed data for single update");
      }
      
    } catch (error) {
      console.log(`❌ Failed to create single price update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 4: Create multiple price update transaction
    console.log("\n4️⃣ Creating multiple price update transaction...");
    try {
      const validPriceFeeds = examplePriceFeeds
        .filter(feed => naviOracleTransactions.validatePriceFeed(feed.pythPriceInfo, feed.feedId))
        .map(feed => ({
          pythPriceInfo: feed.pythPriceInfo,
          feedId: feed.feedId
        }));
      
      if (validPriceFeeds.length > 0) {
        const multiPriceUpdateTx = naviOracleTransactions.updateMultipleTokenPrices(validPriceFeeds);
        
        console.log("✅ Multiple price update transaction created successfully");
        console.log(`Updated prices for ${validPriceFeeds.length} tokens`);
        
        // Estimate gas cost
        const estimatedGas = naviOracleTransactions.estimateGasCost(validPriceFeeds.length);
        console.log(`📊 Estimated gas cost: ${estimatedGas}`);
        
        // Dry run the transaction
        console.log("\nRunning dry run...");
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await multiPriceUpdateTx.build({ client }),
        });
        
        if (dryRunResult.effects.status.status === "success") {
          console.log("✅ Dry run successful - multiple price updates would succeed");
          console.log(`⛽ Actual gas cost: ${dryRunResult.effects.gasUsed.computationCost}`);
        } else {
          console.log("❌ Dry run failed:", dryRunResult.effects.status.error);
        }
      } else {
        console.log("❌ No valid price feeds available for multiple update");
      }
      
    } catch (error) {
      console.log(`❌ Failed to create multiple price update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 5: Update common token prices
    console.log("\n5️⃣ Creating common token price update transaction...");
    try {
      const commonTokens = ["SUI", "USDC", "USDT", "HASUI"];
      const commonPriceUpdateTx = naviOracleTransactions.updateCommonTokenPrices(commonTokens);
      
      console.log("✅ Common token price update transaction created");
      console.log(`Prepared price updates for: ${commonTokens.join(", ")}`);
      
      // Estimate gas cost for common tokens
      const estimatedGas = naviOracleTransactions.estimateGasCost(commonTokens.length);
      console.log(`📊 Estimated gas cost: ${estimatedGas}`);
      
      console.log("⚠️  Note: This transaction uses placeholder logic and requires real price feed data");
      
    } catch (error) {
      console.log(`❌ Failed to create common token price update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 6: Prepare price updates for looping
    console.log("\n6️⃣ Preparing price updates for Navi looping...");
    try {
      // Example: HASUI-SUI looping pair
      const supplyCoin = "HASUI";
      const borrowCoin = "SUI";
      
      const loopingPriceUpdateTx = naviOracleTransactions.preparePriceUpdatesForLooping(supplyCoin, borrowCoin);
      
      console.log("✅ Looping price update transaction prepared");
      console.log(`Supply coin: ${supplyCoin}`);
      console.log(`Borrow coin: ${borrowCoin}`);
      
      // Estimate gas cost for looping (2 tokens)
      const estimatedGas = naviOracleTransactions.estimateGasCost(2);
      console.log(`📊 Estimated gas cost: ${estimatedGas}`);
      
      console.log("💡 This transaction should be executed before any looping operations");
      
    } catch (error) {
      console.log(`❌ Failed to prepare looping price updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 7: Update all supported tokens
    console.log("\n7️⃣ Creating comprehensive price update...");
    try {
      const allTokensUpdateTx = naviOracleTransactions.updateAllSupportedTokenPrices();
      
      console.log("✅ All supported tokens price update transaction created");
      
      // Estimate gas cost for all tokens (8 tokens typically)
      const estimatedGas = naviOracleTransactions.estimateGasCost(8);
      console.log(`📊 Estimated gas cost: ${estimatedGas}`);
      
      console.log("Supported tokens: SUI, USDC, USDT, WETH, HASUI, VSUI, STSUI, NAVX");
      console.log("⚠️  Note: This uses placeholder logic and requires real price feed mapping");
      
    } catch (error) {
      console.log(`❌ Failed to create comprehensive price update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Example 8: Best practices and usage patterns
    console.log("\n8️⃣ Best practices for Navi Oracle usage...");
    console.log("📚 Best practices:");
    console.log("1. Always update prices before executing DeFi operations");
    console.log("2. Batch multiple price updates in a single transaction for efficiency");
    console.log("3. Validate price feed information before creating transactions");
    console.log("4. Monitor gas costs - price updates can be expensive");
    console.log("5. Use the preparePriceUpdatesForLooping method for looping strategies");
    
    console.log("\n🔧 Technical details:");
    console.log("- Price updates use Pyth network price feeds");
    console.log("- Updates are required for accurate liquidation calculations");
    console.log("- Stale prices can cause transaction failures in DeFi operations");
    console.log("- Oracle updates are atomic with other DeFi operations");

    console.log("\n💡 Integration patterns:");
    console.log("- Add price updates to the beginning of deposit/withdraw transactions");
    console.log("- Use separate price update transactions for better error handling");
    console.log("- Consider price update frequency vs. gas costs");
    console.log("- Monitor price feed health and validity");

    console.log("\n🎉 Navi Oracle example completed successfully!");

  } catch (error) {
    console.error("❌ Error in Navi Oracle example:", error);
  }
}

// Example helper function to create optimized price update strategy
async function createOptimizedPriceUpdateStrategy(
  naviOracleTransactions: NaviOracleTransactions,
  requiredTokens: string[]
) {
  try {
    console.log(`\n🔍 Creating optimized price update strategy for ${requiredTokens.length} tokens...`);
    
    // Filter for valid tokens (in a real implementation, you'd check against available price feeds)
    const availableTokens = ["SUI", "USDC", "USDT", "WETH", "HASUI", "VSUI", "STSUI", "NAVX"];
    const validTokens = requiredTokens.filter(token => availableTokens.includes(token));
    
    if (validTokens.length === 0) {
      console.log("❌ No valid tokens for price updates");
      return null;
    }
    
    console.log(`Valid tokens for update: ${validTokens.join(", ")}`);
    
    // Estimate gas cost
    const estimatedGas = naviOracleTransactions.estimateGasCost(validTokens.length);
    console.log(`📊 Estimated gas cost: ${estimatedGas}`);
    
    // Create the transaction
    const priceUpdateTx = naviOracleTransactions.updateCommonTokenPrices(validTokens);
    
    return {
      transaction: priceUpdateTx,
      tokenCount: validTokens.length,
      estimatedGas,
      tokens: validTokens
    };
    
  } catch (error) {
    console.error("Error creating optimized price update strategy:", error);
    return null;
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as naviOracleExample, createOptimizedPriceUpdateStrategy }; 