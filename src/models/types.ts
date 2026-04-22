import { Decimal } from 'decimal.js';
import { StrategyType } from '../strategies/strategy.js';

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
      strategyType: StrategyType;
      coinAType: string;
      coinBType: string;
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
      strategyType: StrategyType;
      coinType: string;
      poolName: string;
      apr: AprData;
      tvl: TvlData;
    };

export type UserWithdrawalStatus = {
  ticketId: string;
  tokenAmount: Decimal;
  status: number;
  withdrawalEtaTimestamp: number;
};

export type PoolBalance =
  | {
      tokenAAmount: Decimal;
      tokenBAmount: Decimal;
      usdValue: Decimal;
    }
  | { tokenAmount: Decimal; usdValue: Decimal }
  | {
      tokenAmount: Decimal;
      usdValue: Decimal;
      withdrawals: UserWithdrawalStatus[];
    }
  | {
      stakedAlphaAmount: Decimal;
      stakedAlphaUsdValue: Decimal;
      pendingDeposits: Decimal;
      withdrawals: UserWithdrawalStatus[];
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

/**
 * Typed shape of `simulateTransaction` GraphQL responses.
 * Mirrors the selection set used by `Blockchain.simulateTransaction`.
 * Scalar numeric fields arrive as `string | number` depending on size,
 * so callers should coerce via `Number(..)` / `BigInt(..)` as appropriate.
 */
export interface SimulationGasSummary {
  computationCost: string | number;
  storageCost: string | number;
  storageRebate: string | number;
  nonRefundableStorageFee: string | number;
}

export interface SimulationGasEffects {
  gasSummary: SimulationGasSummary | null;
}

export interface SimulationEffects {
  status: string | null;
  /** `JSON` scalar — shape not statically knowable; coerce at the call-site if needed. */
  balanceChangesJson: unknown;
  gasEffects: SimulationGasEffects | null;
}

export interface SimulationReturnValue {
  argument: { __typename: string } | null;
  value: {
    type: { repr: string };
    /** Move value JSON-encoded; the concrete shape depends on the function's return type. */
    json: unknown;
    display: unknown | null;
  };
}

export interface SimulationOutput {
  returnValues: SimulationReturnValue[];
}

export interface SimulationResult {
  effects: SimulationEffects | null;
  outputs: SimulationOutput[];
}

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
