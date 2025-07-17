import {
  poolDetailsMap,
  isNaviLoopPool,
  isSingleAssetNaviPool,
  isNaviLoopPoolByName,
  isSingleAssetNaviPoolByName,
  getNaviLoopPools,
  getSingleAssetNaviPools,
  getAllNaviPools,
  getNaviLoopPoolNames,
  getSingleAssetNaviPoolNames,
  categorizeNaviPool,
} from "../common/maps.js";

/**
 * Example demonstrating how to differentiate between NAVI-LOOP and single asset NAVI pools
 */
async function demonstrateNaviPoolDifferentiation() {
  console.log("=== NAVI Pool Differentiation Example ===\n");

  // Get all NAVI pools
  const allNaviPools = getAllNaviPools();
  console.log(`Total NAVI pools: ${allNaviPools.length}`);

  // Get NAVI-LOOP pools
  const naviLoopPools = getNaviLoopPools();
  console.log(`NAVI-LOOP pools: ${naviLoopPools.length}`);

  // Get single asset NAVI pools
  const singleAssetNaviPools = getSingleAssetNaviPools();
  console.log(`Single asset NAVI pools: ${singleAssetNaviPools.length}\n`);

  // Print NAVI-LOOP pool names
  console.log("=== NAVI-LOOP Pools ===");
  const naviLoopPoolNames = getNaviLoopPoolNames();
  naviLoopPoolNames.forEach((poolName, index) => {
    console.log(`${index + 1}. ${poolName}`);
  });

  console.log("\n=== Single Asset NAVI Pools ===");
  const singleAssetNaviPoolNames = getSingleAssetNaviPoolNames();
  singleAssetNaviPoolNames.forEach((poolName, index) => {
    console.log(`${index + 1}. ${poolName}`);
  });

  // Demonstrate pool categorization
  console.log("\n=== Pool Categorization Examples ===");
  
  // Test specific pools
  const testPools = [
    poolDetailsMap["14"], // NAVI-LOOP-SUI-STSUI
    poolDetailsMap["46"], // NAVI-LOOP-HASUI-SUI
    poolDetailsMap["2"],  // NAVI-DEEP
    poolDetailsMap["61"], // NAVI-SUI
    poolDetailsMap["6"],  // BLUEFIN-WAL-USDC (non-NAVI)
  ];

  testPools.forEach((pool) => {
    if (pool) {
      const category = categorizeNaviPool(pool);
      const isLoop = isNaviLoopPool(pool);
      const isSingleAsset = isSingleAssetNaviPool(pool);
      
      console.log(`Pool: ${pool.poolName}`);
      console.log(`  - Parent Protocol: ${pool.parentProtocolName}`);
      console.log(`  - Strategy Type: ${pool.strategyType}`);
      console.log(`  - Category: ${category}`);
      console.log(`  - Is NAVI-LOOP: ${isLoop}`);
      console.log(`  - Is Single Asset NAVI: ${isSingleAsset}`);
      console.log("");
    }
  });

  // Demonstrate pool name-based checking
  console.log("=== Pool Name-Based Checking ===");
  const testPoolNames = [
    "NAVI-LOOP-USDC-USDT",
    "NAVI-LOOP-SUI-STSUI",
    "NAVI-DEEP",
    "NAVI-WETH",
    "BLUEFIN-SUI-USDC",
  ];

  testPoolNames.forEach((poolName) => {
    const isLoopByName = isNaviLoopPoolByName(poolName);
    const isSingleAssetByName = isSingleAssetNaviPoolByName(poolName);
    
    console.log(`Pool Name: ${poolName}`);
    console.log(`  - Is NAVI-LOOP (by name): ${isLoopByName}`);
    console.log(`  - Is Single Asset NAVI (by name): ${isSingleAssetByName}`);
    console.log("");
  });

  // Show strategy types and parent protocols for verification
  console.log("=== Strategy Types and Parent Protocols ===");
  allNaviPools.forEach((pool) => {
    console.log(
      `${pool.poolName}: ${pool.strategyType} (${pool.parentProtocolName})`
    );
  });
}

/**
 * Example showing how to filter pools for specific use cases
 */
async function filteringExamples() {
  console.log("\n=== Filtering Examples ===\n");

  // Filter active (non-retired) NAVI-LOOP pools
  const activeNaviLoopPools = getNaviLoopPools().filter(
    (pool) => !pool.retired
  );
  console.log("Active NAVI-LOOP pools:");
  activeNaviLoopPools.forEach((pool) => {
    console.log(`  - ${pool.poolName} (Package #${pool.packageNumber})`);
  });

  // Filter active single asset NAVI pools
  const activeSingleAssetNaviPools = getSingleAssetNaviPools().filter(
    (pool) => !pool.retired
  );
  console.log("\nActive Single Asset NAVI pools:");
  activeSingleAssetNaviPools.forEach((pool) => {
    console.log(`  - ${pool.poolName} (Package #${pool.packageNumber})`);
  });

  // Find pools by specific package numbers
  const package1NaviPools = getAllNaviPools().filter(
    (pool) => pool.packageNumber === 1
  );
  console.log("\nNAVI pools in Package #1:");
  package1NaviPools.forEach((pool) => {
    const category = categorizeNaviPool(pool);
    console.log(`  - ${pool.poolName} (${category})`);
  });
}

/**
 * Run the demonstration
 */
async function main() {
  try {
    await demonstrateNaviPoolDifferentiation();
    await filteringExamples();
  } catch (error) {
    console.error("Error in demonstration:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  demonstrateNaviPoolDifferentiation,
  filteringExamples,
}; 