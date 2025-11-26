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

export class StrategyContext {
  blockchain: Blockchain;
  coinInfoProvider: CoinInfoProvider;
  poolLabels: PoolLabel[];
  aprMap: Map<string, AprData>;
  alphalendTvl: Map<string, Decimal>;
  naviTvl: Map<string, Decimal>;
  bucketTvl: Decimal;

  constructor(blockchain: Blockchain, coinInfoProvider: CoinInfoProvider) {
    this.blockchain = blockchain;
    this.coinInfoProvider = coinInfoProvider;
    this.poolLabels = [];
    this.aprMap = new Map<string, AprData>();
    this.alphalendTvl = new Map<string, Decimal>();
    this.naviTvl = new Map<string, Decimal>();
    this.bucketTvl = new Decimal(0);
  }

  async init() {
    await Promise.all([
      this.cacheAprData(),
      this.cacheAlphaLendMarkets(),
      this.cacheNaviTvlByPoolId(),
      this.cacheBucketTvl(),
      this.cachePoolLabelsFromConfig(),
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
          },
          isActive: d.is_active,
          poolName: d.pool_name,
          isNative: d.is_native,
        } as PoolLabel);
      }
    }
  }
}
