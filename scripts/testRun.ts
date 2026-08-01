import { Transaction } from '@mysten/sui/transactions';
import {
  addAirdropCoinTxb,
  addExternalRewardsWalLockedTxb,
  AlphaFiSDK,
  collectUnsuppliedBalance,
  collectUnsuppliedBalanceTxb,
  getCurrentTick,
  getManualRebalanceUsingTicksTxb,
  getTickSpacing,
  getWithdrawRequestsAndUnsuppliedAmount,
  processWithdrawRequestsManualTxb,
  StrategyContext,
} from '../src/index.js';
import { AlphaVaultPoolLabel } from '../src/strategies/alphaVault.js';
import {
  dryRunTransactionBlock,
  executeTransactionBlock,
  getExecStuff,
  getSuiClient,
} from './utils.js';
import fs from 'fs';

// async function test() {
//   const { address, keypair, suiClient } = getExecStuff();
//   const lockedTableID = '0xe8474026c16bcb0581bc77169e1ee8d656d64c07ddfa02929ea536fe260e1a09';
//   const blockchain = new Blockchain(suiClient, 'mainnet');
//   const protocol = new Protocol(suiClient, 'mainnet');
//   const portfolio = new Portfolio(protocol, blockchain, suiClient, address);
//   const res = await portfolio.getPortfolioData();
//   console.log(res);
// }
// test();

// ──────────────────────────────────────────────────────────────────────────────
// Alpha Vault admin (`src/admin/alphaVault.ts`) — read + dry-run helpers
// ──────────────────────────────────────────────────────────────────────────────

// function strategyNetworkForTests(): 'mainnet' | 'testnet' {
//   return process.env.NETWORK === 'testnet' ? 'testnet' : 'mainnet';
// }

async function findAlphaVaultLabel(context: StrategyContext): Promise<AlphaVaultPoolLabel> {
  const labels = await context.getPoolLabels();
  for (const [, label] of labels) {
    if (label.strategyType === 'AlphaVault') {
      return label as AlphaVaultPoolLabel;
    }
  }
  throw new Error('AlphaVault pool label not found in registry');
}

/** Read-only: `getWithdrawRequestsAndUnsuppliedAmount`. */
export async function testAlphaVaultGetWithdrawRequestsAndUnsuppliedAmount() {
  const context = new StrategyContext('mainnet');
  const data = await getWithdrawRequestsAndUnsuppliedAmount(context);
  console.log('[alphaVault] getWithdrawRequestsAndUnsuppliedAmount', JSON.stringify(data, null, 2));
  return data;
}

/** Dry-run: `collectUnsuppliedBalance`. */
export async function dryRunAlphaVaultCollectUnsuppliedBalance() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const tx = new Transaction();
  await collectUnsuppliedBalance(tx, context);
  tx.setGasBudget(200_000_000);
  console.log('[alphaVault] dryRun collectUnsuppliedBalance');
  await dryRunTransactionBlock(tx, address);
}

/** Dry-run: `collectUnsuppliedBalanceTxb` (label resolved from registry). */
export async function dryRunAlphaVaultCollectUnsuppliedBalanceTxb() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const label = await findAlphaVaultLabel(context);
  const tx = new Transaction();
  collectUnsuppliedBalanceTxb(tx, label);
  tx.setGasBudget(200_000_000);
  console.log('[alphaVault] dryRun collectUnsuppliedBalanceTxb');
  await dryRunTransactionBlock(tx, address);
}

/**
 * Dry-run: `processWithdrawRequestsManualTxb`.
 * Set `ALPHA_VAULT_PROCESS_WITHDRAW_AMOUNT` (base units of the pool underlying); defaults to `1`.
 */
export async function dryRunAlphaVaultProcessWithdrawRequestsManual() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const amount = process.env.ALPHA_VAULT_PROCESS_WITHDRAW_AMOUNT ?? '1';
  const tx = new Transaction();
  await processWithdrawRequestsManualTxb(tx, amount, address, context);
  tx.setGasBudget(500_000_000);
  console.log('[alphaVault] dryRun processWithdrawRequestsManualTxb', { amount, address });
  await dryRunTransactionBlock(tx, address);
}

/**
 * Dry-run: `addAirdropCoinTxb`.
 * Set `ALPHA_VAULT_AIRDROP_MIST` (SUI in MIST); defaults to `1`.
 */
export async function dryRunAlphaVaultAddAirdropCoin() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const amount = process.env.ALPHA_VAULT_AIRDROP_MIST ?? '1';
  const tx = new Transaction();
  await addAirdropCoinTxb(tx, amount, address, context);
  tx.setGasBudget(500_000_000);
  console.log('[alphaVault] dryRun addAirdropCoinTxb', { amount, address });
  await dryRunTransactionBlock(tx, address);
}

/**
 * Runs `getWithdrawRequestsAndUnsuppliedAmount` and dry-runs every transaction builder
 * from `alphaVault.ts`. Individual steps log errors and continue.
 */
