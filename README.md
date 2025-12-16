# AlphaFi SDK for JavaScript

A comprehensive TypeScript/JavaScript SDK for interacting with the AlphaFi DeFi platform on Sui blockchain.
This SDK provides seamless integration with multiple DeFi protocols and strategies including lending,
LP farming, leveraged yield farming, and more.

## Features

- **Multi-Protocol Support**: Bluefin, Navi, Cetus, Bucket, AlphaLend, and AlphaFi protocols
- **Complete DeFi Suite**: Deposits, withdrawals, swaps, portfolio management, and reward claims
- **Advanced Strategies**: Lending, LP farming, leveraged yield farming (LYF), looping, and Alpha vaults
- **Portfolio Management**: Real-time portfolio tracking with aggregated metrics and alpha rewards
- **Token Swaps**: Integrated Cetus aggregator for optimal token routing
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Options-Based API**: Consistent, easy-to-use interface across all methods

## Installation

```bash
npm install @alphafi/alphafi-sdk
```

## Quick Start

```typescript
import { AlphaFiSDK } from '@alphafi/alphafi-sdk';
import { SuiClient } from '@mysten/sui/client';

// Initialize the SDK
const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
const sdk = new AlphaFiSDK({
  suiClient,
  network: 'mainnet',
});

const userAddress = 'your_sui_address_here';

// Get all available pools
const pools = await sdk.getPoolsData();
console.log('Available pools:', pools);

// Get user portfolio
const portfolio = await sdk.getUserPortfolio(userAddress);
console.log('Portfolio:', {
  netWorth: portfolio.netWorth.toString(),
  aggregatedApy: portfolio.aggregatedApy.toString(),
  alphaRewards: portfolio.alphaRewardsToClaim.toString(),
});

// Deposit into a pool
const depositTx = await sdk.deposit({
  poolId: '0x...', // Pool ID
  address: userAddress,
  amount: 1000000000n, // 1 SUI in base units
  isAmountA: true, // For LP pools: which token this amount represents
});

// Withdraw from a pool
const withdrawTx = await sdk.withdraw({
  poolId: '0x...',
  address: userAddress,
  amount: '500000000', // Amount to withdraw
  withdrawMax: false, // Set to true to withdraw entire position
});

// Claim all rewards
const claimTx = await sdk.claim({
  address: userAddress,
});
```

> **Note**: The SDK uses `bigint` for deposit amounts to ensure precision with large numbers.
> Use the `n` suffix to create bigint literals (e.g., `1000000000n` for 1 SUI).
> Withdrawal amounts use strings for flexibility. All monetary values in responses are Decimal objects
> for precise arithmetic.

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
  suiClient: SuiClient; // Sui blockchain client
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}
```

#### Core Methods

##### getPoolsData(strategiesType?: StrategyType[]): Promise\<Map\<string, PoolData>>

Get comprehensive data for all available DeFi pools.

```typescript
const pools = await sdk.getPoolsData(['Lending', 'Lp']); // Filter by strategy types
const allPools = await sdk.getPoolsData(); // Get all pools
```

##### getUserPortfolio(address: string, strategiesType?: StrategyType[]): Promise\<UserPortfolioData>

Get complete portfolio summary for a user address.

```typescript
const portfolio = await sdk.getUserPortfolio(userAddress);
console.log({
  netWorth: portfolio.netWorth.toString(),
  aggregatedApy: portfolio.aggregatedApy.toString(),
  alphaRewards: portfolio.alphaRewardsToClaim.toString(),
  poolBalances: portfolio.poolBalances,
});
```

#### Transaction Methods

##### deposit(options: DepositOptions): Promise\<Transaction>

Deposit assets into a DeFi pool to start earning yield.

```typescript
interface DepositOptions {
  poolId: string; // Unique pool identifier
  address: string; // User's wallet address
  amount: bigint; // Amount in base units
  isAmountA?: boolean; // For LP pools: which token this amount represents
}
```

##### withdraw(options: WithdrawOptions): Promise\<Transaction>

Withdraw assets from a DeFi pool.

```typescript
interface WithdrawOptions {
  poolId: string; // Unique pool identifier
  address: string; // User's wallet address
  amount: string; // Amount to withdraw (ignored if withdrawMax is true)
  isAmountA?: boolean; // For LP pools: specify withdrawal in terms of token A
  withdrawMax: boolean; // If true, withdraw entire position
}
```

##### estimateLpAmounts(options: EstimateLpAmountsOptions): Promise\<[string, string]>

Calculate required token amounts for balanced LP deposits.

```typescript
interface EstimateLpAmountsOptions {
  poolId: string; // LP pool identifier
  amount: string; // Input token amount
  isAmountA: boolean; // True if amount refers to token A
}
```

##### claim(options: ClaimOptions): Promise\<Transaction>

Claim accumulated rewards from all pools.

```typescript
interface ClaimOptions {
  address: string; // User's wallet address
  poolId?: string; // Optional: specific pool ID
}
```

#### Alpha Token Methods

##### initiateWithdrawAlpha(options: WithdrawOptions): Promise\<Transaction>

Initiate ALPHA token withdrawal (creates withdrawal ticket).

##### claimWithdrawAlpha(options: ClaimWithdrawAlphaOptions): Promise\<Transaction>

Complete ALPHA token withdrawal using previously created ticket.

```typescript
interface ClaimWithdrawAlphaOptions {
  ticketId: string; // Withdrawal ticket ID
  address: string; // User's wallet address
}
```

##### claimAirdrop(options: ClaimAirdropOptions): Promise\<Transaction>

Claim available airdrop tokens.

```typescript
interface ClaimAirdropOptions {
  address: string; // User's wallet address
  transferToWallet: boolean; // Whether to transfer directly to wallet
}
```

#### Zap Deposit Methods

##### zapDepositQuote(options: ZapDepositQuoteOptions): Promise\<[string, string] | undefined>

Get quote for zap deposit operation (single token to LP).

```typescript
interface ZapDepositQuoteOptions {
  poolId: string; // LP pool identifier
  inputCoinAmount: bigint; // Input token amount in base units
  isInputA: boolean; // True if input token is token A
  slippage: number; // Max slippage (e.g., 0.005 = 0.5%)
}
```

##### zapDeposit(options: ZapDepositOptions): Promise\<Transaction | undefined>

Execute zap deposit: convert single token to balanced LP position.

```typescript
interface ZapDepositOptions {
  poolId: string; // LP pool identifier
  inputCoinAmount: bigint; // Input token amount in base units
  isInputA: boolean; // True if input token is token A
  address: string; // User's wallet address
  slippage: number; // Max slippage (e.g., 0.005 = 0.5%)
}
```

#### Token Swap Methods

##### getCetusSwapQuote(options: CetusSwapQuoteOptions): Promise\<RouterDataV3 | undefined>

Get quote for token swap via Cetus aggregator.

```typescript
interface CetusSwapQuoteOptions {
  from: string; // Source token type/address
  target: string; // Destination token type/address
  amount: string; // Amount to swap in source token units
  byAmountIn: boolean; // True to fix input amount, false to fix output
}
```

##### cetusSwapTxb(options: CetusSwapOptions): Promise\<Transaction>

Execute token swap using Cetus aggregator.

```typescript
interface CetusSwapOptions {
  router: RouterDataV3; // Router data from getCetusSwapQuote
  slippage: number; // Max slippage (e.g., 0.01 = 1%)
}
```

## Supported Strategies

The SDK supports multiple DeFi strategies across various protocols:

### Strategy Types

- **Lending**: Single-asset yield farming on protocols like Navi and Bucket
- **Lp**: Liquidity provision on AMMs like Cetus and Bluefin
- **Lyf** (Leveraged Yield Farming): Amplified returns with borrowed capital
- **AutobalanceLp**: Self-rebalancing liquidity positions
- **AlphaVault**: Optimized staking for ALPHA tokens
- **Looping**: Leveraged single-asset positions with recursive borrowing
- **SingleAssetLooping**: Single-token leverage strategies
- **FungibleLp**: Fungible liquidity tokens for easy transfer
- **SlushLending**: Slush protocol lending integration

### Pool Discovery

Use the SDK methods to discover available pools:

```typescript
// Get all pools
const allPools = await sdk.getPoolsData();

