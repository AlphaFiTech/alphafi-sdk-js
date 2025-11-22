// <--------- Native Pool Queries --------->
export type DefaultPoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      acc_rewards_per_xtoken: {
        fields: {
          contents: {
            fields: {
              key: {
                fields: {
                  name: string;
                };
                type: string;
              };
              value: string;
            };
            type: string;
          }[];
        };
        type: string;
      };
      deposit_fee: string;
      deposit_fee_max_cap: string;
      id: { id: string };
      image_url: number[];
      name: number[];
      paused: boolean;
      rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      tokensInvested: string;
      withdraw_fee_max_cap: string;
      withdrawal_fee: string;
      xTokenSupply: string;
    };
  };
};

export type FungiblePoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      deposit_fee: string;
      deposit_fee_max_cap: string;
      id: { id: string };
      paused: boolean;
      tokensInvested: string;
      treasury_cap: {
        fields: {
          id: {
            id: string;
          };
          total_supply: {
            fields: {
              value: string;
            };
            type: string;
          };
        };
        type: string;
      };
      withdraw_fee_max_cap: string;
      withdrawal_fee: string;
    };
  };
};
export type VecMap<K = any, V = any> = {
  fields: {
    contents: {
      fields: {
        key: K;
        value: V;
      };
      type: string;
    }[];
  };
  type: string;
};
export type Bag = {
  fields: {
    id: {
      id: string;
    };
    size?: string;
  };
  type: string;
};
export type ObjectTable = Bag;
// export enum RequestType {
//   Withdraw = "Withdraw",
//   AutoCompound = "AutoCompound",
//   Leverage = "Leverage",
// }
export type WithdrawalRequest = {
  fields: {
    owner: string;
    receiver: string;
    shares: string;
    estimated_withdraw_amount: string;
    timestamp: string;
    sequence_number: string;
  };
  type: string;
}
export type AlphaPoolInvestor = {
  type: string;
  fields: {
    id: {
      id: string;
    };
    unsupplied_balance: string;
    claimable_balance: string;
    alphalend_position_cap: {
      type: string;
      fields:{
        position_id: string;
      };
    };
    cur_debt: string;
    current_debt_to_supply_ratio: string;
    borrow_token_to_token_ratio: string;
    safe_borrow_percentage: string;
    allowed_coin_types_for_swap: VecMap<{
      fields: {
        name: string;
      };
      type: string;
    }, boolean>;
    minimum_swap_amount: string;
    primary_market_id: string;
    borrow_market_id: string;
    resupply_market_id: string;
    free_rewards: Bag;
    withdraw_receivers_address: string;
    withdraw_tickets: VecMap<{
      variant: string;
    }, VecMap<string, WithdrawalRequest>>;
    total_pending_withdrawals: string;
    performance_fee: string;
    performance_fee_cap: string;
    additional_fields: Bag;
  };
};
export type AlphaPoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
        id: {
          id: string
        };
        xTokenSupply: string;
        tokensInvested: string;
        unsupplied_balance: string;
        claimable_balance: string;
        positions: ObjectTable;
        recently_updated_alphafi_receipts: VecMap<string, {
          fields: {
            xtokens_to_add: string;
            xtokens_to_remove: string;
          };
          type: string;
        }>;
        withdraw_requests: VecMap<string, {
          fields: {
            total_amount_to_withdraw: string;
            leftover_amount: string;
          };
          type: string;
        }>;
        fee_collected: string;
        last_distribution_time: string;
        last_autocompound_time: string;
        locking_period: string;
        time_from_locking_period_for_unstaking_to_start: string;
        current_exchange_rate: {
          fields:{
            value: string;
          };
        };
        rewards: Bag;
        acc_rewards_per_xtoken: VecMap<{
          fields: {
            name: string;
          };
          type: string;
        }, string>;
        deposit_fee: string;
        deposit_fee_max_cap: string;
        withdrawal_fee: string;
        withdraw_fee_max_cap: string;
        fee_address: string;
        is_deposit_paused: boolean;
        is_withdraw_paused: boolean;
        alphafi_partner_cap: {
          type: string;
          fields: {
            id: {
              id: string;
            }
          };
        };
        additional_fields: Bag;
    };
  };
};

