import { Decimal } from 'decimal.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../common/maps.js';
import { Blockchain } from './blockchain.js';
import { SuiClient } from '@mysten/sui/client/client.js';
import { getConf } from '../common/constants.js';
import { Pool, PoolData } from './pool.js';
import { stSuiExchangeRate, getConf as getStSuiConf } from '@alphafi/stsui-sdk';

type LoopingDebt = {
  dataType: string;
  type: string;
  hasPublicTransfer: boolean;
  fields: {
    name: [];
    value: string;
  };
};

export class Protocol {
  suiClient: SuiClient;
  blockchain: Blockchain;

  constructor(suiClient: SuiClient, network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.suiClient = suiClient;
    this.blockchain = new Blockchain(suiClient, network);
  }

  async getAllPoolsData(): Promise<Map<string, PoolData>> {
    const pools = await this.getAllPools();
    const aprMap = await this.getAprMap();
    const priceMap = await this.getPriceMap();
    const naviTvlMap = await this.getNaviTvlMap();
    const bucketTvl = await this.getBucketTVL();
    const poolDataMap = new Map<string, PoolData>();
    for (const pool of pools.values()) {
      const poolData = pool.getPoolData(aprMap, priceMap, naviTvlMap, bucketTvl);
      poolDataMap.set(pool.pool.id, poolData);
    }
    return poolDataMap;
  }

  async getAllPools(): Promise<Map<string, Pool>> {
    const pools = new Map<string, Pool>();
    const poolKeys = Object.keys(poolDetailsMap);
    const poolObjects = await this.blockchain.getMultiPool();
    const investorObjects = await this.blockchain.getMultiInvestor();
    const parentPoolObjects = await this.blockchain.getMultiParentPool();

    for (const poolKey of poolKeys) {
      const poolDetail = poolDetailsMap[poolKey];
      const poolObject = poolObjects.get(poolDetail.poolId);
      const investorObject = investorObjects.get(poolDetail.investorId);
      const parentPoolObject = parentPoolObjects.get(poolDetail.parentPoolId);
      if (!poolObject) {
        console.error(`Pool ${poolKey} not found in blockchain`);
        continue;
      }
      const pool = new Pool(poolObject, investorObject, parentPoolObject);
      pools.set(poolKey, pool);
    }
    return pools;
  }

  async getAprMap(): Promise<Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>> {
    const apiUrl = 'https://api.alphafi.xyz/apr';
    const response = await fetch(`${apiUrl}`);
    const dataArr = (await response.json()) as {
      name: string;
      apr: any;
    }[];
    const aprMap = new Map<
      string,
      {
        parentApr: Decimal;
        alphaMiningApr: Decimal;
      }
    >();

    for (const data of dataArr) {
      const poolId = poolDetailsMapByPoolName[data.name].poolId;
      if (!poolId) {
        console.error(`Pool ${data.name} not found in poolDetailsMap`);
        continue;
      }
      const entries = Object.entries(data.apr) as [string, number][];
      const parentApr = entries.find(([key]) => key !== 'alphaApr')?.[1];
      aprMap.set(poolId, {
        parentApr: new Decimal(parentApr ?? 0),
        alphaMiningApr: new Decimal(data.apr.alphaApr),
      });
    }

    return aprMap;
  }

  async getPriceMap(): Promise<Map<string, Decimal>> {
    const apiUrl = 'https://api.alphalend.xyz/public/graphql';
    const query = `
      query {
        coinInfo {
          coinType
          coingeckoPrice
        }
      }
    `;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const dataArr = (await response.json()).data.coinInfo;
    const priceMap = new Map<string, Decimal>();
    for (const data of dataArr) {
      priceMap.set(data.coinType, new Decimal(data.coingeckoPrice));
    }
    priceMap.set(
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      priceMap.get('0x2::sui::SUI') || new Decimal(0),
    );
    return priceMap;
  }

  async getNaviTvlMap(): Promise<Map<string, Decimal>> {
    const naviUrl = 'https://api.alphafi.xyz/navi-params';
    const response = await fetch(naviUrl);
    const dataArr = await response.json();
    const naviTvlMap = new Map<string, Decimal>();

    for (const data of dataArr) {
      if (!poolDetailsMapByPoolName[data.poolName]) continue;
      const poolId = poolDetailsMapByPoolName[data.poolName].poolId;
      if (!poolId) {
        console.error(`Pool ${data.poolName} not found in poolDetailsMap`);
        continue;
      }
      naviTvlMap.set(poolId, new Decimal(data.naviPoolTVL));
    }
    return naviTvlMap;
  }

  async getNaviLoopingPoolDebt(): Promise<Map<string, string>> {
    const debtMap = new Map<string, string>();
    const poolKeys = Object.keys(poolDetailsMap);
    for (const poolKey of poolKeys) {
      if (poolDetailsMap[poolKey].strategyType === 'SINGLE-ASSET-LOOPING') {
        const debt = await this.getSingularNaviLoopingPoolDebt(poolKey);
        debtMap.set(poolKey, debt);
      }
    }
    return debtMap;
  }

  async getVoloExchangeRate(): Promise<Decimal> {
    const apiUrl = 'https://open-api.naviprotocol.io/api/volo/stats';
    try {
      const response = await fetch(apiUrl);
      const data = (await response.json()) as any;
      return new Decimal(data.data.exchangeRate);
    } catch (error) {
      console.log('error in api', error);
      return new Decimal(0);
    }
  }

  async getStsuiExchangeRate(): Promise<Decimal> {
    const suiTostSuiExchangeRate = await stSuiExchangeRate(getStSuiConf().LST_INFO, true);
    return new Decimal(suiTostSuiExchangeRate);
  }

  private async getSingularNaviLoopingPoolDebt(poolId: string): Promise<string> {
    const debt = (
      (
        await this.suiClient.getDynamicFieldObject({
          parentId: poolDetailsMap[poolId].investorId,
          name: {
            type: 'vector<u8>',
            value: 'debt'.split('').map((char) => char.charCodeAt(0)),
          },
        })
      ).data?.content as LoopingDebt
    ).fields.value.toString();
    return debt;
  }

  private async getBucketTVL(): Promise<Decimal> {
    try {
      const fountain = (
        await this.suiClient.getObject({
          id: getConf().FOUNTAIN,
          options: { showContent: true },
        })
      ).data as any;
      const flask = (
        await this.suiClient.getObject({
          id: getConf().FLASK,
          options: { showContent: true },
        })
      ).data as any;

      const totalSbuckInFountain = fountain.content.fields.staked;
      const buckPerSbuck = new Decimal(flask.content.fields.reserves).div(
        flask.content.fields.sbuck_supply.fields.value,
      );
      const totalBuckInFountain = new Decimal(totalSbuckInFountain).mul(buckPerSbuck);

      return totalBuckInFountain.div(new Decimal(1e9));
    } catch {
      throw new Error('error in bucket protocol tvl');
    }
  }
}
