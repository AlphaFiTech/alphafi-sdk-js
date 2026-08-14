/**
 * Blockchain interface wrapper for Sui network operations.
 *
 * Reads and transaction simulation go through GraphQL (`gqlClient`), using
 * `gqlClient.core.simulateTransaction` for simulation (server-side build + gas
 * resolution). A gRPC (v2 Core) client (`suiGrpcClient`) serves object reads
 * and anything needing a Core-capable client (e.g. the Navi reward `devInspect`).
 */

import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { graphql } from '@mysten/sui/graphql/schema';
import { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { Network } from '@alphafi/alphalend-sdk';

export type BlockchainOptions = {
  network: Network;
  graphqlUrl?: string;
  grpcUrl?: string;
  /** Auth token for the gRPC endpoint, sent as `x-token` metadata (e.g. a BlockPI key). */
  grpcToken?: string;
};

export class Blockchain {
  network: Network;
  graphqlUrl: string;
  gqlClient: SuiGraphQLClient;
  /** gRPC (v2 Core) client for object reads and anything needing a Core-capable client. */
  suiGrpcClient: SuiGrpcClient;

  constructor(options: BlockchainOptions) {
    this.network = options.network;
    this.graphqlUrl =
      options.graphqlUrl ??
      (options.network === 'testnet'
        ? 'https://graphql.testnet.sui.io/graphql'
        : 'https://graphql.mainnet.sui.io/graphql');
    this.gqlClient = new SuiGraphQLClient({
      url: this.graphqlUrl,
      network: options.network === 'testnet' ? 'testnet' : 'mainnet',
    });
    // SuiGrpcClient's convenience constructor forwards only `baseUrl`/`fetchInit`
    // to the transport it builds and silently drops `meta`, so the token would
    // never be sent. Build the transport explicitly — its `defaultOptions.meta`
    // is merged into every call as gRPC metadata (the `x-token` auth header).
    this.suiGrpcClient = new SuiGrpcClient({
      network: options.network === 'testnet' ? 'testnet' : 'mainnet',
      transport: new GrpcWebFetchTransport({
        baseUrl:
          options.grpcUrl ??
          (options.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io'
            : 'https://fullnode.mainnet.sui.io'),
        ...(options.grpcToken ? { meta: { 'x-token': options.grpcToken } } : {}),
      }),
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

  /**
   * Credit a `Coin<coinType>` to `address`'s address balance (the accumulator)
   */
  sendCoinToAddressBalance(
    tx: Transaction,
    coinType: string,
    address: string,
    coin: TransactionObjectArgument | string,
  ) {
    tx.moveCall({
      target: '0x2::coin::send_funds',
      typeArguments: [coinType],
      arguments: [typeof coin === 'string' ? tx.object(coin) : coin, tx.pure.address(address)],
    });
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

  /**
   * Simulate a transaction via the GraphQL client's core API, which builds the
   * transaction, resolves gas, and simulates server-side. Returns the parsed
   * transaction effects and per-command results (return values as raw BCS).
   */
  async simulateTransaction(tx: Transaction, sender: string) {
    tx.setSenderIfNotSet(sender);
    const result = await this.gqlClient.core.simulateTransaction({
      transaction: tx,
      include: { effects: true, commandResults: true },
    });
    const txData = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
    return { effects: txData?.effects, commandResults: result.commandResults };
  }

  /** Estimate gas budget for transaction execution. */
  async getEstimatedGasBudget(tx: Transaction, sender: string): Promise<number | undefined> {
    try {
      const { effects } = await this.simulateTransaction(tx, sender);
      const gasUsed = effects?.gasUsed;
      if (!gasUsed) {
        throw new Error('Simulation returned no gas summary');
      }
      return Number(gasUsed.computationCost) + Number(gasUsed.nonRefundableStorageFee) + 1e8;
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

  /**
   * Returns the first dynamic field under `parentId` whose key type contains
   * `keyTypeFragment`, or null. Reads via GraphQL, paginating the dynamic-field
   * connection until a match is found.
   *
   * `fieldAddress` is the `Field<K, V>` wrapper object's address (equivalent to
   * the JSON-RPC `objectId`); `valueJson` carries the unwrapped value struct
   * fields (`MoveValue.json`, or `MoveObject.contents.json` for dynamic object
   * fields).
   */
  async getDynamicFieldByKeyType(
    parentId: string,
    keyTypeFragment: string,
  ): Promise<{ fieldAddress: string; valueJson: Record<string, unknown> } | null> {
    const query = graphql(`
      query getDynamicFieldByKeyType($parent: SuiAddress!, $cursor: String) {
        address(address: $parent) {
          dynamicFields(after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              address
              name {
                type {
                  repr
                }
              }
              value {
                __typename
                ... on MoveValue {
                  json
                }
                ... on MoveObject {
                  address
                  contents {
                    json
                  }
                }
              }
            }
          }
        }
      }
    `);

    try {
      let cursor: string | null | undefined = null;
      do {
        const response: any = await this.gqlClient.query({
          query,
          variables: { parent: parentId, cursor },
        });
        const connection = response.data?.address?.dynamicFields;
        for (const node of connection?.nodes ?? []) {
          const keyType: string = node?.name?.type?.repr ?? '';
          if (!keyType.includes(keyTypeFragment)) continue;

          const value = node?.value;
          const valueJson =
            value?.__typename === 'MoveObject' ? value?.contents?.json : value?.json;
          if (valueJson && typeof valueJson === 'object') {
            return {
              fieldAddress: node.address as string,
              valueJson: valueJson as Record<string, unknown>,
            };
          }
        }
        if (connection?.pageInfo?.hasNextPage && connection.pageInfo.endCursor) {
          cursor = connection.pageInfo.endCursor;
        } else break;
      } while (true);
      return null;
    } catch (err) {
      console.error('[AlphaFiSDK] getDynamicFieldByKeyType error:', err);
      return null;
    }
  }
}
