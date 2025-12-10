/**
 * StrategyContext
 * Aggregates shared dependencies for strategies (blockchain and coin info provider).
 * Mirrors the concept used in the Rust SDK's StrategyContext.
 */

import { Blockchain } from './blockchain.js';
import { CoinInfoProvider } from './coinInfoProvider.js';
import { PoolLabel } from '../strategies/strategy.js';
import { Decimal } from 'decimal.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { AprData } from './types.js';

interface SlushPositionCap {
  id: string;
  position_pool_map: Map<string, string>;
  client_address: string;
  image_url: string;
}

interface AlphaFiReceipt {
  id: string;
  positionPoolMap: Array<{
    key: string;
    value: {
      poolId: string;
      partnerCapId: string;
    };
  }>;
  clientAddress: string;
  imageUrl: string;
}

const SLUSH_POSITION_CAP_TYPE =
  '0x41b1def47b6259cd7306e049d6500eabb1a984e25558b56eefa9b6c000a038c3::alphalend_slush_pool::PositionCap';
const ALPHAFI_RECEIPT_TYPE =
  '0x18533807391b15db5f1f530f54b32553372e5c204d179928d8da0a1753cbb63c::alphafi_receipt::AlphaFiReceipt';

export class StrategyContext {
  blockchain: Blockchain;
  coinInfoProvider: CoinInfoProvider;
  poolLabels: PoolLabel[];
  aprMap: Map<string, AprData>;
  alphalendTvl: Map<string, Decimal>;
  naviTvl: Map<string, Decimal>;
  bucketTvl: Decimal;
  private slushPositionCapsCache: Map<string, SlushPositionCap[]>;
  private alphaFiReceiptsCache: Map<string, AlphaFiReceipt[]>;

  constructor(blockchain: Blockchain, coinInfoProvider: CoinInfoProvider) {
    this.blockchain = blockchain;
    this.coinInfoProvider = coinInfoProvider;
    this.poolLabels = [];
    this.aprMap = new Map<string, AprData>();
    this.alphalendTvl = new Map<string, Decimal>();
    this.naviTvl = new Map<string, Decimal>();
    this.bucketTvl = new Decimal(0);
    this.slushPositionCapsCache = new Map<string, SlushPositionCap[]>();
    this.alphaFiReceiptsCache = new Map<string, AlphaFiReceipt[]>();
  }

  async init(userAddress: string) {
    await Promise.all([
      this.cacheAprData(),
      this.cacheAlphaLendMarkets(),
      this.cacheNaviTvlByPoolId(),
      this.cacheBucketTvl(),
      this.cachePoolLabelsFromConfig(),
      this.getAlphaFiReceipts(userAddress),
      this.getSlushPositionCaps(userAddress),
      this.coinInfoProvider.init(),
    ]);
  }

  /**
   * Convenience helper: get coin decimals by type, defaulting to 9 when missing.
   */
  async getCoinDecimals(coinType: string): Promise<number> {
    const info = await this.coinInfoProvider.getCoinByType(coinType);
    return info?.decimals ?? 9;
  }

  /**
   * Convenience helper: get coin price by type.
   */
  async getCoinPrice(coinType: string): Promise<Decimal> {
    return this.coinInfoProvider.getPriceByType(coinType);
  }

  getAprData(poolId: string): AprData {
    return (
      this.aprMap.get(poolId) || {
        baseApr: new Decimal(0),
        alphaMiningApr: new Decimal(0),
        apy: new Decimal(0),
        lastAutocompounded: new Date(),
      }
    );
  }

  private async cacheAprData() {
    const resp = await fetch('https://api.alphafi.xyz/api/apr');
    if (!resp.ok) {
      throw new Error(`Failed to fetch apr data: ${resp.status} ${resp.statusText}`);
    }
    const dataArr = (await resp.json()) as Map<string, AprData>;
    for (const [key, value] of Object.entries(dataArr)) {
      this.aprMap.set(key, value);
    }
  }

  getAlphaLendTvl(coinType: string): Decimal {
    return this.alphalendTvl.get(coinType) || new Decimal(0);
  }

  private async cacheAlphaLendMarkets() {
    const alphalendClient = new AlphalendClient('mainnet', this.blockchain.suiClient);
    const marketsChain = await alphalendClient.getMarketsChain();
    if (!marketsChain) {
      throw new Error('Failed to get markets chain');
    }
    const markets = await alphalendClient.getAllMarketsWithCachedMarkets(marketsChain);
    if (!markets) {
      throw new Error('Failed to get markets');
    }
    for (const market of markets) {
      this.alphalendTvl.set(market.coinType, market.availableLiquidity);
    }
  }

  getNaviTvlByPoolId(poolId: string): Decimal {
    return this.naviTvl.get(poolId) || new Decimal(0);
  }

