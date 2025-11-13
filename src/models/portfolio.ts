import { SuiClient } from '@mysten/sui/client';
import { Blockchain } from './blockchain.js';
import { Protocol } from './protocol.js';
import { Decimal } from 'decimal.js';
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
}
