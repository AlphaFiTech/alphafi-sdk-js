import {
  DefaultPoolQueryType,
  FungiblePoolQueryType,
  AlphaPoolQueryType,
  CetusInvestorQueryType,
  NaviInvestorQueryType,
  NaviLoopInvestorQueryType,
  BucketInvestorQueryType,
  BluefinInvestorQueryType,
  AlphaReceiptQueryType,
  DistributorQueryType,
  CetusParentPoolQueryType,
  BluefinParentPoolQueryType,
  DefaultReceiptQueryType,
  NaviParentPoolQueryType,
} from './queryTypes.js';

import {
  DefaultPoolType,
  FungiblePoolType,
  AlphaPoolType,
  CetusInvestorType,
  NaviInvestorType,
  NaviLoopInvestorType,
  BucketInvestorType,
  BluefinInvestorType,
  AlphaReceiptType,
  DefaultReceiptType,
  DistributorType,
  CetusParentPoolType,
  BluefinParentPoolType,
  NaviParentPoolType,
} from './parsedTypes.js';

// Helper function to parse flat contents array with key-value structure
function parseContentsArray(
  contents: Array<{
    fields: {
      key: { fields: { name: string }; type: string };
      value: string;
    };
    type: string;
  }>,
): Array<{ key: string; value: string }> {
  return contents.map((item) => ({
    key: item.fields.key.fields.name,
    value: item.fields.value,
  }));
}

// Helper function to parse member pool data
function parseMemberPoolData(
  poolData: Array<{
    fields: {
      key: { fields: { name: string }; type: string };
      value: {
        fields: {
          last_update_time: string;
          pending_rewards: string;
          weight: string;
        };
        type: string;
      };
    };
    type: string;
  }>,
): Array<{
  key: string;
  value: {
    last_update_time: string;
    pending_rewards: string;
    weight: string;
  };
}> {
  return poolData.map((item) => ({
    key: item.fields.key.fields.name,
    value: {
      last_update_time: item.fields.value.fields.last_update_time,
      pending_rewards: item.fields.value.fields.pending_rewards,
      weight: item.fields.value.fields.weight,
    },
  }));
}

// <--------- Pool Parsers --------->

export function parsePool(query: DefaultPoolQueryType): DefaultPoolType {
  return {
    acc_rewards_per_xtoken: parseContentsArray(
      query.content.fields.acc_rewards_per_xtoken.fields.contents,
    ),
    deposit_fee: query.content.fields.deposit_fee,
    deposit_fee_max_cap: query.content.fields.deposit_fee_max_cap,
    id: query.content.fields.id.id,
    image_url: query.content.fields.image_url,
    name: query.content.fields.name,
    paused: query.content.fields.paused,
    rewards: {
      id: query.content.fields.rewards.fields.id.id,
      size: query.content.fields.rewards.fields.size,
    },
    tokensInvested: query.content.fields.tokensInvested,
    withdraw_fee_max_cap: query.content.fields.withdraw_fee_max_cap,
    withdrawal_fee: query.content.fields.withdrawal_fee,
    xTokenSupply: query.content.fields.xTokenSupply,
  };
}

export function parseFungiblePool(query: FungiblePoolQueryType): FungiblePoolType {
  return {
    deposit_fee: query.content.fields.deposit_fee,
    deposit_fee_max_cap: query.content.fields.deposit_fee_max_cap,
    id: query.content.fields.id.id,
    paused: query.content.fields.paused,
    tokensInvested: query.content.fields.tokensInvested,
    treasury_cap: {
      id: query.content.fields.treasury_cap.fields.id.id,
      total_supply: query.content.fields.treasury_cap.fields.total_supply.fields.value,
    },
    withdraw_fee_max_cap: query.content.fields.withdraw_fee_max_cap,
    withdrawal_fee: query.content.fields.withdrawal_fee,
  };
}

