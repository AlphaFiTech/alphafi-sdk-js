# Admin Module — `alphafi-sdk-js/src/admin/`

This module contains all administration functions previously spread across
`alphafi-sdk/src/adminFunctions.ts` and `sui-alpha-sdk/src/crons/`. It is
exposed as a subpath export (`@alphafi/alphafi-sdk/admin`) so consumer code
never needs to import from the legacy packages.

---

## Why this module exists

`alphafi-admin` (the React UI) used to import admin helpers directly from
`alphafi-sdk` and `sui-alpha-sdk`. This created a hard coupling to those legacy
packages which included large unused dependencies and prevented the UI from
working with the unified `alphafi-sdk-js` alone.

The migration goal was:

- Zero legacy SDK imports in `alphafi-admin`.
- All admin helpers live under one well-typed subpath.
- All I/O goes through `StrategyContext` (GraphQL + JSON-RPC on `context.blockchain`), not globals.

---

## File overview

| File | What it contains |
|---|---|
| `tickPrice.ts` | Tick ↔ price math for LP pool CLMM positions |
| `patrol.ts` | Pool patrol — detect out-of-range LP positions |
| `rebalanceCap.ts` | Look up the `RebalanceCap` object for a wallet |
| `alphaVault.ts` | Alpha Ember vault admin operations |
| `slushAdmin.ts` | Slush WAL locked-loop pool admin operations |
| `autocompound.ts` | Autocompound transaction builder (all strategy types) |
| `rebalance.ts` | Manual rebalance transaction builder (LP + LYF) |
| `index.ts` | Barrel — re-exports everything above |

---

## Core pattern

Every function follows the same three rules:

1. **Dependency injection** — `StrategyContext` is the primary dependency. On-chain reads use
   `context.blockchain` (GraphQL for bulk objects, `txBuildClient` for JSON-RPC when needed).
   There are no global `getSuiClient()` or `poolInfo` lookups.
2. **Caller-owned transactions** — functions that build PTBs accept an existing
   `Transaction` and mutate it. They do not create or return a transaction.
   The UI creates the `tx`, passes it to the SDK function, then calls
   `signAndExecuteTransaction`.
3. **Private helpers use `_` prefix** — `_autocompoundLp`, `_rebalanceLp`, etc.
   are module-private implementation details. Only the public dispatchers are
   exported.

---

## Public API

### `tickPrice.ts`

```ts
// Get the current CLMM tick for a pool's parent pool (GraphQL).
getCurrentTick(poolName: string, context: StrategyContext): Promise<number>

// Get the position's [lower, upper] tick indexes from the investor object (GraphQL).
getPositionTicks(poolName: string, context: StrategyContext): Promise<[number, number]>

// Convert a tick index to a human-readable price string.
// Call context.getCoinDecimals(coinType) to obtain the decimals beforehand.
getTickToPrice(tick: number, coinADecimals: number, coinBDecimals: number): string

// Convert a price string to the nearest valid tick, snapped to tickSpacing.
getPriceToTick(price: string, tickSpacing: number, coinADecimals: number, coinBDecimals: number, isUpper?: boolean): number

// Get the CLMM tick spacing for a pool (Cetus or Bluefin; GraphQL).
getTickSpacing(poolName: string, context: StrategyContext): Promise<number>
```

**Migration difference:** The old signatures were `(poolName, tick)` /
`(poolName, price, tickSpacing)`. Coin decimals were resolved internally from a
static `coinsList` map. The new signatures accept pre-fetched decimals so that
callers control when/how they are loaded (typically via `context.getCoinDecimals()`).

---

### `patrol.ts`

```ts
// Return a Map<poolName, currentPrice> for all active LP pools (GraphQL).
getCurrentPoolPrice(context: StrategyContext): Promise<Map<string, string>>

// Return pool names whose current CLMM price is outside the position range (GraphQL).
poolPatrol(context: StrategyContext): Promise<string[]>
```

**Migration difference:** Old `poolPatrol` read a pre-warmed in-memory cache via
`getMultiCetusPool` / `getMultiParentPool`. New version fetches live from chain in
`Promise.all` (parallel) and filters via `label.isActive` instead of `poolInfo[p].retired`.

---

### `rebalanceCap.ts`

```ts
// Find and return the RebalanceCap objectId owned by `address`.
// Uses JSON-RPC via context.blockchain.txBuildClient. Throws if no cap is found.
getRebalanceCap(address: string, context: StrategyContext): Promise<string>
```

---

### `alphaVault.ts`

```ts
// Read current unsupplied balance + pending withdraw requests.
getWithdrawRequestsAndUnsuppliedAmount(context: StrategyContext): Promise<WithdrawRequestsAndUnsuppliedAmount>

// Append a process_withdraw_requests_manual Move call to `tx`.
processWithdrawRequestsManualTxb(tx: Transaction, amount: string, address: string, context: StrategyContext): Promise<void>

// Append a collect_unsupplied_balance Move call to `tx`.
collectUnsuppliedBalanceTxb(tx: Transaction, label: AlphaVaultPoolLabel): void
// Convenience wrapper (resolves label automatically):
collectUnsuppliedBalance(tx: Transaction, context: StrategyContext): Promise<void>

// Append an add_airdrop_coin Move call to `tx`.
addAirdropCoinTxb(tx: Transaction, amount: string, address: string, context: StrategyContext): Promise<void>
```

**Migration difference:** Old functions created a new `Transaction` internally and
returned it. New functions accept and mutate a caller-supplied `Transaction`. The UI
creates the `tx`, calls the SDK function, and then signs it.

