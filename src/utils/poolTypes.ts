export type CetusPoolType = {
  objectId: string;
  version: string;
  digest: string;
  content: {
    dataType: string;
    type: string;
    hasPublicTransfer: boolean;
    fields: {
      xTokenSupply: string;
      tokensInvested: string;
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
      // reward_manager: {};
      // tick_manager: {};
      tick_spacing: number;
      url: string;
    };
  };
};

export type BluefinPoolType = {
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
      observation_manager: {
        fields: {
          observation_index: string;
          observation: [];
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
        fields: { bitmap: []; tick_spacing: number; ticks: [] };
      };
    };
  };
};
