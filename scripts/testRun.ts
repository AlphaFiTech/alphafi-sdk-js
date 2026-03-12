import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Blockchain } from '../src/models/blockchain';
import { fromB64, normalizeStructTag } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { Protocol } from '../src/models/protocol.js';
import { Portfolio } from '../src/models/portfolio.js';
import { AlphaFiSDK } from '../src/index.js';
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

  return {
    address,
    // address: '0xe25b5d16ca31ddfdc31a7219c90f88bdfc56b606c13df6619aef22515580e293',
    keypair,
    suiClient,
  };
}

export async function dryRunTransactionBlock(txb: Transaction, address: string) {
  const { suiClient } = getExecStuff();
  txb.setSender(address);
  // txb.setGasBudget(1e9);
  try {
    const serializedTxb = await txb.build({ client: suiClient });
    suiClient
      .dryRunTransactionBlock({
        transactionBlock: serializedTxb,
      })
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
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
  const alphafiClient = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
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
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    suiClient: suiClient,
    network: 'mainnet',
  });
  const data = await sdk.getSinglePoolData(
    '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
  );
  console.log('data', data);
}
async function portfolioData() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    suiClient: suiClient,
    network: 'mainnet',
  });
  const data = await sdk.getUserSinglePoolBalance(
    address,
    '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
  );
  console.log('user data', data);
}
async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    suiClient: suiClient,
    network: 'mainnet',
  });
  const tx = await sdk.deposit({
    poolId: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
    amount: 10_000_000n,
    address: address,
    isAmountA: false,
  });
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}

async function withdraw() {
  const { keypair, suiClient } = getExecStuff();
  const { address } = getExecStuff();
  // const address = '0xfd839097e089804fa39e3a99a47b889dfe1fa8b5506ee5238e9b06794490f841';
  const sdk = new AlphaFiSDK({
    suiClient: suiClient,
    network: 'mainnet',
  });
  const tx = await sdk.withdraw({
    poolId: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
    withdrawMax: false,
    amount: '5_000_000',
    isAmountA: true,
    address,
  });
  tx.setGasBudget(2e8);
  // dryRunTransactionBlock(tx);
  executeTransactionBlock(tx);
}
async function claimSlushWithdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  const tx = await sdk.claimWithdrawSlush({
    poolId: '0x46688bb99cbca2d99154d287d8660a750bd056d5cbbb332c336f1db93185de83',
    withdrawRequestId: '0xa20c20f0e19b7c888409e79b49d47be799569c1f13f555e4e35e434305ba3fa0',
    address,
  });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
async function claimAirdrop() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  const tx = await sdk.claimAirdrop({ address: address, transferToWallet: false });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
// claimAirdrop();
withdraw();
// poolsData();
// portfolioData();
// claimSlushWithdraw();
// deposit();
