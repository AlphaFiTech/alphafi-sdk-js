export interface CoinDetails {
  coinType: string;
  coingeckoPrice: string;
  symbol: string;
  decimals: number;
  pythPrice: string;
}

export class Coins {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  constructor(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.network = network;
  }

  async getCoinDetails(): Promise<CoinDetails[]> {
    const apiUrl = 'https://api.alphalend.xyz/public/graphql';
    const query = `
      query {
        coinInfo {
          coinType
          coingeckoPrice
          pythPrice
          symbol
          decimals
        }
      }`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const dataArr = (await response.json()).data.coinInfo;

    return dataArr;
  }
}
