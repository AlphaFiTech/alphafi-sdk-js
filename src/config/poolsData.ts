/**
 * Pool configuration data
 * Auto-generated from pools.json
 */

const poolsConfig = [
  {
    strategy_type: 'AlphaVault',
    data: {
      pool_id: '0x6ee8f60226edf48772f81e5986994745dae249c2605a5b12de6602ef1b05b0c1',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'AlphaFi',
      receipt: {
        name: 'AlphaFi ALPHA Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
      },
      asset: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      events: {
        autocompound_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::RewardEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphapool::LiquidityChangeEvent',
        withdraw_v2_event_type:
          '0x904f7b5fc4064adc1a3d49b263abe683660ba766f78abd84a454c37c1f102218::alphapool::WithdrawEventV2',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::BeforeAndAfterEvent',
      },
      strategy_type: 'AlphaVault',
      is_active: true,
      pool_name: 'ALPHA',
      is_native: true,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x6fdf026be1d524112c62a8fd9211700fce94bb7e5fa5b7b0c146f1c5d8f0a8fa',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x15dbcac854b1fc68fc9467dbd9ab34270447aabd8cc0e04a5864d95ccb86b74a',
      investor_id: '0xa32648590b2c2023da645b5804c16ab4fc64dcf731d461c775aae1b6c17f4234',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance SUI-USDC (0.175%) Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0xd1ae1a8bfb89829b3e6289b0ffa6b83ff43006057f488b8b9ebb602a1cbc4c2e::alphafi_bluefin_sui_first_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-SUI-USDC-175',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x0c81278074f114f2a02f27edc05f6c02f40d7644973ef6bddb803f9fc73725b8',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x7242459a663c4e59434252ceb27c228f6b1f21f2ba506f3b62d71b19a7421cc1',
      investor_id: '0x203a9f205b6e7b357e7fdbd1258a3be0f4a778b7e421bbc4f315bce89482cf32',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance DEEP-SUI (0.175%) Receipt',
        type: '0x0c3fe368a5234c423f55d99badd45f1c09f0f4a468ee0403fb455d276a5dac62::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_sui_second_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-DEEP-SUI-175',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0xe1792743f086de2b176a408f9782ce8f1cc301981c720082f51de4bdba4f8d55',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xe60bc7ade245b9f35b49686dfab0a18e5ca9176d49bef1b90f60d67d06315ff0',
      investor_id: '0x743db07ab88395fa194fbf2552136c168feddbac1dc3b4275f77215cd9050c3a',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance WAL-SUI Receipt',
        type: '0x0c3fe368a5234c423f55d99badd45f1c09f0f4a468ee0403fb455d276a5dac62::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'WAL',
        type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_sui_second_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-WAL-SUI',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0xce921f354d7eb15f356b274c55834f9098290f08e1e7f1f49f056a2eecb02cf6',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x62af128423465822e5a0979ccad2b0b5ee50a58c6a2c8ea3dd7fda1cda3cfbe7',
      investor_id: '0xd26173539584dbce0020a9eb69dc1bf6cfe7b7be8a55e94b2db4e0261d9a5e1d',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance suiUSDT-USDC(0.001%) Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'suiUSDT',
        type: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_type_1_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC-ZERO-ZERO',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x82938703e493c5759c4fa1218d7b7f82fd0356714dfc32eae457479f1f71c225',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xbcc6909d2e85c06cf9cbfe5b292da36f5bfa0f314806474bbf6a0bf9744d37ce',
      investor_id: '0xab8585241f83c4e9cfe4d3b36af4b640a0c309b2b60be2c07b2246c32e5d8b4e',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance WAL-USDC Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'WAL',
        type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_type_1_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-WAL-USDC',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0xafc0dc5166233af565e30e24755c401ff8958a28a8fdfdbbf407236b67725695',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xa0153768c7ed857ffd8bad4708da873fb7825a6878e5f4c83f5df4c091933e56',
      investor_id: '0x7a8fc71060975c6e16083c723f376eaf41aab466d0a773c06a68f8f07040998a',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance SUI-LBTC Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'LBTC',
        type: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC',
      },
      events: {
        autocompound_event_type:
          '0xd1ae1a8bfb89829b3e6289b0ffa6b83ff43006057f488b8b9ebb602a1cbc4c2e::alphafi_bluefin_sui_first_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-SUI-LBTC',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x76fb78985fae4cf24bcd933ea5e8a6e818e9d4b51c091c4c4a78b6720199e81e',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x1b06371d74082856a1be71760cf49f6a377d050eb57afd017f203e89b09c89a2',
      investor_id: '0x217a85380d0cf4b4c5a870b8f6d11b8e3bc66de87e86d0376080ca7e60e6506c',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance DEEP-SUI Receipt',
        type: '0x0c3fe368a5234c423f55d99badd45f1c09f0f4a468ee0403fb455d276a5dac62::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_sui_second_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-DEEP-SUI',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0xb8cf0bf8b39f465c1b845e5ee8c2c53424c3faf97fb8e0ef1139abb9001e844a',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xde705d4f3ded922b729d9b923be08e1391dd4caeff8496326123934d0fb1c312',
      investor_id: '0xf7785cf8b3d3f9bee48bf4d90a142d7ec98b25d6784408ffedc11633d7124197',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance BLUE-SUI Receipt',
        type: '0x0c3fe368a5234c423f55d99badd45f1c09f0f4a468ee0403fb455d276a5dac62::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'BLUE',
        type: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_sui_second_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-BLUE-SUI',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x37671a77fb00a3323304f2586d18694bb93a6bc840e8184634ebe66d69eb48db',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x4b8271fc4819078e44ee9a0506a824b77464789d57ace355d0562a4776c51840',
      investor_id: '0x90364be9cca6c1df042f269fb944fd49ba1c74688789fe33329aa6d40ac8552a',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance DEEP-BLUE Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      asset_b: {
        name: 'BLUE',
        type: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_type_1_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-DEEP-BLUE',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x8b68333ff71fa008bb2c8bc26d5989fba51cec27393172bb6bbfdbd360489542',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0bd95d012d60190a6713ae51f2d833b24ae70c5fb07fcfb41db40f25549878b1',
      investor_id: '0x07506ea66cb73fa60dbea5177c974ca6c98d7cd8ee2fae631af6e79f139f99ec',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance suiUSDT-USDC Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'suiUSDT',
        type: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_type_1_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x1ec0aacf500624de90dd21478da12fca4726b3837e78993aee1c82f631e8364d',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa',
      investor_id: '0xcf2a8bfaafd4b50f068826e3e4217925b4280836d8f182e3481c3725269c2a1f',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance SUI-USDC Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0xd1ae1a8bfb89829b3e6289b0ffa6b83ff43006057f488b8b9ebb602a1cbc4c2e::alphafi_bluefin_sui_first_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-SUI-USDC',
      is_native: false,
    },
  },
  {
    strategy_type: 'AutobalanceLp',
    data: {
      pool_id: '0x65a167f16da65732fc71ec5b8714e5beb293e931d54820f1fea188bbcf09383d',
      package_id: '0x6a6388dd70cba58a4e4b3704b8ee770fcf83adf54d04405757d17b61f69317f2',
      package_number: 7,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0321b68a0fca8c990710d26986ba433d06b351deba9384017cd6175f20466a8f',
      investor_id: '0x685c0569675bb46b838941568f1123c03eeef374dc4160c7d9b3abbc3b93f25c',
      receipt: {
        name: 'AlphaFi-Bluefin-Autobalance USDT-USDC Receipt',
        type: '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x830ce657bd8547460bdb1a5e5a7607d4641a73593a23165c8630c0d310a3f306::alphafi_bluefin_type_1_pool::RewardEvent',
        liquidity_change_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x754afbce8c72c8e491e3b9d536aa9d9766fdbc68650224ce01072189b235eee3::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'AutobalanceLp',
      is_active: true,
      pool_name: 'BLUEFIN-AUTOBALANCE-USDT-USDC',
      is_native: false,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x20f27f4b4e8de8e11aef5c59a4facc8367a92b24bd8302448bd97efbbaf9fec5',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xee0d89310b7216a8ef86cd2af0dd22382f4be2049cd073603b7099d9846ab4ca',
      investor_id: '0xe171b8b8270e0e311362d55a0e21d387be6d549af8559f0d6ce3c4dfbb95deb7',
      receipt: {
        name: 'AlphaFi-Bluefin WAL-STSUI Receipt',
        type: '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_pool::Receipt',
      },
      asset_a: {
        name: 'WAL',
        type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
      },
      asset_b: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      events: {
        autocompound_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-WAL-STSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x2781cca45bd57e1205b46dd439baf5233a0f02c4016e0a6b0d1f84036f47d109',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xbcc6909d2e85c06cf9cbfe5b292da36f5bfa0f314806474bbf6a0bf9744d37ce',
      investor_id: '0x386445d435618922939a998c59593558d576821b5adceb1279b72731fbefaa38',
      receipt: {
        name: 'AlphaFi-Bluefin WAL-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'WAL',
        type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-WAL-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x59ec4223043e2bbbcd519bf161088b81946193b0580d6ce94b48e9cb659c6efa',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x7df346f8ef98ad20869ff6d2fc7c43c00403a524987509091b39ce61dde00957',
      investor_id: '0x6285c57b0d86cbe585abfe5b23d74f96243f450381ef4d57604164e76a76f4c8',
      receipt: {
        name: 'AlphaFi-Cetus suiUSDT-USDC Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      asset_b: {
        name: 'suiUSDT',
        type: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDC-SUIUSDT',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xd30d849bbddd0c1bc0e2eb552c2dacdf4ae998cc03cd485640eb3db7f456e295',
      package_id: '0x50037e98117943e5bda330ff010c2556a216c06c2f5ba8a9958060c8b7c99b91',
      package_number: 8,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x715959c4a67cc6b8d2d4c0db628618d947a032041453a24c3a5315beb613331a',
      investor_id: '0x43523544dd4e7900ac6aeb8299e1aebd5d72bf7fae97f1a3b988c31e08b1bacc',
      receipt: {
        name: 'AlphaFi-Bluefin LBTC-wBTC Receipt',
        type: '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'LBTC',
        type: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC',
      },
      asset_b: {
        name: 'wBTC',
        type: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',
      },
      events: {
        autocompound_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-LBTC-SUIBTC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x4043b9e628d0cc6c2e3f322e6a7bddf603a3bcc084992355b55f4c23516bb6ba',
      package_id: '0x50037e98117943e5bda330ff010c2556a216c06c2f5ba8a9958060c8b7c99b91',
      package_number: 8,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xf0e4772e80800550368973d1f8ab2c9a7241ace8df8770452ee2bf3e3e67b8a1',
      investor_id: '0x6876c4b19075ee774ca368a4a782c9425cca97251093dafa7ff239a846b3ee30',
      receipt: {
        name: 'AlphaFi-Bluefin wBTC-USDC Receipt',
        type: '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'wBTC',
        type: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x5d0b7cab355e1ffc6d5108a31d7d7064cd5da8c7a2abb35b45960b3f195a8402::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-SUIBTC-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xb251e187a4e688dd3dbbf378e4aacfdd41de6a81e2a4bc10c7b80e056c1da630',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0da4bcb1669ae3b6ce80f024e3a2076e2c4e2cc899d4724fce94da0f729bc968',
      investor_id: '0xa8a705f8819e01396927c1ec179a140750597ed3b5268d205bbf5240979fda86',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-MUSD Receipt',
        type: '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'MUSD',
        type: '0xe44df51c0b21a27ab915fa1fe2ca610cd3eaa6d9666fe5e62b988bf7f0bd8722::musd::MUSD',
      },
      events: {
        autocompound_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-STSUI-MUSD',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xdee56209e25c0eafdd3e06ee9f4aae03d173478d158fb4c5c1fbae7c75d4cd72',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0bc35f5b7e7b77dadc62c2630e9efafb1beb4122fd5393bf3b99586abf3ca8b1',
      investor_id: '0xb5633adb8cfb5a4e6580002b21bc403d5d096dbca07495986b4882619ce05279',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-BUCK Receipt',
        type: '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'BUCK',
        type: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
      },
      events: {
        autocompound_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-STSUI-BUCK',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x5b975bf7d0f0e3784a5b2db8f0a3e0b45cdcc31b39a222e680716a6ad7eba67f',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0bd95d012d60190a6713ae51f2d833b24ae70c5fb07fcfb41db40f25549878b1',
      investor_id: '0x23c073d557e4512f1811bd7c767047de13de14c59bb9607373613531250910b7',
      receipt: {
        name: 'AlphaFi-Bluefin suiUSDT-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'suiUSDT',
        type: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-SUIUSDT-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xd601c2d1f451a1493e8d071482272a83e6dafbcdb82b249ca5b3ac909c4138f3',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xd4051b5dc76ca354e48813268aa79de38b274878ef6a9d274066ae5a47f46cc6',
      investor_id: '0x959f6df092073b23c0ad0278a9cf070b6779f2edc9b7124108207b4d7b4e94ca',
      receipt: {
        name: 'AlphaFi-Bluefin ALPHA-STSUI Receipt',
        type: '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_pool::Receipt',
      },
      asset_a: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      asset_b: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      events: {
        autocompound_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xdb3f0d00c5aa1d24dd65dfcbaecb284e013a2c7e742be3cb979c7703a1b899c9::alphafi_bluefin_stsui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-ALPHA-STSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x41e33aea32a0436f11009dffe539585eeaddcca69dafa8ca94af822a40f13686',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x1236ad7cce4e8d432221c1ff8084fc062614c4834927d6086ed2dc79c4dc504c',
      investor_id: '0x1035ef8163114280567780eb5b64e9fc2545bd9fa72799ee956657be810c5e73',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-WSOL Receipt',
        type: '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'WSOL',
        type: '0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-STSUI-WSOL',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xec9a1b3aad68c7993750c322f349cdf716f4ee4ec6932d9d876460b056f2319f',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x38e058d059d2bd6d00d2c85a7b0656a232cada12441fb406cd3ab29c6822b550',
      investor_id: '0x5eb70fc34300e26e01b59108f4b9618a6609a9428bd76d9e04941ed867fa5cfe',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-ETH Receipt',
        type: '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'suiETH',
        type: '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH',
      },
      events: {
        autocompound_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-STSUI-ETH',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x95f0543f861584f1a3c3129c46901d5c5cc1d44e77eb57aab63eec55cd128f29',
      package_id: '0x36d6d7a686129055b72a9b9482f24018db0e7188433e542d403808242223b455',
      package_number: 6,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x11dbeb991fea4b2c7efcba4b6b21cbecd3f94be99ec8c9205839eaf03356d358',
      investor_id: '0x65e4af88e543e41c410f969801d53e40acb23da7be811e4c61d05a7d7d235b3b',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-USDC Receipt',
        type: '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-STSUI-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xf5e643282e76af102aada38c67aae7eaec1ba2fe3301871f9fcca482893f96f2',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x4746414e445cebdc19666b6e4de9b79a46ca7bcaa894bf10ec230e649376356e',
      investor_id: '0xe348b843a54463afe5438fa76df127b2b78bc89caa9018ba70b3c2ba043f6a1e',
      receipt: {
        name: 'AlphaFi-Bluefin STSUI-SUI Receipt',
        type: '0xe304fb307fd32b77b7471d6e26bfa04c8a84d1342b5e5ea29bd79b75fffbdea5::alphafi_bluefin_stsui_sui_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0xe304fb307fd32b77b7471d6e26bfa04c8a84d1342b5e5ea29bd79b75fffbdea5::alphafi_bluefin_stsui_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xe304fb307fd32b77b7471d6e26bfa04c8a84d1342b5e5ea29bd79b75fffbdea5::alphafi_bluefin_stsui_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0xe304fb307fd32b77b7471d6e26bfa04c8a84d1342b5e5ea29bd79b75fffbdea5::alphafi_bluefin_stsui_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-STSUI-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x46de57bfaa096c674492c3892caa261cf34cc46a2e539ece91f0db3e46e3f6c3',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x1b06371d74082856a1be71760cf49f6a377d050eb57afd017f203e89b09c89a2',
      investor_id: '0x92454fe9c315328efb29607c30f6fb7b5ec55c0a8d9944285075386e381bbca0',
      receipt: {
        name: 'AlphaFi-Bluefin DEEP-SUI Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-DEEP-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x31cc72ec8a332d5e0ecd65c8d5d778333e1c8432a8826a88a8c51eb4e7dc6fac',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xe71aa89df60e737f1b687f8dfbd51e2a9b35706e9e5540ce9b053bd53fcb9ec3',
      investor_id: '0x68d23ee66a167e39513747a75dd4af3fd2b5728a4653566bf3e813f684cf748b',
      receipt: {
        name: 'AlphaFi-Bluefin WBTC-SUI Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'WBTC',
        type: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-WBTC-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xd5757d9f00db3f21a0fa38a86a5c1d52ae44828cc59f1798550e2ccf260b2a34',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xbd5b29a952040ccd47ce2822bddd4aba3affaae9d6ccdaf65aded5528e39b837',
      investor_id: '0xa57b9da796a2848853de7478ec64db63213cb409bfdf182c8b20c7a64896cbcc',
      receipt: {
        name: 'AlphaFi-Bluefin SEND-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'SEND',
        type: '0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-SEND-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xddecab961380225c95e6a6089660de2e6028170fbc2cd07ab79b8bf45e3c2645',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xde705d4f3ded922b729d9b923be08e1391dd4caeff8496326123934d0fb1c312',
      investor_id: '0x56f05fc7b81cf45b8b223de9daba1ba82bf4ce32ba0bfa46c2780d78216b2b92',
      receipt: {
        name: 'AlphaFi-Bluefin BLUE-SUI Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::Receipt',
      },
      asset_a: {
        name: 'BLUE',
        type: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_second_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-BLUE-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x4b28663453af487a81d4fb2ba7c96cccd63978b83f950d3dcf60dd88116e3e91',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x3717c637003c4274f20cde8c4eeadbffa2bbf16d995a0fe0f7bf99c03cf52e61',
      investor_id: '0xb1a991064c4cbf1d7fb64a01ce8b2e3aa2f7d25b3ff8de7cabc1cb9ccc0fc12f',
      receipt: {
        name: 'AlphaFi-Bluefin BLUE-USDC Receipt',
        type: '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::Receipt',
      },
      asset_a: {
        name: 'BLUE',
        type: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-BLUE-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xf495b997ae10b8bb0996c1ee56a1cc7832daec36a9380e0932e41256d97cabad',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xa0b4fef70ccef039b94512d6384806979d4c201c5e12af9a4b0458454b80da35',
      investor_id: '0x3672719d64416d0f04575b500e853d9101dfca6488f705856c59ace1999e99d1',
      receipt: {
        name: 'AlphaFi-Bluefin NAVX-VSUI Receipt',
        type: '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::Receipt',
      },
      asset_a: {
        name: 'NAVX',
        type: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
      },
      asset_b: {
        name: 'vSUI',
        type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      },
      events: {
        autocompound_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-NAVX-VSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x89793208211927a4d1458a59d34b775aaec17af8c98a59a1ba97f7b005c0e587',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xb30df44907da6e9f3c531563f19e6f4a203d70f26f8a33ad57881cd7781e592d',
      investor_id: '0x275e4df83f6f7b9dc75504d02e5d32f21ca03a5a8b017c622a8b42d3671e2888',
      receipt: {
        name: 'AlphaFi-Bluefin SUI-AUSD Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'AUSD',
        type: '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-SUI-AUSD',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x4540c5e7de64088c0c2c30abc51f7e6bbe6bc48703667c108aa1de23f6aa40e6',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x6595edf6d8c8b6894a5c6760843ae2fde81cb37d8586984dd1345b0f00bfecd8',
      investor_id: '0x187ca6f373d20465a730125c93e62a96c6a73354a1a8b35cbdd2b39278b7b141',
      receipt: {
        name: 'AlphaFi-Bluefin ALPHA-USDC Receipt',
        type: '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::Receipt',
      },
      asset_a: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x2db488439eb7c31010515a6534ea185a99e17b287ef01b618a74cdd134552f4e::alphafi_bluefin_type_2_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-ALPHA-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xbc0de037958d7988710c40f4e7317f8f3ffca4fa3cc9e1c18bc1ebd7ec65cd6e',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x38282481e3a024c50254c31ebfc4710e003fe1b219c0aa31482a860bd58c4ab0',
      investor_id: '0x9d14a391953d5b853fb22c4135657da341f4db3b341dd4d5f603cfb008e91745',
      receipt: {
        name: 'AlphaFi-Bluefin WBTC-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'WBTC',
        type: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-WBTC-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x8ed765497eeedf7960af787c0c419cb2c01c471ab47682a0619e8588c06a9aa6',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x881639630836b703aa3e04898f8a3740584859838d986619d0ee0f63a784c078',
      investor_id: '0x1f9f325dfb23a3516679cd7bda58c26791b2a34c40ce5e1cd88ee6f8361a0ea6',
      receipt: {
        name: 'AlphaFi-Bluefin AUSD-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'AUSD',
        type: '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-AUSD-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x58c4a8c5d18c61156e1a5a82811fbf71963a4de3f5d52292504646611a308888',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0xe63329f43a9474d421be85ff270bafc04667b811d215d4d4ee2512bcf2713896',
      investor_id: '0xc04ef6923ae5cf047cf853d2fa809ab56dbe712ca95f87c5f3c12dcfe66f7ecd',
      receipt: {
        name: 'AlphaFi-Bluefin SUI-BUCK Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'BUCK',
        type: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-SUI-BUCK',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x8d9220587b2969429c517e76b3695f01cb3749849d69937c4140a6715bf14c7f',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x0321b68a0fca8c990710d26986ba433d06b351deba9384017cd6175f20466a8f',
      investor_id: '0x114bf16bd3504d6f491e35152d54f5340d66d7c6abaca7689b9081cd3af0cd93',
      receipt: {
        name: 'AlphaFi-Bluefin USDT-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::Receipt',
      },
      asset_a: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_type_1_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BLUEFIN-USDT-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x99b9bd1d07690a658b9723509278b83715f7c4bec2bc5983316c002b597dfabd',
      package_id: '0x5769fdace205e2a37375b8bc46f839c20780c136f036d227f5a09ab5bd206908',
      package_number: 4,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa',
      investor_id: '0x863909d3ced121e06053dec3fd2cb08ecda4c54607ad1b3f4fc8c75267c8012c',
      receipt: {
        name: 'AlphaFi-Bluefin SUI-USDC Receipt',
        type: '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::Receipt',
      },
      asset_a: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x066648edaf473d6cc14b7ab46f56b673be4e44f9c940f70b6bacd7848808859b::alphafi_bluefin_sui_first_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: true,
      pool_name: 'BLUEFIN-SUI-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xeb44ecef39cc7873de0c418311557c6b8a60a0af4f1fe1fecece85d5fbe02ab5',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x59cf0d333464ad29443d92bfd2ddfd1f794c5830141a5ee4a815d1ef3395bf6c',
      investor_id: '0x9b7c9b6086d3baf413bccdfbb6f60f04dedd5f5387dee531eef5b811afdfaedc',
      receipt: {
        name: 'AlphaFi BUCK-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'BUCK',
        type: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'BUCK-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xc04f71f32a65ddf9ebf6fb69f39261457da28918bfda5d3760013f3ea782a594',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x9e59de50d9e5979fc03ac5bcacdb581c823dbd27d63a036131e17b391f2fac88',
      investor_id: '0xb0bff60783536f9dc0b38e43150a73b73b8a4f1969446f7721e187821915bd00',
      receipt: {
        name: 'AlphaFi USDC(Native)-ETH Receipt',
        type: '0x2793db7aa0e0209afc84f0adb1b258973cf1c9da55c35ee85c18f2ed4912bb6f::alphafi_cetus_pool_base_a::Receipt',
      },
      asset_a: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      asset_b: {
        name: 'suiETH',
        type: '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool_base_a::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDC-ETH',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xff496f73a1f9bf7461882fbdad0c6c6c73d301d3137932f7fce2428244359eaa',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2',
      investor_id: '0x5e195363175e4b5139749d901ddd5ef1ffc751777a7051b558c45fa12f24abc3',
      receipt: {
        name: 'AlphaFi DEEP-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'DEEP-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x4c0e42f1826170ad9283b321a7f9a453ef9f65aaa626f7d9ee5837726664ecdc',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x29e218b46e35b4cf8eedc7478b8795d2a9bcce9c61e11101b3a039ec93305126',
      investor_id: '0xb43d1defd5f76ef084d68d6b56e903b54d0a3b01be8bb920ed1fa84b42c32ee1',
      receipt: {
        name: 'AlphaFi ALPHA-USDC(Native) Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      asset_b: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'ALPHA-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x568a47adf2b10219f0973a5600096822b38b4a460c699431afb6dad385614d66',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x1efc96c99c9d91ac0f54f0ca78d2d9a6ba11377d29354c0a192c86f0495ddec7',
      investor_id: '0x6cc5e671a2a6e9b8c8635ff1fb16ae62abd7834558c3a632d97f393c0f022972',
      receipt: {
        name: 'AlphaFi USDC(Native)-WUSDC Receipt',
        type: '0x2793db7aa0e0209afc84f0adb1b258973cf1c9da55c35ee85c18f2ed4912bb6f::alphafi_cetus_pool_base_a::Receipt',
      },
      asset_a: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      asset_b: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool_base_a::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDC-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x727882553d1ab69b0cabad2984331e7e39445f91cb4046bf7113c36980685528',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105',
      investor_id: '0xba6acd0350eab1c6bc433b6c869e5592fe0667ae96a3115f89d5c79dd78396ef',
      receipt: {
        name: 'AlphaFi USDC(Native)-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDC-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xa213f04c6049f842a7ffe7d39e0c6138a863dc6e25416df950d23ddb27d75661',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x6bd72983b0b5a77774af8c77567bb593b418ae3cd750a5926814fcd236409aaa',
      investor_id: '0xe553be450b7290025d5810da45102abdbaa211c5735e47f6740b4dd880edc0bd',
      receipt: {
        name: 'AlphaFi USDC(Native)-USDT Receipt',
        type: '0x2793db7aa0e0209afc84f0adb1b258973cf1c9da55c35ee85c18f2ed4912bb6f::alphafi_cetus_pool_base_a::Receipt',
      },
      asset_a: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      asset_b: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool_base_a::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDC-USDT',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x594f13b8f287003fd48e4264e7056e274b84709ada31e3657f00eeedc1547e37',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xda7347c3192a27ddac32e659c9d9cbed6f8c9d1344e605c71c8886d7b787d720',
      investor_id: '0x46d901d5e1dba34103038bd2ba789b775861ea0bf4d6566afd5029cf466a3d88',
      receipt: {
        name: 'AlphaFi ALPHA-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'ALPHA-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x30066d9879374276dc01177fbd239a9377b497bcd347c82811d75fcda35b18e5',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20',
      investor_id: '0x87a76889bf4ed211276b16eb482bf6df8d4e27749ebecd13017d19a63f75a6d5',
      receipt: {
        name: 'AlphaFi USDT-USDC Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      asset_b: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'USDT-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xee6f6392cbd9e1997f6e4cf71db0c1ae1611f1f5f7f23f90ad2c64b8f23cceab',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
      investor_id: '0xb6ca8aba0fb26ed264a3ae3d9c1461ac7c96cdcbeabb01e71086e9a8340b9c55',
      receipt: {
        name: 'AlphaFi USDC-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'WUSDC-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xbdf4f673b34274f36be284bca3f765083380fefb29141f971db289294bf679c6',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df',
      investor_id: '0x05fa099d1df7b5bfb2e420d5ee2d63508db17c40ce7c4e0ca0305cd5df974e43',
      receipt: {
        name: 'AlphaFi WETH-USDC Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'WETH',
        type: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
      },
      asset_b: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'WETH-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x676fc5cad79f51f6a7d03bfa3474ecd3c695d322380fc68e3d4f61819da3bf8a',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xaa57c66ba6ee8f2219376659f727f2b13d49ead66435aa99f57bb008a64a8042',
      investor_id: '0x9ae0e56aa0ebc27f9d8a17b5a9118d368ba262118d878977b6194a10a671bbbc',
      receipt: {
        name: 'AlphaFi WBTC-USDC Receipt',
        type: '0x2793db7aa0e0209afc84f0adb1b258973cf1c9da55c35ee85c18f2ed4912bb6f::alphafi_cetus_pool_base_a::Receipt',
      },
      asset_a: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      asset_b: {
        name: 'WBTC',
        type: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_pool_base_a::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x2793db7aa0e0209afc84f0adb1b258973cf1c9da55c35ee85c18f2ed4912bb6f::alphafi_cetus_pool_base_a::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor_base_a::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'WUSDC-WBTC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x045e4e3ccd383bedeb8fda54c39a7a1b1a6ed6a9f66aec4998984373558f96a0',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x0254747f5ca059a1972cd7f6016485d51392a3fde608107b93bbaebea550f703',
      investor_id: '0xdd9018247d579bd7adfdbced4ed39c28821c6019461d37dbdf32f0d409959b1c',
      receipt: {
        name: 'AlphaFi NAVX-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'NAVX',
        type: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::AfterTransactionEvent',
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'NAVX-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xa87297a4a8aa38848955195340ba40ba4eef476d4204c34a9297efcd37c21264',
      package_id: '0x723ad60e50b9813a32648799419db63fc6b08e2473818e79cc7f899680506211',
      package_number: 2,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded',
      investor_id: '0xd060e81548aee885bd3d37ae0caec181185be792bf45412e0d0acccd1e0174e6',
      receipt: {
        name: 'AlphaFi CETUS-SUI Receipt',
        type: '0x1a22b26f139b34c9de9718cf7e53159b2b939ec8f46f4c040776b7a3d580dd28::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'CETUS',
        type: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x1a22b26f139b34c9de9718cf7e53159b2b939ec8f46f4c040776b7a3d580dd28::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x1a22b26f139b34c9de9718cf7e53159b2b939ec8f46f4c040776b7a3d580dd28::alphafi_cetus_sui_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x1a22b26f139b34c9de9718cf7e53159b2b939ec8f46f4c040776b7a3d580dd28::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'CETUS-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x430986b53a787362e54fa83d0ae046a984fb4285a1bc4fb1335af985f4fe019d',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x0cbe3e6bbac59a93e4d358279dff004c98b2b8da084729fabb9831b1c9f71db6',
      investor_id: '0x705c560fd1f05c64e0480af05853e27e1c3d04e255cd6c5cb6921f5d1df12b5a',
      receipt: {
        name: 'AlphaFi ALPHA-USDC Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'ALPHA',
        type: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
      },
      asset_b: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'ALPHA-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0xd50ec46c2514bc8c588760aa7ef1446dcd37993bc8a3f9e93563af5f31b43ffd',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0x9ddb0d269d1049caf7c872846cc6d9152618d1d3ce994fae84c1c051ee23b179',
      investor_id: '0x74308f0de7ea1fc4aae2046940522f8f79a6a76db94e1227075f1c2343689882',
      receipt: {
        name: 'AlphaFi WSOL-USDC Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt',
      },
      asset_a: {
        name: 'WSOL',
        type: '0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN',
      },
      asset_b: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::LiquidityChangeEvent',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'WSOL-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lp',
    data: {
      pool_id: '0x005a2ebeb982a1e569a54795bce1eeb4d88900b674440f8487c2846da1706182',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Cetus',
      parent_pool_id: '0xfc6a11998f1acf1dd55acb58acd7716564049cfd5fd95e754b0b4fe9444f4c9d',
      investor_id: '0xaa17ff01024678a94381fee24d0021a96d4f3a11855b0745facbb5d2eb9df730',
      receipt: {
        name: 'AlphaFi FUD-SUI Receipt',
        type: '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_sui_pool::Receipt',
      },
      asset_a: {
        name: 'FUD',
        type: '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type: '',
        after_transaction_event_type: null,
        rebalance_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_cetus_sui_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lp',
      is_active: false,
      pool_name: 'FUD-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'FungibleLp',
    data: {
      pool_id: '0x0b45d1e5889b524dc1a472f59651cdedb8e0a2678e745f27975a9b57c127acdd',
      package_id: '0x8e4db6dc8350ea52b59ac6197405c9ea619e6e637102489e810fd4b4300b7ad9',
      package_number: 8,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x73549e0918d10727e324ebeed11ab81ab46f8fadb11078a0641f117d9097b725',
      investor_id: '0xaec347c096dd7e816febd8397be4cca3aabc094a9a2a1f23d7e895564f859dc2',
      fungible_coin: {
        name: 'AlphaFi stSUI-SUI LP',
        type: '0x96eb2012a75798ce4410392baeab9dd888bc704799b7daa468c36856c83174f3::ALPHAFI_STSUI_SUI_LP::ALPHAFI_STSUI_SUI_LP',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x59fd36210b1bf1dcd70d148cd868e059e74b22a660f84c5602cfb8501442322a::alphafi_bluefin_stsui_sui_ft_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xff869e243a172cfef9a4551f4eef88ac4861be0f81b0e7a4b7840b6276f5ceeb::alphafi_bluefin_stsui_sui_ft_pool::LiquidityChangeEvent',
        rebalance_event_type:
          '0x59fd36210b1bf1dcd70d148cd868e059e74b22a660f84c5602cfb8501442322a::alphafi_bluefin_stsui_sui_ft_investor::RebalancePoolEvent',
      },
      strategy_type: 'FungibleLp',
      is_active: false,
      pool_name: 'BLUEFIN-FUNGIBLE-STSUI-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x16a5cc859b1af17b7478c79ff43e67cc5f5e5d257fba21839060dd398a9eb958',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0x08373c5efffd07f88eace1c76abe4777489d9ec044fd4cd567f982d9c169e946',
      investor_id: '0x1e5d64f161663c0437dc34cdb1e200f983ecaad882ab3bb891a3104d2825a534',
      receipt: {
        name: 'AlphaFi-Navi DEEP Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'DEEP',
        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-DEEP',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x8ceca427f6fef09f7691eb2c9f1bf41e4854230f9e1bd21322b3ea7f76ee6975',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0xef76883525f5c2ff90cd97732940dbbdba0b391e29de839b10588cee8e4fe167',
      investor_id: '0xe261d6b63ba101a6cd79adfe69c8499a13a590170e2554072edfa10b770cfbe6',
      receipt: {
        name: 'AlphaFi-Navi WAL Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'WAL',
        type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-WAL',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x1d30d1b07d78341810a604ad34734001b3b70362c6502de2220999074429a641',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0xa3e0471746e5d35043801bce247d3b3784cc74329d39f7ed665446ddcf22a9e2',
      investor_id: '0x30432ba26016f1f1155d4a8baaa64306283dc9640cc8a42e6e3c91b1d5ba9bd4',
      receipt: {
        name: 'AlphaFi-Navi suiUSDT Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'suiUSDT',
        type: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-SUIUSDT',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x17743a10e89b108fd7c048e7737ce09082e3ef91f416ee93c2566c5dd3f438db',
      package_id: '0x8163199c587b80780bd49eec4b78995c3c321c01fc8426ebb636b1658f8b87eb',
      package_number: 9,
      parent_protocol: 'Navi',
      parent_pool_id: '0x348f4049063e6c4c860064d67a170a7b3de033db9d67545d98fa5da3999966bc',
      investor_id: '0x469237db8da554e6f061c50a0f1e106fba6775a194984b24b4827c1f9c122606',
      receipt: {
        name: 'AlphaFi-Navi wBTC Receipt',
        type: '0x6f2d869138ef374fcb24f890387c0d8c54355f497ed9f9bb69186b7fe65a7de5::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'wBTC',
        type: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',
      },
      events: {
        autocompound_event_type:
          '0x6f2d869138ef374fcb24f890387c0d8c54355f497ed9f9bb69186b7fe65a7de5::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x6f2d869138ef374fcb24f890387c0d8c54355f497ed9f9bb69186b7fe65a7de5::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-SUIBTC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0xd1125035ab6e2889239442031c130c641b75b430b71057bb79710ad578cc2867',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0x0bccd5189d311002f4e10dc98270a3362fb3f7f9d48164cf40828f6c09f351e2',
      investor_id: '0x3a5d769b84ea9ba9ae76a9a4a48f8f3880b0ab3a36564d42922d507da8d5bd06',
      receipt: {
        name: 'AlphaFi-Navi stSUI Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-STSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x35f7260fefe3dde7fa5b4bf1319f15554934a94c74acd4ba54161f99470c348f',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0xc0e02e7a245e855dd365422faf76f87d9f5b2148a26d48dda6e8253c3fe9fa60',
      investor_id: '0xcc7bcb6a7fb530349292a5ca675695150372f42171ab2b4f2b2dd6aa0fd63ac9',
      receipt: {
        name: 'AlphaFi-Navi NAVX Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'NAVX',
        type: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-NAVX',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x55b7ae7eb570d3d2ee89a92dd8d958794f1e39c4ee067b28655359c0a152b3aa',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0x2fcc6245f72795fad50f17c20583f8c6e81426ab69d7d3590420571364d080d4',
      investor_id: '0x255591fa81f35b99a16870ed97c83b69ae1557d392c72c1c7a1d2e01c1771ef0',
      receipt: {
        name: 'AlphaFi-Navi NS Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'NS',
        type: '0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-NS',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0xea3c2a2d29144bf8f22e412ca5e2954c5d3021d3259ff276e3b62424a624ad1f',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0x4b6253a9f8cf7f5d31e6d04aed4046b9e325a1681d34e0eff11a8441525d4563',
      investor_id: '0xf43c62ca04c2f8d4583630872429ba6f5d8a7316ccb9552c86bb1fcf9dee3ce2',
      receipt: {
        name: 'AlphaFi-Navi USDY Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'USDY',
        type: '0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-USDY',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x8ebe04b51e8a272d4db107ad19cfbc184d1dafeeaab0b61c26e613b804e7777a',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0xc9208c1e75f990b2c814fa3a45f1bf0e85bb78404cfdb2ae6bb97de58bb30932',
      investor_id: '0x227226f22bd9e484e541005916904ca066db1d42b8a80351800ef37b26c6cd89',
      receipt: {
        name: 'AlphaFi-Navi AUSD Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'AUSD',
        type: '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-AUSD',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0xc37ec956fdef6c217505e62444ab93f833c20923755d67d1c8588c9b093ae00e',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Navi',
      parent_pool_id: '0x78ba01c21d8301be15690d3c30dc9f111871e38cfb0b2dd4b70cc6052fba41bb',
      investor_id: '0x145952d6e903db412c2bd1d8bb25875acd57a772764fba0a97b20e2f7bdcb09c',
      receipt: {
        name: 'AlphaFi-Navi ETH Receipt',
        type: '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::Receipt',
      },
      asset: {
        name: 'suiETH',
        type: '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH',
      },
      events: {
        autocompound_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_investor_v2::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x5d90d17172b9e38da9f13a982668a9e48d0b0b5f864e421b60686f60758b37bd::alphafi_navi_pool_v2::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-ETH',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x2c5c14b9fb21f93f36cac0f363acf59ecb21f34c4c9b1a1b383f635ecdc7b507',
      package_id: '0xe7965a17ebb31475b3bc3cd60edd4bf5724972ae762173762b24f392a8c6a998',
      package_number: 3,
      parent_protocol: 'Bucket',
      parent_pool_id: '0x9e3dab13212b27f5434416939db5dec6a319d15b89a84fd074d03ece6350d3df',
      investor_id: '0x646f400ef45a3c1c9cd94dd37b3a3388098427a5aff968206bbe6b8f119866e2',
      receipt: {
        name: 'AlphaFi-Bucket BUCK Receipt',
        type: '0xa095412a92ff0f063cbea962f2f88b1a93cbc85c72bebf5dd7d90a8e2d6375ae::alphafi_bucket_pool_v1::Receipt',
      },
      asset: {
        name: 'BUCK',
        type: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
      },
      events: {
        autocompound_event_type:
          '0xa095412a92ff0f063cbea962f2f88b1a93cbc85c72bebf5dd7d90a8e2d6375ae::alphafi_bucket_investor_v1::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xa095412a92ff0f063cbea962f2f88b1a93cbc85c72bebf5dd7d90a8e2d6375ae::alphafi_bucket_pool_v1::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'BUCKET-BUCK',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x04378cf67d21b41399dc0b6653a5f73f8d3a03cc7643463e47e8d378f8b0bdfa',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0xa3582097b4c57630046c0c49a88bfc6b202a3ec0a9db5597c31765f7563755a8',
      investor_id: '0x681a30beb23d2532f9413c09127525ae5e562da7aa89f9f3498bd121fef22065',
      receipt: {
        name: 'AlphaFi-Navi USDC(Native) Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x643f84e0a33b19e2b511be46232610c6eb38e772931f582f019b8bbfb893ddb3',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5',
      investor_id: '0x0b4309b0cb8a75747635ae65a7bf3e7d555e7248c17cf8232a40240a415cf78f',
      receipt: {
        name: 'AlphaFi-Navi SUI Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x0d9598006d37077b4935400f6525d7f1070784e2d6f04765d76ae0a4880f7d0a',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0x9790c2c272e15b6bf9b341eb531ef16bcc8ed2b20dfda25d060bf47f5dd88d01',
      investor_id: '0x5843b3db9f1bc9ee39dd4950507f5466f24f1b110b8c6b1d7aa8502ce8ca4ac4',
      receipt: {
        name: 'AlphaFi-Navi VSUI Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'vSUI',
        type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-VSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0xe4eef7d4d8cafa3ef90ea486ff7d1eec347718375e63f1f778005ae646439aad',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56',
      investor_id: '0xaef988b8bcd85f319817579cfeaf94b13c2113d4b670f9ed66326d97a3f9d76f',
      receipt: {
        name: 'AlphaFi-Navi WETH Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'WETH',
        type: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-WETH',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0xc696ca5b8f21a1f8fcd62cff16bbe5a396a4bed6f67909cfec8269eb16e60757',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103',
      investor_id: '0xc3b2ba8d15fe77bada328ede3219aa8b746832932f7372f974313c841bb6693f',
      receipt: {
        name: 'AlphaFi-Navi USDT Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-USDT',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lending',
    data: {
      pool_id: '0x01493446093dfcdcfc6c16dc31ffe40ba9ac2e99a3f6c16a0d285bff861944ae',
      package_id: '0xa98ddf10b9eebf500c7e9a7ffd30358928b4617df6e179b817efebea1fff604e',
      package_number: 1,
      parent_protocol: 'Navi',
      parent_pool_id: '0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8',
      investor_id: '0xdf980cacf2ef2f4411f793ee9ee9266af78324b228323ede2ce73f9cf0c301cc',
      receipt: {
        name: 'AlphaFi-Navi USDC Receipt',
        type: '0x8f7d2c35e19c65213bc2153086969a55ec207b5a25ebdee303a6d9edd9c053e3::alphafi_navi_pool::Receipt',
      },
      asset: {
        name: 'wUSDC',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x73754ff4132adde2c28995739e8bb403aeb7219ba92003245529681dbc379c08::alphafi_navi_pool::LiquidityChangeEvent',
      },
      strategy_type: 'Lending',
      is_active: false,
      pool_name: 'NAVI-WUSDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Looping',
    data: {
      pool_id: '0xc4caf2d31693974b838ffb83b0c8ae880a6b09ca251a07062cf66453bf3e3ce0',
      package_id: '0x996ff7edaaa986da408ca4760cb004baa74bf678776d2d5ee43e705384a620f9',
      package_number: 5,
      parent_protocol: 'Alphalend',
      investor_id: '0x3e8937974f3dac64eb8ee9f86a80ccc24852bd2f74d18753d071bbdad73a4c97',
      receipt: {
        name: 'AlphaFi-Alphalend SUI-STSUI Receipt',
        type: '0x1ac7aacf8479f86464df1141db1662cf8622e6a138fa8e5fd4499eec14a07151::alphafi_navi_sui_stsui_pool::Receipt',
      },
      supply_asset: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      borrow_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      user_deposit_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      user_withdraw_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0x1ac7aacf8479f86464df1141db1662cf8622e6a138fa8e5fd4499eec14a07151::alphafi_navi_sui_stsui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x1ac7aacf8479f86464df1141db1662cf8622e6a138fa8e5fd4499eec14a07151::alphafi_navi_sui_stsui_pool::LiquidityChangeEvent',
        check_ratio_event_type:
          '0x1ac7aacf8479f86464df1141db1662cf8622e6a138fa8e5fd4499eec14a07151::alphafi_navi_sui_stsui_investor::CheckRatio',
      },
      strategy_type: 'Looping',
      is_active: true,
      pool_name: 'ALPHALEND-LOOP-SUI-STSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Looping',
    data: {
      pool_id: '0xdd886dd4828a44b7ae48bb7eaceca1cecedd1dcc06174f66ee398dc0feb71451',
      package_id: '0x996ff7edaaa986da408ca4760cb004baa74bf678776d2d5ee43e705384a620f9',
      package_number: 5,
      parent_protocol: 'Navi',
      investor_id: '0xe512e692f4d48a79abcfd5970ccb44d6f7f149e81bb077ccd58b89d4ab557d0e',
      receipt: {
        name: 'AlphaFi-Navi USDT-USDC Receipt',
        type: '0xe516e0c12e56619c196fa0ee28d57e5e4ca532bd39df79bee9dcd1e3946119ec::alphafi_navi_usdt_usdc_pool::Receipt',
      },
      supply_asset: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      borrow_asset: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      user_deposit_asset: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      user_withdraw_asset: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      events: {
        autocompound_event_type:
          '0xe516e0c12e56619c196fa0ee28d57e5e4ca532bd39df79bee9dcd1e3946119ec::alphafi_navi_usdt_usdc_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xe516e0c12e56619c196fa0ee28d57e5e4ca532bd39df79bee9dcd1e3946119ec::alphafi_navi_usdt_usdc::LiquidityChangeEvent',
        check_ratio_event_type:
          '0xe516e0c12e56619c196fa0ee28d57e5e4ca532bd39df79bee9dcd1e3946119ec::alphafi_navi_usdt_usdc_investor::CheckRatioEvent',
      },
      strategy_type: 'Looping',
      is_active: false,
      pool_name: 'NAVI-LOOP-USDT-USDC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Looping',
    data: {
      pool_id: '0x4b22c2fc59c7697eea08c1cc1eadf231415d66b842875ba4730a8619efa38ced',
      package_id: '0x723ad60e50b9813a32648799419db63fc6b08e2473818e79cc7f899680506211',
      package_number: 2,
      parent_protocol: 'Navi',
      investor_id: '0xa65eaadb556a80e4cb02fe35efebb2656d82d364897530f45dabc1e99d15a8a9',
      receipt: {
        name: 'AlphaFi-Navi HASUI-SUI Receipt',
        type: '0xb7039e74683423783f5179d6359df115af06b040bc439cbef3b307bdaceb050d::alphafi_navi_hasui_sui_pool::Receipt',
      },
      supply_asset: {
        name: 'HASUI',
        type: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
      },
      borrow_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      user_deposit_asset: {
        name: 'HASUI',
        type: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
      },
      user_withdraw_asset: {
        name: 'HASUI',
        type: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
      },
      events: {
        autocompound_event_type:
          '0xb7039e74683423783f5179d6359df115af06b040bc439cbef3b307bdaceb050d::alphafi_navi_hasui_sui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xb7039e74683423783f5179d6359df115af06b040bc439cbef3b307bdaceb050d::alphafi_navi_hasui_sui_pool::LiquidityChangeEvent',
        check_ratio_event_type:
          '0xb7039e74683423783f5179d6359df115af06b040bc439cbef3b307bdaceb050d::alphafi_navi_hasui_sui_investor::CheckRatio',
      },
      strategy_type: 'Looping',
      is_active: false,
      pool_name: 'NAVI-LOOP-HASUI-SUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'Looping',
    data: {
      pool_id: '0xb90c7250627e0113df2e60d020df477cac14ca78108e3c5968230f3e7d4d8846',
      package_id: '0x723ad60e50b9813a32648799419db63fc6b08e2473818e79cc7f899680506211',
      package_number: 2,
      parent_protocol: 'Navi',
      investor_id: '0x3b9fe28a07e8dd5689f3762ba45dbdf10bd5f7c85a14432928d9108a61ef2dc2',
      receipt: {
        name: 'AlphaFi-Navi USDC-USDT Receipt',
        type: '0xad4f82d9956085bdab812d46fb2ea4d95c35e9e936cb53d04a79d3989ef97774::alphafi_navi_native_usdc_usdt_pool::Receipt',
      },
      supply_asset: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      borrow_asset: {
        name: 'USDT',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      },
      user_deposit_asset: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      user_withdraw_asset: {
        name: 'USDC',
        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      },
      events: {
        autocompound_event_type:
          '0xad4f82d9956085bdab812d46fb2ea4d95c35e9e936cb53d04a79d3989ef97774::alphafi_navi_native_usdc_usdt_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x596639cb12dc5731890063eea58cc631bd6608f49bd338da96181f4265bf8f18::alphafi_navi_native_usdc_usdt_pool::LiquidityChangeEvent',
        check_ratio_event_type:
          '0xad4f82d9956085bdab812d46fb2ea4d95c35e9e936cb53d04a79d3989ef97774::alphafi_navi_native_usdc_usdt_investor::CheckRatioEvent',
      },
      strategy_type: 'Looping',
      is_active: false,
      pool_name: 'NAVI-LOOP-USDC-USDT',
      is_native: true,
    },
  },
  {
    strategy_type: 'Looping',
    data: {
      pool_id: '0xd013a1a0c6f2bad46045e3a1ba05932b4a32f15864021d7e0178d5c2fdcc85e3',
      package_id: '0x723ad60e50b9813a32648799419db63fc6b08e2473818e79cc7f899680506211',
      package_number: 2,
      parent_protocol: 'Navi',
      investor_id: '0x36cc3135c255632f9275a5b594145745f8344ce8f6e46d9991ffb17596195869',
      receipt: {
        name: 'AlphaFi-Navi SUI-VSUI Receipt',
        type: '0x531989a4be74dd43b25e7bb1eeade871f4524bdf437a8eaa30b4ac2a932b5579::alphafi_navi_sui_vsui_pool::Receipt',
      },
      supply_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      borrow_asset: {
        name: 'vSUI',
        type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      },
      user_deposit_asset: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      user_withdraw_asset: {
        name: 'vSUI',
        type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      },
      events: {
        autocompound_event_type:
          '0x531989a4be74dd43b25e7bb1eeade871f4524bdf437a8eaa30b4ac2a932b5579::alphafi_navi_sui_vsui_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x531989a4be74dd43b25e7bb1eeade871f4524bdf437a8eaa30b4ac2a932b5579::alphafi_navi_sui_vsui_pool::LiquidityChangeNewNewEvent',
        check_ratio_event_type:
          '0x531989a4be74dd43b25e7bb1eeade871f4524bdf437a8eaa30b4ac2a932b5579::alphafi_navi_sui_vsui_investor::CheckRatio',
      },
      strategy_type: 'Looping',
      is_active: false,
      pool_name: 'NAVI-LOOP-SUI-VSUI',
      is_native: true,
    },
  },
  {
    strategy_type: 'SingleAssetLooping',
    data: {
      pool_id: '0x4db8dacf91a31daa296cd3a32a11a140aa44f4ede663798e92cb1cf2e157e6cb',
      package_id: '0x337cc22418506402cd75f1c3584ccd4a0803c60de8b70d774be69c5eaddd22e8',
      package_number: 10,
      parent_protocol: 'Alphalend',
      investor_id: '0x0f859f3ec685882133f1d8ba2a20843a9e818575d32a4bc7b816c77e887753e2',
      receipt: {
        name: 'AlphaFi-AlphaLend Single-Loop XAUm Receipt',
        type: '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
      },
      asset: {
        name: 'XAUM',
        type: '0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM',
      },
      events: {
        autocompound_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::LiquidityChangeEvent',
      },
      strategy_type: 'SingleAssetLooping',
      is_active: true,
      pool_name: 'ALPHALEND-SINGLE-LOOP-XAUM',
      is_native: true,
    },
  },
  {
    strategy_type: 'SingleAssetLooping',
    data: {
      pool_id: '0xc38279f945d14b4ec7f8c7b6956d0485ee8fa31a6cf710e462d17714bff028a2',
      package_id: '0x337cc22418506402cd75f1c3584ccd4a0803c60de8b70d774be69c5eaddd22e8',
      package_number: 10,
      parent_protocol: 'Alphalend',
      investor_id: '0x0f03b5c37f49c18d6e13ddc58939df17586a0b80cb83ceda2e4494addd571990',
      receipt: {
        name: 'AlphaFi-AlphaLend Single-Loop wBTC Receipt',
        type: '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
      },
      asset: {
        name: 'wBTC',
        type: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',
      },
      events: {
        autocompound_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::LiquidityChangeEvent',
      },
      strategy_type: 'SingleAssetLooping',
      is_active: true,
      pool_name: 'ALPHALEND-SINGLE-LOOP-SUIBTC',
      is_native: true,
    },
  },
  {
    strategy_type: 'SingleAssetLooping',
    data: {
      pool_id: '0x185c2124971c44836ce303ed5cdf8a3f614105a4d8948bb98c81a816d087dba9',
      package_id: '0x337cc22418506402cd75f1c3584ccd4a0803c60de8b70d774be69c5eaddd22e8',
      package_number: 10,
      parent_protocol: 'Alphalend',
      investor_id: '0x46bd2afe728ee1e64935d4c46c426237fda647b9d577da206507864b8fd446aa',
      receipt: {
        name: 'AlphaFi-AlphaLend Single-Loop tBTC Receipt',
        type: '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::Receipt',
      },
      asset: {
        name: 'TBTC',
        type: '0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC',
      },
      events: {
        autocompound_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0x45564ea956f9b25890a5c1c3a199c8d86aabd5291b34723fb662283419ee2f4d::alphafi_alphalend_single_loop_pool::LiquidityChangeEvent',
      },
      strategy_type: 'SingleAssetLooping',
      is_active: true,
      pool_name: 'ALPHALEND-SINGLE-LOOP-TBTC',
      is_native: true,
    },
  },
  {
    strategy_type: 'Lyf',
    data: {
      pool_id: '0x139d3ed6292b4ac8978b31adb3415bfa5cdb1d1a6b8f364adbe3317158792413',
      package_id: '0xff296a9ea1430e47ffc3e0e4e6aa8dd0f821f78ec37daba52dcdc517845559bb',
      package_number: 11,
      parent_protocol: 'Bluefin',
      parent_pool_id: '0x4746414e445cebdc19666b6e4de9b79a46ca7bcaa894bf10ec230e649376356e',
      investor_id: '0xabb42030e68058db8af3f623923ec1c0d365052af2a175d95d6c03b1c8fddb40',
      receipt: {
        name: 'AlphaFi lyf stSUI-SUI Receipt',
        type: '0xff296a9ea1430e47ffc3e0e4e6aa8dd0f821f78ec37daba52dcdc517845559bb::alphafi_lyf_pool::Receipt',
      },
      asset_a: {
        name: 'stSUI',
        type: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI',
      },
      asset_b: {
        name: 'SUI',
        type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      },
      events: {
        autocompound_event_type:
          '0xff296a9ea1430e47ffc3e0e4e6aa8dd0f821f78ec37daba52dcdc517845559bb::alphafi_lyf_investor::AutoCompoundingEvent',
        liquidity_change_event_type:
          '0xff296a9ea1430e47ffc3e0e4e6aa8dd0f821f78ec37daba52dcdc517845559bb::alphafi_lyf_pool::LiquidityChangeEvent',
        rebalance_event_type:
          '0xff296a9ea1430e47ffc3e0e4e6aa8dd0f821f78ec37daba52dcdc517845559bb::alphafi_lyf_investor::RebalancePoolEvent',
      },
      strategy_type: 'Lyf',
      is_active: true,
      pool_name: 'BLUEFIN-LYF-STSUI-SUI',
      is_native: true,
    },
  },
] as const;

export default poolsConfig;
