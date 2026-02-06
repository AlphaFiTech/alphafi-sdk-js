import { Decimal } from 'decimal.js';

export type CoinInfo = {
  coinType: string;
  symbol: string;
  decimals: number;
  coingeckoPrice?: Decimal;
  pythPrice?: Decimal;
};

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

export type SlushPositionCap = {
  id: string;
  position_pool_map: Map<string, string>;
  client_address: string;
  image_url: string;
};

export type AlphaFiReceipt = {
  id: string;
  positionPoolMap: Array<{
    key: string;
    value: {
      poolId: string;
      partnerCapId: string;
    };
  }>;
  clientAddress: string;
  imageUrl: string;
};

export type DistributorObject = {
  airdropWallet: string;
  airdropWalletBalance: string;
  dustWalletAddress: string;
  feeWallet: string;
  id: string;
  nextHalvingTimestamp: string;
  onholdReceiptsWalletAddress: string;
  poolAllocator: {
    id: string;
    members: {
      key: string;
      value: {
        poolData: {
          key: string;
          value: {
            lastUpdateTime: string;
            pendingRewards: string;
            weight: string;
          };
        }[];
      };
    }[];
    rewards: { id: string; size: string };
    totalWeights: Array<{ key: string; value: string }>;
  };
  rewardUnlock: string[];
  startTimestamp: string;
  target: string;
  teamWalletAddress: string;
  teamWalletBalance: string;
};
