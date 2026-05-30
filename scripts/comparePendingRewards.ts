import dotenv from 'dotenv';
import { AlphaFiSDK } from '../src/index.js';
import { getSuiClient } from './testRun.js';

dotenv.config();

/**
 * Compare the output of the new SDK's `autobalanceLpPendingRewardAmount`
 * against the deprecated `@alphafi/alphafi-sdk`'s `pendingRewardAmount`
 * for a given user and AutobalanceLp pool.
 *
 * The old SDK is identified by pool name (e.g. "BLUEFIN-AUTOBALANCE-SUI-USDC-175")
 * while the new SDK is identified by pool object ID. Make sure both point to the
 * same on-chain pool or the outputs will naturally differ.
 *
 * Requires the sibling repo `../alphafi-sdk` to be built (i.e. `dist/esm/index.js`
 * must exist).
 */
async function comparePendingRewards() {
  const TEST_ADDRESS = '0xe136f0b6faf27ee707725f38f2aeefc51c6c31cc508222bee5cbc4f5fcf222c3';
  const TEST_POOL_ID = '0x6fdf026be1d524112c62a8fd9211700fce94bb7e5fa5b7b0c146f1c5d8f0a8fa';
  const TEST_POOL_NAME = 'BLUEFIN-AUTOBALANCE-SUI-USDC-175';

  const suiClient = getSuiClient('mainnet');

  // --- NEW SDK ---
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  let newResult: Record<string, string> = {};
  try {
    newResult = await sdk.autobalanceLpPendingRewardAmount(TEST_ADDRESS, TEST_POOL_ID);
  } catch (e) {
    console.error('NEW SDK error:', e);
  }

  // --- OLD SDK ---
  const oldSdk = await import('../../alphafi-sdk/dist/esm/index.js');
  oldSdk.setCustomSuiClient(suiClient as any);
  let oldResult: Record<string, string> = {};
  try {
    oldResult = await oldSdk.pendingRewardAmount(TEST_ADDRESS, TEST_POOL_NAME);
  } catch (e) {
    console.error('OLD SDK error:', e);
  }

  console.log('=== NEW SDK result ===');
  console.log(JSON.stringify(newResult, null, 2));
  console.log('=== OLD SDK result ===');
  console.log(JSON.stringify(oldResult, null, 2));

  const allKeys = new Set([...Object.keys(newResult), ...Object.keys(oldResult)]);
  console.log('=== DIFF ===');
  for (const k of allKeys) {
    const n = newResult[k];
    const o = oldResult[k];
    const match = n === o ? '✓' : '✗';
    console.log(`${match} ${k}\n  new: ${n}\n  old: ${o}`);
  }
}

comparePendingRewards();
