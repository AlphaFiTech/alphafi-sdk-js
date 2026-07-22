/**
 * Smoke test for the server-built transaction paths (autocompound + rebalance).
 *
 * Builds transactions through the SDK's alphafi-api client and dry-runs them
 * against mainnet — no keys required, nothing executes.
 *
 * Usage:
 *   SENDER=0x... POOL_ID=0x... npx tsx scripts/serverTxSmoke.ts
 *
 * Optional:
 *   ALPHAFI_API_BASE_URL=http://localhost:8090   (default: SDK prod default)
 *   POOL_NAME=BLUEFIN-BLUE-SUI LOWER_TICK=-10000 UPPER_TICK=10000
 *     (adds the rebalance leg; SENDER must own the RebalanceCap)
 */
import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { AlphaFiSDK } from '../src/index.js';
import { getManualRebalanceUsingTicksTxb } from '../src/admin/index.js';
import { StrategyContext } from '../src/models/strategyContext.js';

dotenv.config();

async function main() {
  const sender = process.env.SENDER;
  const poolId = process.env.POOL_ID;
  if (!sender || !poolId) {
    throw new Error('env vars SENDER and POOL_ID are required');
  }
  const apiBaseUrl = process.env.ALPHAFI_API_BASE_URL || undefined;

  // Use the SDK's own client so the Transaction and the resolver come from the
  // same @mysten/sui copy (scripts/ has its own nested install of a different
  // version, which cannot build src-created transactions).
  const context = new StrategyContext('mainnet', undefined, apiBaseUrl);
  const suiClient = context.blockchain.pythSuiClient;

  async function dryRun(label: string, tx: Transaction) {
    tx.setSender(sender as string);
    const bytes = await tx.build({ client: suiClient });
    const res = await suiClient.dryRunTransactionBlock({ transactionBlock: bytes });
    console.log(`${label} -> ${res.effects.status.status}`, res.effects.status.error ?? '');
    if (res.effects.status.status !== 'success') {
      process.exitCode = 1;
    }
  }

  const sdk = new AlphaFiSDK({ network: 'mainnet', apiBaseUrl });
  await dryRun('autocompound', await sdk.autocompound({ poolId }));

  const { POOL_NAME, LOWER_TICK, UPPER_TICK } = process.env;
  if (POOL_NAME && LOWER_TICK && UPPER_TICK) {
    const tx = await getManualRebalanceUsingTicksTxb(
      POOL_NAME,
      sender,
      LOWER_TICK,
      UPPER_TICK,
      10,
      context,
      true,
      false,
    );
    if (!tx) throw new Error(`pool ${POOL_NAME} is not rebalanceable`);
    await dryRun('rebalance', tx);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
