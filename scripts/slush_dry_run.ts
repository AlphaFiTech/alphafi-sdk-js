/**
 * Dry-run all slush pool deposit & withdraw PTBs using AlphaFiSDK.
 *
 * Iterates every SlushLending and SlushSingleAssetLooping pool, builds
 * deposit and withdraw transactions, and dry-runs them against mainnet
 * via the Sui GraphQL `simulateTransaction` API. No transactions are signed
 * or submitted.
 *
 * Outputs a JSON array to stdout so that the calling process (e.g. the
 * Rust binary `slush_sdk_js_regression` in alphafi-crons) can parse
 * pass/fail results without screen-scraping.
 *
 * Required env vars:
 *   SLUSH_REGRESSION_USER_ADDRESS  — sender wallet (needs coin balances for deposit dry-runs)
 *
 * Optional env vars:
 *   SUI_GRAPHQL_URL                — defaults to mainnet
 */

import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { AlphaFiSDK } from '../src/index.js';
import { Blockchain } from '../src/models/blockchain.js';

dotenv.config();

type DryRunResult = {
  poolName: string;
  poolId: string;
  operation: string;
  status: 'ok' | 'fail';
  error?: string;
};

// Depositing 1 base unit can round to a 0-value collateral coin after the
// slush pool's internal swap/loop math, which trips the pool's
// `ErrInvalidCollateralAmount` assertion on an otherwise healthy pool.
// 1,000,000 base units is large enough to survive that rounding while
// staying a trivially small real-money amount on the monitoring wallet.
const DEPOSIT_AMOUNT = 1_000_000n;

async function dryRunTx(tx: Transaction, blockchain: Blockchain, address: string): Promise<void> {
  tx.setSenderIfNotSet(address);
  const { effects } = await blockchain.simulateTransaction(tx, address);
  if (!effects?.status.success) {
    throw new Error(JSON.stringify(effects?.status.error) ?? 'unknown dry-run failure');
  }
}

async function hasCoinBalance(
  blockchain: Blockchain,
  address: string,
  coinType: string,
  minAmount: bigint,
): Promise<boolean> {
  const balances = await blockchain.getAllBalances(address);
  return balances.some((b) => b.coinType === coinType && BigInt(b.totalBalance) >= minAmount);
}

async function main() {
  const address = process.env.SLUSH_REGRESSION_USER_ADDRESS;
  if (!address) {
    throw new Error('SLUSH_REGRESSION_USER_ADDRESS env var must be set');
  }

  const graphqlUrl = process.env.SUI_GRAPHQL_URL;
  const sdk = new AlphaFiSDK({ network: 'mainnet', graphqlUrl });
  const blockchain = new Blockchain({ network: 'mainnet', graphqlUrl });

  const poolsData = await sdk.getPoolsData(['SlushSingleAssetLooping', 'SlushLending']);

  const results: DryRunResult[] = [];

  for (const [poolId, pool] of poolsData) {
    // ── Deposit dry-run ──────────────────────────────────────────────────────
    const hasCoins = await hasCoinBalance(blockchain, address, pool.coinType, DEPOSIT_AMOUNT);
    if (hasCoins) {
      try {
        const tx = await sdk.deposit({
          poolId,
          amount: DEPOSIT_AMOUNT,
          address,
          isAmountA: true,
        });
        await dryRunTx(tx, blockchain, address);
        results.push({ poolName: pool.poolName, poolId, operation: 'deposit', status: 'ok' });
      } catch (e) {
        results.push({
          poolName: pool.poolName,
          poolId,
          operation: 'deposit',
          status: 'fail',
          error: String(e),
        });
      }
    } else {
      process.stderr.write(
        `SKIP ${pool.poolName} deposit: ${pool.coinType} balance below ${DEPOSIT_AMOUNT}\n`,
      );
    }

    // ── Withdraw dry-run ─────────────────────────────────────────────────────
    try {
      const balance = await sdk.getUserSinglePoolBalance(address, poolId);
      const tokenAmount =
        balance && 'tokenAmount' in balance ? Number(balance.tokenAmount) : 0;

      if (tokenAmount > 0) {
        const tx = await sdk.withdraw({
          poolId,
          amount: '0',
          withdrawMax: true,
          isAmountA: true,
          address,
        });
        await dryRunTx(tx, blockchain, address);
        results.push({ poolName: pool.poolName, poolId, operation: 'withdraw', status: 'ok' });
      } else {
        process.stderr.write(`SKIP ${pool.poolName} withdraw: no position\n`);
      }
    } catch (e) {
      results.push({
        poolName: pool.poolName,
        poolId,
        operation: 'withdraw',
        status: 'fail',
        error: String(e),
      });
    }
  }

  process.stdout.write(JSON.stringify(results) + '\n');

  const failCount = results.filter((r) => r.status === 'fail').length;
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
