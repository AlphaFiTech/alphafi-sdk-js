import { PoolLabel } from '../strategies/strategy.js';

export const TEST_POOLS: PoolLabel[] = [
  {
    poolId: '0x6ae707d20a057d48100539c716072725e068aa1bc13ea9fe39700ec6e75401ee',
    packageId: '0x08410debacb4a08c31abba750c8e4d27ef27d3b65813667651a272014721f1c1',
    strategyType: 'FungibleLending',
    parentProtocol: 'DeepBook',
    parentPoolId: '',
    asset: {
      name: 'USDC',
      type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    },
    fungibleCoin: {
      name: 'DEEPBOOK_STAKED',
      type: '0x66a09a4da70828bfa1ffb98998477403e4fc47ffa727adb916bb42d9bc8e1d66::alphalend_deepbook_pool::DEEPBOOK_STAKED<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>',
    },
    events: {
      autocompoundEventType:
        '0x66a09a4da70828bfa1ffb98998477403e4fc47ffa727adb916bb42d9bc8e1d66::alphalend_deepbook_pool::AutoCompoundingEvent',
    },
    isActive: true,
    poolName: 'ALPHALEND-DEEPBOOK-USDC',
    isNative: true,
  },
  {
    poolId: '0x46688bb99cbca2d99154d287d8660a750bd056d5cbbb332c336f1db93185de83',
    packageId: '0x8d5e0d608b60e3d928f36f4da75d2f50e0ae4446fc70c6346470d0edcb84f005',
    strategyType: 'SlushSingleAssetLooping',
    parentProtocol: 'Alphalend',
    asset: {
      name: 'WAL',
      type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
    },
    events: {
      autocompoundEventType:
        '0x8d5e0d608b60e3d928f36f4da75d2f50e0ae4446fc70c6346470d0edcb84f005::alphalend_slush_locked_loop_pool::XtokenRatioChangeEvent',
    },
    isActive: true,
    poolName: 'ALPHALEND-SLUSH-WAL-SINGLE-LOOP',
    isNative: true,
  },
  {
    poolId: '0x0bca47c53d57d203d19611af98a4e723c52cbf1bc58312360bfb5dcba0286de9',
    packageId: '0xcd3c28d6643fa2060d73d6e98bcc8049744b32804b017213a897e9466c5feb4d',
    strategyType: 'SlushSingleAssetLooping',
    parentProtocol: 'Alphalend',
    asset: {
      name: 'WAL',
      type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
    },
    events: {
      autocompoundEventType:
        '0x3221f39ee2ebdb94bff679589d836c9b4d6879194af745edf47f37c9d2c2e7c7::alphalend_slush_locked_loop_pool::XtokenRatioChangeEvent',
    },
    isActive: true,
    poolName: 'ALPHALEND-SLUSH-WAL-SINGLE-LOOP',
    isNative: true,
  },
  {
    poolId: '0x0e1399fe66eca3147766bb113ae7b52b31243874c9e4a64a48e6d8cb91aa3c04',
    packageId: '0xcd3c28d6643fa2060d73d6e98bcc8049744b32804b017213a897e9466c5feb4d',
    strategyType: 'SlushSingleAssetLooping',
    parentProtocol: 'Alphalend',
    asset: {
      name: 'USDSUI',
      type: '0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI',
    },
    events: {
      autocompoundEventType:
        '0xad19911966b8ba9d6c5240da9389ccf347059385a0e90fd19f9cce644560a989::alphalend_slush_locked_loop_pool::XtokenRatioChangeEventV2',
    },
    isActive: true,
    poolName: 'ALPHALEND-SLUSH-USDSUI-SINGLE-LOOP',
    isNative: true,
  },
  {
    poolId: '0xccda433a3324dc743478c7f79cce584628f6303501281167a3f4b386187c8c63',
    packageId: '0x2bcf16ac9570eb384bc65f9e74acb9abbfb6716fea0cfef5e1fd1ab301a08069',
    strategyType: 'SlushLooping',
    packageNumber: 12,
    versionId: '0x146d1785834528d08a44cac4a59c6a981d43cc13b1d07818e7fa3d29318ca00f',
    parentProtocol: 'Alphalend',
    asset: {
      name: 'SUI',
      type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    },
    events: {
      autocompoundEventType:
        '0x2bcf16ac9570eb384bc65f9e74acb9abbfb6716fea0cfef5e1fd1ab301a08069::alphafi_slush_stsui_sui_loop_pool::XtokenRatioChangeEvent',
    },
    isActive: true,
    poolName: 'ALPHALEND-SLUSH-STSUI-LOOP',
    isNative: true,
  },
];
