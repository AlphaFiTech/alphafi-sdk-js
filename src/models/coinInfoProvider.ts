/**
 * Provides coin metadata and pricing data from AlphaLend API with automatic caching.
 */

import { normalizeStructTag } from '@mysten/sui/utils';
import { Decimal } from 'decimal.js';
import { SingletonCache } from '../utils/cache.js';
import { CoinInfo } from './types.js';
import { CACHE_TTL, URLS } from '../utils/constants.js';

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
  private readonly apiUrl: string = URLS.COININFO_API;
  private readonly cache: SingletonCache<Map<string, CoinInfo>>;

  constructor() {
    // 5 minute TTL for coin data
    this.cache = new SingletonCache<Map<string, CoinInfo>>(CACHE_TTL.COIN_INFO);
  }

  /** Get all coin metadata with caching and promise deduplication. */
  async getAllCoins(): Promise<Map<string, CoinInfo>> {
    return this.cache.getOrFetch(() => this.fetchFromApi());
  }

  /** Get coin metadata by symbol. */
  async getCoinBySymbol(symbol: string): Promise<CoinInfo | undefined> {
    const coins = await this.getAllCoins();
    return Array.from(coins.values()).find(
      (coin) => coin.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  }

  /** Get coin metadata by type. */
  async getCoinByType(coinType: string): Promise<CoinInfo | undefined> {
    const coins = await this.getAllCoins();
    return coins.get(normalizeStructTag(coinType));
  }

  /** Get coin price (Pyth preferred, fallback to CoinGecko). */
  async getPriceByType(coinType: string): Promise<Decimal> {
    const coin = await this.getCoinByType(normalizeStructTag(coinType));
    if (!coin) throw new Error(`Coin not found: ${coinType}`);
    const price = coin.pythPrice ?? coin.coingeckoPrice;
    if (!price) throw new Error(`No price available for: ${coinType}`);
    return price;
  }

  /** Clear the cache to force fresh data on next request. */
  clear(): void {
    this.cache.clear();
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