export async function dryRunAllAlphaVaultAdminFunctions() {
  console.log('\n======== Alpha Vault admin dry-run suite ========\n');
  try {
    await testAlphaVaultGetWithdrawRequestsAndUnsuppliedAmount();
  } catch (e) {
    console.error('[alphaVault] read failed', e);
  }
  const steps = [
    ['collectUnsuppliedBalance', dryRunAlphaVaultCollectUnsuppliedBalance],
    ['collectUnsuppliedBalanceTxb', dryRunAlphaVaultCollectUnsuppliedBalanceTxb],
    ['processWithdrawRequestsManualTxb', dryRunAlphaVaultProcessWithdrawRequestsManual],
    ['addAirdropCoinTxb', dryRunAlphaVaultAddAirdropCoin],
  ] as const;
  for (const [name, fn] of steps) {
    try {
      console.log(`\n--- ${name} ---`);
      await fn();
    } catch (e) {
      console.error(`[alphaVault] ${name} failed`, e);
    }
  }
  console.log('\n======== Alpha Vault suite done ========\n');
}

async function main() {
  const { address, keypair, suiClient } = getExecStuff();
  const alphafiClient = new AlphaFiSDK({ network: 'mainnet' });
  const startTime = Date.now();
  const res = await alphafiClient.getPoolsData(
    //   // ['SlushLending']
    ['AutobalanceLp', 'Lp'],
  );
  // const res = await alphafiClient.getUserPortfolio(
  // '0x396c8d5f9560f2ffa5d67dcdf3f458ee654ad3e3e08d4eb6ff50e7ddf66a82e5',
  // address,
  // ['SlushLending'],
  // );
  const endTime = Date.now();
  console.log(`Time taken: ${endTime - startTime}ms`);
  // for (const pool of res) {
  //   console.log(poolDetailsMap[pool[0]].poolName, pool[1]);
  // }
  // const res = await portfolio.getPortfolioData();
  // const res = await blockchain.getObject(
  //   '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
  // );
  // const res = await blockchain.multiGetObjects([
  //   '0x58c4a8c5d18c61156e1a5a82811fbf71963a4de3f5d52292504646611a308888',
  //   '0x89793208211927a4d1458a59d34b775aaec17af8c98a59a1ba97f7b005c0e587',
  // ]);
  // const res = await blockchain.getReceipt(
  //   address,
  //   '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
  // );
  // const res = await blockchain.multiGetReceipts(address, [
  //   '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
  //   '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
  // ]);
  // Write result to file (convert Decimals to strings for JSON serialization)
  const serializedRes = JSON.stringify(
    res,
    (key, value) => {
      // Convert Map to array of entries (or object)
      if (value instanceof Map) {
        return Object.fromEntries(value); // or Array.from(value.entries())
      }
      // Convert Decimal objects to strings
      if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
        return value.toString();
      }
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2,
  );
  fs.writeFileSync('scripts/poolsData.json', serializedRes);
  // console.log('Result written to scripts/poolsData.json');
  // console.log(res);
  // console.log(
  //   normalizeStructTag(
  //     '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //   ),
  // );
}

async function poolsData() {
  const sdk = new AlphaFiSDK({
    network: 'mainnet',
  });
  const data = await sdk.getSinglePoolData(
    '0xccda433a3324dc743478c7f79cce584628f6303501281167a3f4b386187c8c63',
  );
  console.log('data', data);
}
async function portfolioData() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    network: 'mainnet',
  });
  const data = await sdk.getUserSinglePoolBalance(
    address,
    '0xccda433a3324dc743478c7f79cce584628f6303501281167a3f4b386187c8c63',
  );
  console.log('user data', data);
}
async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    network: 'mainnet',
  });
  const tx = await sdk.deposit({
    poolId: '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: 1000000n,
    address: address,
    // coinType: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
  });
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}

