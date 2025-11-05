import { AlphaFiReceiptType } from '../utils/parsedTypes.js';
import { poolDetailsMap } from 'src/common/maps.js';
import { Blockchain } from './blockchain.js';

export class AlphaFiReceipt {
  alphafiReceipt: AlphaFiReceiptType;
  blockchain: Blockchain
  constructor(alphafiReceipt: AlphaFiReceiptType, blockchain: Blockchain) {
    this.alphafiReceipt = alphafiReceipt;
    this.blockchain = blockchain;
  }

  async getTotalShares(poolId: string):Promise<string>{
    let entry = this.alphafiReceipt.position_pool_map.find(item=>item.value.pool_id===poolId);
    if(!entry){
        console.error("no position for pool id found");
        return "0";        
    }
    if(poolDetailsMap[poolId].poolName === "ALPHA"){
        let position = await this.blockchain.getAlphaPosition(entry.key);
        return position.xtokens
    }
    return "0";
  }
}