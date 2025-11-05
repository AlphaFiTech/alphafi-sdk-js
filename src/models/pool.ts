import { PoolDetails, poolDetailsMap } from '../common/maps.js';
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import BN from 'bn.js';
import {
  AlphaPoolType,
  BluefinInvestorType,
  BluefinParentPoolType,
  DefaultPoolType,
  FungiblePoolType,
  InvestorType,
  NaviLoopInvestorType,
  ParentPoolType,
  PoolType,
} from '../utils/parsedTypes.js';
import { Decimal } from 'decimal.js';
import { coinsList, coinsListByType } from '../common/coinsList.js';

/**
 * Pool utility types and interfaces
 */
// export interface LiquidityCalculationResult {
//   coinAmountA: bigint;
//   coinAmountB: bigint;
//   liquidity: bigint;
// }

// export type PoolName = string;

export type PoolData = {
  apr: {
    parentApr: Decimal;
    alphaMiningApr: Decimal;
  };
  apy: Decimal;
  tvl: Decimal;
  parentTvl: Decimal;
  currentLPPoolPrice: Decimal | undefined;
  positionRange: { lowerPrice: Decimal; upperPrice: Decimal } | undefined;
};

export class Pool {
  pool: PoolType;
  parentPool: ParentPoolType | undefined;
  investor: InvestorType | undefined;
  poolDetails: PoolDetails;

  constructor(pool: PoolType, investor?: InvestorType, parentPool?: ParentPoolType) {
    this.pool = pool;
    this.investor = investor;
    this.parentPool = parentPool;
    this.poolDetails = poolDetailsMap[pool.id];
  }

  getPoolData(
    aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>,
    priceMap: Map<string, Decimal>,
    naviTvlMap: Map<string, Decimal>,
    bucketTvl: Decimal,
  ): PoolData {
    return {
      apr: this.apr(aprMap),
      apy: this.apy(aprMap),
      tvl: this.tvl(priceMap),
      parentTvl: this.parentTvl(priceMap, naviTvlMap, bucketTvl),
      currentLPPoolPrice:
        this.poolDetails.assetTypes.length === 2 ? this.currentLPPoolPrice() : undefined,
      positionRange: this.poolDetails.assetTypes.length === 2 ? this.positionRange() : undefined,
    };
  }

  apy(aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>): Decimal {
    const apr = this.apr(aprMap);
    return this.convertAprToApy(apr.parentApr.add(apr.alphaMiningApr));
  }

  apr(aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>): {
    parentApr: Decimal;
    alphaMiningApr: Decimal;
  } {
    const apr = aprMap.get(this.pool.id);
    if (!apr) {
      throw new Error(`Apr not found for pool ${this.pool.id}`);
    }
    return apr;
  }

