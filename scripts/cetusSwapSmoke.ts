/**
 * Smoke test for the Cetus aggregator swap path.
 *
 * Quotes a real mainnet route, reports which aggregator package the router API
 * is serving, then builds the swap PTB and simulates it. No keys, nothing
 * executes. Run it before and after an aggregator-sdk bump.
 *
 * Usage:
 *   SENDER=0x... npx tsx scripts/cetusSwapSmoke.ts
 *
 * Optional:
 *   FROM=0x2::sui::SUI TARGET=0x...::usdc::USDC AMOUNT=1000000000 SLIPPAGE=0.01
 */
import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { StrategyContext } from '../src/models/strategyContext.js';
import { CetusSwap } from '../src/models/swap.js';

dotenv.config();

const SUI = '0x2::sui::SUI';
const USDC = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

/** Aggregator v3 package shipped with @cetusprotocol/aggregator-sdk 1.7.3. */
const EXPECTED_AGGREGATOR_V3 = '0xffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9';

/** The gql core simulate and the JSON-RPC dry run report status differently. */
function readStatus(status: any): { success: boolean; error?: string } {
  if (!status) return { success: false, error: 'no status in effects' };
  const error = typeof status.error === 'string' ? status.error : JSON.stringify(status.error);
  if (typeof status.success === 'boolean') return { success: status.success, error };
  return { success: status.status === 'success', error };
}

async function main() {
  const sender = process.env.SENDER;
  if (!sender) {
    throw new Error('env var SENDER is required (a mainnet address holding the input coin)');
  }
  const from = process.env.FROM ?? SUI;
  const target = process.env.TARGET ?? USDC;
  const amount = process.env.AMOUNT ?? '1000000000';
  const slippage = Number(process.env.SLIPPAGE ?? '0.01');

  const swap = new CetusSwap('mainnet');

  // ── Quote ──────────────────────────────────────────────────────────────────
  const router = await swap.getCetusSwapQuote(from, target, amount, true);
  if (!router) throw new Error('no route found');

  const aggregatorV3 = router.packages?.get('aggregator_v3');
  console.log('quoteID           ', router.quoteID);
  console.log('amountIn          ', router.amountIn.toString());
  console.log('amountOut         ', router.amountOut.toString());
  console.log('providers         ', [...new Set(router.paths.map((p) => p.provider))].join(', '));
  console.log('aggregator_v3 pkg ', aggregatorV3);
  console.log(
    aggregatorV3 === EXPECTED_AGGREGATOR_V3
      ? '  -> router API is serving the NEW aggregator package'
      : `  -> NOT the 1.7.3 package (expected ${EXPECTED_AGGREGATOR_V3})`,
  );

  // ── Build + simulate ───────────────────────────────────────────────────────
  // Use the SDK's own client so the Transaction and the resolver come from the
  // same @mysten/sui copy (scripts/ has its own nested install of a different
  // version, which cannot build src-created transactions).
  const context = new StrategyContext('mainnet');

  const tx = new Transaction();
  tx.setSender(sender);
  const inputCoin = context.blockchain.getCoinObject(tx, from, sender, BigInt(amount));
  const { coinOut } = await swap.cetusSwapTokensTxb(router, slippage, inputCoin, tx);
  tx.transferObjects([coinOut], sender);

  // The aggregator entry points the PTB targets: v3 since aggregator-sdk 1.7.3,
  // `new_swap_context` / `confirm_swap` on 1.6.x.
  const targets = tx
    .getData()
    .commands.filter((c: any) => c.MoveCall)
    .map((c: any) => `${c.MoveCall.module}::${c.MoveCall.function}`);
  console.log('\nrouter entry pts  ', targets.filter((t) => t.startsWith('router::')).join(', '));

  const { effects } = await context.blockchain.simulateTransaction(tx, sender);
  const { success, error } = readStatus((effects as any)?.status);
  console.log('\nsimulate          ', success ? 'success' : `FAILED: ${error}`);
  if (!success) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
