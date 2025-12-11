import { Protocol } from './protocol.js';
import { normalizeStructTag } from '@mysten/sui/utils/sui-types.js';
import { StrategyContext } from './strategyContext.ts';

export class Portfolio {
  protocol: Protocol;
  strategyContext: StrategyContext;

  constructor(protocol: Protocol, strategyContext: StrategyContext) {
    this.protocol = protocol;
    this.strategyContext = strategyContext;
  }

  async getWalletCoins(userAddress: string): Promise<Map<string, string>> {
    const res = await this.strategyContext.blockchain.suiClient.getAllBalances({
      owner: userAddress,
    });

    const resMap: Map<string, string> = new Map();
    res.forEach((entry: { coinType: string; totalBalance: string }) => {
      resMap.set(normalizeStructTag(entry.coinType), entry.totalBalance);
    });
    return resMap;
  }
}
