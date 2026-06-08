import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';

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

  return {
    // address,
    address: '0x5c455d275a6cd3d9bb5bf91f8a47bffc07574b5df0960093e016a33c6987de9c',
    keypair,
    suiClient,
  };
}

export async function dryRunTransactionBlock(txb: Transaction, add?: string) {
  const { suiClient, address } = getExecStuff();

  add ? txb.setSender(add) : txb.setSender(address);
  // txb.setGasBudget(1e9);
  try {
    const serializedTxb = await txb.build({ client: suiClient });
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