export function parseAlphaPool(query: AlphaPoolQueryType): AlphaPoolType {
  return {
    acc_rewards_per_xtoken: parseContentsArray(
      query.content.fields.acc_rewards_per_xtoken.fields.contents,
    ),
    alpha_bal: query.content.fields.alpha_bal,
    deposit_fee: query.content.fields.deposit_fee,
    deposit_fee_max_cap: query.content.fields.deposit_fee_max_cap,
    id: query.content.fields.id.id,
    image_url: query.content.fields.image_url,
    instant_withdraw_fee: query.content.fields.instant_withdraw_fee,
    instant_withdraw_fee_max_cap: query.content.fields.instant_withdraw_fee_max_cap,
    locked_period_in_ms: query.content.fields.locked_period_in_ms,
    locking_start_ms: query.content.fields.locking_start_ms,
    name: query.content.fields.name,
    paused: query.content.fields.paused,
    performance_fee: query.content.fields.performance_fee,
    performance_fee_max_cap: query.content.fields.performance_fee_max_cap,
    rewards: {
      id: query.content.fields.rewards.fields.id.id,
      size: query.content.fields.rewards.fields.size,
    },
    tokensInvested: query.content.fields.tokensInvested,
    withdraw_fee_max_cap: query.content.fields.withdraw_fee_max_cap,
    withdrawal_fee: query.content.fields.withdrawal_fee,
    xTokenSupply: query.content.fields.xTokenSupply,
  };
}

// <--------- Parent Pool Parsers --------->

export function parseCetusParentPool(query: CetusParentPoolQueryType): CetusParentPoolType {
  return {
    coin_a: query.content.fields.coin_a,
    coin_b: query.content.fields.coin_b,
    current_sqrt_price: query.content.fields.current_sqrt_price,
    current_tick_index: query.content.fields.current_tick_index.fields.bits,
    fee_growth_global_a: query.content.fields.fee_growth_global_a,
    fee_growth_global_b: query.content.fields.fee_growth_global_b,
    fee_protocol_coin_a: query.content.fields.fee_protocol_coin_a,
    fee_protocol_coin_b: query.content.fields.fee_protocol_coin_b,
    fee_rate: query.content.fields.fee_rate,
    id: query.content.fields.id.id,
    index: query.content.fields.index,
    is_pause: query.content.fields.is_pause,
    liquidity: query.content.fields.liquidity,
    position_manager: {
      position_index: query.content.fields.position_manager.fields.position_index,
      positions: {
        head: query.content.fields.position_manager.fields.positions.fields.head,
        id: query.content.fields.position_manager.fields.positions.fields.id.id,
        size: query.content.fields.position_manager.fields.positions.fields.size,
        tail: query.content.fields.position_manager.fields.positions.fields.tail,
      },
      tick_spacing: query.content.fields.position_manager.fields.tick_spacing,
    },
    rewarder_manager: {
      last_updated_time: query.content.fields.rewarder_manager.fields.last_updated_time,
      points_growth_global: query.content.fields.rewarder_manager.fields.points_growth_global,
      points_released: query.content.fields.rewarder_manager.fields.points_released,
      rewarders: query.content.fields.rewarder_manager.fields.rewarders.map((rewarder: any) => ({
        emissions_per_second: rewarder.fields.emissions_per_second,
        growth_global: rewarder.fields.growth_global,
        reward_coin: rewarder.fields.reward_coin.fields.name,
      })),
    },
    tick_spacing: query.content.fields.tick_spacing,
    url: query.content.fields.url,
  };
}

export function parseBluefinParentPool(query: BluefinParentPoolQueryType): BluefinParentPoolType {
  return {
    coin_a: query.content.fields.coin_a,
    coin_b: query.content.fields.coin_b,
    current_sqrt_price: query.content.fields.current_sqrt_price,
    current_tick_index: query.content.fields.current_tick_index.fields.bits,
    fee_growth_global_coin_a: query.content.fields.fee_growth_global_coin_a,
    fee_growth_global_coin_b: query.content.fields.fee_growth_global_coin_b,
    fee_rate: query.content.fields.fee_rate,
    icon_url: query.content.fields.icon_url,
    id: query.content.fields.id.id,
    is_paused: query.content.fields.is_paused,
    liquidity: query.content.fields.liquidity,
    name: query.content.fields.name,
    observations_manager: {
      observation_index: query.content.fields.observations_manager.fields.observation_index,
      observations: query.content.fields.observations_manager.fields.observations,
      observation_cardinality:
        query.content.fields.observations_manager.fields.observation_cardinality,
      observation_cardinality_next:
        query.content.fields.observations_manager.fields.observation_cardinality_next,
    },
    position_index: query.content.fields.position_index,
    protocol_fee_coin_a: query.content.fields.protocol_fee_coin_a,
    protocol_fee_coin_b: query.content.fields.protocol_fee_coin_b,
    protocol_fee_share: query.content.fields.protocol_fee_share,
    reward_infos: query.content.fields.reward_infos,
    sequence_number: query.content.fields.sequence_number,
    ticks_manager: {
      bitmap: {
        id: query.content.fields.ticks_manager.fields.bitmap.fields.id.id,
        size: query.content.fields.ticks_manager.fields.bitmap.fields.size,
      },
      tick_spacing: query.content.fields.ticks_manager.fields.tick_spacing,
      ticks: {
        id: query.content.fields.ticks_manager.fields.ticks.fields.id.id,
        size: query.content.fields.ticks_manager.fields.ticks.fields.size,
      },
    },
  };
}