// Filter by strategy type
const lendingPools = await sdk.getPoolsData(['Lending']);
const lpPools = await sdk.getPoolsData(['Lp', 'AutobalanceLp']);

// Explore pool details
for (const [poolId, poolData] of allPools) {
  console.log(`${poolData.name} (${poolData.strategyType}):`, {
    apy: `${poolData.apr.apy}%`,
    tvl: `$${poolData.tvl}`,
    assets: poolData.assets.map((asset) => asset.symbol),
  });
}
```

### SDK Initialization

```typescript
import { AlphaFiSDK } from '@alphafi/alphafi-sdk';
import { SuiClient } from '@mysten/sui/client';

const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
});

const sdk = new AlphaFiSDK({
  suiClient,
  network: (process.env.NETWORK as any) || 'mainnet',
});

const userAddress = process.env.USER_ADDRESS;
```

## Data Types

### Key Response Types

```typescript
// Pool data structure
interface PoolData {
  poolId: string;
  name: string;
  strategyType: StrategyType;
  apr: { apy: Decimal };
  tvl: Decimal;
  assets: Array<{
    symbol: string;
    type: string;
    decimals: number;
  }>;
  // ... additional fields
}

// Portfolio data structure
interface UserPortfolioData {
  netWorth: Decimal; // Total USD value
  aggregatedApy: Decimal; // Weighted average APY
  alphaRewardsToClaim: Decimal; // Claimable ALPHA rewards
  poolBalances: Map<string, PoolBalance>; // Individual pool balances
}

// Strategy types
type StrategyType =
  | 'Lending'
  | 'Lp'
  | 'Lyf'
  | 'AutobalanceLp'
  | 'AlphaVault'
  | 'Looping'
  | 'SingleAssetLooping'
  | 'FungibleLp'
  | 'SlushLending';
```

### Security Guidelines

- **Never commit your `.env` file** to version control
- **Store private keys securely** and never expose them in client-side code
- **Use environment variables** for sensitive configuration
- **Always test on testnet first** before mainnet deployment
- **Verify pool IDs and amounts** before executing transactions
- **Check transaction gas estimates** before submission
- **Implement proper error handling** for all SDK calls
- **Use appropriate slippage settings** for swaps (typically 0.5-2%)

## Support

For issues, questions, or contributions, please refer to the project repository or contact the AlphaFi team.
