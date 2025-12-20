/**
 * Provides coin metadata and pricing data from AlphaLend API with automatic caching.
 */

import { normalizeStructTag } from '@mysten/sui/utils';
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
  private readonly maxAgeMs: number = 2 * 60 * 1000; // Cache TTL

  constructor() {
    this.coinInfoByType = new Map();
    this.lastFetchedAt = null;
  }

  /** Initialize coin data cache. */
  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  /** Fetch fresh data if cache is stale. */
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

  /** Get all coin metadata. */
  async getAllCoins(): Promise<Map<string, CoinInfo>> {
    await this.ensureInitialized();
    return this.coinInfoByType;
  }

  /** Get coin metadata by type. */
  async getCoinByType(coinType: string): Promise<CoinInfo | undefined> {
    await this.ensureInitialized();
    return this.coinInfoByType.get(normalizeStructTag(coinType));
  }

  /** Get coin price (Pyth preferred, fallback to CoinGecko). */
  async getPriceByType(coinType: string): Promise<Decimal> {
    await this.ensureInitialized();
    const coin = await this.getCoinByType(normalizeStructTag(coinType));
    if (!coin) throw new Error(`Coin not found: ${coinType}`);
    const price = coin.pythPrice ?? coin.coingeckoPrice;
    if (!price) throw new Error(`No price available for: ${coinType}`);
    return price;
  }

  /** Fetch coin data from AlphaLend GraphQL API. */
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
        coins.set(normalizeStructTag(apiCoin.coinType), {
          coinType: normalizeStructTag(apiCoin.coinType),
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

    return coins;
  }
}