export function parseNaviParentPool(query: NaviParentPoolQueryType): NaviParentPoolType {
  return {
    balance: query.content.fields.balance,
    decimal: query.content.fields.decimal,
    id: query.content.fields.id.id,
    treasury_balance: query.content.fields.treasury_balance,
  };
}

// <--------- Investor Parsers --------->

export function parseCetusInvestor(query: CetusInvestorQueryType): CetusInvestorType {
  return {
    emergency_balance_a: query.content.fields.emergency_balance_a,
    emergency_balance_b: query.content.fields.emergency_balance_b,
    free_balance_a: query.content.fields.free_balance_a,
    free_balance_b: query.content.fields.free_balance_b,
    free_rewards: {
      id: query.content.fields.free_rewards.fields.id.id,
      size: query.content.fields.free_rewards.fields.size,
    },
    id: query.content.fields.id.id,
    is_emergency: query.content.fields.is_emergency,
    lower_tick: query.content.fields.lower_tick,
    minimum_swap_amount: query.content.fields.minimum_swap_amount,
    performance_fee: query.content.fields.performance_fee,
    performance_fee_max_cap: query.content.fields.performance_fee_max_cap,
    upper_tick: query.content.fields.upper_tick,
  };
}

export function parseNaviInvestor(query: NaviInvestorQueryType): NaviInvestorType {
  return {
    free_rewards: {
      id: query.content.fields.free_rewards.fields.id.id,
      size: query.content.fields.free_rewards.fields.size,
    },
    id: query.content.fields.id.id,
    max_cap_performance_fee: query.content.fields.max_cap_performance_fee,
    minimum_swap_amount: query.content.fields.minimum_swap_amount,
    navi_acc_cap: {
      id: query.content.fields.navi_acc_cap.fields.id.id,
      owner: query.content.fields.navi_acc_cap.fields.owner,
    },
    performance_fee: query.content.fields.performance_fee,
    tokensDeposited: query.content.fields.tokensDeposited,
  };
}

export function parseNaviLoopInvestor(query: NaviLoopInvestorQueryType): NaviLoopInvestorType {
  return {
    current_debt_to_supply_ratio: query.content.fields.current_debt_to_supply_ratio,
    free_rewards: {
      id: query.content.fields.free_rewards.fields.id.id,
      size: query.content.fields.free_rewards.fields.size,
    },
    id: query.content.fields.id.id,
    loops: query.content.fields.loops,
    max_cap_performance_fee: query.content.fields.max_cap_performance_fee,
    minimum_swap_amount: query.content.fields.minimum_swap_amount,
    navi_acc_cap: {
      id: query.content.fields.navi_acc_cap.fields.id.id,
      owner: query.content.fields.navi_acc_cap.fields.owner,
    },
    performance_fee: query.content.fields.performance_fee,
    safe_borrow_percentage: query.content.fields.safe_borrow_percentage,
    tokensDeposited: query.content.fields.tokensDeposited,
  };
}

export function parseBucketInvestor(query: BucketInvestorQueryType): BucketInvestorType {
  return {
    free_rewards: {
      id: query.content.fields.free_rewards.fields.id.id,
      size: query.content.fields.free_rewards.fields.size,
    },
    id: query.content.fields.id.id,
    max_cap_performance_fee: query.content.fields.max_cap_performance_fee,
    minimum_swap_amount: query.content.fields.minimum_swap_amount,
    performance_fee: query.content.fields.performance_fee,
    stake_proof: {
      fountain_id: query.content.fields.stake_proof.fields.fountain_id,
      id: query.content.fields.stake_proof.fields.id.id,
      lock_until: query.content.fields.stake_proof.fields.lock_until,
      stake_amount: query.content.fields.stake_proof.fields.stake_amount,
      stake_weight: query.content.fields.stake_proof.fields.stake_weight,
      start_uint: query.content.fields.stake_proof.fields.start_uint,
    },
    tokensDeposited: query.content.fields.tokensDeposited,
  };
}

