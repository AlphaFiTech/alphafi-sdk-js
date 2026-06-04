/**
 * Blockchain interface wrapper for Sui network operations using GraphQL and JSON-RPC clients.
 */

import { SuiJsonRpcClient, SuiObjectData } from '@mysten/sui/jsonRpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schema';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import type { SimulationGasSummary, SimulationResult } from './types.js';
import { Network } from '@alphafi/alphalend-sdk';

export type BlockchainOptions = {
  network: Network;
  txBuildClient?: SuiJsonRpcClient;
  graphqlUrl?: string;
};

export class Blockchain {
  network: Network;
  graphqlUrl: string;
  gqlClient: SuiGraphQLClient;
  txBuildClient: SuiJsonRpcClient;

  constructor(options: BlockchainOptions) {
    this.network = options.network;
    this.graphqlUrl =
      options.graphqlUrl ??
      (options.network === 'testnet'
        ? 'https://graphql.testnet.sui.io/graphql'
        : 'https://graphql.mainnet.sui.io/graphql');
    this.txBuildClient = new SuiJsonRpcClient({
      url:
        options.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io/'
          : 'https://fullnode.mainnet.sui.io/',
      network: options.network === 'testnet' ? 'testnet' : 'mainnet',
    });
    this.gqlClient = new SuiGraphQLClient({
      url: this.graphqlUrl,
      network: options.network === 'testnet' ? 'testnet' : 'mainnet',
    });
  }

  /**
   * Source an exact-`amount` coin of `coinType` for spending, drawing from BOTH
   * the user's address balance (the accumulator) AND their `Coin<T>` objects.
   */
  getCoinObject(tx: Transaction, coinType: string, address: string, amount: bigint) {
    tx.setSenderIfNotSet(address);
    return tx.coin({ type: coinType, balance: amount });
  }

  getOptionReceipt(tx: Transaction, receiptType: string, receiptId?: string) {
    let receiptOption;
    if (receiptId) {
      receiptOption = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receiptType],
        arguments: [tx.object(receiptId)],
      });
    } else {
      receiptOption = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: [receiptType],
        arguments: [],
      });
    }
    return receiptOption;
  }

  /** Simulate a transaction via GraphQL and return a typed simulation result. */
  async simulateTransaction(
    tx: Transaction,
    sender: string,
  ): Promise<SimulationResult | undefined> {
    tx.setSenderIfNotSet(sender);
    const txBytes = await tx.build({ client: this.txBuildClient });
    const txBase64 = toBase64(txBytes);

    const query = graphql(`
      query simulate($tx: JSON!) {
        simulateTransaction(transaction: $tx, checksEnabled: true, doGasSelection: false) {
          effects {
            status
            balanceChangesJson
            gasEffects {
              gasSummary {
                computationCost
                storageCost
                storageRebate
                nonRefundableStorageFee
              }
            }
          }
          outputs {
            returnValues {
              argument {
                __typename
              }
              value {
                type {
                  repr
                }
                json
                display {
                  output
                }
              }
            }
          }
        }
      }
    `);

    const result = await this.gqlClient.query({
      query,
      variables: { tx: { bcs: { value: txBase64 } } },
    });

    return result.data?.simulateTransaction as SimulationResult | undefined;
  }

  /** Estimate gas budget for transaction execution. */
  async getEstimatedGasBudget(tx: Transaction, sender: string): Promise<number | undefined> {
    try {
      const simResult = await this.simulateTransaction(tx, sender);
      const gasSummary: SimulationGasSummary | null | undefined =
        simResult?.effects?.gasEffects?.gasSummary;
      if (!gasSummary) {
        throw new Error('Simulation returned no gas summary');
      }
      return Number(gasSummary.computationCost) + Number(gasSummary.nonRefundableStorageFee) + 1e8;
    } catch (err) {
      console.error(`Error estimating transaction gasBudget`, err);
      return undefined;
    }
  }

  /**
   * Get all coin balances owned by an address using GraphQL, paginated.
   * Uses `totalBalance` (= address-balance accumulator + `Coin<T>` objects), so
   * funds held in the address balance are included.
   */
  async getAllBalances(address: string): Promise<{ coinType: string; totalBalance: string }[]> {
    const query = graphql(`
      query getBalances($address: SuiAddress!, $cursor: String) {
        address(address: $address) {
          balances(after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              coinType {
                repr
              }
              totalBalance
            }
          }
        }
      }
    `);

    const balances: { coinType: string; totalBalance: string }[] = [];
    let currentCursor: string | null | undefined = null;
    do {
      const response: any = await this.gqlClient.query({
        query,
        variables: { address, cursor: currentCursor },
      });
      const balancesConn: any = response.data?.address?.balances;
      if (balancesConn?.nodes) {
        for (const node of balancesConn.nodes) {
          if (node?.coinType?.repr && node?.totalBalance) {
            balances.push({
              coinType: node.coinType.repr,
              totalBalance: node.totalBalance,
            });
          }
        }
      }
      if (balancesConn?.pageInfo?.hasNextPage && balancesConn.pageInfo.endCursor) {
        currentCursor = balancesConn.pageInfo.endCursor;
      } else break;
    } while (true);

    return balances;
  }

  /** Get object contents by ID using GraphQL. */
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

  /** Get multiple objects in batches using GraphQL. */
  async multiGetObjects(objectIds: string[]): Promise<Map<string, any>> {
    if (objectIds.length === 0) {
      return new Map();
    }

    const query = graphql(`
      query multiGetObjects($objectIds: [ObjectKey!]!) {
        multiGetObjects(keys: $objectIds) {
          address
          asMoveObject {
            contents {
              json
            }
          }
        }
      }
    `);

    const batches: string[][] = [];
    for (let i = 0; i < objectIds.length; i += 50) {
      batches.push(objectIds.slice(i, i + 50));
    }

    const resMap: Map<string, any> = new Map();
    const results = await Promise.all(
      batches.map((batch) =>
        this.gqlClient.query({
          query,
          variables: { objectIds: batch.map((id) => ({ address: id })) },
        }),
      ),
    );

    results.forEach((result) => {
      result.data?.multiGetObjects?.forEach((obj) => {
        if (obj) {
          resMap.set(obj.address, obj.asMoveObject?.contents?.json);
        }
      });
    });

    return resMap;
  }

  /** Get receipt objects owned by address for specific type. */
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

  /** Get receipt objects for multiple types in batches. */
  async multiGetReceipts(address: string, types: string[]) {
    if (types.length === 0) {
      return new Map();
    }

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

  /** Generate dynamic GraphQL query for multiple receipt types. */
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

  /** Returns the object data of the first dynamic field whose key type contains `keyTypeFragment`, or null. */
  async getDynamicFieldByKeyType(
    parentId: string,
    keyTypeFragment: string,
  ): Promise<SuiObjectData | null> {
    try {
      const fields = await this.txBuildClient.getDynamicFields({ parentId });
      const match = fields.data.find((f) => f.name.type.includes(keyTypeFragment));
      if (!match) return null;

      const obj = await this.txBuildClient.getObject({
        id: match.objectId,
        options: { showContent: true },
      });
      return obj?.data ?? null;
    } catch (err) {
      console.error('[AlphaFiSDK] getDynamicFieldByKeyType error:', err);
      return null;
    }
  }
}