// <--------- Parent Pool Queries --------->
export type CetusParentPoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      coin_a: string;
      coin_b: string;
      current_sqrt_price: string;
      current_tick_index: {
        fields: { bits: number };
        type: string;
      };
      fee_growth_global_a: string;
      fee_growth_global_b: string;
      fee_protocol_coin_a: string;
      fee_protocol_coin_b: string;
      fee_rate: string;
      id: { id: string };
      index: string;
      is_pause: boolean;
      liquidity: string;
      position_manager: {
        fields: {
          position_index: string;
          positions: {
            fields: {
              head: string;
              id: { id: string };
              size: string;
              tail: string;
            };
            type: string;
          };
          tick_spacing: number;
        };
        type: string;
      };
      rewarder_manager: {
        fields: {
          last_updated_time: string;
          points_growth_global: string;
          points_released: string;
          rewarders: {
            fields: {
              emissions_per_second: string;
              growth_global: string;
              reward_coin: {
                fields: {
                  name: string;
                };
                type: string;
              };
            };
            type: string;
          }[];
        };
        type: string;
      };
      // tick_manager: {};
      tick_spacing: number;
      url: string;
    };
  };
};

export type BluefinParentPoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      coin_a: string;
      coin_b: string;
      current_sqrt_price: string;
      current_tick_index: {
        fields: { bits: number };
        type: string;
      };
      fee_growth_global_coin_a: string;
      fee_growth_global_coin_b: string;
      fee_rate: string;
      icon_url: string;
      id: { id: string };
      is_paused: boolean;
      liquidity: string;
      name: string;
      observations_manager: {
        fields: {
          observation_index: string;
          observations: [];
          observation_cardinality: string;
          observation_cardinality_next: string;
        };
        type: string;
      };
      position_index: string;
      protocol_fee_coin_a: string;
      protocol_fee_coin_b: string;
      protocol_fee_share: string;
      reward_infos: [];
      sequence_number: string;
      ticks_manager: {
        type: string;
        fields: {
          bitmap: {
            fields: {
              id: {
                id: string;
              };
              size: string;
            };
            type: string;
          };
          tick_spacing: number;
          ticks: {
            fields: {
              id: {
                id: string;
              };
              size: string;
            };
            type: string;
          };
        };
      };
    };
  };
};

export type NaviParentPoolQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      balance: string;
      decimal: number;
      id: {
        id: string;
      };
      treasury_balance: string;
    };
  };
};

// <--------- Investor Queries --------->
export type CetusInvestorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      emergency_balance_a: string;
      emergency_balance_b: string;
      free_balance_a: string;
      free_balance_b: string;
      free_rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      id: { id: string };
      is_emergency: boolean;
      lower_tick: number;
      minimum_swap_amount: string;
      performance_fee: string;
      performance_fee_max_cap: string;
      upper_tick: number;
    };
  };
};

export type NaviInvestorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      free_rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      id: { id: string };
      max_cap_performance_fee: string;
      minimum_swap_amount: string;
      navi_acc_cap: {
        fields: {
          id: {
            id: string;
          };
          owner: string;
        };
        type: string;
      };
      performance_fee: string;
      tokensDeposited: string;
    };
  };
};

export type NaviLoopInvestorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      current_debt_to_supply_ratio: string;
      free_rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      id: { id: string };
      loops: string;
      max_cap_performance_fee: string;
      minimum_swap_amount: string;
      navi_acc_cap: {
        fields: {
          id: {
            id: string;
          };
          owner: string;
        };
        type: string;
      };
      performance_fee: string;
      safe_borrow_percentage: string;
      tokensDeposited: string;
    };
  };
};

export type BucketInvestorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      free_rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      id: { id: string };
      max_cap_performance_fee: string;
      minimum_swap_amount: string;
      performance_fee: string;
      stake_proof: {
        fields: {
          fountain_id: string;
          id: {
            id: string;
          };
          lock_until: string;
          stake_amount: string;
          stake_weight: string;
          start_uint: string;
        };
        type: string;
      };
      tokensDeposited: string;
    };
  };
};

export type BluefinInvestorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      emergency_balance_a: string;
      emergency_balance_b: string;
      free_balance_a: string;
      free_balance_b: string;
      free_rewards: {
        fields: {
          id: {
            id: string;
          };
          size: string;
        };
        type: string;
      };
      id: { id: string };
      is_emergency: boolean;
      lower_tick: number;
      minimum_swap_amount: string;
      performance_fee: string;
      performance_fee_max_cap: string;
      upper_tick: number;
    };
  };
};

