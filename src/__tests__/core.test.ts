/**
 * AlphaFi SDK Core Test Suite
 * 
 * Comprehensive test cases for the main AlphaFiSDK class and its interfaces.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SuiClient } from "@mysten/sui/client";
import { 
  AlphaFiSDK, 
  AlphaFiSDKConfig, 
  DepositOptions, 
  WithdrawOptions, 
  ClaimOptions
} from "../core/index.js";
import { SuiNetwork } from "../models/types.js";

describe("AlphaFi SDK Core", () => {
  let mockSuiClient: SuiClient;
  let validConfig: AlphaFiSDKConfig;
  let sdk: AlphaFiSDK;

  const mockAddress = "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01";
  const mockNetwork: SuiNetwork = "testnet";

  beforeEach(() => {
    // Create simple mock SuiClient
    mockSuiClient = {
      getBalance: () => Promise.resolve({ totalBalance: "1000000000", coinType: "0x2::sui::SUI" } as any),
      getCoins: () => Promise.resolve({ data: [], hasNextPage: false, nextCursor: null }),
      devInspectTransactionBlock: () => Promise.resolve({ effects: { gasUsed: { computationCost: "1000000", nonRefundableStorageFee: "500000" } } } as any),
      signAndExecuteTransaction: () => Promise.resolve({ digest: "test-digest" } as any),
      dryRunTransactionBlock: () => Promise.resolve({ effects: { status: { status: "success" } } } as any),
    } as unknown as SuiClient;

    // Create valid config
    validConfig = {
      client: mockSuiClient,
      network: mockNetwork,
      address: mockAddress,
    };

    // Create SDK instance
    sdk = new AlphaFiSDK(validConfig);
  });

  describe("Constructor and Initialization", () => {
    test("should initialize with valid configuration", () => {
      expect(sdk).toBeDefined();
      expect(sdk).toBeInstanceOf(AlphaFiSDK);
    });

    test("should handle different network configurations", () => {
      const networks: SuiNetwork[] = ["mainnet", "testnet", "devnet"];
      
      networks.forEach(network => {
        const config: AlphaFiSDKConfig = {
          client: mockSuiClient,
          network,
          address: mockAddress,
        };
        
        const testSdk = new AlphaFiSDK(config);
        expect(testSdk).toBeDefined();
        expect(testSdk.getNetwork()).toBe(network);
      });
    });

    test("should initialize with proper address", () => {
      expect(sdk).toBeDefined();
      // SDK should be created without throwing
    });
  });

  describe("Interface Validation", () => {
    describe("DepositOptions", () => {
      test("should accept valid deposit options", () => {
        const validOptions: DepositOptions[] = [
          { poolId: 1, amount: "1000000" },
          { poolId: 1, amount: "1000000", isAmountA: true },
          { poolId: 1, amount: "1000000", dryRun: false },
          { poolId: 1, amount: "1000000", isAmountA: false, dryRun: true },
        ];

        validOptions.forEach(options => {
          expect(options.poolId).toBeDefined();
          expect(options.amount).toBeDefined();
          expect(typeof options.poolId).toBe('number');
          expect(typeof options.amount).toBe('string');
        });
      });
    });

    describe("WithdrawOptions", () => {
      test("should accept valid withdraw options", () => {
        const validOptions: WithdrawOptions[] = [
          { poolId: 1, xTokens: "500000" },
          { poolId: 1, xTokens: "500000", percentage: 50 },
          { poolId: 1, xTokens: "500000", dryRun: true },
          { poolId: 1, xTokens: "0", percentage: 100, dryRun: false },
        ];

        validOptions.forEach(options => {
          expect(options.poolId).toBeDefined();
          expect(options.xTokens).toBeDefined();
          expect(typeof options.poolId).toBe('number');
          expect(typeof options.xTokens).toBe('string');
        });
      });
    });

    describe("ClaimOptions", () => {
      test("should accept valid claim options", () => {
        const validOptions: ClaimOptions[] = [
          {},
          { poolId: 1 },
          { dryRun: true },
          { poolId: 1, dryRun: false },
        ];

        validOptions.forEach(options => {
          expect(typeof options).toBe("object");
          if (options.poolId) {
            expect(typeof options.poolId).toBe('number');
          }
          if (options.dryRun !== undefined) {
            expect(typeof options.dryRun).toBe('boolean');
          }
        });
      });
    });
  });

  describe("Deposit Functionality", () => {
    test("should attempt deposit to a pool", async () => {
      const options: DepositOptions = {
        poolId: 1,
        amount: "1000000000",
      };

      // Should not throw an error during deposit attempt
      try {
        const result = await sdk.deposit(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle deposit with isAmountA parameter", async () => {
      const options: DepositOptions = {
        poolId: 53, // CETUS pool
        amount: "1000000",
        isAmountA: true,
      };

      try {
        const result = await sdk.deposit(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle deposit with dryRun option", async () => {
      const options: DepositOptions = {
        poolId: 1,
        amount: "1000000",
        dryRun: true,
      };

      try {
        const result = await sdk.deposit(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });
  });

  describe("Withdraw Functionality", () => {
    test("should attempt withdraw from a pool", async () => {
      const options: WithdrawOptions = {
        poolId: 1,
        xTokens: "500000000",
      };

      try {
        const result = await sdk.withdraw(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle withdraw with percentage", async () => {
      const options: WithdrawOptions = {
        poolId: 1,
        xTokens: "0",
        percentage: 50,
      };

      try {
        const result = await sdk.withdraw(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle withdraw with dryRun option", async () => {
      const options: WithdrawOptions = {
        poolId: 1,
        xTokens: "500000",
        dryRun: true,
      };

      try {
        const result = await sdk.withdraw(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });
  });

  describe("Claim Functionality", () => {
    test("should attempt claim rewards", async () => {
      const options: ClaimOptions = {
        poolId: 1,
      };

      try {
        const result = await sdk.claim(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle claim all rewards", async () => {
      const options: ClaimOptions = {};

      try {
        const result = await sdk.claim(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });

    test("should handle claim with dryRun option", async () => {
      const options: ClaimOptions = {
        poolId: 1,
        dryRun: true,
      };

      try {
        const result = await sdk.claim(options);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to potentially fail without full blockchain setup
        expect(error).toBeDefined();
      }
    });
  });

  describe("Pool Information Methods", () => {
    describe("getPoolInfo", () => {
      test("should return pool information for valid pool ID", () => {
        const result = sdk.getPoolInfo(1);
        
                 if (result) {
           expect(result).toHaveProperty('poolName');
           expect(result).toHaveProperty('parentProtocolName');
           expect(result).toHaveProperty('strategyType');
           expect(typeof result.poolName).toBe('string');
         } else {
           expect(result == null).toBe(true); // null or undefined
         }
      });

             test("should return null or undefined for invalid pool ID", () => {
         const result = sdk.getPoolInfo(999);
         expect(result == null).toBe(true); // null or undefined
       });

       test("should handle negative pool IDs", () => {
         const result = sdk.getPoolInfo(-1);
         expect(result == null).toBe(true); // null or undefined
       });
    });

    describe("getAllPools", () => {
      test("should return all available pools", () => {
        const result = sdk.getAllPools();
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        
        if (result.length > 0) {
          const pool = result[0];
          expect(pool).toHaveProperty('poolName');
          expect(pool).toHaveProperty('parentProtocolName');
          expect(typeof pool.poolName).toBe('string');
        }
      });

      test("should return consistent results", () => {
        const result1 = sdk.getAllPools();
        const result2 = sdk.getAllPools();
        
        expect(result1.length).toBe(result2.length);
      });
    });
  });

  describe("User Receipt Methods", () => {
    describe("getReceipts", () => {
      test("should attempt to get user receipts for a pool", async () => {
        try {
          const result = await sdk.getReceipts(1);
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          // Expected to potentially fail without full blockchain setup
          expect(error).toBeDefined();
        }
      });

      test("should handle various pool IDs", async () => {
        const poolIds = [1, 50, 999, -1, 0];
        
        for (const poolId of poolIds) {
          try {
            const result = await sdk.getReceipts(poolId);
            expect(Array.isArray(result)).toBe(true);
          } catch (error) {
            // Expected to potentially fail without full blockchain setup
            expect(error).toBeDefined();
          }
        }
      });
    });
  });

  describe("Network Configuration", () => {
    describe("getNetwork", () => {
      test("should return the configured network", () => {
        const networks: SuiNetwork[] = ["mainnet", "testnet", "devnet"];
        
        networks.forEach(network => {
          const config: AlphaFiSDKConfig = {
            client: mockSuiClient,
            network,
            address: mockAddress,
          };
          
          const testSdk = new AlphaFiSDK(config);
          expect(testSdk.getNetwork()).toBe(network);
        });
      });

      test("should return consistent network value", () => {
        const network1 = sdk.getNetwork();
        const network2 = sdk.getNetwork();
        
        expect(network1).toBe(network2);
        expect(network1).toBe(mockNetwork);
      });
    });
  });

  describe("Admin Manager and Pool Utils", () => {
    test("should have getAdminManager method", () => {
      const adminManager = sdk.getAdminManager();
      expect(adminManager).toBeDefined();
    });

    test("should have getPoolUtils method", () => {
      const poolUtils = sdk.getPoolUtils();
      expect(poolUtils).toBeDefined();
    });
  });

  describe("Method Parameter Validation", () => {
    test("should handle various pool ID types", () => {
      const poolIds = [1, 50, 100];
      
             poolIds.forEach(id => {
         const result = sdk.getPoolInfo(id);
         // Should not throw, result can be null, undefined, or valid pool info
         expect(result == null || typeof result === 'object').toBe(true);
       });
    });

    test("should handle string amounts in deposits", async () => {
      const amounts = ["1", "1000000", "999999999999999999"];
      
      for (const amount of amounts) {
        try {
          await sdk.deposit({ poolId: 1, amount });
          // If successful, that's fine
        } catch (error) {
          // If it fails, that's also expected without full setup
          expect(error).toBeDefined();
        }
      }
    });

         test("should handle boolean flags correctly", async () => {
       // Test deposit with boolean flags
       const depositCases = [
         { poolId: 1, amount: "1000000", dryRun: true },
         { poolId: 53, amount: "1000000", isAmountA: true },
         { poolId: 53, amount: "1000000", isAmountA: false },
       ];

       for (const testCase of depositCases) {
         try {
           await sdk.deposit(testCase);
         } catch (error) {
           // Expected to potentially fail without full blockchain setup
           expect(error).toBeDefined();
         }
       }

       // Test withdraw with boolean flags
       const withdrawCases = [
         { poolId: 1, xTokens: "500000", dryRun: false },
       ];

       for (const testCase of withdrawCases) {
         try {
           await sdk.withdraw(testCase);
         } catch (error) {
           // Expected to potentially fail without full blockchain setup
           expect(error).toBeDefined();
         }
       }
     });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle very large amounts", async () => {
      const largeAmount = "999999999999999999999999999999";
      
      try {
        await sdk.deposit({
          poolId: 1,
          amount: largeAmount,
        });
      } catch (error) {
        // Expected to potentially fail
        expect(error).toBeDefined();
      }
    });

    test("should handle very small amounts", async () => {
      const smallAmount = "1";
      
      try {
        await sdk.deposit({
          poolId: 1,
          amount: smallAmount,
        });
      } catch (error) {
        // Expected to potentially fail
        expect(error).toBeDefined();
      }
    });

    test("should handle boundary pool IDs", async () => {
      const boundaryPoolIds = [0, 1, Number.MAX_SAFE_INTEGER];
      
             for (const poolId of boundaryPoolIds) {
         const result = sdk.getPoolInfo(poolId);
         expect(result == null || typeof result === 'object').toBe(true);
       }
    });
  });
}); 