export function parseBluefinInvestor(query: BluefinInvestorQueryType): BluefinInvestorType {
  return {
    emergency_balance_a: query.content.fields.emergency_balance_a,
    emergency_balance_b: query.content.fields.emergency_balance_b,
    free_balance_a: query.content.fields.free_balance_a,
    free_balance_b: query.content.fields.free_balance_b,
    free_rewards: {
      id: query.content.fields.free_rewards.fields.id.id,
      size: query.content.fields.free_rewards.fields.size,
    },
    id: query.content.fields.id.id,
    is_emergency: query.content.fields.is_emergency,
    lower_tick: query.content.fields.lower_tick,
    minimum_swap_amount: query.content.fields.minimum_swap_amount,
    performance_fee: query.content.fields.performance_fee,
    performance_fee_max_cap: query.content.fields.performance_fee_max_cap,
    upper_tick: query.content.fields.upper_tick,
  };
}

// <--------- Receipt Parsers --------->

export function parseAlphaReceipt(query: AlphaReceiptQueryType): AlphaReceiptType {
  return {
    id: query.content.fields.id.id,
    image_url: query.content.fields.image_url,
    last_acc_reward_per_xtoken: parseContentsArray(
      query.content.fields.last_acc_reward_per_xtoken.fields.contents,
    ),
    locked_balance: {
      head: query.content.fields.locked_balance.fields.head,
      id: query.content.fields.locked_balance.fields.id.id,
      size: query.content.fields.locked_balance.fields.size,
      tail: query.content.fields.locked_balance.fields.tail,
    },
    name: query.content.fields.name,
    owner: query.content.fields.owner,
    pending_rewards: parseContentsArray(query.content.fields.pending_rewards.fields.contents),
    pool_id: query.content.fields.pool_id,
    unlocked_xtokens: query.content.fields.unlocked_xtokens,
    xTokenBalance: query.content.fields.xTokenBalance,
    type: query.content.type,
  };
}

export function parseReceipt(query: DefaultReceiptQueryType): DefaultReceiptType {
  return {
    id: query.content.fields.id.id,
    image_url: query.content.fields.image_url,
    last_acc_reward_per_xtoken: parseContentsArray(
      query.content.fields.last_acc_reward_per_xtoken.fields.contents,
    ),
    name: query.content.fields.name,
    owner: query.content.fields.owner,
    pending_rewards: parseContentsArray(query.content.fields.pending_rewards.fields.contents),
    pool_id: query.content.fields.pool_id,
    xTokenBalance: query.content.fields.xTokenBalance,
    type: query.content.type,
  };
}

// <--------- Distributor Parser --------->

export function parseDistributor(query: DistributorQueryType): DistributorType {
  return {
    airdrop_wallet: query.content.fields.airdrop_wallet,
    airdrop_wallet_balance: query.content.fields.airdrop_wallet_balance,
    dust_wallet_address: query.content.fields.dust_wallet_address,
    fee_wallet: query.content.fields.fee_wallet,
    id: query.content.fields.id.id,
    next_halving_timestamp: query.content.fields.next_halving_timestamp,
    onhold_receipts_wallet_address: query.content.fields.onhold_receipts_wallet_address,
    pool_allocator: {
      id: query.content.fields.pool_allocator.fields.id.id,
      members: query.content.fields.pool_allocator.fields.members.fields.contents.map(
        (member: any) => ({
          key: member.fields.key,
          value: {
            pool_data: parseMemberPoolData(member.fields.value.fields.pool_data.fields.contents),
          },
        }),
      ),
      rewards: {
        id: query.content.fields.pool_allocator.fields.rewards.fields.id.id,
        size: query.content.fields.pool_allocator.fields.rewards.fields.size,
      },
      total_weights: parseContentsArray(
        query.content.fields.pool_allocator.fields.total_weights.fields.contents,
      ),
    },
    reward_unlock: query.content.fields.reward_unlock.fields.contents,
    start_timestamp: query.content.fields.start_timestamp,
    target: query.content.fields.target,
    team_wallet_address: query.content.fields.team_wallet_address,
    team_wallet_balance: query.content.fields.team_wallet_balance,
  };
}

// <--------- Export all parsers --------->

export const parsers = {
  parsePool,
  parseFungiblePool,
  parseAlphaPool,
  parseCetusParentPool,
  parseBluefinParentPool,
  parseNaviParentPool,
  parseCetusInvestor,
  parseNaviInvestor,
  parseNaviLoopInvestor,
  parseBucketInvestor,
  parseBluefinInvestor,
  parseAlphaReceipt,
  parseReceipt,
  parseDistributor,
};
