import { Blockchain } from './blockchain.js';
import { SuiClient } from '@mysten/sui/client';

export class Protocol {
  suiClient: SuiClient;
  blockchain: Blockchain;

  constructor(suiClient: SuiClient, network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.suiClient = suiClient;
    this.blockchain = new Blockchain(network);
  }
}
