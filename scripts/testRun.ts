import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Blockchain } from "../src/models/blockchain";
import { fromB64 } from "@mysten/sui/utils";
import { DynamicFieldInfo, SuiClient } from "@mysten/sui/client";
import { Protocol } from "../src/models/protocol.js";
import { Portfolio } from "../src/models/portfolio.js";
import dotenv from "dotenv";

dotenv.config();

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

async function test() {
  const { address, keypair, suiClient } = getExecStuff();
  const lockedTableID =
    "0xe8474026c16bcb0581bc77169e1ee8d656d64c07ddfa02929ea536fe260e1a09";
  const blockchain = new Blockchain(suiClient, "mainnet");
  const protocol = new Protocol(suiClient, "mainnet");
  const portfolio = new Portfolio(protocol, blockchain, suiClient, address);
  const res = await portfolio.getPortfolioData();
  console.log(res);
}

async function main() {
  const { address, keypair, suiClient } = getExecStuff();
  const client = getSuiClient("mainnet");
  const blockchain = new Blockchain(client, "mainnet");
  const protocol = new Protocol(client, "mainnet");
  const portfolio = new Portfolio(protocol, blockchain, client, address);
  // const res = await protocol.getAllPoolsData();
  // for (const pool of res) {
  //   console.log(poolDetailsMap[pool[0]].poolName, pool[1]);
  // }
  const res = await portfolio.getPortfolioData();
  console.log(res);
}

// main();
test();
