import { getFullnodeUrl, SuiClient, SuiObjectData } from '@mysten/sui/client';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import { Transaction } from '@mysten/sui/transactions';
import { conf, CONF_ENV } from 'src/common/constants.js';
import { poolDetailsMap } from 'src/common/maps.js';
import { AlphaFiReceiptType, AlphaPositionType, PoolType, ReceiptType } from 'src/utils/parsedTypes.js';
import { parsers } from 'src/utils/parser.js';
import { AlphaFiReceiptQueryType, AlphaPoolQueryType, AlphaPositionQueryType, AlphaReceiptQueryType, DefaultPoolQueryType, DefaultReceiptQueryType, FungiblePoolQueryType } from 'src/utils/queryTypes.js';

export class Blockchain {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  gqlClient: SuiGraphQLClient<any>;
  suiClient: SuiClient;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.network = network;
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(network),
    });
    this.gqlClient = new SuiGraphQLClient({
      url:
        network === 'testnet'
          ? 'https://graphql.testnet.sui.io/graphql'
          : 'https://graphql.mainnet.sui.io/graphql',
    });
  }

  /**
   * Get estimated gas budget for a transaction
   */
  async getEstimatedGasBudget(tx: Transaction, sender: string): Promise<number | undefined> {
    try {
      const simResult = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender,
      });
      return (
        Number(simResult.effects.gasUsed.computationCost) +
        Number(simResult.effects.gasUsed.nonRefundableStorageFee) +
        1e8
      );
    } catch (err) {
      console.error(`Error estimating transaction gasBudget`, err);
      return undefined;
    }
  }

  async getObject(objectId: string) {
    const query = graphql(`
      query getObject($objectId: SuiAddress!) {
        object(address: $objectId) {
          asMoveObject {
            contents {
              json
            }
          }
        }
      }
    `);

    const result = await this.gqlClient.query({
      query,
      variables: { objectId },
    });

    return result.data?.object?.asMoveObject?.contents?.json;
  }

  async multiGetObjects(objectIds: string[]) {
    const query = graphql(`
      query multiGetObjects($objectIds: [ObjectKey!]!) {
        multiGetObjects(keys: $objectIds) {
          asMoveObject {
            contents {
              json
            }
          }
        }
      }
    `);

    const result = await this.gqlClient.query({
      query,
      variables: { objectIds: objectIds.map((id) => ({ address: id })) },
    });

    return result.data?.multiGetObjects?.map((obj) => obj?.asMoveObject?.contents?.json);
  }

  async getReceipt(address: string, type: string) {
    const query = graphql(`
      query getReceipt($address: SuiAddress!, $type: String!) {
        objects(filter: { owner: $address, type: $type }) {
          nodes {
            asMoveObject {
              contents {
                json
              }
            }
          }
        }
      }
    `);

    const result = await this.gqlClient.query({
      query,
      variables: { address, type },
    });

    return result.data?.objects?.nodes.map((obj) => obj?.asMoveObject?.contents?.json);
  }

  async multiGetReceipts(address: string, types: string[]) {
    const batches: string[][] = [];
    for (let i = 0; i < types.length; i += 10) {
      batches.push(types.slice(i, i + 10));
    }

    const promises: Promise<any>[] = [];
    for (const batch of batches) {
      promises.push(
        this.gqlClient.query({
          query: this.getMultiReceiptsQuery(batch),
          variables: { address },
        }),
      );
    }

    const results = await Promise.all(promises);
    const receiptsMap: Map<string, any[]> = new Map();

    for (const result of results) {
      for (const receipts of Object.values(result.data)) {
        if ((receipts as any).nodes.length > 0) {
          receiptsMap.set(
            (receipts as any).nodes[0].asMoveObject.contents.type.repr,
            (receipts as any).nodes.map((obj: any) => obj?.asMoveObject?.contents?.json),
          );
        }
      }
    }

    return receiptsMap;
  }

  private getMultiReceiptsQuery(types: string[]) {
    let char = 65;
    let query = `query multiGetReceipts($address: SuiAddress!) {`;
    types.forEach((type) => {
      query += `
        ${String.fromCharCode(char)}: objects(
          filter: {owner: $address, type: "${type}"}
        ) {
          nodes {
            asMoveObject {
              contents {
                type {
                  repr
                }
                json
              }
            }
          }
        }
      `;
      char++;
    });

    query += `}`;
    return graphql(query);
  }
  async getPool(poolId: string): Promise<PoolType> {
    const poolObjectId = poolId;
    const pool = await this.suiClient.getObject({
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
  async getAlphaPosition(positionId: string): Promise<AlphaPositionType> {
    const position = await this.suiClient.getObject({
      id: positionId,
      options: {
        showContent: true,
      },
    });
    return parsers.parseAlphaPosition(position.data as AlphaPositionQueryType);
  }

  async getAlphaFiReceipt(address: string): Promise<AlphaFiReceiptType[]> {
    const receipts = await this.suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: conf[CONF_ENV].ALPHAFI_RECEIPT_TYPE,
      },
      options: {
        showContent: true,
      },
    });
    return receipts.data.map((receipt) => parsers.parseAlphaFiReceipt(receipt.data as AlphaFiReceiptQueryType)) as AlphaFiReceiptType[];
  }
  async getReceiptOld(poolId: string, address: string): Promise<ReceiptType | null> {
    const res: SuiObjectData[] = [];
    let currentCursor: string | null | undefined = null;
    while (true) {
      const paginatedObjects = await this.suiClient.getOwnedObjects({
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

    const receipts: ReceiptType[] = [];

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
}
