import { ReceiptType } from '../utils/parsedTypes.js';
import { Pool } from './pool.js';
import { Decimal } from 'decimal.js';
import { coinsListByType } from '../common/coinsList.js';

export class Receipt {
  receipt: ReceiptType;
  pool: Pool;

  constructor(receipt: ReceiptType, pool: Pool) {
    this.receipt = receipt;
    this.pool = pool;
  }

  getDepositedAmount(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
    voloExchangeRate: Decimal,
    stsuiExchangeRate: Decimal,
    walletCoins: Map<string, string>,
  ): Decimal[] {
    if (this.pool.poolDetails.assetTypes.length === 1) {
      return this.getSingleAssetDepositedAmount(
        priceMap,
        naviLoopingPoolDebt,
        voloExchangeRate,
        stsuiExchangeRate,
      );
    } else {
      return this.getDoubleAssetDepositedAmount(priceMap, naviLoopingPoolDebt, walletCoins);
    }
  }

  getAlphaDepositAmount(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
    lockedBalances: { timestamp: string; xTokenBalance: string }[],
  ): {
    lockedAmount: Decimal;
    totalAmount: Decimal;
  } {
    const totalXTokens = new Decimal(this.receipt.xTokenBalance);
    let lockedXtokens = new Decimal(0);
    const currentTime = Date.now();
    for (const entry of lockedBalances) {
      if (currentTime < Number(entry.timestamp)) {
        lockedXtokens = lockedXtokens.add(entry.xTokenBalance);
      }
    }

    const poolExchangeRate = this.pool.poolExchangeRate(priceMap, naviLoopingPoolDebt);
    const lockedAmount = lockedXtokens.mul(poolExchangeRate).div(1e9);
    const totalAmount = totalXTokens.mul(poolExchangeRate).div(1e9);
    return { lockedAmount, totalAmount };
  }

  getSingleAssetDepositedAmount(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
    voloExchangeRate: Decimal,
    stsuiExchangeRate: Decimal,
  ): Decimal[] {
    const totalXTokens = new Decimal(this.receipt.xTokenBalance);
    if (totalXTokens.gt(0)) {
      if (
        this.pool.poolDetails.poolName == 'NAVI-LOOP-HASUI-SUI' ||
        this.pool.poolDetails.poolName == 'NAVI-LOOP-SUI-VSUI' ||
        this.pool.poolDetails.poolName == 'ALPHALEND-LOOP-SUI-STSUI'
      ) {
        let depositedAmount = totalXTokens.mul(
          this.pool.poolExchangeRate(priceMap, naviLoopingPoolDebt),
        );
        depositedAmount = depositedAmount.div(
          Math.pow(10, 9 - coinsListByType[this.pool.poolDetails.assetTypes[0]].expo),
        );
        if (this.pool.poolDetails.poolName == 'NAVI-LOOP-SUI-VSUI') {
          depositedAmount = depositedAmount.mul(voloExchangeRate);
        } else if (this.pool.poolDetails.poolName == 'ALPHALEND-LOOP-SUI-STSUI') {
          depositedAmount = depositedAmount.mul(stsuiExchangeRate);
        }
        return [
          depositedAmount.div(
            Math.pow(10, coinsListByType[this.pool.poolDetails.assetTypes[0]].expo),
          ),
        ];
      } else {
        let depositedAmount = totalXTokens.mul(
          this.pool.poolExchangeRate(priceMap, naviLoopingPoolDebt),
        );
        if (this.pool.poolDetails.parentProtocolName === 'NAVI') {
          depositedAmount = depositedAmount.div(
            Math.pow(10, 9 - coinsListByType[this.pool.poolDetails.assetTypes[0]].expo),
          );
        }
        return [
          depositedAmount.div(
            Math.pow(10, coinsListByType[this.pool.poolDetails.assetTypes[0]].expo),
          ),
        ];
      }
    }
    return [new Decimal(0)];
  }

  getDoubleAssetDepositedAmount(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
    walletCoins: Map<string, string>,
  ): [Decimal, Decimal] {
    let totalXTokens = new Decimal(0);
    if (this.pool.poolDetails.strategyType === 'FUNGIBLE-DOUBLE-ASSET-POOL') {
      totalXTokens = new Decimal(walletCoins.get(this.pool.poolDetails.assetTypes[0]) || '0');
    } else {
      totalXTokens = new Decimal(this.receipt.xTokenBalance);
    }

    if (totalXTokens.gt(0)) {
      const poolExchangeRate = this.pool.poolExchangeRate(priceMap, naviLoopingPoolDebt);
      const liquidity = totalXTokens.mul(poolExchangeRate);
      const res = this.pool.coinAmountsFromLiquidity(liquidity.toString());
      return [
        res[0].div(Math.pow(10, coinsListByType[this.pool.poolDetails.assetTypes[0]].expo)),
        res[1].div(Math.pow(10, coinsListByType[this.pool.poolDetails.assetTypes[1]].expo)),
      ];
    }
    return [new Decimal(0), new Decimal(0)];
  }
}
