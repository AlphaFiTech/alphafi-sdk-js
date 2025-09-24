// Minimal CJS runner to test deposit using built CJS bundle

require('dotenv').config();

async function main() {
  const { SuiClient } = await import('@mysten/sui/client');
  const { fromB64 } = await import('@mysten/sui/utils');
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
  const { AlphaFiSDK } = require('../dist/cjs/index.js');

  const network = process.env.NETWORK || 'mainnet';
  const rpcUrls = {
    mainnet: 'https://fullnode.mainnet.sui.io/',
    testnet: 'https://fullnode.testnet.sui.io/',
    devnet: 'https://fullnode.devnet.sui.io/',
  };
  const client = new SuiClient({ url: rpcUrls[network] || rpcUrls.devnet });

  const pkB64 = process.env.PK_B64;
  if (!pkB64) throw new Error('env PK_B64 missing');
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(pkB64).slice(1));
  const address = keypair.getPublicKey().toSuiAddress();

  const sdk = new AlphaFiSDK({ client, network, address });

  const poolId = '0x04378cf67d21b41399dc0b6653a5f73f8d3a03cc7643463e47e8d378f8b0bdfa';
  const amount = BigInt('100000');

  const tx = await sdk.deposit({ poolId, amount });

  // Dry run
  tx.setSender(address);
  tx.setGasBudget(1e9);
  const serialized = await tx.build({ client });
  const res = await client.dryRunTransactionBlock({ transactionBlock: serialized });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
