/**
 * StrategyContext
 *
 * Shared services + lazily-loaded cached on-chain/API data used by strategies.
 * All data is loaded on-demand with automatic caching and TTL expiration.
 */

import { Blockchain } from './blockchain.js';
import { CoinInfoProvider } from './coinInfoProvider.js';
import { PoolLabel, StrategyType } from '../strategies/strategy.js';
import { Decimal } from 'decimal.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { AlphaFiReceipt, AprData, CoinInfo, DistributorObject, SlushPositionCap } from './types.js';
import { normalizeStructTag } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client/index.js';
import {
  ALPHAFI_RECEIPT_TYPE,
  CACHE_TTL,
  DISTRIBUTOR_OBJECT_ID,
  SLUSH_POSITION_CAP_TYPE,
} from '../utils/constants.js';
import { getCanonicalPairKey, ProtocolPoolIds } from '../utils/poolMap.js';
import { Cache, SingletonCache } from '../utils/cache.js';

const ALPHAFI_NAVI_TVL_URL = 'https://api.alphafi.xyz/public/navi-params';
const ALPHAFI_APR_URL = 'https://api.alphafi.xyz/public/apr';
const ALPHAFI_CONFIG_URL = 'https://api.alphafi.xyz/public/config';
const ALPHAFI_EXTERNAL_POOLS_URL = 'https://api.alphafi.xyz/public/external-pools';

export class StrategyContext {
  blockchain: Blockchain;
  coinInfoProvider: CoinInfoProvider;

  // Singleton caches for global data
  private allPoolLabelsCache: SingletonCache<Map<string, PoolLabel>>; // For bulk fetches
  private poolLabelCache: Cache<string, PoolLabel>; // Per-pool cache for individual fetches
  private aprMapCache: SingletonCache<Map<string, AprData>>;
  private alphalendTvlCache: SingletonCache<Map<string, Decimal>>;
  private naviTvlCache: SingletonCache<Map<string, Decimal>>;
  private bucketTvlCache: SingletonCache<Decimal>;
  private distributorCache: SingletonCache<DistributorObject>;
  private externalPoolsCache: Cache<string, ProtocolPoolIds>;
  private allExternalPoolsCache: SingletonCache<Map<string, ProtocolPoolIds>>;

  // Per-user caches
  private slushPositionCapsCache: Cache<string, SlushPositionCap[]>;
  private alphaFiReceiptsCache: Cache<string, AlphaFiReceipt[]>;
  private slushPositionsCache: Cache<string, Map<string, any[]>>;
  private alphaFiPositionsCache: Cache<string, Map<string, any[]>>;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet', suiClient: SuiClient) {
    this.blockchain = new Blockchain({ network, suiClient });
    this.coinInfoProvider = new CoinInfoProvider();

    // Initialize singleton caches with appropriate TTLs
    this.allPoolLabelsCache = new SingletonCache(CACHE_TTL.POOL_LABELS);
    this.poolLabelCache = new Cache(CACHE_TTL.POOL_LABELS);
    this.aprMapCache = new SingletonCache(CACHE_TTL.APR_DATA);
    this.alphalendTvlCache = new SingletonCache(CACHE_TTL.TVL_DATA);
    this.naviTvlCache = new SingletonCache(CACHE_TTL.TVL_DATA);
    this.bucketTvlCache = new SingletonCache(CACHE_TTL.TVL_DATA);
    this.distributorCache = new SingletonCache(CACHE_TTL.DISTRIBUTOR);
    this.externalPoolsCache = new Cache(CACHE_TTL.EXTERNAL_POOLS);
    this.allExternalPoolsCache = new SingletonCache(CACHE_TTL.EXTERNAL_POOLS);

