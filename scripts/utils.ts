import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/bcs';
import { SuiJsonRpcClient as SuiClient } from '@mysten/sui/jsonRpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';

import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';

dotenv.config();

/**
 * @deprecated Public fullnodes no longer serve JSON-RPC, so this client fails on any call.
 * Use {@link getGqlClient} instead; it backs the simulate/execute helpers below.
 */
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

/** GraphQL client — builds, simulates and executes server-side. */
export function getGqlClient(network: string = process.env.NETWORK ?? 'mainnet') {
  return new SuiGraphQLClient({
    url:
      network === 'testnet'
        ? 'https://graphql.testnet.sui.io/graphql'
        : 'https://graphql.mainnet.sui.io/graphql',
  });
}

export function getExecStuff() {
  if (!process.env.PK_B64) {
    throw new Error('env var PK_B64 not configured');
  }

  const b64PrivateKey = process.env.PK_B64 as string;
  const keypair = Ed25519Keypair.fromSecretKey(fromBase64(b64PrivateKey).slice(1));
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

export async function dryRunTransactionBlock(txb: Transaction, add?: string) {
  const { address } = getExecStuff();
  txb.setSender(add ?? address);

  try {
    const gql = getGqlClient();
    // Server-side build + gas resolution, so no separate txb.build() is needed.
    const res = await gql.core.simulateTransaction({
      transaction: txb,
      include: { effects: true, balanceChanges: true, events: true },
    });
    const txData = res.$kind === 'Transaction' ? res.Transaction : res.FailedTransaction;
    console.log(txData?.effects?.status, txData?.balanceChanges, txData?.events?.length ?? 0);
  } catch (e) {
    console.log(e);
  }
}

export async function executeTransactionBlock(txb: Transaction) {
  const { keypair, address } = getExecStuff();
  txb.setSenderIfNotSet(address);

  try {
    const gql = getGqlClient();
    const bytes = await txb.build({ client: gql });
    const { signature } = await keypair.signTransaction(bytes);
    const res = await gql.core.executeTransaction({
      transaction: bytes,
      signatures: [signature],
      include: { effects: true },
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (error) {
    console.error(error);
  }
}
