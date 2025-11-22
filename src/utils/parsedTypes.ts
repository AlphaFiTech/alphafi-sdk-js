// <--------- Pool Types --------->
export type PoolType = AlphaPoolType | FungiblePoolType | DefaultPoolType;

export type DefaultPoolType = {
  acc_rewards_per_xtoken: {
    key: string;
    value: string;
  }[];
  deposit_fee: string;
  deposit_fee_max_cap: string;
  id: string;
  image_url: number[];
  name: number[];
  paused: boolean;
  rewards: {
    id: string;
    size: string;
  };
  tokensInvested: string;
  withdraw_fee_max_cap: string;
  withdrawal_fee: string;
  xTokenSupply: string;
};

export type FungiblePoolType = {
  deposit_fee: string;
  deposit_fee_max_cap: string;
  id: string;
  paused: boolean;
  tokensInvested: string;
  treasury_cap: {
    id: string;
    total_supply: string;
  };
  withdraw_fee_max_cap: string;
  withdrawal_fee: string;
};
export type AlphaEmberInvestor = {
    id: string;
    unsupplied_balance: string;
    claimable_balance: string;
    alphalend_position_cap: {
      position_id: string;
    };
    cur_debt: string;
    current_debt_to_supply_ratio: string;
    borrow_token_to_token_ratio: string;
    safe_borrow_percentage: string;
    allowed_coin_types_for_swap: {
      key: string;
      value: boolean;
    }[];
    minimum_swap_amount: string;
    primary_market_id: string;
    borrow_market_id: string;
    resupply_market_id: string;
    free_rewards: {
      id: string;
      size?: string;
    };
    withdraw_receivers_address: string;
    withdraw_tickets: {
      key: string;
      value: {
        key: string;
        value: {
          owner: string;
          receiver: string;
          shares: string;
          estimated_withdraw_amount: string;
          timestamp: string;
          sequence_number: string;
        };
      }[];
    }[];
    total_pending_withdrawals: string;
    performance_fee: string;
    performance_fee_cap: string;
    additional_fields: {
      id: string;
      size?: string;
    };
  }
export type AlphaPoolType = {
  id: string;
  xTokenSupply: string;
  tokensInvested: string;
  unsupplied_balance: string;
  claimable_balance: string;
  positions: {
    id: string;
    size?: string;
  };
  recently_updated_alphafi_receipts: {
    key: string;
    value: {
      xtokens_to_add: string;
      xtokens_to_remove: string;
    };
  }[];
  withdraw_requests: {
    key: string;
    value: {
      total_amount_to_withdraw: string;
      leftover_amount: string;
    };
  }[];
  fee_collected: string;
  last_distribution_time: string;
  last_autocompound_time: string;
  locking_period: string;
  time_from_locking_period_for_unstaking_to_start: string;
  current_exchange_rate: string;
  rewards: {
    id: string;
    size?: string;
  };
  acc_rewards_per_xtoken: {
    key: string;
    value: string;
  }[];
  deposit_fee: string;
  deposit_fee_max_cap: string;
  withdrawal_fee: string;
  withdraw_fee_max_cap: string;
  fee_address: string;
  is_deposit_paused: boolean;
  is_withdraw_paused: boolean;
  alphafi_partner_cap: {
    id: string;
  };
  additional_fields: {
    id: string;
    size?: string;
  };
};

// <--------- Parent Pool Types --------->
export type ParentPoolType = CetusParentPoolType | BluefinParentPoolType | NaviParentPoolType;

export type CetusParentPoolType = {
  coin_a: string;
  coin_b: string;
  current_sqrt_price: string;
  current_tick_index: number;
  fee_growth_global_a: string;
  fee_growth_global_b: string;
  fee_protocol_coin_a: string;
  fee_protocol_coin_b: string;
  fee_rate: string;
  id: string;
  index: string;
  is_pause: boolean;
  liquidity: string;
  position_manager: {
    position_index: string;
    positions: {
      head: string;
      id: string;
      size: string;
      tail: string;
    };
    tick_spacing: number;
  };
  rewarder_manager: {
    last_updated_time: string;
    points_growth_global: string;
    points_released: string;
    rewarders: {
      emissions_per_second: string;
      growth_global: string;
      reward_coin: string;
    }[];
  };
  // tick_manager: {};
  tick_spacing: number;
  url: string;
};

export type BluefinParentPoolType = {
  coin_a: string;
  coin_b: string;
  current_sqrt_price: string;
  current_tick_index: number;
  fee_growth_global_coin_a: string;
  fee_growth_global_coin_b: string;
  fee_rate: string;
  icon_url: string;
  id: string;
  is_paused: boolean;
  liquidity: string;
  name: string;
  observations_manager: {
    observation_index: string;
    observations: [];
    observation_cardinality: string;
    observation_cardinality_next: string;
  };
  position_index: string;
  protocol_fee_coin_a: string;
  protocol_fee_coin_b: string;
  protocol_fee_share: string;
  reward_infos: [];
  sequence_number: string;
  ticks_manager: {
    bitmap: {
      id: string;
      size: string;
    };
    tick_spacing: number;
    ticks: {
      id: string;
      size: string;
    };
  };
};

