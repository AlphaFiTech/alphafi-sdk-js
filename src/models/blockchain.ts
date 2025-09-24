import { SuiClient, SuiObjectData } from '@mysten/sui/client';
import { conf, CONF_ENV } from '../common/constants.js';
import { poolDetailsMap } from '../common/maps.js';
import {
  PoolType,
  ParentPoolType,
  InvestorType,
  ReceiptType,
  DistributorType,
} from '../utils/parsedTypes.js';
import {
  // pool
  AlphaPoolQueryType,
  DefaultPoolQueryType,
  FungiblePoolQueryType,
  // parent pool
  BluefinParentPoolQueryType,
  CetusParentPoolQueryType,
  NaviParentPoolQueryType,
  // investor
  CetusInvestorQueryType,
  BluefinInvestorQueryType,
  // receipt
  DefaultReceiptQueryType,
  AlphaReceiptQueryType,
  // distributor
  DistributorQueryType,
  BucketInvestorQueryType,
  NaviInvestorQueryType,
  NaviLoopInvestorQueryType,
} from '../utils/queryTypes.js';
import { parsers } from '../utils/parser.js';

export class Blockchain {
  client: SuiClient;
  constants: any;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';

  constructor(client: SuiClient, network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.client = client;
    this.network = network;
    this.constants = conf[CONF_ENV];
  }

  async getMultiPool(): Promise<Map<string, PoolType>> {
    let pools = Object.keys(poolDetailsMap);
    pools = pools.filter((pool) => {
      return poolDetailsMap[pool].poolId !== '';
    });

    const result: Map<string, PoolType> = new Map();

    const batchSize = 49;
    const batches: string[][] = [];
    for (let i = 0; i < pools.length; i += batchSize) {
      const batchEntries: string[] = pools.slice(i, i + batchSize);
      batches.push(batchEntries);
    }

    for (const batch of batches) {
      try {
        const poolsData = await this.client.multiGetObjects({
          ids: batch.map((p) => poolDetailsMap[p].poolId),
          options: {
            showContent: true,
          },
        });
        for (let i = 0; i < batch.length; i = i + 1) {
          if (poolsData[i].data) {
            switch (poolDetailsMap[batch[i]].strategyType) {
              case 'ALPHA-VAULT':
                result.set(
                  batch[i],
                  parsers.parseAlphaPool(poolsData[i].data as AlphaPoolQueryType),
                );
                break;
              case 'FUNGIBLE-DOUBLE-ASSET-POOL':
                result.set(
                  batch[i],
                  parsers.parseFungiblePool(poolsData[i].data as FungiblePoolQueryType),
                );
                break;
              default:
                result.set(batch[i], parsers.parsePool(poolsData[i].data as DefaultPoolQueryType));
            }
          }
        }
      } catch (error) {
        console.trace(`Error getting multiPools - ${error}`);
      }
    }
    return result;
  }

  async getPool(poolId: string): Promise<PoolType> {
    const poolObjectId = poolDetailsMap[poolId].poolId;
    const pool = await this.client.getObject({
      id: poolObjectId,
      options: {
        showContent: true,
      },
    });

    if (pool.data) {
      switch (poolDetailsMap[poolId].strategyType) {
        case 'ALPHA-VAULT':
          return parsers.parseAlphaPool(pool.data as AlphaPoolQueryType);
        case 'FUNGIBLE-DOUBLE-ASSET-POOL':
          return parsers.parseFungiblePool(pool.data as FungiblePoolQueryType);
        default:
          return parsers.parsePool(pool.data as DefaultPoolQueryType);
      }
    }

    throw new Error(`Pool for poolId - ${poolId} not found`);
  }

  async getMultiParentPool(): Promise<Map<string, ParentPoolType>> {
    let pools = Object.keys(poolDetailsMap);
    pools = pools.filter((pool) => {
      return (
        poolDetailsMap[pool].parentPoolId !== '' &&
        (poolDetailsMap[pool].parentProtocolName === 'CETUS' ||
          poolDetailsMap[pool].parentProtocolName === 'BLUEFIN')
      );
    });
    const parentPoolSet: Map<string, string> = new Map();

    pools.forEach((pool) => {
      parentPoolSet.set(poolDetailsMap[pool].parentPoolId, poolDetailsMap[pool].parentProtocolName);
    });
    const protocolIds: {
      id: string;
      protocolName: string;
    }[] = [];
    parentPoolSet.forEach((value, key) => {
      protocolIds.push({
        id: key,
        protocolName: value,
      });
    });

    const result: Map<string, ParentPoolType> = new Map();

    const batchSize = 49;
    const batches: {
      id: string;
      protocolName: string;
    }[][] = [];
    for (let i = 0; i < protocolIds.length; i += batchSize) {
      const batchEntries: {
        id: string;
        protocolName: string;
      }[] = protocolIds.slice(i, i + batchSize);
      batches.push(batchEntries);
    }

    for (const batch of batches) {
      try {
        const poolsData = await this.client.multiGetObjects({
          ids: batch.map((p) => p.id),
          options: {
            showContent: true,
          },
        });

        for (let i = 0; i < batch.length; i = i + 1) {
          if (poolsData[i].data) {
            switch (batch[i].protocolName) {
              case 'BLUEFIN':
                result.set(
                  batch[i].id,
                  parsers.parseBluefinParentPool(poolsData[i].data as BluefinParentPoolQueryType),
                );
                break;
              default:
                result.set(
                  batch[i].id,
                  parsers.parseCetusParentPool(poolsData[i].data as CetusParentPoolQueryType),
                );
            }
          }
        }
      } catch (error) {
        console.trace(`Error getting multiPools - ${error}`);
      }
    }
    return result;
  }