async function withdraw() {
  const { keypair, suiClient } = getExecStuff();
  const { address } = getExecStuff();
  // const address = '0xfd839097e089804fa39e3a99a47b889dfe1fa8b5506ee5238e9b06794490f841';
  const sdk = new AlphaFiSDK({
    network: 'mainnet',
  });
  const tx = await sdk.withdraw({
    poolId: '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    withdrawMax: true,
    amount: '5_000_00',
    address,
    // coinType: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
  });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
async function claimSlushWithdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const tx = await sdk.claimWithdrawSlush({
    poolId: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
    withdrawRequestId: '0xd7c583c1a6b2849ed2a8164747cb4dda02b3bd56ef1f76cc0cfbd3301a9a1c7f',
    address,
  });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
async function cancelSlushWithdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const tx = await sdk.cancelWithdrawSlush({
    poolId: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
    withdrawRequestId: '0xd7c583c1a6b2849ed2a8164747cb4dda02b3bd56ef1f76cc0cfbd3301a9a1c7f',
    address,
  });
  tx.setGasBudget(2e8);
  // dryRunTransactionBlock(tx);
  executeTransactionBlock(tx);
}
async function claimAirdrop() {
  const { address } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const tx = await sdk.claimAirdrop({ address: address, transferToWallet: false });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
async function rebalance() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const poolName = 'USDC-SUIUSDT';
  // Parent Bluefin pool ticks: wide band around current price, snapped to tick spacing.
  const rangeHalfWidthInSpacings = 5;
  const [currentTick, tickSpacing] = await Promise.all([
    getCurrentTick(poolName, context),
    getTickSpacing(poolName, context),
  ]);
  const lowerTick =
    Math.floor((currentTick - rangeHalfWidthInSpacings * tickSpacing) / tickSpacing) * tickSpacing;
  const upperTick =
    Math.ceil((currentTick + rangeHalfWidthInSpacings * tickSpacing) / tickSpacing) * tickSpacing;
  if (lowerTick === upperTick) {
    throw new Error(
      `Computed rebalance range is empty (lower=${lowerTick}, upper=${upperTick}, spacing=${tickSpacing})`,
    );
  }
  console.log(
    `Parent pool currentTick=${currentTick}, tickSpacing=${tickSpacing} → range [${lowerTick}, ${upperTick}]`,
  );
  const tx = await getManualRebalanceUsingTicksTxb(
    poolName,
    address,
    String(lowerTick),
    String(upperTick),
    15,
    context,
    true,
    false,
  );
  if (tx) {
    tx.setGasBudget(2e8);
    dryRunTransactionBlock(tx, address);
  }

  // executeTransactionBlock(tx);
}

async function createTransferRequestAlphaFiReceipt() {
  const { address } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const receiptId = '0x79a5074ce093b48117613663e0f48b44859c65160271b84586ab4fefcf6fd232';
  const tx = sdk.createTransferRequest({
    receiptId,
    receiver: '0xdc2e499e0b56d97399fd160b9374820010b6f153a01396c1c80ca3401acfe273',
  });
  dryRunTransactionBlock(tx, address);
}
async function addExternalRewardsWalLocked() {
  const { address } = getExecStuff();
  const context = new StrategyContext('mainnet');
  const tx = new Transaction();
  const amount = 1_000_000_000n; // 1 WAL (WAL_DECIMALS = 9)
  const startTimeMs = Date.now() + 60 * 1000; // +1 minute from now
  const endTimeMs = startTimeMs + 7 * 24 * 60 * 60 * 1000; // +7 days
  await addExternalRewardsWalLockedTxb(tx, address, amount, startTimeMs, endTimeMs, context);
  tx.setGasBudget(2e8);
  console.log('[slushAdmin] dryRun addExternalRewardsWalLockedTxb', {
    address,
    amount: amount.toString(),
    startTimeMs,
    endTimeMs,
  });
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
async function updatePool() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const tx = await sdk.updatePool(
    '0xccda433a3324dc743478c7f79cce584628f6303501281167a3f4b386187c8c63',
  );
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
interface WithdrawRequest {
  type: string;
  positionId: string;
  senderAddress: string;
  principal: {
    coinType: string;
    amount: string;
  };
  mode: string;
}
interface DepositRequest {
  type: string;
  strategyId: string;
  senderAddress: string;
  coinType: string;
  nativeAmount: string;
}
async function withdrawApi(req: WithdrawRequest) {
  try {
    const resp = await fetch('https://api.alphalend.xyz/slush/v1/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Withdraw API error: ${errBody}`);
    }
    let res = await resp.json();
    const txb = Transaction.fromKind(res.bytes);
    dryRunTransactionBlock(txb);
    // executeTransactionBlock(txb)
  } catch (e) {
    console.error(e);
  }
}
async function depositApi(req: DepositRequest) {
  try {
    const resp = await fetch('https://api-staging.alphalend.xyz/slush/v1/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Deposit API error: ${errBody}`);
    }

    const res = await resp.json();
    const txb = Transaction.from(res.bytes);

    dryRunTransactionBlock(txb);
    // executeTransactionBlock(txb)
  } catch (e) {
    console.error('Deposit failed:', e);
  }
}
// withdrawApi({
//   type: 'PositionV1',
//   positionId: '0x4513c9f00d6e091c96e8f0000f2d0b63f9c497a24e4064ee7d302b0ef5dbd9e7',
//   senderAddress: '0xa511088cc13a632a5e8f9937028a77ae271832465e067360dd13f548fe934d1a',
//   principal: {
//     coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
//     amount: '10000',
//   },
//   mode: 'usdc',
// });
// updatePool();
// claimAirdrop();
// withdraw();
// poolsData();
// portfolioData();
// claimSlushWithdraw();
deposit();
// cancelSlushWithdraw();
// rebalance();
// addExternalRewardsWalLocked();
// dryRunAllAlphaVaultAdminFunctions();
// createTransferRequestAlphaFiReceipt();
