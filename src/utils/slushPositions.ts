/**
 * Helpers for slush strategies, where a wallet can hold several confirmed positions in one pool
 * (one per position cap). Balances cover every position, so withdrawals are spread across them.
 */

export interface SlushPositionReceipt {
  positionCapId: string;
  xTokens: string;
}

export interface SlushWithdrawLeg {
  positionCapId: string;
  xTokens: string;
}

/** Total xTokens across every position the user holds in the pool. */
export function totalSlushXTokens(receipts: SlushPositionReceipt[]): bigint {
  return receipts.reduce((sum, r) => sum + BigInt(r.xTokens || '0'), 0n);
}

/**
 * Split a withdrawal into one leg per position, largest position first, each leg using that
 * position's own cap. `'max'` empties every position. Throws if the amount exceeds the total.
 */
export function planSlushWithdraw(
  receipts: SlushPositionReceipt[],
  xTokenAmount: string | 'max',
): SlushWithdrawLeg[] {
  const positions = receipts
    .map((r) => ({ positionCapId: r.positionCapId, xTokens: BigInt(r.xTokens || '0') }))
    .filter((p) => p.xTokens > 0n)
    .sort((a, b) => (b.xTokens > a.xTokens ? 1 : b.xTokens < a.xTokens ? -1 : 0));

  if (xTokenAmount === 'max') {
    return positions.map((p) => ({
      positionCapId: p.positionCapId,
      xTokens: p.xTokens.toString(),
    }));
  }

  let remaining = BigInt(xTokenAmount);
  const legs: SlushWithdrawLeg[] = [];
  for (const p of positions) {
    if (remaining <= 0n) break;
    const take = remaining < p.xTokens ? remaining : p.xTokens;
    legs.push({ positionCapId: p.positionCapId, xTokens: take.toString() });
    remaining -= take;
  }
  if (remaining > 0n) {
    throw new Error('Withdraw amount exceeds the balance held in this pool');
  }
  return legs;
}
