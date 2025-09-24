import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Blockchain } from '../src/models/blockchain';
import { fromB64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { Protocol } from '../src/models/protocol.js';
import { Portfolio } from '../src/models/portfolio.js';
import { AlphaFiSDK } from '../src/index.js';
import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';

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
  txb.setGasBudget(1e9);
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

async function test() {
  const { address, keypair, suiClient } = getExecStuff();
  const lockedTableID = '0xe8474026c16bcb0581bc77169e1ee8d656d64c07ddfa02929ea536fe260e1a09';
  const blockchain = new Blockchain(suiClient, 'mainnet');
  const protocol = new Protocol(suiClient, 'mainnet');
  const portfolio = new Portfolio(protocol, blockchain, suiClient, address);
  const res = await portfolio.getPortfolioData();
  console.log(res);
}
// test();

async function main() {
  const { address, keypair, suiClient } = getExecStuff();
  const client = getSuiClient('mainnet');
  const blockchain = new Blockchain(client, 'mainnet');
  const protocol = new Protocol(client, 'mainnet');
  const portfolio = new Portfolio(protocol, blockchain, client, address);
  // const res = await protocol.getAllPoolsData();
  // for (const pool of res) {
  //   console.log(poolDetailsMap[pool[0]].poolName, pool[1]);
  // }
  const res = await portfolio.getPortfolioData();
  console.log(res);
}
// main();

async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ client: suiClient, network: 'mainnet', address });
  const tx = await sdk.deposit({
    poolId: '0x04378cf67d21b41399dc0b6653a5f73f8d3a03cc7643463e47e8d378f8b0bdfa', // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: 100_000n,
  });
  dryRunTransactionBlock(tx);
}
deposit();

async function withdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ client: suiClient, network: 'mainnet', address });
  const tx = await sdk.withdraw({
    poolId: '0x04378cf67d21b41399dc0b6653a5f73f8d3a03cc7643463e47e8d378f8b0bdfa', // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    xTokens: 100_000n,
  });
  dryRunTransactionBlock(tx);
}
// withdraw();
