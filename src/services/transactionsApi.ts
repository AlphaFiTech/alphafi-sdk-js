/**
 * Client for alphafi-api's public transaction-building endpoints.
 *
 * Autocompound and rebalance PTBs are built server-side by the Rust SDK
 * (single source of truth for the per-pool move-call matrix) and returned as
 * base64 BCS `TransactionKind` bytes. The restored Transaction has no sender —
 * the wallet supplies it and resolves gas coins at signing.
 */
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';

/** Gas budgets mirror alphafi-crons production values; wallet estimation
 * under-budgets these heavy transactions. */
export const AUTOCOMPOUND_GAS_BUDGET = 300_000_000;
export const REBALANCE_GAS_BUDGET = 500_000_000;

/** Abort the build request if the API hangs, instead of spinning forever. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * POST to `{apiBaseUrl}/public/transactions/{path}` and restore the returned
 * kind bytes into a Transaction. Throws with the server's error message when
 * the build fails, and on a hung request or malformed response.
 */
export async function fetchServerBuiltTx(
  apiBaseUrl: string,
  path: 'autocompound' | 'rebalance',
  body: Record<string, unknown>,
  gasBudget: number,
): Promise<Transaction> {
  const res = await fetch(`${apiBaseUrl}/public/transactions/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      // non-JSON error body; keep the status line
    }
    throw new Error(`Failed to build ${path} transaction: ${message}`);
  }
  const { txKindBytes } = (await res.json()) as { txKindBytes?: unknown };
  if (typeof txKindBytes !== 'string' || txKindBytes.length === 0) {
    throw new Error(`Malformed ${path} response: missing txKindBytes`);
  }
  const tx = Transaction.fromKind(fromBase64(txKindBytes));
  tx.setGasBudget(gasBudget);
  return tx;
}
