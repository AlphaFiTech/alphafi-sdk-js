import { AlphaFiSDK } from "../core/index.js";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

/**
 * Example demonstrating AdminManager usage
 * This showcases administrative functions for AlphaFi pools
 */
async function adminExample() {
  // Initialize the SDK
  const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
  const sdk = new AlphaFiSDK({
    client,
    network: "mainnet",
    address: "0x123...", // Your wallet address
  });

  // Get the admin manager
  const adminManager = sdk.getAdminManager();

  try {
    console.log("=== AlphaFi AdminManager Example ===\n");

    // 1. Get all pools with admin info
    console.log("1. Getting all pools admin information...");
    const allPoolsInfo = await adminManager.getAllPoolsAdminInfo();
    console.log(`Found ${allPoolsInfo.pools.length} pools:`);
    allPoolsInfo.pools.slice(0, 3).forEach(pool => {
      console.log(`  - ${pool.poolName} (${pool.protocol}): ${pool.strategyType}`);
      if (pool.currentTick) {
        console.log(`    Current Tick: ${pool.currentTick}`);
      }
      if (pool.positionTicks) {
        console.log(`    Position: ${pool.positionTicks.lowerTick} to ${pool.positionTicks.upperTick}`);
      }
    });

    // 2. Get tick information for a specific pool
    console.log("\n2. Getting tick information for CETUS pools...");
    try {
      const currentTick = await adminManager.getCurrentTick("CETUS-SUI-USDC");
      console.log(`Current tick for CETUS-SUI-USDC: ${currentTick}`);

      const positionTicks = await adminManager.getPositionTicks("CETUS-SUI-USDC");
      console.log(`Position ticks: ${positionTicks.lowerTick} to ${positionTicks.upperTick}`);

      const tickSpacing = await adminManager.getTickSpacing("CETUS-SUI-USDC");
      console.log(`Tick spacing: ${tickSpacing.tickSpacing} (${tickSpacing.protocol})`);
    } catch (error) {
      console.log("Note: Tick information only available for LP pools");
    }

    // 3. Price/tick conversions
    console.log("\n3. Price/tick conversions...");
    try {
      const price = adminManager.getTickToPrice("CETUS-SUI-USDC", 1000);
      console.log(`Tick 1000 = Price: ${price}`);

      const tick = adminManager.getPriceToTick("CETUS-SUI-USDC", "2.5", 60);
      console.log(`Price 2.5 = Tick: ${tick} (with spacing 60)`);
    } catch (error) {
      console.log("Note: Price conversions only available for LP pools");
    }

    // 4. Get pool weight distributions
    console.log("\n4. Getting pool weight distributions...");
    try {
      const weightDistribution = await adminManager.getPoolsWeightDistribution("ALPHA");
      console.log(`Weight distribution for ALPHA token:`);
      console.log(`Total weight: ${weightDistribution.totalWeight}`);
      console.log(`Pools with weights:`);
      weightDistribution.data
        .filter(pool => pool.weight > 0)
        .slice(0, 5)
        .forEach(pool => {
          console.log(`  - ${pool.poolName}: ${pool.weight} (${((pool.weight / weightDistribution.totalWeight) * 100).toFixed(2)}%)`);
        });
    } catch (error) {
      console.log(`Could not fetch weight distribution: ${(error as Error).message}`);
    }

    // 5. Admin operations (requires admin privileges)
    console.log("\n5. Admin operations example (commented out)...");
    console.log("// Set weights for pools (requires admin capability):");
    console.log(`/*
const setWeightsTx = await adminManager.setWeights({
  poolNames: ["ALPHA", "NAVI-SUI"],
  weights: ["1000", "500"],
  coinType: "ALPHA",
  adminAddress: "0xadmin..."
});
console.log("Set weights transaction created:", setWeightsTx);
*/`);

  } catch (error) {
    console.error("Error in admin example:", error);
  }
}

/**
 * Advanced admin monitoring example
 */
async function adminMonitoringExample() {
  const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
  const sdk = new AlphaFiSDK({
    client,
    network: "mainnet", 
    address: "0x123...",
  });

  const adminManager = sdk.getAdminManager();

  console.log("\n=== Advanced Admin Monitoring ===\n");

  try {
    // Monitor multiple pools
    const poolsToMonitor = ["CETUS-SUI-USDC", "BLUEFIN-SUI-USDT", "NAVI-SUI"];
    
    for (const poolName of poolsToMonitor) {
      try {
        console.log(`\n--- ${poolName} ---`);
        
        // Check if it's an LP pool for tick monitoring
        const allPools = sdk.getAllPools();
        const poolDetails = allPools.find(p => p.poolName === poolName);
        
        if (poolDetails && sdk.getPoolUtils().isDoubleAssetPool(Number(poolDetails.poolId))) {
          const currentTick = await adminManager.getCurrentTick(poolName);
          const positionTicks = await adminManager.getPositionTicks(poolName);
          const tickSpacing = await adminManager.getTickSpacing(poolName);
          
          console.log(`Current Tick: ${currentTick}`);
          console.log(`Position Range: ${positionTicks.lowerTick} to ${positionTicks.upperTick}`);
          console.log(`Tick Spacing: ${tickSpacing.tickSpacing}`);
          
          // Calculate distance from position bounds
          const distanceFromLower = currentTick - positionTicks.lowerTick;
          const distanceFromUpper = positionTicks.upperTick - currentTick;
          console.log(`Distance from bounds: -${distanceFromLower} / +${distanceFromUpper}`);
          
          // Alert if position is near bounds
          if (distanceFromLower < 1000 || distanceFromUpper < 1000) {
            console.log("⚠️  WARNING: Position is near bounds!");
          }
        } else {
          console.log("Single asset pool - no tick monitoring needed");
        }
        
             } catch (error) {
         console.log(`Error monitoring ${poolName}: ${(error as Error).message}`);
       }
    }
    
  } catch (error) {
    console.error("Error in monitoring:", error);
  }
}

// Export the example functions
export { adminExample, adminMonitoringExample };

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  adminExample()
    .then(() => adminMonitoringExample())
    .catch(console.error);
} 