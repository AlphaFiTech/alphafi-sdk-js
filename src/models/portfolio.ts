import { SuiClient } from '@mysten/sui/client';
import { Blockchain } from './blockchain.js';
import { Protocol } from './protocol.js';
import { Receipt } from './receipt.js';
import { Decimal } from 'decimal.js';
import { poolDetailsMap, poolDetailsMapByPoolName } from '../common/maps.js';
import { AlphaReceiptType } from '../utils/parsedTypes.js';
import { coinsList, coinsListByType } from '../common/coinsList.js';
import { Pool } from './pool.js';
import { DynamicFieldInfo } from '@mysten/sui/client/index.js';

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

  async getPortfolioData(): Promise<PortfolioData> {
    const priceMap = await this.protocol.getPriceMap();
    const aprMap = await this.protocol.getAprMap();
    const naviLoopingPoolDebt = await this.protocol.getNaviLoopingPoolDebt();
    const voloExchangeRate = await this.protocol.getVoloExchangeRate();
    const stsuiExchangeRate = await this.protocol.getStsuiExchangeRate();
    const pools = await this.protocol.getAllPools();
    const receiptsMap = await this.getAllReceipts(pools);
    const walletCoins = await this.getWalletCoins();

    const alphaReceipt = receiptsMap.get(poolDetailsMapByPoolName['ALPHA'].poolId);

    receiptsMap.delete(poolDetailsMapByPoolName['ALPHA'].poolId);
    const lockedBalances = alphaReceipt
      ? await this.fetchUserLockedBalances(
          (alphaReceipt.receipt as AlphaReceiptType).locked_balance.id,
        )
      : [];

    const poolDeposits = new Map<string, Decimal[]>();
    receiptsMap.forEach((receipt, poolId) => {
      poolDeposits.set(
        poolId,
        receipt.getDepositedAmount(
          priceMap,
          naviLoopingPoolDebt,
          voloExchangeRate,
          stsuiExchangeRate,
          walletCoins,
        ),
      );
    });

    const fungileDeposits = await this.getFungileDeposits(
      pools,
      walletCoins,
      priceMap,
      naviLoopingPoolDebt,
    );
    fungileDeposits.forEach((deposits, poolId) => {
      poolDeposits.set(poolId, deposits);
    });

    const alphaDeposit = alphaReceipt
      ? alphaReceipt.getAlphaDepositAmount(priceMap, naviLoopingPoolDebt, lockedBalances)
      : { lockedAmount: new Decimal(0), totalAmount: new Decimal(0) };

    let userDeposit = alphaDeposit.totalAmount.mul(
      priceMap.get(coinsList['ALPHA'].type) ?? new Decimal(0),
    );
    let weightedAPYNumerator = userDeposit.mul(alphaReceipt?.pool.apy(aprMap) ?? new Decimal(0));
    let weightedAPYDenominator = userDeposit;

    poolDeposits.forEach((deposits, poolId) => {
      const amount1 = deposits[0].mul(
        priceMap.get(poolDetailsMap[poolId].assetTypes[0]) ?? new Decimal(0),
      );
      const amount2 =
        poolDetailsMap[poolId].assetTypes.length === 2
          ? deposits[1].mul(priceMap.get(poolDetailsMap[poolId].assetTypes[1]) ?? new Decimal(0))
          : new Decimal(0);
      const pool = pools.get(poolId);
      if (!pool) return;

      userDeposit = userDeposit.add(amount1).add(amount2);
      weightedAPYNumerator = weightedAPYNumerator.add(
        amount1.add(amount2).mul(pool.apy(aprMap) ?? new Decimal(0)),
      );
      console.log(
        pool.poolDetails.poolName,
        '----',
        // pool.apy(aprMap),
        // "----",
        amount1.add(amount2).toString(),
      );
      weightedAPYDenominator = weightedAPYDenominator.add(amount1.add(amount2));
    });

    const portfolioData: PortfolioData = {
      userDeposit,
      userApy: weightedAPYNumerator.div(weightedAPYDenominator),
      alphaReward: new Decimal(0),
      alphaDeposit,
      poolDeposits,
    };

    return portfolioData;
  }

  async getAllReceipts(pools: Map<string, Pool>): Promise<Map<string, Receipt>> {
    const receipts = await this.blockchain.getMultiReceipt(this.userAddress);
    const portfolio: Map<string, Receipt> = new Map();

    receipts.forEach((receipt, poolId) => {
      const pool = pools.get(poolId);
      if (pool) {
        portfolio.set(poolId, new Receipt(receipt[0], pool));
      }
    });
    return portfolio;
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
