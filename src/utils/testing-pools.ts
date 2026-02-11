import { PoolLabel } from 'src/strategies/strategy.js';

export const TEST_POOLS: PoolLabel[] = [
  {
    poolId: '0xa3d24b60cae841cbd83d65c5a7e6380b0160cbff9d1a86bdd79df9d1eea702f8',
    packageId: '0x6f9cd495d625a89955b7c9d75610871bdd42b28546b54a1f58846fbf52be1726',
    strategyType: 'FungibleLending',
    parentProtocol: 'DeepBook',
    parentPoolId: '',
    asset: {
      name: 'USDC',
      type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    },
    fungibleCoin: {
      name: 'DEEPBOOK_STAKED',
      type: '0x1558c10b18e2cd9bcf7a03c83cbfdb88fc3437ad12d0cae97a17a0d9cc6f31d5::alphalend_deepbook_pool::DEEPBOOK_STAKED<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>',
    },
    events: {
      autocompoundEventType:
        '0x1558c10b18e2cd9bcf7a03c83cbfdb88fc3437ad12d0cae97a17a0d9cc6f31d5::alphalend_deepbook_pool::AutoCompoundingEvent',
    },
    isActive: true,
    poolName: 'ALPHALEND-DEEPBOOK-USDC',
    isNative: true,
  },
];
