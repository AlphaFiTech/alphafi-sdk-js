# AlphaFi SDK for JavaScript

A comprehensive TypeScript/JavaScript SDK for interacting with the AlphaFi DeFi
platform on Sui blockchain. This SDK provides seamless integration with
multiple DeFi protocols including Bluefin, Navi, Cetus, Bucket, and AlphaLend.

## Features

- **Multi-Protocol Support**: Bluefin, Navi, Cetus, Bucket, AlphaLend, and AlphaFi protocols
- **Transaction Management**: Unified interface for deposits, withdrawals, and reward claims
- **Pool Management**: Support for single-asset and double-asset pools
- **Strategy Support**: Regular pools, looping strategies, and autobalance pools
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Dual Module Support**: Both CommonJS and ESM builds available

## Installation

```bash
npm install @alphafi/alphafi-sdk
```

## Quick Start

```typescript
import { AlphaFiSDK } from '@alphafi/alphafi-sdk';
import { SuiClient } from '@mysten/sui/client';

// Initialize the SDK
const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
const sdk = new AlphaFiSDK({
  client,
  network: 'mainnet',
  address: 'your_sui_address_here',
});

// Deposit into a pool
const depositTx = await sdk.deposit({
  poolId: '45', // Pool ID as string
  amount: 1000000n, // Amount in smallest unit (1 SUI = 1000000000n)
  isAmountA: true, // For double-asset pools
});

// Withdraw from a pool
const withdrawTx = await sdk.withdraw({
  poolId: '45',
  xTokens: 500000n, // Amount of xTokens to withdraw
});

// Claim rewards
const claimTx = await sdk.claim({
  poolId: 1, // Optional: specific pool ID, omit for all pools
});
```

> **Note**: The SDK uses `bigint` for amount and xTokens parameters to ensure
> precision with large numbers. Use the `n` suffix to create bigint literals
> (e.g., `1000000n`).

## Supported Protocols

### Bluefin Protocol

- **Pool Types**: SUI-USDC, USDT-USDC, STSUI-SUI, and more
- **Strategies**: Regular liquidity pools, autobalance pools, fungible pools
- **Special Features**: Support for different tick ranges (175, zero-zero)

### Navi Protocol

- **Pool Types**: Single-asset pools (SUI, USDC, USDT, etc.)
- **Strategies**: Regular lending, looping strategies
- **Special Features**: Support for NAVI-LOOP pools with supply/borrow mechanics

### Cetus Protocol

- **Pool Types**: CETUS-SUI, ALPHA-SUI, and other trading pairs
- **Strategies**: Concentrated liquidity with tick-based ranges
- **Special Features**: Support for different pool configurations

### Bucket Protocol

- **Pool Types**: BUCK token pools
- **Strategies**: Single-asset staking
- **Special Features**: Simple deposit/withdraw mechanics

### AlphaLend Protocol

- **Pool Types**: SUI-STSUI looping, single-loop pools (TBTC, SUIBTC, XAUM)
- **Strategies**: Looping strategies, single-asset looping
- **Special Features**: Advanced lending strategies with leverage

## API Reference

### AlphaFiSDK Class

#### Constructor

```typescript
new AlphaFiSDK(config: AlphaFiSDKConfig)
```

#### Configuration Interface

```typescript
interface AlphaFiSDKConfig {
  client: SuiClient;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  address: string;
}
```

#### Methods

##### deposit(options: DepositOptions): Promise\<Transaction>

Deposit assets into a DeFi pool.

```typescript
interface DepositOptions {
  poolId: string; // Pool ID as string
  amount: bigint; // Amount in smallest unit
  isAmountA?: boolean; // For double-asset pools (optional)
}
```

##### withdraw(options: WithdrawOptions): Promise\<Transaction>

Withdraw assets from a DeFi pool.

```typescript
interface WithdrawOptions {
  poolId: string; // Pool ID as string
  xTokens: bigint; // Amount of xTokens to withdraw
}
```

##### claim(options: ClaimOptions): Promise\<Transaction>

Claim rewards from DeFi pools.

```typescript
interface ClaimOptions {
  poolId?: number; // Optional: specific pool ID
}
```

## Pool Information

The SDK supports **81+ pools** across multiple protocols:

### Pool Types by Strategy

- **Single-Asset Pools**: NAVI-SUI, NAVI-USDC, BUCKET-BUCK
- **Double-Asset Pools**: BLUEFIN-SUI-USDC, CETUS-SUI, etc.
- **Looping Pools**: NAVI-LOOP-SUI-VSUI, ALPHALEND-LOOP-SUI-STSUI
- **Autobalance Pools**: BLUEFIN-AUTOBALANCE-SUI-USDC
- **Single-Loop Pools**: ALPHALEND-SINGLE-LOOP-TBTC, ALPHALEND-SINGLE-LOOP-SUIBTC

### Pool ID Format

- Pool IDs are **strings** (not numbers)
- Use `poolDetailsMap` to look up pool information
- Pool names follow the pattern: `PROTOCOL-ASSET1-ASSET2`

