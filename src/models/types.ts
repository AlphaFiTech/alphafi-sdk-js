import { Decimal } from 'decimal.js';

export type AprData = {
  baseApr: Decimal;
  alphaMiningApr: Decimal;
  apy: Decimal;
  lastAutocompounded: Date;
};

export type PoolData =
  | {
      poolId: string;
      apr: AprData;
      tvl: Decimal;
      parentTvl: Decimal;
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
      apr: AprData;
      tvl: Decimal;
      parentTvl: Decimal;
    };
