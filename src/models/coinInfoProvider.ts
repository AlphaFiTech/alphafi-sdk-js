import { Decimal } from 'decimal.js';

export type CoinInfo = {
  coinType: string;
  symbol: string;
  decimals: number;
  coingeckoPrice?: Decimal;
  pythPrice?: Decimal;
};

type GraphQLResponse = {
  data: {
    coinInfo: Array<{
      coinType: string;
      symbol: string;
      decimals: number;
      coingeckoPrice?: number | null;
      pythPrice?: number | null;
    }>;
  };
};

export class CoinInfoProvider {
  private readonly apiUrl: string = 'https://api.alphalend.xyz/public/graphql';
  private readonly coinInfoByType: Map<string, CoinInfo>;
  private lastFetchedAt: number | null;
  private readonly maxAgeMs: number = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.coinInfoByType = new Map();
    this.lastFetchedAt = null;
  }

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    const now = Date.now();
    const isStale = this.lastFetchedAt == null || now - this.lastFetchedAt > this.maxAgeMs;
    if (isStale) {
      const coins = await this.fetchFromApi();
      this.coinInfoByType.clear();
      Array.from(coins.values()).forEach((coin) => {
        this.coinInfoByType.set(coin.coinType, coin);
      });
      this.lastFetchedAt = now;
    }
  }

  async getAllCoins(): Promise<Map<string, CoinInfo>> {
    await this.ensureInitialized();
    return this.coinInfoByType;
  }

  async getCoinByType(coinType: string): Promise<CoinInfo | undefined> {
    await this.ensureInitialized();
    return this.coinInfoByType.get(coinType);
  }

  async getPriceByType(coinType: string): Promise<Decimal> {
    await this.ensureInitialized();
    const coin = await this.getCoinByType(coinType);
    if (!coin) throw new Error(`Coin not found: ${coinType}`);
    const price = coin.pythPrice ?? coin.coingeckoPrice;
    if (!price) throw new Error(`No price available for: ${coinType}`);
    return price;
  }

  private async fetchFromApi(): Promise<Map<string, CoinInfo>> {
    const query = `
      query {
        coinInfo {
          coinType
          symbol
          decimals
          coingeckoPrice
          pythPrice
        }
      }
    `;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`AlphaLend API error: ${response.status}`);
    }

    const json = (await response.json()) as GraphQLResponse;
    const apiCoins = json?.data?.coinInfo ?? [];

    const coins: Map<string, CoinInfo> = new Map();
    apiCoins.forEach(
      (apiCoin: {
        coinType: string;
        symbol: string;
        decimals: number;
        coingeckoPrice?: number | null;
        pythPrice?: number | null;
      }) => {
        coins.set(apiCoin.coinType, {
          coinType: apiCoin.coinType,
          symbol: apiCoin.symbol,
          decimals: apiCoin.decimals,
          coingeckoPrice:
            apiCoin.coingeckoPrice !== undefined && apiCoin.coingeckoPrice !== null
              ? new Decimal(apiCoin.coingeckoPrice)
              : undefined,
          pythPrice:
            apiCoin.pythPrice !== undefined && apiCoin.pythPrice !== null
              ? new Decimal(apiCoin.pythPrice)
              : undefined,
        });
      },
    );

    // Add special SUI mapping
    const suiCoin = coins.get('0x2::sui::SUI');
    if (suiCoin) {
      coins.set('0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI', {
        ...suiCoin,
        coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      });
    }
    return coins;
  }
}
