import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Blockchain } from '../src/models/blockchain';
import { fromB64, normalizeStructTag } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { Protocol } from '../src/models/protocol.js';
import { Portfolio } from '../src/models/portfolio.js';
import { AlphaFiSDK } from '../src/index.js';
import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../src/common/constants.js';

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
        // console.log(JSON.stringify(res, null, 2));
        console.log(res.effects.status, res.balanceChanges);
      })
      .catch((error) => {
        console.error(error);
      });
  } catch (e) {
    console.log(e);
  }
}
export async function executeTransactionBlock(txb: Transaction) {
  const { keypair, suiClient } = getExecStuff();

  await suiClient
    .signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
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

async function main() {
  const { address, keypair, suiClient } = getExecStuff();
  const blockchain = new Blockchain('mainnet');
  const protocol = new Protocol(suiClient, 'mainnet');
  const portfolio = new Portfolio(protocol, blockchain, suiClient, address);
  // const res = await protocol.getAllPoolsData();
  // for (const pool of res) {
  //   console.log(poolDetailsMap[pool[0]].poolName, pool[1]);
  // }
  // const res = await portfolio.getPortfolioData();
  // const res = await blockchain.getObject(
  //   '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
  // );
  const res = await blockchain.multiGetObjects([
    '0x58c4a8c5d18c61156e1a5a82811fbf71963a4de3f5d52292504646611a308888',
    '0x89793208211927a4d1458a59d34b775aaec17af8c98a59a1ba97f7b005c0e587',
  ]);
  // const res = await blockchain.getReceipt(
  //   address,
  //   '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
  // );
  // const res = await blockchain.multiGetReceipts(address, [
  //   '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
  //   '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
  // ]);
  console.log(res);
  // console.log(
  //   normalizeStructTag(
  //     '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //   ),
  // );
}
// main();

async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    client: suiClient,
    network: 'mainnet',
    address,
  });
  const tx = await sdk.deposit({
    poolId: getConf().ALPHAFI_ALPHALEND_SINGLE_LOOP_DEEP_POOL, // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: 10000n,
  });
  // dryRunTransactionBlock(tx);
  executeTransactionBlock(tx);
}
// deposit();

async function withdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ client: suiClient, network: 'mainnet', address });
  const tx = await sdk.withdraw({
    poolId: getConf().ALPHAFI_ALPHALEND_SINGLE_LOOP_WBTC_POOL, // '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
    amount: '1000',
    withdrawMax: false,
  });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
async function claimAirdrop() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ client: suiClient, network: 'mainnet', address });
  const tx = await sdk.claimAirdrop(false);
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
claimAirdrop();
// withdraw();
