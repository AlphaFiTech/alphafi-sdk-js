import { jest } from '@jest/globals';
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { StrategyContext } from '../models/strategyContext';
import { SlushSingleAssetLoopingStrategy } from '../strategies/slushSingleAssetLooping';
import { SLUSH_POSITION_CAP_TYPE } from '../utils/constants';

// A PositionCap has `store` and `alphalend_slush_pool::insert` is public, so anyone can fill a
// cap's position_pool_map with arbitrary entries and send it to a victim. These tests pin that
// the SDK trusts only positions whose on-chain back-pointer names the listing cap, and that
// every PTB uses the cap of the position it acts on.

const id = (n: number) => normalizeSuiObjectId(n.toString(16));

const USER = id(0xa1);
const ATTACKER = id(0xbad);
const POOL = id(0x9001);
const PACKAGE = id(0x7);
const SPAM_CAP = id(0x5a);
const OWN_CAP = id(0xc1);
const CAP_A = id(0xca);
const CAP_B = id(0xcb);
const P1 = id(0x91);
const PX = id(0x99); // listed by the spam cap, doesn't exist on chain
const P_OTHER = id(0x92); // a real position owned by someone else's cap
const OTHER_CAP = id(0xc9);
const PA = id(0xa0);
const PB = id(0xb0);
const W1 = id(0x1e1); // withdraw request held by position B

function capJson(capId: string, client: string, entries: [string, string][]) {
  return {
    id: capId,
    client_address: client,
    image_url: '',
    position_pool_map: { contents: entries.map(([key, value]) => ({ key, value })) },
  };
}

function newContext(caps: any[], positions: Record<string, any>): StrategyContext {
  const ctx = new StrategyContext('mainnet');
  (ctx.blockchain as any).getReceipt = jest.fn(async (_addr: string, type: string) =>
    type === SLUSH_POSITION_CAP_TYPE ? caps : [],
  );
  (ctx.blockchain as any).multiGetObjects = jest.fn(async (ids: string[]) => {
    const found = new Map<string, any>();
    for (const i of ids) {
      if (positions[i]) found.set(i, positions[i]);
    }
    return found;
  });
  (ctx.alphalendClient as any).updatePrices = jest.fn(async () => undefined);
  return ctx;
}

function newStrategy(ctx: StrategyContext): SlushSingleAssetLoopingStrategy {
  const label: any = {
    poolId: POOL,
    packageId: PACKAGE,
    versionId: id(0x8),
    strategyType: 'SlushSingleAssetLooping',
    parentProtocol: 'Alphalend',
    asset: { type: '0x2::sui::SUI' },
    events: { autocompoundEventType: '' },
    isActive: true,
    poolName: 'TEST',
    isNative: false,
  };
  // 1:1 exchange rate so coin amounts equal xToken amounts.
  const pool = {
    id: POOL,
    x_token_supply: { value: '1000' },
    tokens_invested: '1000',
    positions: { size: '2', id: id(0x3) },
    investor: { id: id(0x4), market_id: '1', alphalend_position_cap: {} },
  };
  const strategy = new SlushSingleAssetLoopingStrategy(label, pool, ctx);
  (strategy as any).collectAndSwapRewards = jest.fn(async () => undefined);
  return strategy;
}

function receiptJson(posId: string, capId: string, xtokens: string, requestIds: string[] = []) {
  return {
    id: posId,
    position_cap_id: capId,
    pool_id: POOL,
    coin_type: { name: 'sui' },
    principal: xtokens,
    xtokens,
    withdraw_requests: {
      contents: requestIds.map((reqId) => ({
        key: reqId,
        value: {
          id: reqId,
          time_of_request: '0',
          time_of_claim: '0',
          time_of_unlock: '0',
          status: '0',
          token_amount: '5',
          x_token_amount: '5',
        },
      })),
    },
  };
}

/** The (cap, u64 or id) arguments of every call to `fn` in the PTB. */
function callsTo(tx: Transaction, fn: string): { cap: string; arg: string }[] {
  const data = tx.getData();
  const input = (a: any): any => data.inputs[a.Input];
  return data.commands
    .filter((c: any) => c.$kind === 'MoveCall' && c.MoveCall.function === fn)
    .map((c: any) => {
      const [, capArg, , valueArg] = c.MoveCall.arguments;
      const cap = normalizeSuiObjectId(input(capArg).UnresolvedObject.objectId);
      const bytes = Uint8Array.from(Buffer.from(input(valueArg).Pure.bytes, 'base64'));
      const arg = bytes.length === 8 ? bcs.u64().parse(bytes) : bcs.Address.parse(bytes);
      return { cap, arg: String(arg) };
    });
}

