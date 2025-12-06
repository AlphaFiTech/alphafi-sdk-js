import { AggregatorClient, RouterDataV3 } from '@cetusprotocol/aggregator-sdk';
// import { getFullnodeUrl } from '@mysten/sui/client/network.js';
import { Transaction } from '@mysten/sui/transactions';

// Re-export RouterDataV3 type for external use
export type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';

export class CetusSwap {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  client: AggregatorClient;
  cetusRouterDataV3: RouterDataV3 | null;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.network = network;
    this.client = new AggregatorClient({});
    this.cetusRouterDataV3 = null;
  }

  async getCetusSwapQuote(
    from: string,
    target: string,
    amount: string,
  ): Promise<RouterDataV3 | undefined> {
    try {
      // const providers = getAllProviders();

      const router = await this.client.findRouters({
        from,
        target,
        amount,
        byAmountIn: true, // `true` means fix input amount, `false` means fix output amount
        // providers: providers,
      });
      return router || undefined;
    } catch (error) {
      console.error('Error getting cetus swap quote', error);
      throw error;
    }
  }

  async cetusSwapTokens(router: RouterDataV3, slippage: number): Promise<Transaction> {
    try {
      if (!router) {
        throw new Error('No routers found');
      }
      const txb = new Transaction();
      await this.client.fastRouterSwap({
        router,
        txb,
        slippage: slippage || 0.01, // 1% slippage
      });
      return txb;
    } catch (error) {
      console.error('Error swapping tokens in cetus swap', error);
      throw error;
    }
  }
}