    // Initialize per-user caches
    this.slushPositionCapsCache = new Cache(CACHE_TTL.USER_DATA);
    this.alphaFiReceiptsCache = new Cache(CACHE_TTL.USER_DATA);
    this.slushPositionsCache = new Cache(CACHE_TTL.USER_DATA);
    this.alphaFiPositionsCache = new Cache(CACHE_TTL.USER_DATA);
  }

  // ============================================================
  // Pool Labels (lazy loaded)
  // ============================================================

  /**
   * Get all pool labels. Lazily loaded and cached.
   * Also populates the per-pool cache for subsequent individual lookups.
   */
  async getPoolLabels(): Promise<Map<string, PoolLabel>> {
    return this.allPoolLabelsCache.getOrFetch(async () => {
      const labels = await this.fetchAllPoolLabels();
      // Populate per-pool cache for faster individual lookups
      labels.forEach((label, poolId) => {
        this.poolLabelCache.set(poolId, label);
      });
      return labels;
    });
  }

  /**
   * Get a specific pool label by ID.
   * Uses per-pool cache and fetches only the requested pool if not cached.
   */
  async getPoolLabel(poolId: string): Promise<PoolLabel | undefined> {
    return this.poolLabelCache.getOrFetch(poolId, async () => {
      const labels = await this.fetchPoolLabelsByIds([poolId]);
      const label = labels.get(poolId);
      if (!label) {
        throw new Error(`Pool not found: ${poolId}`);
      }
      return label;
    });
  }

  /**
   * Get multiple pool labels by IDs.
   * Efficiently fetches only uncached pools in a single API call.
   */
  async getPoolLabelsByIds(poolIds: string[]): Promise<Map<string, PoolLabel>> {
    const result = new Map<string, PoolLabel>();
    const uncachedIds: string[] = [];

    // Check cache first
    for (const poolId of poolIds) {
      const cached = this.poolLabelCache.get(poolId);
      if (cached) {
        result.set(poolId, cached);
      } else {
        uncachedIds.push(poolId);
      }
    }

    // Fetch uncached pools in a single API call
    if (uncachedIds.length > 0) {
      const fetched = await this.fetchPoolLabelsByIds(uncachedIds);
      fetched.forEach((label, poolId) => {
        this.poolLabelCache.set(poolId, label);
        result.set(poolId, label);
      });
    }

    return result;
  }

  /**
   * Fetch pool labels by IDs from the API.
   * Supports fetching multiple pools in a single request.
   */
  private async fetchPoolLabelsByIds(poolIds: string[]): Promise<Map<string, PoolLabel>> {
    if (poolIds.length === 0) {
      return new Map();
    }

    const url = `${ALPHAFI_CONFIG_URL}?pool_ids=${poolIds.join(',')}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch pool config: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as Record<
      string,
      {
        strategy_type: StrategyType;
        data: any;
      }
    >;
    const poolLabels = new Map<string, PoolLabel>();
    for (const [poolId, entry] of Object.entries(json)) {
      const label = this.parsePoolLabelEntry(entry.strategy_type, entry.data);
      if (label) {
        poolLabels.set(poolId, label);
      }
    }

    return poolLabels;
  }

  /**
   * Fetch all pool labels from the API.
   */
  private async fetchAllPoolLabels(): Promise<Map<string, PoolLabel>> {
    const poolLabels = new Map<string, PoolLabel>();
    const response = await fetch(ALPHAFI_CONFIG_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as Record<
      string,
      {
        strategy_type: StrategyType;
        data: any;
      }
    >;

    for (const [, entry] of Object.entries(json)) {
      const label = this.parsePoolLabelEntry(entry.strategy_type, entry.data || {});
      if (label) {
        poolLabels.set(label.poolId, label);
      }
    }

    return poolLabels;
  }

  /**
   * Parse a single pool label entry from the API response.
   */
  private parsePoolLabelEntry(strategyType: StrategyType, d: any): PoolLabel | null {
    if (!d.pool_id) {
      console.error('Pool ID is required for pool labels', d);
      return null;
    }

    if (strategyType === 'Lp' || strategyType === 'AutobalanceLp') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        parentPoolId: d.parent_pool_id,
        investorId: d.investor_id,
        receipt: d.receipt,
        assetA: d.asset_a,
        assetB: d.asset_b,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          rebalanceEventType: d.events?.rebalance_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
          afterTransactionEventType: d.events?.after_transaction_event_type ?? undefined,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'FungibleLp') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        parentPoolId: d.parent_pool_id,
        investorId: d.investor_id,
        fungibleCoin: d.fungible_coin ?? d.asset_a ?? d.asset,
        assetA: d.asset_a,
        assetB: d.asset_b,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          rebalanceEventType: d.events?.rebalance_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'SlushLending') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        receipt: d.receipt,
        asset: d.asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'Lending') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        parentPoolId: d.parent_pool_id,
        investorId: d.investor_id,
        receipt: d.receipt,
        asset: d.asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'Looping') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        investorId: d.investor_id,
        receipt: d.receipt,
        supplyAsset: d.supply_asset,
        borrowAsset: d.borrow_asset,
        userDepositAsset: d.user_deposit_asset,
        userWithdrawAsset: d.user_withdraw_asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
          checkRatioEventType: d.events?.check_ratio_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'SingleAssetLooping') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        investorId: d.investor_id,
        receipt: d.receipt,
        asset: d.asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'Lyf') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        parentPoolId: d.parent_pool_id,
        receipt: d.receipt,
        zapAsset: d.zap_asset,
        assetA: d.asset_a,
        assetB: d.asset_b,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          rebalanceEventType: d.events?.rebalance_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
          afterTransactionEventType: d.events?.after_transaction_event_type ?? undefined,
        },
        isActive: d.is_active,
        isNative: d.is_native,
        poolName: d.pool_name,
      } as PoolLabel;
    } else if (strategyType === 'AlphaVault') {
      return {
        poolId: d.pool_id,
        investorId: d.investor_id,
        packageId: d.package_id,
        versionObjectId: d.version_object_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        receipt: d.receipt,
        asset: d.asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
          liquidityChangeEventType: d.events?.liquidity_change_event_type,
          withdrawV2EventType: d.events?.withdraw_v2_event_type,
          afterTransactionEventType: d.events?.after_transaction_event_type,
          airdropAddEventType: d.events?.airdrop_add_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    } else if (strategyType === 'FungibleLending') {
      return {
        poolId: d.pool_id,
        packageId: d.package_id,
        packageNumber: d.package_number,
        strategyType: strategyType,
        parentProtocol: d.parent_protocol,
        parentPoolId: d.parent_pool_id,
        fungibleCoin: d.fungible_coin ?? d.asset,
        asset: d.asset,
        events: {
          autocompoundEventType: d.events?.autocompound_event_type,
        },
        isActive: d.is_active,
        poolName: d.pool_name,
        isNative: d.is_native,
      } as PoolLabel;
    }

    return null;
  }

  // ============================================================
  // APR Data (lazy loaded)
  // ============================================================

  /**
   * Get APR map. Lazily loaded and cached.
   */
  async getAprMap(): Promise<Map<string, AprData>> {
    return this.aprMapCache.getOrFetch(() => this.fetchAprData());
  }

  /**
   * Get APR/APY data for a specific pool.
   */
  async getAprData(poolId: string): Promise<AprData> {
    const aprMap = await this.getAprMap();
    return (
      aprMap.get(poolId) || {
        baseApr: new Decimal(0),
        alphaMiningApr: new Decimal(0),
        apy: new Decimal(0),
        lastAutocompounded: new Date(),
      }
    );
  }

  private async fetchAprData(): Promise<Map<string, AprData>> {
    const aprMap = new Map<string, AprData>();
    const resp = await fetch(ALPHAFI_APR_URL);
    if (!resp.ok) {
      throw new Error(`Failed to fetch apr data: ${resp.status} ${resp.statusText}`);
    }
    const dataArr = (await resp.json()) as Map<string, AprData>;
    for (const [key, value] of Object.entries(dataArr)) {
      aprMap.set(key, value);
    }
    return aprMap;
  }

  // ============================================================
  // Distributor Object (lazy loaded)
  // ============================================================

  /**
   * Get the distributor object for ALPHA mining calculations.
   */
  async getDistributorObject(): Promise<DistributorObject> {
    return this.distributorCache.getOrFetch(() => this.fetchDistributorObject());
  }

  private async fetchDistributorObject(): Promise<DistributorObject> {
    const distributorObject = await this.blockchain.getObject(DISTRIBUTOR_OBJECT_ID);
    return this.parseDistributorObject(distributorObject);
  }

  private parseDistributorObject(fields: any): DistributorObject {
    return {
      id: fields.id,
      airdropWallet: fields.airdrop_wallet,
      airdropWalletBalance: fields.airdrop_wallet_balance,
      dustWalletAddress: fields.dust_wallet_address,
      feeWallet: fields.fee_wallet,
      nextHalvingTimestamp: fields.next_halving_timestamp,
      onholdReceiptsWalletAddress: fields.onhold_receipts_wallet_address,
      poolAllocator: {
        id: fields.pool_allocator.id,
        members: fields.pool_allocator.members.contents.map((member: any) => ({
          key: member.key,
          value: {
            poolData: member.value.pool_data.contents.map((poolData: any) => ({
              key: poolData.key,
              value: {
                lastUpdateTime: poolData.value.last_update_time,
                pendingRewards: poolData.value.pending_rewards,
                weight: poolData.value.weight,
              },
            })),
          },
        })),
        rewards: {
          id: fields.pool_allocator.rewards.id,
          size: fields.pool_allocator.rewards.size,
        },
        totalWeights: fields.pool_allocator.total_weights.contents.map((weight: any) => ({
          key: weight.key.name,
          value: weight.value,
        })),
      },
      rewardUnlock: [],
      startTimestamp: fields.start_timestamp,
      target: fields.target,
      teamWalletAddress: fields.team_wallet_address,
      teamWalletBalance: fields.team_wallet_balance,
    };
  }

  // ============================================================
  // AlphaLend TVL (lazy loaded)
  // ============================================================

  /**
   * Get AlphaLend TVL map. Lazily loaded and cached.
   */
  async getAlphaLendTvlMap(): Promise<Map<string, Decimal>> {
    return this.alphalendTvlCache.getOrFetch(() => this.fetchAlphaLendTvl());
  }

  /**
   * Get Alphalend TVL for a specific coin type.
   */
  async getAlphaLendTvl(coinType: string): Promise<Decimal> {
    const tvlMap = await this.getAlphaLendTvlMap();
    return tvlMap.get(normalizeStructTag(coinType)) || new Decimal(0);
  }

  private async fetchAlphaLendTvl(): Promise<Map<string, Decimal>> {
    const tvlMap = new Map<string, Decimal>();
    const alphalendClient = new AlphalendClient('mainnet', this.blockchain.suiClient);
    const markets = await alphalendClient.getAllMarkets({
      useCache: true,
      cacheTTL: CACHE_TTL.ALPHALEND_MARKETS,
    });
    if (!markets) {
      throw new Error('Failed to get Alphalend markets');
    }
    for (const market of markets) {
      tvlMap.set(normalizeStructTag(market.coinType), market.totalSupply);
    }
    return tvlMap;
  }

  // ============================================================
  // Navi TVL (lazy loaded)
  // ============================================================

  /**
   * Get Navi TVL map. Lazily loaded and cached.
   */
  async getNaviTvlMap(): Promise<Map<string, Decimal>> {
    return this.naviTvlCache.getOrFetch(() => this.fetchNaviTvl());
  }

  /**
   * Get Navi TVL (USD) by poolId.
   */
  async getNaviTvlByPoolId(poolId: string): Promise<Decimal> {
    const tvlMap = await this.getNaviTvlMap();
    return tvlMap.get(poolId) || new Decimal(0);
  }

  private async fetchNaviTvl(): Promise<Map<string, Decimal>> {
    const tvlMap = new Map<string, Decimal>();
    const resp = await fetch(ALPHAFI_NAVI_TVL_URL);
    if (!resp.ok) {
      return tvlMap;
    }
    const dataArr = (await resp.json()) as Array<{ poolId: string; naviPoolTVL: string }>;
    for (const entry of dataArr) {
      tvlMap.set(entry.poolId, new Decimal(entry.naviPoolTVL));
    }
    return tvlMap;
  }

  // ============================================================
  // Bucket TVL (lazy loaded)
  // ============================================================

  /**
   * Get Bucket TVL in BUCK units. Lazily loaded and cached.
   */
  async getBucketTvl(): Promise<Decimal> {
    return this.bucketTvlCache.getOrFetch(() => this.fetchBucketTvl());
  }

  private async fetchBucketTvl(): Promise<Decimal> {
    const FOUNTAIN = '0xbdf91f558c2b61662e5839db600198eda66d502e4c10c4fc5c683f9caca13359';
    const FLASK = '0xc6ecc9731e15d182bc0a46ebe1754a779a4bfb165c201102ad51a36838a1a7b8';
    const fountain = await this.blockchain.suiClient.getObject({
      id: FOUNTAIN,
      options: { showContent: true },
    });
    const flask = await this.blockchain.suiClient.getObject({
      id: FLASK,
      options: { showContent: true },
    });
    const fountainFields = (fountain.data as any)?.content?.fields;
    const flaskFields = (flask.data as any)?.content?.fields;
    if (!fountainFields || !flaskFields) {
      throw new Error('Failed to get fountain or flask fields');
    }
    const totalSbuckInFountain = new Decimal(fountainFields.staked || '0');
    const reserves = new Decimal(flaskFields.reserves || '0');
    const sbuckSupply = new Decimal(flaskFields.sbuck_supply?.fields?.value || '0');
    if (sbuckSupply.isZero()) {
      return new Decimal(0);
    }
    const buckPerSbuck = reserves.div(sbuckSupply);
    const totalBuckInFountain = totalSbuckInFountain.mul(buckPerSbuck);
    return totalBuckInFountain.div(new Decimal(1e9));
  }

  // ============================================================
  // Coin Info (delegated to CoinInfoProvider)
  // ============================================================

  /**
   * Get coin decimals (defaults to 9 if unknown).
   */
  async getCoinDecimals(coinType: string): Promise<number> {
    const info = await this.coinInfoProvider.getCoinByType(coinType);
    return info?.decimals ?? 9;
  }

  /**
   * Get coin price (USD).
   */
  async getCoinPrice(coinType: string): Promise<Decimal> {
    return this.coinInfoProvider.getPriceByType(coinType);
  }

  async getCoinsBySymbols(symbols: string[]): Promise<CoinInfo[]> {
    const coins = await Promise.all(
      symbols.map(async (symbol) => {
        const coin = await this.coinInfoProvider.getCoinBySymbol(symbol);
        if (!coin) {
          throw new Error(`Coin not found: ${symbol}`);
        }
        return coin;
      }),
    );
    return coins;
  }

  private async getCoinTypeBySymbol(symbol: string): Promise<string | undefined> {
    const coin = await this.coinInfoProvider.getCoinBySymbol(symbol);
    return coin?.coinType;
  }

  // ============================================================
  // Pool ID Lookups
  // ============================================================

  /**
   * Get pool ID by coin symbols and protocol.
   */
  async getPoolIdBySymbolsAndProtocol(
    symbolA: string,
    symbolB: string,
    protocol: 'cetus' | 'bluefin' | 'mmt',
  ): Promise<string> {
    const poolIds = await this.getPoolIdsBySymbols(symbolA, symbolB);
    const poolId = poolIds[protocol as keyof ProtocolPoolIds];
    if (!poolId) {
      throw new Error(
        `Pool for protocol: ${protocol} not found for coin pair: ${symbolA} or ${symbolB}`,
      );
    }
    return poolId;
  }

  /**
   * Lookup pool IDs by coin symbols (order-agnostic).
   */
  async getPoolIdsBySymbols(symbolA: string, symbolB: string): Promise<ProtocolPoolIds> {
    const [typeA, typeB] = await Promise.all([
      this.getCoinTypeBySymbol(symbolA),
      this.getCoinTypeBySymbol(symbolB),
    ]);
    if (!typeA || !typeB) {
      throw new Error(`Coin not found: ${symbolA} or ${symbolB}`);
    }
    return this.getPoolIdsByTypes(typeA, typeB);
  }

  /**
   * Lookup pool IDs by coin types (order-agnostic).
   */
  async getPoolIdsByTypes(coinTypeA: string, coinTypeB: string): Promise<ProtocolPoolIds> {
    const key = getCanonicalPairKey(coinTypeA, coinTypeB);

    return this.externalPoolsCache.getOrFetch(key, async () => {
      const fetchedMap = await this.fetchExternalPools([key]);
      const ids = fetchedMap.get(key);
      if (!ids) {
        throw new Error(`Pool not found for coin pair: ${coinTypeA} or ${coinTypeB}`);
      }
      return ids;
    });
  }

  /**
   * Get external pools registry. Lazily loaded and cached.
   * Populates the individual cache as well.
   */
  async getExternalPools(): Promise<Map<string, ProtocolPoolIds>> {
    return this.allExternalPoolsCache.getOrFetch(async () => {
      const registry = await this.fetchExternalPools();
      // Populate individual cache
      registry.forEach((val, key) => {
        this.externalPoolsCache.set(key, val);
      });
      return registry;
    });
  }

  private async fetchExternalPools(
    coinPairs: string[] = [],
  ): Promise<Map<string, ProtocolPoolIds>> {
    const registry = new Map<string, ProtocolPoolIds>();
    let url = ALPHAFI_EXTERNAL_POOLS_URL;

    if (coinPairs.length > 0) {
      const param = coinPairs.join(',');
      url += `?coin_pairs=${encodeURIComponent(param)}`;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch external pools: ${resp.status} ${resp.statusText}`);
    }
    const data = (await resp.json()) as Record<string, ProtocolPoolIds>;
    for (const [key, val] of Object.entries(data)) {
      registry.set(key, val);
    }
    return registry;
  }

  // ============================================================
  // User Slush Positions (lazy loaded per user)
  // ============================================================

  /**
   * Fetch all slush positions for a user, grouped by poolId.
   */
  async getAllSlushPositions(userAddress: string): Promise<Map<string, any[]>> {
    return this.slushPositionsCache.getOrFetch(userAddress, async () => {
      const caps = await this.getSlushPositionCaps(userAddress);
      if (!caps.length) {
        return new Map();
      }

      const positionToPool: Map<string, string> = new Map();
      for (const cap of caps) {
        for (const [posId, poolId] of cap.position_pool_map.entries()) {
          positionToPool.set(posId, poolId);
        }
      }

      const allIds = Array.from(positionToPool.keys());
      if (allIds.length === 0) {
        return new Map();
      }

      const positionMap = await this.blockchain.multiGetObjects(allIds);

      const result: Map<string, any[]> = new Map();
      positionMap.forEach((obj, posId) => {
        const poolId = positionToPool.get(posId);
        if (!poolId || !obj) return;
        if (!result.has(poolId)) {
          result.set(poolId, []);
        }
        result.get(poolId)!.push(obj);
      });

      return result;
    });
  }

  /**
   * Get slush positions for a user in a specific pool.
   */
  async getSlushPosition(userAddress: string, poolId: string): Promise<any[]> {
    const allPositions = await this.getAllSlushPositions(userAddress);
    return allPositions.get(poolId) || [];
  }

  /**
   * Fetch and cache slush position caps for a user.
   */
  async getSlushPositionCaps(userAddress: string): Promise<SlushPositionCap[]> {
    return this.slushPositionCapsCache.getOrFetch(userAddress, async () => {
      const caps = await this.blockchain.getReceipt(userAddress, SLUSH_POSITION_CAP_TYPE);
      if (!caps || caps.length === 0) {
        return [];
      }

      const parsed: SlushPositionCap[] = [];
      for (const cap of caps) {
        const parsedCap = this.parseSlushPositionCap(cap);
        if (parsedCap) {
          parsed.push(parsedCap);
        }
      }

      return parsed;
    });
  }

  private parseSlushPositionCap(response: any): SlushPositionCap | null {
    const fields = response?.fields ?? response;
    if (!fields) return null;

    const id = typeof fields.id?.id === 'string' ? fields.id.id : fields.id;
    if (typeof id !== 'string' || !id) return null;

    const positionPoolMap = fields.position_pool_map;
    const contents = positionPoolMap?.fields?.contents ?? positionPoolMap?.contents;
    if (!Array.isArray(contents)) return null;

    const map = new Map<string, string>();
    for (const item of contents) {
      const itemFields = item?.fields ?? item;
      const key = itemFields?.key;
      const value = itemFields?.value;
      if (typeof key === 'string' && typeof value === 'string') {
        map.set(key, value);
      }
    }

    const client_address = typeof fields.client_address === 'string' ? fields.client_address : '';
    const image_url = typeof fields.image_url === 'string' ? fields.image_url : '';

    return {
      id,
      position_pool_map: map,
      client_address,
      image_url,
    };
  }

  // ============================================================
  // User AlphaFi Receipts/Positions (lazy loaded per user)
  // ============================================================

  /**
   * Fetch AlphaFi positions for a user, grouped by poolId.
   */
  async getPositionsFromAlphaFiReceipts(userAddress: string): Promise<Map<string, any[]>> {
    return this.alphaFiPositionsCache.getOrFetch(userAddress, async () => {
      const alphaFiReceipts = await this.getAlphaFiReceipts(userAddress);
      if (!alphaFiReceipts.length) {
        return new Map();
      }

      const positionToPool: Map<string, string> = new Map();
      for (const receipt of alphaFiReceipts) {
        for (const entry of receipt.positionPoolMap) {
          positionToPool.set(entry.key, entry.value.poolId);
        }
      }

      const allIds = Array.from(positionToPool.keys());
      if (allIds.length === 0) {
        return new Map();
      }

      const positionMap = await this.blockchain.multiGetObjects(allIds);

      const result: Map<string, any[]> = new Map();
      positionMap.forEach((obj, posId) => {
        const poolId = positionToPool.get(posId);
        if (!poolId || !obj) return;
        if (!result.has(poolId)) {
          result.set(poolId, []);
        }
        result.get(poolId)!.push(obj);
      });

      return result;
    });
  }

  /**
   * Get AlphaFi receipts for a user (parsed + cached).
   */
  async getAlphaFiReceipts(userAddress: string): Promise<AlphaFiReceipt[]> {
    return this.alphaFiReceiptsCache.getOrFetch(userAddress, async () => {
      const receipts = await this.blockchain.getReceipt(userAddress, ALPHAFI_RECEIPT_TYPE);
      if (!receipts || receipts.length === 0) {
        return [];
      }
      return this.parseAlphaFiReceipts(receipts);
    });
  }

  private parseAlphaFiReceipts(responses: any[]): AlphaFiReceipt[] {
    const results: AlphaFiReceipt[] = [];

    for (const response of responses) {
      const data = (response as any)?.data ?? response;
      const content = data?.content ?? data;
      const fields = content?.fields ?? content;

      const positionPoolMap: AlphaFiReceipt['positionPoolMap'] = [];
      const ppm = fields?.position_pool_map;
      const contents = ppm?.fields?.contents ?? ppm?.contents;
      if (Array.isArray(contents)) {
        for (const entry of contents) {
          const entryFields = entry?.fields ?? entry;
          const key = typeof entryFields?.key === 'string' ? entryFields.key : '';
          const valueFields = entryFields?.value?.fields ?? entryFields?.value ?? {};
          const poolId = typeof valueFields.pool_id === 'string' ? valueFields.pool_id : '';
          const partnerCapId =
            typeof valueFields.partner_cap_id === 'string' ? valueFields.partner_cap_id : '';
          if (key) {
            positionPoolMap.push({
              key,
              value: { poolId, partnerCapId },
            });
          }
        }
      }

      const imageUrlRaw = fields?.image_url;
      let imageUrl = '';
      if (Array.isArray(imageUrlRaw)) {
        imageUrl = this.asciiToString(imageUrlRaw);
      } else if (typeof imageUrlRaw === 'string') {
        imageUrl = imageUrlRaw;
      }

      const id =
        typeof data?.objectId === 'string'
          ? data.objectId
          : typeof data?.object_id === 'string'
            ? data.object_id
            : typeof fields?.id === 'string'
              ? fields.id
              : '';

      results.push({
        id,
        positionPoolMap,
        clientAddress: typeof fields?.client_address === 'string' ? fields.client_address : '',
        imageUrl,
      });
    }

    return results;
  }

  private asciiToString(asciiArray: any): string {
    if (!Array.isArray(asciiArray)) return '';
    try {
      const bytes = asciiArray
        .map((v) => (typeof v === 'number' ? v : Number(v)))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 255);
      return String.fromCharCode(...bytes);
    } catch {
      return '';
    }
  }

  // ============================================================
  // Cache Management
  // ============================================================

  /**
   * Clear all caches. Useful for forcing fresh data.
   */
  clearAllCaches(): void {
    this.allPoolLabelsCache.clear();
    this.poolLabelCache.clear();
    this.aprMapCache.clear();
    this.alphalendTvlCache.clear();
    this.naviTvlCache.clear();
    this.bucketTvlCache.clear();
    this.distributorCache.clear();
    this.externalPoolsCache.clear();
    this.allExternalPoolsCache.clear();
    this.slushPositionCapsCache.clear();
    this.alphaFiReceiptsCache.clear();
    this.slushPositionsCache.clear();
    this.alphaFiPositionsCache.clear();
    this.coinInfoProvider.clear();
  }

  /**
   * Clear user-specific caches for a given address.
   */
  clearUserCaches(userAddress: string): void {
    this.slushPositionCapsCache.delete(userAddress);
    this.alphaFiReceiptsCache.delete(userAddress);
    this.slushPositionsCache.delete(userAddress);
    this.alphaFiPositionsCache.delete(userAddress);
  }
}