  async getParentPool(poolId: string): Promise<ParentPoolType> {
    const parentPoolObjectId = poolDetailsMap[poolId].parentPoolId;
    const parentPool = await this.client.getObject({
      id: parentPoolObjectId,
      options: {
        showContent: true,
      },
    });

    if (parentPool.data) {
      switch (poolDetailsMap[poolId].parentProtocolName) {
        case 'BLUEFIN':
          return parsers.parseBluefinParentPool(parentPool.data as BluefinParentPoolQueryType);
        case 'NAVI':
          return parsers.parseNaviParentPool(parentPool.data as NaviParentPoolQueryType);
        case 'ALPHALEND':
          return parsers.parseNaviParentPool(parentPool.data as NaviParentPoolQueryType);
        default:
          return parsers.parseCetusParentPool(parentPool.data as CetusParentPoolQueryType);
      }
    }

    throw new Error(`Parent pool for poolId - ${poolId} not found`);
  }

  async getMultiInvestor(): Promise<Map<string, InvestorType>> {
    let pools = Object.keys(poolDetailsMap);
    pools = pools.filter((pool) => {
      return (
        poolDetailsMap[pool].investorId !== '' &&
        poolDetailsMap[pool].strategyType !== 'ALPHA-VAULT'
      );
    });

    const result: Map<string, InvestorType> = new Map();

    const batchSize = 49;
    const batches: string[][] = [];
    for (let i = 0; i < pools.length; i += batchSize) {
      const batchEntries: string[] = pools.slice(i, i + batchSize);
      batches.push(batchEntries);
    }

    for (const batch of batches) {
      try {
        const investorsData = await this.client.multiGetObjects({
          ids: batch.map((p) => poolDetailsMap[p].investorId),
          options: {
            showContent: true,
          },
        });
        for (let i = 0; i < batch.length; i = i + 1) {
          if (investorsData[i].data) {
            switch (poolDetailsMap[batch[i]].parentProtocolName) {
              case 'BLUEFIN':
                result.set(
                  poolDetailsMap[batch[i]].investorId,
                  parsers.parseBluefinInvestor(investorsData[i].data as BluefinInvestorQueryType),
                );
                break;
              case 'BUCKET':
                result.set(
                  poolDetailsMap[batch[i]].investorId,
                  parsers.parseBucketInvestor(investorsData[i].data as BucketInvestorQueryType),
                );
                break;
              case 'NAVI':
                if (poolDetailsMap[batch[i]].strategyType === 'SINGLE-ASSET-LOOPING') {
                  result.set(
                    poolDetailsMap[batch[i]].investorId,
                    parsers.parseNaviLoopInvestor(
                      investorsData[i].data as NaviLoopInvestorQueryType,
                    ),
                  );
                } else {
                  result.set(
                    poolDetailsMap[batch[i]].investorId,
                    parsers.parseNaviInvestor(investorsData[i].data as NaviInvestorQueryType),
                  );
                }
                break;
              case 'ALPHALEND':
                result.set(
                  poolDetailsMap[batch[i]].investorId,
                  parsers.parseNaviLoopInvestor(investorsData[i].data as NaviLoopInvestorQueryType),
                );
                break;
              default:
                result.set(
                  poolDetailsMap[batch[i]].investorId,
                  parsers.parseCetusInvestor(investorsData[i].data as CetusInvestorQueryType),
                );
            }
          }
        }
      } catch (error) {
        console.trace(`Error getting multiInvestors - ${error}`);
      }
    }
    return result;
  }