  tvl(priceMap: Map<string, Decimal>): Decimal {
    const coin = this.poolDetails.assetTypes[0];
    const price = priceMap.get(coin);
    if (!price) {
      throw new Error(`Price not found for coin ${coin}`);
    }

    if (
      this.poolDetails.parentProtocolName === 'NAVI' ||
      this.poolDetails.parentProtocolName === 'ALPHALEND'
    ) {
      if (!this.investor) {
        throw new Error(`Investor not found for pool ${this.pool.id}`);
      }
      if (this.poolDetails.strategyType === 'SINGLE-ASSET-LOOPING') {
        const liquidity = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const debtToSupplyRatio = new Decimal(
          (this.investor as NaviLoopInvestorType).current_debt_to_supply_ratio,
        );
        const tokensInvested = liquidity.mul(
          new Decimal(1).minus(debtToSupplyRatio.div(new Decimal(1e20))),
        );

        if (this.poolDetails.poolName == 'NAVI-LOOP-SUI-VSUI') {
          const vsuiPrice = priceMap.get(coinsList['VSUI'].type);
          if (vsuiPrice) return tokensInvested.div(1e9).mul(vsuiPrice);
        } else if (this.poolDetails.poolName == 'ALPHALEND-LOOP-SUI-STSUI') {
          const stsuiPrice = priceMap.get(coinsList['STSUI'].type);
          if (stsuiPrice) return tokensInvested.div(1e9).mul(stsuiPrice);
        }

        return tokensInvested.div(1e9).mul(price);
      } else {
        const tokensInvested = new Decimal(this.pool.tokensInvested).div(
          new Decimal(Math.pow(10, 9)),
        );
        return tokensInvested.mul(price);
      }
    } else if (this.poolDetails.parentProtocolName === 'BUCKET') {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, coinsListByType[coin].expo)),
      );
      return tokensInvested.mul(price);
    } else if (this.poolDetails.parentProtocolName === 'ALPHAFI') {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, 9)),
      );
      return tokensInvested.mul(price);
    } else if (
      this.poolDetails.parentProtocolName === 'CETUS' ||
      this.poolDetails.parentProtocolName === 'BLUEFIN'
    ) {
      return this.getV3PoolTVL(priceMap);
    }
    return new Decimal(0);
  }

  parentTvl(
    priceMap: Map<string, Decimal>,
    naviTvlMap: Map<string, Decimal>,
    bucketTvl: Decimal,
  ): Decimal {
    if (
      this.poolDetails.parentProtocolName === 'BLUEFIN' ||
      this.poolDetails.parentProtocolName === 'CETUS'
    ) {
      if (this.parentPool) {
        const amounts = [
          (this.parentPool as BluefinParentPoolType).coin_a,
          (this.parentPool as BluefinParentPoolType).coin_b,
        ];
        const [coin1, coin2] = this.poolDetails.assetTypes;

        const [priceOfCoin1, priceOfCoin2] = [priceMap.get(coin1), priceMap.get(coin2)];
        if (!priceOfCoin1 || !priceOfCoin2) {
          throw new Error(`Price not found for coin ${coin1} or ${coin2}`);
        }
        const coin1InUsd = priceOfCoin1
          .mul(amounts[0])
          .div(Math.pow(10, coinsListByType[coin1].expo));
        const coin2InUsd = priceOfCoin2
          .mul(amounts[1])
          .div(Math.pow(10, coinsListByType[coin2].expo));

        return coin1InUsd.add(coin2InUsd);
      }
      return new Decimal(0);
    } else if (this.poolDetails.parentProtocolName === 'ALPHAFI') {
      return this.tvl(priceMap);
    } else if (this.poolDetails.parentProtocolName === 'NAVI') {
      return naviTvlMap.get(this.pool.id) || new Decimal(0);
    } else if (this.poolDetails.parentProtocolName === 'BUCKET') {
      return bucketTvl;
    } else if (this.poolDetails.parentProtocolName === 'ALPHALEND') {
      return this.tvl(priceMap);
    }
    return new Decimal(0);
  }

  currentLPPoolPrice(): Decimal {
    const coinA = coinsListByType[this.poolDetails.assetTypes[0]];
    const coinB = coinsListByType[this.poolDetails.assetTypes[1]];

    if (this.parentPool) {
      const currentSqrtPrice = (this.parentPool as BluefinParentPoolType).current_sqrt_price;

      return TickMath.sqrtPriceX64ToPrice(new BN(currentSqrtPrice), coinA.expo, coinB.expo);
    }
    return new Decimal(0);
  }

  positionRange(): { lowerPrice: Decimal; upperPrice: Decimal } {
    if (!this.investor) {
      throw new Error(`Investor not found for pool ${this.pool.id}`);
    }
    const coinA = coinsListByType[this.poolDetails.assetTypes[0]];
    const coinB = coinsListByType[this.poolDetails.assetTypes[1]];

    const upperBound = 443636;
    let lowerTick = Number((this.investor as BluefinInvestorType).lower_tick);
    let upperTick = Number((this.investor as BluefinInvestorType).upper_tick);
    if (lowerTick > upperBound) {
      lowerTick = -~(lowerTick - 1);
    }
    if (upperTick > upperBound) {
      upperTick = -~(upperTick - 1);
    }
    return {
      lowerPrice: TickMath.tickIndexToPrice(lowerTick, coinA.expo, coinB.expo),
      upperPrice: TickMath.tickIndexToPrice(upperTick, coinA.expo, coinB.expo),
    };
  }

  poolExchangeRate(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
  ): Decimal {
    let xTokenSupply = new Decimal(0);
    if (this.poolDetails.strategyType === 'FUNGIBLE-DOUBLE-ASSET-POOL') {
      xTokenSupply = new Decimal((this.pool as FungiblePoolType).treasury_cap.total_supply);
    } else {
      xTokenSupply = new Decimal((this.pool as DefaultPoolType).xTokenSupply);
    }

    let tokensInvested = new Decimal(this.pool.tokensInvested);
    if (this.poolDetails.poolName == 'ALPHA') {
      tokensInvested = new Decimal((this.pool as AlphaPoolType).tokensInvested);
    } else if (this.poolDetails.strategyType === 'SINGLE-ASSET-LOOPING') {
      if (!this.investor) {
        throw new Error(`Investor not found for pool ${this.pool.id}`);
      }
      if (
        this.poolDetails.poolName == 'NAVI-LOOP-USDC-USDT' ||
        this.poolDetails.poolName == 'NAVI-LOOP-USDT-USDC'
      ) {
        const supplyCoinPrice =
          priceMap.get(this.poolDetails.loopingPoolCoinMap?.supplyCoin || '') || new Decimal(0);
        const borrowCoinPrice =
          priceMap.get(this.poolDetails.loopingPoolCoinMap?.borrowCoin || '') || new Decimal(0);

        const currentDebt = naviLoopingPoolDebt.get(this.pool.id) || '0';
        const currentSupply = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const currentDebtInSupplyCoin = new Decimal(currentDebt)
          .mul(borrowCoinPrice)
          .div(supplyCoinPrice);

        tokensInvested = new Decimal(currentSupply).minus(currentDebtInSupplyCoin);
      } else {
        const liquidity = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const debtToSupplyRatio = new Decimal(
          (this.investor as NaviLoopInvestorType).current_debt_to_supply_ratio,
        );
        tokensInvested = liquidity.mul(
          new Decimal(1).minus(new Decimal(debtToSupplyRatio).div(1e20)),
        );
      }
    }

    // Check for division by zero
    if (xTokenSupply.eq(0)) {
      console.error('Division by zero error: tokensInvested is zero.');
      return new Decimal(0);
    }
    const poolExchangeRate = tokensInvested.div(xTokenSupply);
    return poolExchangeRate;
  }

  coinAmountsFromLiquidity(liquidity: string): [Decimal, Decimal] {
    if (!this.investor) {
      throw new Error(`Investor not found for pool ${this.pool.id}`);
    }
    const upper_bound = 443636;
    let lower_tick = Number((this.investor as BluefinInvestorType).lower_tick);
    let upper_tick = Number((this.investor as BluefinInvestorType).upper_tick);

    if (lower_tick > upper_bound) {
      lower_tick = -~(lower_tick - 1);
    }
    if (upper_tick > upper_bound) {
      upper_tick = -~(upper_tick - 1);
    }

    if (this.parentPool) {
      const coin_amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(Math.floor(parseFloat(liquidity))),
        new BN((this.parentPool as BluefinParentPoolType).current_sqrt_price),
        TickMath.tickIndexToSqrtPriceX64(lower_tick),
        TickMath.tickIndexToSqrtPriceX64(upper_tick),
        true,
      );
      return [
        new Decimal(coin_amounts.coinA.toString()),
        new Decimal(coin_amounts.coinB.toString()),
      ];
    } else {
      return [new Decimal(0), new Decimal(0)];
    }
  }

  private getV3PoolTVL(priceMap: Map<string, Decimal>): Decimal {
    const coin1 = this.poolDetails.assetTypes[0];
    const coin2 = this.poolDetails.assetTypes[1];

    const [priceOfCoin1, priceOfCoin2] = [priceMap.get(coin1), priceMap.get(coin2)];

    if (priceOfCoin1 && priceOfCoin2 && this.parentPool && this.investor) {
      let upper_tick = (this.investor as BluefinInvestorType).upper_tick;
      let lower_tick = (this.investor as BluefinInvestorType).lower_tick;
      if (Math.abs(lower_tick - Math.pow(2, 32)) < lower_tick) {
        lower_tick = lower_tick - Math.pow(2, 32);
      }
      if (Math.abs(upper_tick - Math.pow(2, 32)) < upper_tick) {
        upper_tick = upper_tick - Math.pow(2, 32);
      }

      const upper_sqrt_price = TickMath.tickIndexToSqrtPriceX64(upper_tick);
      const lower_sqrt_price = TickMath.tickIndexToSqrtPriceX64(lower_tick);
      const { coinA, coinB } = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(this.pool.tokensInvested),
        new BN((this.parentPool as BluefinParentPoolType).current_sqrt_price),
        lower_sqrt_price,
        upper_sqrt_price,
        false,
      );
      let amount1 = new Decimal(coinA.toString());
      let amount2 = new Decimal(coinB.toString());

      amount1 = amount1.div(new Decimal(10).pow(coinsListByType[coin1].expo));
      amount2 = amount2.div(new Decimal(10).pow(coinsListByType[coin2].expo));
      const tvl = amount1.mul(priceOfCoin1).add(amount2.mul(priceOfCoin2));

      return tvl;
    }
    return new Decimal(0);
  }

  private convertAprToApy(apr: Decimal): Decimal {
    const n = 6 * 365; // 6 times a day
    return apr.div(100).div(n).add(1).pow(n).minus(1).mul(100);
  }
}
