import { Decimal } from 'decimal.js';

export type AprData = {
  baseApr: Decimal;
  alphaMiningApr: Decimal;
  apy: Decimal;
  lastAutocompounded: Date;
};

export type SingleTvl = {
  tokenAmount: Decimal;
  usdValue: Decimal;
};

export type DoubleTvl = {
  tokenAmountA: Decimal;
  tokenAmountB: Decimal;
  usdValue: Decimal;
};

export type TvlData =
  | {
      alphafi: SingleTvl;
      parent: SingleTvl;
    }
  | {
      alphafi: DoubleTvl;
      parent: DoubleTvl;
    };

export type PoolData =
  | {
      poolId: string;
      poolName: string;
      apr: AprData;
      tvl: TvlData;
      lpBreakdown: {
        token1Amount: Decimal;
        token2Amount: Decimal;
        totalLiquidity: Decimal;
      };
      parentLpBreakdown: {
        token1Amount: Decimal;
        token2Amount: Decimal;
        totalLiquidity: Decimal;
      };
      currentLPPoolPrice: Decimal;
      positionRange: { lowerPrice: Decimal; upperPrice: Decimal };
    }
  | {
      poolId: string;
      poolName: string;
      apr: AprData;
      tvl: TvlData;
    };