// <--------- Receipt Queries --------->
export type AlphaReceiptQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      id: { id: string };
      image_url: string;
      last_acc_reward_per_xtoken: {
        fields: {
          contents: {
            fields: {
              key: {
                fields: {
                  name: string;
                };
                type: string;
              };
              value: string;
            };
            type: string;
          }[];
        };
        type: string;
      };
      locked_balance: {
        fields: {
          head: string;
          id: { id: string };
          size: string;
          tail: string;
        };
        type: string;
      };
      name: string;
      owner: string;
      pending_rewards: {
        fields: {
          contents: {
            fields: {
              key: {
                fields: {
                  name: string;
                };
                type: string;
              };
              value: string;
            };
            type: string;
          }[];
        };
        type: string;
      };
      pool_id: string;
      unlocked_xtokens: string;
      xTokenBalance: string;
    };
  };
};

export type DefaultReceiptQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      id: { id: string };
      image_url: string;
      last_acc_reward_per_xtoken: {
        fields: {
          contents: {
            fields: {
              key: {
                fields: {
                  name: string;
                };
                type: string;
              };
              value: string;
            };
            type: string;
          }[];
        };
        type: string;
      };
      name: string;
      owner: string;
      pending_rewards: {
        fields: {
          contents: {
            fields: {
              key: {
                fields: {
                  name: string;
                };
                type: string;
              };
              value: string;
            };
            type: string;
          }[];
        };
        type: string;
      };
      pool_id: string;
      xTokenBalance: string;
    };
  };
};

// <--------- Distributor Queries --------->
export type DistributorQueryType = {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      airdrop_wallet: string;
      airdrop_wallet_balance: string;
      dust_wallet_address: string;
      fee_wallet: string;
      id: {
        id: string;
      };
      next_halving_timestamp: string;
      onhold_receipts_wallet_address: string;
      pool_allocator: AllocatorQueryType;
      reward_unlock: {
        fields: { contents: [] };
        type: string;
      };
      start_timestamp: string;
      target: string;
      team_wallet_address: string;
      team_wallet_balance: string;
    };
  };
};

type AllocatorQueryType = {
  fields: {
    id: {
      id: string;
    };
    members: {
      fields: {
        contents: MemberQueryType[];
      };
      type: string;
    };
    rewards: {
      fields: {
        id: {
          id: string;
        };
        size: string;
      };
      type: string;
    };
    total_weights: {
      fields: {
        contents: {
          fields: {
            key: {
              fields: {
                name: string;
              };
              type: string;
            };
            value: string;
          };
          type: string;
        }[];
      };
      type: string;
    };
  };
  type: string;
};

type MemberQueryType = {
  fields: {
    key: string;
    value: {
      fields: {
        pool_data: {
          fields: {
            contents: {
              fields: {
                key: {
                  fields: {
                    name: string;
                  };
                  type: string;
                };
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
            }[];
          };
          type: string;
        };
      };
      type: string;
    };
  };
  type: string;
};

export type AlphaFiReceiptQueryType = {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      id: {
        id: string;
      };
      position_pool_map: VecMap<string, {
        type: string;
        fields: {
          pool_id: string;
          partner_cap_id: string;
        };
      }>;
      client_address: string;
    };
  };
};

// <--------- Position Queries --------->
export type UserWithdrawRequestQueryType = {
  type: string;
  fields: {
    id: {
      id: string;
    };
    time_of_request: string;
    time_of_acceptance: string;
    time_of_claim: string;
    time_of_unlock: string;
    status: string;
    token_amount: string;
  };
};

export type Table = ObjectTable;

export type AlphaPositionQueryType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      id: {
        id: string;
      };
      alphafi_receipt_id: string;
      pool_id: string;
      coin_type: {
        fields: {
          name: string;
        };
        type: string;
      };
      xtokens: string;
      withdraw_requests: VecMap<string, UserWithdrawRequestQueryType>;
      all_withdrawals: ObjectTable;
      all_deposits: Table;
      last_acc_reward_per_xtoken: VecMap<{
        fields: {
          name: string;
        };
        type: string;
      }, string>;
      pending_rewards: VecMap<{
        fields: {
          name: string;
        };
        type: string;
      }, string>;
    };
  };
};

