/**
 * Blockchain interface wrapper for Sui network operations using GraphQL and JSON-RPC clients.
 */

import { CoinStruct, SuiClient } from '@mysten/sui/client';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import { Transaction } from '@mysten/sui/transactions';

export type BlockchainOptions = {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  suiClient?: SuiClient;
  gqlClient?: SuiGraphQLClient<any>;
};

export class Blockchain {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  gqlClient: SuiGraphQLClient<any>;
  suiClient: SuiClient;

  constructor(options: BlockchainOptions) {
    this.network = options.network;
    this.suiClient =
      options.suiClient ||
      new SuiClient({
        url:
          options.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io/'
            : 'https://fullnode.mainnet.sui.io/',
      });
    this.gqlClient =
      options.gqlClient ||
      new SuiGraphQLClient({
        url:
          options.network === 'testnet'
            ? 'https://graphql.testnet.sui.io/graphql'
            : 'https://graphql.mainnet.sui.io/graphql',
      });
  }

  async getCoinObject(tx: Transaction, coinType: string, address: string, amount?: bigint) {
    if (this.isCoinTypeSui(coinType)) {
      if (amount) {
        return tx.splitCoins(tx.gas, [amount]);
      } else {
        return tx.gas;
      }
    }

    let currentCursor: string | null | undefined = null;
    let coins1: CoinStruct[] = [];
    do {
      const response = await this.suiClient.getCoins({
        owner: address,
        coinType,
        cursor: currentCursor,
      });
      coins1 = coins1.concat(response.data);
      if (response.hasNextPage && response.nextCursor) {
        currentCursor = response.nextCursor;
      } else break;
    } while (true);

    if (coins1.length === 0) {
      throw new Error(`No coins found for ${coinType} for owner ${address}`);
    }

    const [coin] = tx.splitCoins(tx.object(coins1[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins1.map((c) => c.coinObjectId),
    );

    if (amount) {
      const returnCoin = tx.splitCoins(coin, [amount]);
      tx.transferObjects([coin], address);
      return returnCoin;
    } else {
      return coin;
    }
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

  /** Estimate gas budget for transaction execution. */
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

  private isCoinTypeSui(coinType: string) {
    return (
      coinType === '0x2::sui::SUI' ||
      coinType === '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
    );
  }
}