  private async cacheNaviTvlByPoolId() {
    const resp = await fetch('https://api.alphafi.xyz/navi-params');
    if (!resp.ok) {
      return null;
    }
    const dataArr = (await resp.json()) as Array<{ poolId: string; naviPoolTVL: string }>;
    for (const entry of dataArr) {
      this.naviTvl.set(entry.poolId, new Decimal(entry.naviPoolTVL));
    }
  }

  getBucketTvl(): Decimal {
    return this.bucketTvl;
  }

  /**
   * Get slush positions for a user and pool.
   */
  async getSlushPosition(userAddress: string, poolId: string): Promise<any[]> {
    const caps = await this.getSlushPositionCaps(userAddress);
    if (!caps.length) {
      return [];
    }

    const positionIds: string[] = [];
    for (const cap of caps) {
      for (const [posId, pid] of cap.position_pool_map.entries()) {
        if (pid === poolId) {
          positionIds.push(posId);
        }
      }
    }

    if (positionIds.length === 0) {
      return [];
    }

    const positionMap = await this.blockchain.multiGetObjects(positionIds);
    return Array.from(positionMap.values()).filter(Boolean);
  }

  /**
   * Get AlphaFi receipts for a user (parsed and cached).
   */
  async getAlphaFiReceipts(userAddress: string): Promise<AlphaFiReceipt[]> {
    const cached = this.alphaFiReceiptsCache.get(userAddress);
    if (cached) {
      return cached;
    }

    const receipts = await this.blockchain.getReceipt(userAddress, ALPHAFI_RECEIPT_TYPE);
    if (!receipts || receipts.length === 0) {
      this.alphaFiReceiptsCache.set(userAddress, []);
      return [];
    }

    const parsed = this.parseAlphaFiReceipts(receipts);
    this.alphaFiReceiptsCache.set(userAddress, parsed);
    return parsed;
  }

  /**
   * Fetch and parse slush position caps for a user.
   */
  private async getSlushPositionCaps(userAddress: string): Promise<SlushPositionCap[]> {
    const cached = this.slushPositionCapsCache.get(userAddress);
    if (cached) {
      return cached;
    }

    const caps = await this.blockchain.getReceipt(userAddress, SLUSH_POSITION_CAP_TYPE);
    if (!caps || caps.length === 0) {
      this.slushPositionCapsCache.set(userAddress, []);
      return [];
    }

    const parsed: SlushPositionCap[] = [];
    for (const cap of caps) {
      const parsedCap = this.parseSlushPositionCap(cap);
      if (parsedCap) {
        parsed.push(parsedCap);
      }
    }

    this.slushPositionCapsCache.set(userAddress, parsed);
    return parsed;
  }

  /**
   * Parse a slush position cap object response into a structured shape.
   */
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

  /**
   * Parse AlphaFi receipts from object responses.
   */
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

  /**
   * Convert ASCII array (if present) to string.
   */
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

  private async cacheBucketTvl() {
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
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const buckPerSbuck = reserves.div(sbuckSupply);
    const totalBuckInFountain = totalSbuckInFountain.mul(buckPerSbuck);

    this.bucketTvl = totalBuckInFountain.div(new Decimal(1e9));
  }

  /**
   * Fetch pool labels configuration from the AlphaFi config API and map to PoolLabel objects.
   */
  private async cachePoolLabelsFromConfig() {
    const response = await fetch('https://api.alphafi.xyz/api/config');
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as Record<
      string,
      {
        strategy_type:
          | 'AlphaVault'
          | 'Lp'
          | 'FungibleLp'
          | 'AutobalanceLp'
          | 'SlushLending'
          | 'Lending'
          | 'Looping'
          | 'SingleAssetLooping'
          | 'Lyf';
        data: any;
      }
    >;

    for (const [, entry] of Object.entries(json)) {
      const st = entry.strategy_type;
      const d = entry.data || {};
      if (st === 'Lp' || st === 'AutobalanceLp') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'FungibleLp') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
          parentProtocol: d.parent_protocol,
          parentPoolId: d.parent_pool_id,
          investorId: d.investor_id,
          fungibleCoin: d.fungible_coin ?? d.asset_a ?? d.asset, // fallback if API varies
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
        } as PoolLabel);
      } else if (st === 'SlushLending') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'Lending') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'Looping') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'SingleAssetLooping') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'Lyf') {
        this.poolLabels.push({
          poolId: d.pool_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      } else if (st === 'AlphaVault') {
        this.poolLabels.push({
          poolId: d.pool_id,
          investorId: d.investor_id,
          packageId: d.package_id,
          packageNumber: d.package_number,
          strategyType: st,
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
        } as PoolLabel);
      }
    }
  }
}