---

### `slushAdmin.ts`

```ts
// Read the current external rewards config from the WAL locked-loop pool.
// Returns null when no rewards are configured yet.
getWalLockedRewardInfo(context: StrategyContext): Promise<WalLockedRewardInfo | null>

// Append an add_external_rewards Move call to `tx`.
addExternalRewardsWalLockedTxb(
  tx: Transaction,
  address: string,
  amount: bigint,
  startTimeMs: number,
  endTimeMs: number,
  context: StrategyContext,
): Promise<void>
```

---

### `autocompound.ts`

```ts
// Build an autocompound transaction for a single pool.
// Returns undefined if pool not found.
getAutoCompoundSingleTxb(
  poolName: string,
  context: StrategyContext,
  tx?: Transaction,
): Promise<Transaction | undefined>
```

**How it works:**

1. Looks up the pool by name from the strategy context
2. Instantiates the appropriate strategy class
3. Calls `strategy.updatePool(tx)` which handles:
   - Price oracle updates (if needed)
   - Reward collection and swapping
   - Pool-specific autocompound Move calls

**Strategy implementations:**

| Strategy type | Implementation |
|---|---|
| `AlphaVault` | No-op (returns empty transaction) |
| `Lp` | Bluefin, Cetus, Bucket LP pools |
| `AutobalanceLp` | Bluefin autobalance pools |
| `FungibleLp` | Bluefin fungible LP pools |
| `Lyf` | Leverage yield farming pools |
| `Lending` | NAVI single-asset lending pools |
| `Looping` | NAVI looping pools |
| `SingleAssetLooping` | AlphaLend single-asset loops |
| `SlushLending` | AlphaLend Slush lending pools |
| `SlushSingleAssetLooping` | AlphaLend Slush looping pools |
| `FungibleLending` | No-op (returns empty transaction) |

**Example usage:**

```ts
import { getAutoCompoundSingleTxb } from '@alphafi/alphafi-sdk/admin';
import { StrategyContext } from '@alphafi/alphafi-sdk';
import { Transaction } from '@mysten/sui/transactions';
import { useMemo } from 'react';

const context = useMemo(() => new StrategyContext('mainnet'), []);

const tx = await getAutoCompoundSingleTxb(poolName, context);
if (tx) signAndExecuteTransaction({ transaction: tx });
```

---

### `rebalance.ts`

```ts
// Build a manual rebalance transaction for a single LP or LYF pool.
// Returns undefined for non-rebalanceable strategy types.
getManualRebalanceUsingTicksTxb(
  poolName: string,
  rebalanceCap: string,
  lowerTick: string,
  upperTick: string,
  context: StrategyContext,
  loops?: number,            // default 15; old SDK auto-computed from TVL
  swap_using_bluefin?: boolean,
  rebalance_using_base_pool?: boolean,
): Promise<Transaction | undefined>
```

**Migration difference:** Old signature computed `loops` from an internal TVL fetch.
New signature accepts it as an optional parameter (default 15). The admin UI can pass
the TVL-derived value or accept the default.

---

## Usage example (UI component pattern)

```ts
import { StrategyContext } from '@alphafi/alphafi-sdk';
import { getAutoCompoundSingleTxb } from '@alphafi/alphafi-sdk/admin';
import { Transaction } from '@mysten/sui/transactions';
import { useMemo } from 'react';

const context = useMemo(() => new StrategyContext('mainnet'), []);

// Autocompound
const tx = await getAutoCompoundSingleTxb(poolName, context);
if (tx) signAndExecuteTransaction({ transaction: tx });

// Alpha Vault withdraw
const tx = new Transaction();
await processWithdrawRequestsManualTxb(tx, amount, address, context);
signAndExecuteTransaction({ transaction: tx });
```

---

## Constants used

New constants added to `src/utils/constants.ts` under the `ADMIN` block:

| Constant | Description |
|---|---|
| `ADMIN.ALPHA_FIRST_PACKAGE_ID` | First-ever AlphaFi package (for RebalanceCap type) |
| `ADMIN.ALPHA_SLUSH_FIRST_PACKAGE_ID` | First Slush package (for AdminCap filter) |
| `ADMIN.ALPHA_SLUSH_LATEST_PACKAGE_ID` | Current Slush package for Move calls |
| `ADMIN.ALPHA_SLUSH_VERSION` | Slush version object ID |
| `ADMIN.ALPHA_SLUSH_WAL_LOOP_POOL_ID` | WAL locked-loop pool object ID |
| `ADMIN.BLUEFIN_SUI_USDC_175_POOL` | Bluefin SUI-USDC 1.75% pool (autocompound swap route) |
| `ADMIN.BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND` | Bluefin BLUE-SUI pool for autocompound |
| `ADMIN.BLUEFIN_ALPHA_STSUI_POOL` | Bluefin ALPHA-stSUI pool |
| `ADMIN.BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL` | Bluefin stSUI-SUI 0.00% pool |
| `ADMIN.BLUEFIN_LBTC_SUIBTC_POOL` | Bluefin LBTC-SUIBTC pool |
| `ADMIN.BLUEFIN_SUIBTC_USDC_POOL` | Bluefin SUIBTC-USDC pool |

---

## Future work

- Add Cetus LP pool autocompound branches (`WUSDC-WBTC`, `USDC-USDT`, `USDC-WUSDC`,
  `HASUI-SUI`, `USDC-ETH`) to `_autocompoundLp`.
- Consider passing TVL-derived `loops` from the Rebalance UI instead of relying on
  the default of 15.
