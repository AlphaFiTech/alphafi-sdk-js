import {
  AggregatorClient,
  RouterDataV3,
  // getAllProviders,
  getProvidersExcluding,
} from '@cetusprotocol/aggregator-sdk';
import { Transaction } from '@mysten/sui/transactions';

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
    byAmountIn: boolean,
  ): Promise<RouterDataV3 | undefined> {
    try {
      // const providers = getAllProviders();

      const providersExcept = getProvidersExcluding([
        'STEAMM_OMM_V2',
        'OBRIC',
        'METASTABLE',
        'HAEDALHMMV2',
        'HAEDALPMM',
      ]);

      const router = await this.client.findRouters({
        from,
        target,
        amount,
        byAmountIn, // `true` means fix input amount, `false` means fix output amount
        providers: providersExcept,
        splitCount: 15,
      });

      return router || undefined;
    } catch (error) {
      console.error('Error getting cetus swap quote', error);
      throw error;
    }
  }

  async cetusSwapTokensTxb(router: RouterDataV3, slippage: number): Promise<Transaction> {
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