  async getInvestor(poolId: string): Promise<InvestorType> {
    const investorObjectId = poolDetailsMap[poolId].investorId;
    const investor = await this.client.getObject({
      id: investorObjectId,
      options: {
        showContent: true,
      },
    });

    if (investor.data) {
      switch (poolDetailsMap[poolId].parentProtocolName) {
        case 'BLUEFIN':
          return parsers.parseBluefinInvestor(investor.data as BluefinInvestorQueryType);
        case 'BUCKET':
          return parsers.parseBucketInvestor(investor.data as BucketInvestorQueryType);
        case 'NAVI':
          if (poolDetailsMap[poolId].strategyType === 'SINGLE-ASSET-LOOPING') {
            return parsers.parseNaviLoopInvestor(investor.data as NaviLoopInvestorQueryType);
          } else {
            return parsers.parseNaviInvestor(investor.data as NaviInvestorQueryType);
          }
        case 'ALPHALEND':
          return parsers.parseNaviLoopInvestor(investor.data as NaviLoopInvestorQueryType);
        default:
          return parsers.parseCetusInvestor(investor.data as CetusInvestorQueryType);
      }
    }

    throw new Error(`Investor for poolId - ${poolId} not found`);
  }

  async getMultiReceipt(address: string): Promise<Map<string, ReceiptType>> {
    let pools = Object.keys(poolDetailsMap);
    pools = pools.filter((pool) => {
      return (
        poolDetailsMap[pool].receipt.type !== '' &&
        poolDetailsMap[pool].strategyType !== 'FUNGIBLE-DOUBLE-ASSET-POOL'
      );
    });
    const receiptTypes: Map<string, string> = new Map();
    pools.forEach((pool) => {
      receiptTypes.set(poolDetailsMap[pool].receipt.type, pool);
    });

    let res: SuiObjectData[] = [];
    let currentCursor: string | null | undefined = null;
    while (true) {
      const paginatedObjects = await this.client.getOwnedObjects({
        owner: address,
        cursor: currentCursor,
        options: {
          showContent: true,
        },
      });

      // Traverse the current page data and push to coins array
      paginatedObjects.data.forEach((obj) => {
        if (obj.data && receiptTypes.has((obj.data.content as any).type)) res.push(obj.data);
      });
      // Check if there's a next page
      if (paginatedObjects.hasNextPage && paginatedObjects.nextCursor) {
        currentCursor = paginatedObjects.nextCursor;
      } else {
        // No more pages available
        break;
      }
    }

    let receipts: ReceiptType[] = [];
    res.forEach((receipt) => {
      const key = receiptTypes.get((receipt.content as any).type);
      switch (key && poolDetailsMap[key].strategyType) {
        case 'ALPHA-VAULT':
          receipts.push(parsers.parseAlphaReceipt(receipt as AlphaReceiptQueryType));
          break;
        default:
          receipts.push(parsers.parseReceipt(receipt as DefaultReceiptQueryType));
      }
    });

    const receiptsMap: Map<string, ReceiptType> = new Map();
    receipts.forEach((receipt) => {
      if (!receiptsMap.has(receipt.pool_id)) {
        receiptsMap.set(receipt.pool_id, receipt);
      }
    });

    return receiptsMap;
  }

  async getReceipt(poolId: string, address: string): Promise<ReceiptType | null> {
    let res: SuiObjectData[] = [];
    let currentCursor: string | null | undefined = null;
    while (true) {
      const paginatedObjects = await this.client.getOwnedObjects({
        owner: address,
        cursor: currentCursor,
        filter: {
          StructType: poolDetailsMap[poolId].receipt.type,
        },
        options: {
          showContent: true,
        },
      });

      // Traverse the current page data and push to coins array
      paginatedObjects.data.forEach((obj) => {
        if (obj.data) res.push(obj.data);
      });
      // Check if there's a next page
      if (paginatedObjects.hasNextPage && paginatedObjects.nextCursor) {
        currentCursor = paginatedObjects.nextCursor;
      } else {
        // No more pages available
        break;
      }
    }

    let receipts: ReceiptType[] = [];

    res.forEach((receipt) => {
      if ((receipt.content as any).fields.name !== poolDetailsMap[poolId].receipt.name) {
        return;
      }

      switch (poolDetailsMap[poolId].strategyType) {
        case 'ALPHA-VAULT':
          receipts.push(parsers.parseAlphaReceipt(receipt as AlphaReceiptQueryType));
        default:
          receipts.push(parsers.parseReceipt(receipt as DefaultReceiptQueryType));
      }
    });

    return receipts.length > 0 ? receipts[0] : null;
  }

  async getDistributor(): Promise<DistributorType> {
    const distributorObjectId = this.constants.ALPHA_DISTRIBUTOR;
    const distributor = await this.client.getObject({
      id: distributorObjectId,
      options: {
        showContent: true,
      },
    });

    if (distributor.data) {
      return parsers.parseDistributor(distributor.data as DistributorQueryType);
    }

    throw new Error(`Distributor with object id - ${distributorObjectId} not found`);
  }
}
