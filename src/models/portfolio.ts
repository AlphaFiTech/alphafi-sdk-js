import { SuiClient } from '@mysten/sui/client';
import { Blockchain } from './blockchain.js';
import { Protocol } from './protocol.js';
import { Decimal } from 'decimal.js';
import { poolDetailsMap } from '../common/maps.js';
import { coinsListByType } from '../common/coinsList.js';
import { Pool } from './pool.js';
import { DynamicFieldInfo } from '@mysten/sui/client';

type LockedAlphaDynamicField = {
  dataType: 'moveObject';
  hasPublicTransfer: boolean;
  type: string;
  fields: {
    id: {
      id: string;
    };
    name: string;
    value: {
      type: string;
      fields: { next: string | null; prev: string | null; value: string };
    };
  };
};

type PortfolioData = {
  userDeposit: Decimal;
  userApy: Decimal;
  alphaReward: Decimal;
  alphaDeposit: {
    lockedAmount: Decimal;
    totalAmount: Decimal;
  };
  poolDeposits: Map<string, Decimal[]>;
};

export class Portfolio {
  protocol: Protocol;
  blockchain: Blockchain;
  suiClient: SuiClient;
  userAddress: string;

  constructor(
    protocol: Protocol,
    blockchain: Blockchain,
    suiClient: SuiClient,
    userAddress: string,
  ) {
    this.protocol = protocol;
    this.blockchain = blockchain;
    this.suiClient = suiClient;
    this.userAddress = userAddress;
  }

  async getAllReceipts(pools: Map<string, Pool>) {
    const receiptTypes = Array.from(pools.values()).map((pool) => pool.poolDetails.receipt.type);
    const receipts = await this.blockchain.multiGetReceipts(this.userAddress, receiptTypes);
    return receipts;
  }

  async getWalletCoins(): Promise<Map<string, string>> {
    const res = await this.suiClient.getAllBalances({
      owner: this.userAddress,
    });

    const resMap: Map<string, string> = new Map();
    res.forEach((entry: { coinType: string; totalBalance: string }) => {
      resMap.set(entry.coinType, entry.totalBalance);
    });
    return resMap;
  }

  async fetchUserLockedBalances(lockedTableID: string): Promise<
    {
      timestamp: string;
      xTokenBalance: string;
    }[]
  > {
    let currentCursor: string | null = null;
    const data: DynamicFieldInfo[] = [];
    do {
      const response = await this.suiClient.getDynamicFields({
        parentId: lockedTableID,
        cursor: currentCursor,
      });
      data.push(...response.data);
      if (response.hasNextPage) {
        currentCursor = response.nextCursor;
      } else {
        break;
      }
    } while (true);

    const res = await this.suiClient.multiGetObjects({
      ids: data.map((item) => item.objectId),
      options: {
        showContent: true,
      },
    });

    return res.map((item) => {
      const fields = (item.data?.content as LockedAlphaDynamicField).fields;
      return {
        timestamp: fields.name,
        xTokenBalance: fields.value.fields.value,
      };
    });
  }

  async getFungileDeposits(
    pools: Map<string, Pool>,
    walletCoins: Map<string, string>,
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
  ): Promise<Map<string, Decimal[]>> {
    const result = new Map<string, Decimal[]>();

    for (const poolDetails of Object.values(poolDetailsMap)) {
      if (poolDetails.strategyType === 'FUNGIBLE-DOUBLE-ASSET-POOL') {
        const totalXTokens = new Decimal(
          walletCoins.get(poolDetails.fungibleCoinType || '') || '0',
        );
        const pool = pools.get(poolDetails.poolId);
        if (totalXTokens.gt(0) && pool) {
          const poolExchangeRate = pool.poolExchangeRate(priceMap, naviLoopingPoolDebt);
          const liquidity = totalXTokens.mul(poolExchangeRate);
          const res = pool.coinAmountsFromLiquidity(liquidity.toString());
          const amounts = [
            res[0].div(Math.pow(10, coinsListByType[poolDetails.assetTypes[0]].expo)),
            res[1].div(Math.pow(10, coinsListByType[poolDetails.assetTypes[1]].expo)),
          ];
          result.set(poolDetails.poolId, amounts);
        }
      }
    }
    return result;
  }
}
