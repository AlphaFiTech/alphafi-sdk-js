import { Decimal } from 'decimal.js';

export type UserPortfolioData = {
  netWorth: Decimal;
  aggregatedApy: Decimal;
  alphaRewardsToClaim: Decimal;
  poolBalances: Map<string, PoolBalance>;
};

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

export type PoolBalance =
  | {
      tokenAAmount: Decimal;
      tokenBAmount: Decimal;
      usdValue: Decimal;
    }
  | { tokenAmount: Decimal; usdValue: Decimal }
  | {
      stakedAlphaAmount: Decimal;
      stakedAlphaUsdValue: Decimal;
      pendingDeposits: Decimal;
      withdrawals: {
        ticketId: string;
        alphaAmount: string;
        status: number; // 0 for pending, 1 for accepted, 2 for claimable
        withdrawalEtaTimestamp: number;
      }[];
      claimableAirdrop: Decimal;
      totalAirdropClaimed: Decimal;
    };
