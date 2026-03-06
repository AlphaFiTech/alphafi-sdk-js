import { PoolLabel } from 'src/strategies/strategy.js';

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
];