describe('slush position caps with a spam cap in the wallet', () => {
  const caps = [
    // Spam cap listed first: entries for the user's real position, someone else's position and
    // a missing one.
    capJson(SPAM_CAP, ATTACKER, [
      [P1, POOL],
      [P_OTHER, POOL],
      [PX, POOL],
    ]),
    capJson(OWN_CAP, USER, [[P1, POOL]]),
  ];
  const positions = {
    [P1]: { id: P1, position_cap_id: OWN_CAP, pool_id: POOL, xtokens: '100' },
    [P_OTHER]: { id: P_OTHER, position_cap_id: OTHER_CAP, pool_id: POOL, xtokens: '999' },
  };

  it('keeps only positions that point back at the listing cap', async () => {
    const ctx = newContext(caps, positions);
    const all = await ctx.getAllSlushPositions(USER);
    const inPool = all.get(POOL) ?? [];
    expect(inPool).toHaveLength(1);
    expect(normalizeSuiObjectId(inPool[0].position_cap_id)).toBe(OWN_CAP);
  });

  it('deposits into the user own cap, not the spam cap', async () => {
    const ctx = newContext(caps, positions);
    const tx = new Transaction();
    await newStrategy(ctx).deposit(tx, { address: USER, amount: '10' } as any);
    const deposits = tx
      .getData()
      .commands.filter(
        (c: any) => c.$kind === 'MoveCall' && c.MoveCall.function === 'user_deposit',
      );
    expect(deposits).toHaveLength(1);
    const capInput = tx.getData().inputs[(deposits[0] as any).MoveCall.arguments[1].Input];
    expect(normalizeSuiObjectId((capInput as any).UnresolvedObject.objectId)).toBe(OWN_CAP);
  });
});

describe('SlushSingleAssetLooping with positions under two caps', () => {
  // A: 10 xTokens, no requests. B: 100 xTokens, holds withdraw request W1.
  // Both caps are the user's own; A is listed first.
  function setup() {
    const receipts = [receiptJson(PA, CAP_A, '10'), receiptJson(PB, CAP_B, '100', [W1])];
    const ctx = newContext(
      [capJson(CAP_A, USER, [[PA, POOL]]), capJson(CAP_B, USER, [[PB, POOL]])],
      { [PA]: receipts[0], [PB]: receipts[1] },
    );
    const strategy = newStrategy(ctx);
    strategy.updateReceipts(receipts);
    return strategy;
  }

  it('claims and cancels with the cap of the position holding the request', async () => {
    const strategy = setup();
    const claimTx = new Transaction();
    await strategy.claimWithdraw(claimTx, W1, USER);
    expect(callsTo(claimTx, 'user_claim_withdraw')).toEqual([{ cap: CAP_B, arg: W1 }]);

    const cancelTx = new Transaction();
    await strategy.cancelWithdraw(cancelTx, W1, USER);
    expect(callsTo(cancelTx, 'user_cancel_withdraw')).toEqual([{ cap: CAP_B, arg: W1 }]);
  });

  it('withdraw max empties every position, each with its own cap', async () => {
    const strategy = setup();
    const tx = new Transaction();
    await strategy.withdraw(tx, { address: USER, amount: '0', withdrawMax: true } as any);
    expect(callsTo(tx, 'user_initiate_withdraw')).toEqual([
      { cap: CAP_B, arg: '100' },
      { cap: CAP_A, arg: '10' },
    ]);
  });

  it('a partial withdraw draws from the largest position first', async () => {
    const strategy = setup();
    const tx = new Transaction();
    await strategy.withdraw(tx, { address: USER, amount: '50' } as any);
    expect(callsTo(tx, 'user_initiate_withdraw')).toEqual([{ cap: CAP_B, arg: '50' }]);
  });

  it('reports the balance of every position', async () => {
    const strategy = setup();
    const ctx = (strategy as any).context as StrategyContext;
    (ctx as any).getCoinPrice = jest.fn(async () => 1);
    (ctx as any).getCoinDecimals = jest.fn(async () => 0);
    const balance: any = await strategy.getBalance(USER);
    expect(balance.tokenAmount.toString()).toBe('110');
  });
});

describe('Blockchain.getReceipt', () => {
  it('follows every page of owned objects', async () => {
    const ctx = new StrategyContext('mainnet');
    const page = (ids: string[], next: string | null) => ({
      data: {
        objects: {
          pageInfo: { hasNextPage: next !== null, endCursor: next },
          nodes: ids.map((i) => ({ asMoveObject: { contents: { json: { id: i } } } })),
        },
      },
    });
    const query = jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValueOnce(page([SPAM_CAP], 'c1'))
      .mockResolvedValueOnce(page([OWN_CAP], null));
    (ctx.blockchain as any).gqlClient = { query };

    const caps = await ctx.blockchain.getReceipt(USER, SLUSH_POSITION_CAP_TYPE);
    expect((caps ?? []).map((c: any) => c.id)).toEqual([SPAM_CAP, OWN_CAP]);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
