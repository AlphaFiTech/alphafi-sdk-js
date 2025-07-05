# AlphaFi SDK Testing Scripts

This directory contains testing scripts for the AlphaFi SDK transaction functionality.

## Setup

### 1. Environment Configuration

Create a `.env` file in the root of the `alphafi-sdk-js` project with the following variables:

```bash
# Required: Network to test on
NETWORK=testnet

# Required: Your private key (Base64 encoded)
PK_B64=your_base64_private_key_here

# Optional: Custom pool IDs for testing
TEST_BLUEFIN_POOL_ID=1
TEST_NAVI_POOL_ID=2
TEST_CETUS_POOL_ID=3    

# Optional: Custom deposit amounts (in smallest unit)
TEST_DEPOSIT_AMOUNT_SUI=1000000000   # 1 SUI
TEST_DEPOSIT_AMOUNT_USDC=1000000     # 1 USDC
TEST_DEPOSIT_AMOUNT_USDT=1000000     # 1 USDT

# Optional: Test configuration
DRY_RUN=true                         # Set to false to execute real transactions
VERBOSE_LOGGING=true                 # Set to false for minimal output
SKIP_BALANCE_CHECK=false             # Set to true to skip balance verification
```

### 2. Get Your Private Key

Using the Sui CLI:
```bash
# Generate a new keypair (if needed)
sui keytool generate ed25519

# Export your private key
sui keytool export --key-identity <your-address> --json
```

The output will contain a `privateKey` field - use that value for `PK_B64`.

### 3. Install Dependencies

Make sure you have installed the project dependencies:
```bash
cd alphafi-sdk-js
npm install
```

## Running Tests

### Deposit Tests

Test all deposit functionality across protocols:

```bash
npx ts-node scripts/testDeposits.ts
```

### Test Features

The deposit test script includes:

- **Balance Checking**: Verifies you have sufficient funds before testing
- **Dry Run Mode**: Test transaction building without executing (default)
- **Protocol Coverage**: Tests Bluefin, Navi, and Cetus protocols
- **Generic Interface**: Tests the unified deposit API
- **Detailed Logging**: Shows transaction details and gas costs
- **Error Handling**: Comprehensive error reporting

### Test Output

Example output:
```
[2024-01-15T10:30:00.000Z] INFO : Starting AlphaFi SDK Deposit Tests
[2024-01-15T10:30:00.000Z] INFO : Network: testnet
[2024-01-15T10:30:00.000Z] INFO : Dry Run Mode: true
[2024-01-15T10:30:00.000Z] INFO : =====================================
[2024-01-15T10:30:00.000Z] INFO : Wallet Address: 0x...
[2024-01-15T10:30:00.000Z] INFO : SUI Balance: 5000000000 MIST (5 SUI)
[2024-01-15T10:30:00.000Z] INFO : === Testing Bluefin Deposit ===
[2024-01-15T10:30:00.000Z] INFO : DRY RUN: Would execute Bluefin deposit (Pool 1, Amount: 1000000000)
[2024-01-15T10:30:00.000Z] INFO : Dry run successful. Gas used: 1000000
...
[2024-01-15T10:30:00.000Z] INFO : =====================================
[2024-01-15T10:30:00.000Z] INFO : Test Results Summary:
[2024-01-15T10:30:00.000Z] INFO : Bluefin Deposit: ✅ PASS
[2024-01-15T10:30:00.000Z] INFO : Navi Deposit: ✅ PASS
[2024-01-15T10:30:00.000Z] INFO : Cetus Deposit: ✅ PASS
[2024-01-15T10:30:00.000Z] INFO : Generic Interface: ✅ PASS
[2024-01-15T10:30:00.000Z] INFO : Overall: 4/4 tests passed
[2024-01-15T10:30:00.000Z] INFO : 🎉 All tests passed!
```

## Customizing Tests

### Local Configuration

For local testing, you can create `env.config.local.ts` to override default settings:

```typescript
import { TestConfig } from './env.config.js';

export const localTestConfig: TestConfig = {
  network: 'devnet',
  privateKeyB64: 'your_local_private_key',
  bluefinPoolId: 5,
  naviPoolId: 8,
  cetusPoolId: 12,
  depositAmounts: {
    sui: '500000000',    // 0.5 SUI
    usdc: '500000',      // 0.5 USDC  
    usdt: '500000',      // 0.5 USDT
  },
  dryRun: false,       // Execute real transactions
  verbose: true,
  skipBalanceCheck: false,
};
```

### Adding Custom Tests

You can extend the `DepositTester` class to add custom test scenarios:

```typescript
import { DepositTester } from './testDeposits.js';

class CustomDepositTester extends DepositTester {
  async testLargeDeposit() {
    // Custom test implementation
  }
}
```

## Safety Notes

⚠️ **Important Safety Guidelines:**

1. **Always test in dry-run mode first** (`DRY_RUN=true`)
2. **Use testnet for initial testing** (`NETWORK=testnet`)
3. **Start with small amounts** when testing real transactions
4. **Keep your private key secure** - never commit it to version control
5. **Verify pool IDs** before executing real transactions

## Troubleshooting

### Common Issues

1. **"PK_B64 not configured"**: Set your private key in the environment
2. **"Low SUI balance"**: Get more SUI from the testnet faucet
3. **"Pool not found"**: Verify the pool ID exists for your network
4. **Gas errors**: Ensure you have enough SUI for transaction fees

### Getting Help

- Check the logs for detailed error messages
- Use `VERBOSE_LOGGING=true` for maximum detail
- Verify your configuration in `env.config.ts`
- Test individual protocols by commenting out others in the script 