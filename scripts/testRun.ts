import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Blockchain } from '../src/models/blockchain';
import { fromB64, normalizeStructTag } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { Protocol } from '../src/models/protocol.js';
import { Portfolio } from '../src/models/portfolio.js';
import { AlphaFiSDK, StrategyContext } from '../src/index.js';
import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import * as fs from 'fs';

dotenv.config();

export function getSuiClient(network: string) {
  const mainnetUrl = 'https://fullnode.mainnet.sui.io/';
  const testnetUrl = 'https://fullnode.testnet.sui.io/';
  const devnetUrl = 'https://fullnode.devnet.sui.io/';

  let rpcUrl = devnetUrl;
  if (network === 'mainnet') {
    rpcUrl = mainnetUrl;
  } else if (network === 'testnet') {
    rpcUrl = testnetUrl;
  }

  return new SuiClient({
    url: rpcUrl,
  });
}

export function getExecStuff() {
  if (!process.env.PK_B64) {
    throw new Error('env var PK_B64 not configured');
  }

  const b64PrivateKey = process.env.PK_B64 as string;
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(b64PrivateKey).slice(1));
  const address = `${keypair.getPublicKey().toSuiAddress()}`;

  if (!process.env.NETWORK) {
    throw new Error('env var NETWORK not configured');
  }

  const suiClient = getSuiClient(process.env.NETWORK);

  return { address, keypair, suiClient };
}

export async function dryRunTransactionBlock(txb: Transaction) {
  const { suiClient, address } = getExecStuff();
  txb.setSender(address);
  // txb.setGasBudget(1e9);
  try {
    let serializedTxb = await txb.build({ client: suiClient });
    suiClient
      .dryRunTransactionBlock({
        transactionBlock: serializedTxb,
      })
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        // console.log(res.effects.status, res.balanceChanges);
      })
      .catch((error) => {
        console.error(error);
      });
  } catch (e) {
    console.log(e);
  }
}

async function main() {
  const { address, keypair, suiClient } = getExecStuff();
  const alphafiClient = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  // const res = await alphafiClient.getAllPoolsData();
  const res = await alphafiClient.getUserPortfolio(
    '0x396c8d5f9560f2ffa5d67dcdf3f458ee654ad3e3e08d4eb6ff50e7ddf66a82e5',
    // address,
  );
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
  console.log('Result written to scripts/poolsData.json');
  // console.log(res);
  // console.log(
  //   normalizeStructTag(
  //     '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //   ),
  // );
}
main();

async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  const tx = await sdk.deposit({
    poolId: '0x04378cf67d21b41399dc0b6653a5f73f8d3a03cc7643463e47e8d378f8b0bdfa', // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: 100_000n,
    address: address,
  });
  dryRunTransactionBlock(tx);
}
// deposit();

async function withdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  const tx = await sdk.withdraw({
    poolId: '0x139d3ed6292b4ac8978b31adb3415bfa5cdb1d1a6b8f364adbe3317158792413', // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: '100000000',
    withdrawMax: false,
    address: address,
  });
  tx.setGasBudget(2e8);
  // dryRunTransactionBlock(tx);
  await suiClient
    .signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      requestType: 'WaitForLocalExecution',
      options: {
        showEffects: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      },
    })
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((error) => {
      console.error(error);
    });
}
// withdraw();