export type NaviParentPoolType = {
  balance: string;
  decimal: number;
  id: string;
  treasury_balance: string;
};

// <--------- Investor Types --------->
export type InvestorType =
  | CetusInvestorType
  | NaviInvestorType
  | NaviLoopInvestorType
  | BucketInvestorType
  | BluefinInvestorType;

export type CetusInvestorType = {
  emergency_balance_a: string;
  emergency_balance_b: string;
  free_balance_a: string;
  free_balance_b: string;
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  is_emergency: boolean;
  lower_tick: number;
  minimum_swap_amount: string;
  performance_fee: string;
  performance_fee_max_cap: string;
  upper_tick: number;
};

export type NaviInvestorType = {
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  max_cap_performance_fee: string;
  minimum_swap_amount: string;
  navi_acc_cap: {
    id: string;
    owner: string;
  };
  performance_fee: string;
  tokensDeposited: string;
};

export type NaviLoopInvestorType = {
  current_debt_to_supply_ratio: string;
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  loops: string;
  max_cap_performance_fee: string;
  minimum_swap_amount: string;
  navi_acc_cap: {
    id: string;
    owner: string;
  };
  performance_fee: string;
  safe_borrow_percentage: string;
  tokensDeposited: string;
};

export type BucketInvestorType = {
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  max_cap_performance_fee: string;
  minimum_swap_amount: string;
  performance_fee: string;
  stake_proof: {
    fountain_id: string;
    id: string;
    lock_until: string;
    stake_amount: string;
    stake_weight: string;
    start_uint: string;
  };
  tokensDeposited: string;
};

export type BluefinInvestorType = {
  emergency_balance_a: string;
  emergency_balance_b: string;
  free_balance_a: string;
  free_balance_b: string;
  free_rewards: {
    id: string;
    size: string;
  };
  id: string;
  is_emergency: boolean;
  lower_tick: number;
  minimum_swap_amount: string;
  performance_fee: string;
  performance_fee_max_cap: string;
  upper_tick: number;
};

// <--------- Receipt Types --------->
export type ReceiptType = AlphaReceiptType | DefaultReceiptType;

export type AlphaReceiptType = {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: {
    key: string;
    value: string;
  }[];
  locked_balance: {
    head: string;
    id: string;
    size: string;
    tail: string;
  };
  name: string;
  owner: string;
  pending_rewards: {
    key: string;
    value: string;
  }[];
  pool_id: string;
  unlocked_xtokens: string;
  xTokenBalance: string;
  type: string;
};

export type DefaultReceiptType = {
  id: string;
  image_url: string;
  last_acc_reward_per_xtoken: {
    key: string;
    value: string;
  }[];
  name: string;
  owner: string;
  pending_rewards: {
    key: string;
    value: string;
  }[];
  pool_id: string;
  xTokenBalance: string;
  type: string;
};

// <--------- Distributor Types --------->
export type DistributorType = {
  airdrop_wallet: string;
  airdrop_wallet_balance: string;
  dust_wallet_address: string;
  fee_wallet: string;
  id: string;
  next_halving_timestamp: string;
  onhold_receipts_wallet_address: string;
  pool_allocator: AllocatorType;
  reward_unlock: [];
  start_timestamp: string;
  target: string;
  team_wallet_address: string;
  team_wallet_balance: string;
};

type AllocatorType = {
  id: string;
  members: MemberType[];
  rewards: {
    id: string;
    size: string;
  };
  total_weights: {
    key: string;
    value: string;
  }[];
};

type MemberType = {
  key: string;
  value: {
    pool_data: {
      key: string;
      value: {
        last_update_time: string;
        pending_rewards: string;
        weight: string;
      };
    }[];
  };
};

// <--------- Position Types --------->
export type UserWithdrawRequestType = {
  id: string;
  time_of_request: string;
  time_of_acceptance: string;
  time_of_claim: string;
  time_of_unlock: string;
  status: string;
  token_amount: string;
};

export type AlphaPositionType = {
  id: string;
  alphafi_receipt_id: string;
  pool_id: string;
  coin_type: string;
  xtokens: string;
  withdraw_requests: {
    key: string;
    value: UserWithdrawRequestType;
  }[];
  all_withdrawals: {
    id: string;
    size?: string;
  };
  all_deposits: {
    id: string;
    size?: string;
  };
  last_acc_reward_per_xtoken: {
    key: string;
    value: string;
  }[];
  pending_rewards: {
    key: string;
    value: string;
  }[];
};


export type AlphaFiReceiptType = {
  id: string;
  position_pool_map: {
    key: string;
    value: {
      pool_id: string;
      partner_cap_id: string;
    };
  }[];
  client_address: string;
};