## Environment Configuration

Create a `.env` file in your project root:

```bash
# Network Configuration
NETWORK=mainnet              # Options: mainnet, testnet, devnet, localnet

# Private Key (Base64 encoded)
PK_B64=your_base64_private_key_here

# Testing Configuration
DRY_RUN=true                 # Set to false for real transactions
VERBOSE_LOGGING=true         # Enable detailed logging
SKIP_BALANCE_CHECK=false     # Skip balance verification before transactions

# Test Pool IDs (as strings)
TEST_BLUEFIN_POOL_ID=45      # Bluefin protocol pool ID
TEST_NAVI_POOL_ID=2          # Navi protocol pool ID
TEST_CETUS_POOL_ID=3         # Cetus protocol pool ID

# Test Deposit Amounts
TEST_DEPOSIT_AMOUNT_SUI=1000000n    # 1 SUI
TEST_DEPOSIT_AMOUNT_USDC=1000000n   # 1 USDC
TEST_DEPOSIT_AMOUNT_USDT=1000000n   # 1 USDT

# Withdraw Testing
TEST_WITHDRAW_XTOKENS=1000000n      # Amount of xTokens to withdraw
TEST_WITHDRAW_PERCENTAGE=50        # Percentage of balance to withdraw (50%)
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the SDK (both CommonJS and ESM)
npm run build

# Run tests
npm test

# Run specific test suites
npm run test:deposits
npm run test:withdraws

# Generate documentation
npm run docs

# Lint and format
npm run lint
npm run format
```

### Build Outputs

The SDK builds to two formats:

- **CommonJS**: `dist/cjs/` - For Node.js and bundlers
- **ESM**: `dist/esm/` - For modern JavaScript environments

### Project Structure

```text
src/
├── core/                    # Core SDK functionality
│   └── index.ts            # Main SDK class and interfaces
├── models/                  # TypeScript interfaces and classes
│   ├── blockchain.ts       # Blockchain interaction layer
│   ├── transaction.ts      # Transaction management
│   ├── portfolio.ts        # Portfolio management
│   ├── protocol.ts         # Protocol-specific logic
│   └── transactionProtocolModels/  # Protocol-specific transactions
│       ├── bluefin.ts      # Bluefin protocol transactions
│       ├── navi.ts         # Navi protocol transactions
│       ├── cetus.ts        # Cetus protocol transactions
│       ├── bucket.ts       # Bucket protocol transactions
│       ├── alphalend.ts    # AlphaLend protocol transactions
│       ├── claimRewards.ts # Reward claiming transactions
│       └── utils.ts        # Transaction utilities
├── common/                 # Common utilities and configuration
│   ├── constants.ts       # Configuration constants
│   ├── maps.ts           # Pool details and mappings
│   └── coinsList.ts      # Supported tokens
├── utils/                 # Utility functions
│   ├── parsedTypes.ts     # TypeScript type definitions
│   ├── parser.ts         # Data parsing utilities
│   └── queryTypes.ts     # Query type definitions
└── __tests__/            # Test files
```

## Dependencies

### Peer Dependencies

- `@mysten/sui`: Sui blockchain SDK (>=1.30.0 <2)
- `@alphafi/stsui-sdk`: STSUI token SDK
- `navi-sdk`: Navi protocol SDK

### Main Dependencies

- `@cetusprotocol/cetus-sui-clmm-sdk`: Cetus protocol SDK
- `@alphafi/alphalend-sdk`: AlphaLend protocol SDK
- `decimal.js`: High-precision decimal arithmetic
- `bn.js`: Big number operations
- `bech32`: Address encoding/decoding

## Examples

### Basic Deposit Example

```typescript
import { AlphaFiSDK } from '@alphafi/alphafi-sdk';
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
const sdk = new AlphaFiSDK({
  client,
  network: 'mainnet',
  address: '0x123...', // Your Sui address
});

// Deposit 1 SUI into Bluefin SUI-USDC pool
const tx = await sdk.deposit({
  poolId: '45', // Bluefin SUI-USDC pool
  amount: 1000000000n, // 1 SUI in smallest unit
  isAmountA: true, // SUI is the first asset in the pair
});

console.log('Transaction created:', tx);
```

### Withdraw Example

```typescript
// Withdraw 50% of your position
const withdrawTx = await sdk.withdraw({
  poolId: '45',
  xTokens: 500000n, // Amount of xTokens to withdraw
});
```

### Claim Rewards Example

```typescript
// Claim rewards from all pools
const claimTx = await sdk.claim({});

// Or claim from a specific pool
const specificClaimTx = await sdk.claim({
  poolId: 1, // AlphaFi pool
});
```

## Security Notes

- **Never commit your `.env` file** to version control
- **Use environment variables** for sensitive data like private keys
- **Always test with `DRY_RUN=true`** before executing real transactions
- **Use testnet for development** and testing
- **Verify pool IDs** before executing transactions
- **Check gas estimates** before submitting transactions

## License

ISC

## Support

For issues, questions, or contributions, please refer to the project repository or contact the AlphaFi team.
