import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Blockchain } from "../src/models/blockchain";
import { fromB64 } from "@mysten/sui/utils";
import { SuiClient } from "@mysten/sui/client";

export function getSuiClient(network: string) {
  const mainnetUrl = "https://fullnode.mainnet.sui.io/";
  const testnetUrl = "https://fullnode.testnet.sui.io/";
  const devnetUrl = "https://fullnode.devnet.sui.io/";

  let rpcUrl = devnetUrl;
  if (network === "mainnet") {
    rpcUrl = mainnetUrl;
  } else if (network === "testnet") {
    rpcUrl = testnetUrl;
  }

  return new SuiClient({
    url: rpcUrl,
  });
}

export function getExecStuff() {
  if (!process.env.PK_B64) {
    throw new Error("env var PK_B64 not configured");
  }

  const b64PrivateKey = process.env.PK_B64 as string;
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(b64PrivateKey).slice(1));
  const address = `${keypair.getPublicKey().toSuiAddress()}`;

  if (!process.env.NETWORK) {
    throw new Error("env var NETWORK not configured");
  }

  const suiClient = getSuiClient(process.env.NETWORK);

  return { address, keypair, suiClient };
}

async function main() {
  const client = getSuiClient("mainnet");
  const blockchain = new Blockchain(client, "mainnet");
  //   const res = await blockchain.getReceipts(
  //     1,
  //     "0xe136f0b6faf27ee707725f38f2aeefc51c6c31cc508222bee5cbc4f5fcf222c3",
  //   );
  const res = await blockchain.getMultiReceipt(
    "0xe136f0b6faf27ee707725f38f2aeefc51c6c31cc508222bee5cbc4f5fcf222c3",
  );
  console.log(res);
  //   for (let i = 49; i < 76; i = i + 1) {
  //     console.log(i);
  // const res = await blockchain.getPool(10);
  // console.log(res);
  //   }
}

main();
