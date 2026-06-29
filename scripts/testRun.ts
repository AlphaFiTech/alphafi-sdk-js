import { AlphaFiSDK } from '../src/index.js';
import { dryRunTransactionBlock, executeTransactionBlock, getExecStuff } from './utils.js';

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
    '0x1124c5e7b1fb1f3cfa02cad5934dc27785e083f2b4a49bde3cc41ba66ff9113c',
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
    '0x1124c5e7b1fb1f3cfa02cad5934dc27785e083f2b4a49bde3cc41ba66ff9113c',
  );
  console.log('user data', data);
}
async function deposit() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({
    network: 'mainnet',
  });
  const tx = await sdk.deposit({
    poolId: '0xc4caf2d31693974b838ffb83b0c8ae880a6b09ca251a07062cf66453bf3e3ce0',
    amount: 100000000n,
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
    network: 'mainnet',
  });
  const tx = await sdk.withdraw({
    poolId: '0x1124c5e7b1fb1f3cfa02cad5934dc27785e083f2b4a49bde3cc41ba66ff9113c',
    withdrawMax: false,
    amount: '5_000_000',
    isAmountA: true,
    address,
  });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx);
  // executeTransactionBlock(tx);
}
async function claimSlushWithdraw() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
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
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
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
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ suiClient: suiClient, network: 'mainnet' });
  const tx = await sdk.claimAirdrop({ address: address, transferToWallet: false });
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
async function createTransferRequestAlphaFiReceipt() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const receiptId = '0x79a5074ce093b48117613663e0f48b44859c65160271b84586ab4fefcf6fd232';
  const tx = sdk.createTransferRequest({
    receiptId,
    receiver: '0xdc2e499e0b56d97399fd160b9374820010b6f153a01396c1c80ca3401acfe273',
  });
  dryRunTransactionBlock(tx);
}
async function updatePool() {
  const { address, keypair, suiClient } = getExecStuff();
  const sdk = new AlphaFiSDK({ network: 'mainnet' });
  const tx = await sdk.updatePool(
    '0x18db5470cc2da4f74b1b957891f274d896764d08c56c3941788cef84d2a1362e',
  );
  tx.setGasBudget(2e8);
  dryRunTransactionBlock(tx, address);
  // executeTransactionBlock(tx);
}
// updatePool();
// claimAirdrop();
// withdraw();
// poolsData();
// portfolioData();
// claimSlushWithdraw();
deposit();
// cancelSlushWithdraw();
// createTransferRequestAlphaFiReceipt();
