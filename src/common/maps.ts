import { coinsList } from './coins.js';
import { conf, CONF_ENV } from './constants.js';

export type PoolDetails = {
  packageId: string;
  poolName: string;
  packageNumber: number;
  strategyType: string;
  parentProtocolName: string;
  parentPoolId: string;
  poolId: string;
  investorId: string;
  receipt: {
    name: string;
    type: string;
  };
  assetTypes:
    | {
        token1: string;
        token2: string;
      }
    | { token: string };
  events: {
    autoCompoundingEventType: string;
    rebalanceEventType: string | undefined;
    liquidityChangeEventType: string;
    withdrawV2EventType?: string;
    afterTransactionEventType?: string;
    checkRatioEventType?: string;
  };
  images?: {
    imageUrl1?: string;
    imageUrl2?: string;
  };
  lockIcon?: string;
  retired: boolean;
};

export const poolDetailsMap: Record<string, PoolDetails> = {
  1: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'ALPHA',
    packageNumber: 1,
    strategyType: 'ALPHA-VAULT',
    parentProtocolName: 'ALPHAFI',
    parentPoolId: conf[CONF_ENV].ALPHA_POOL,
    poolId: conf[CONF_ENV].ALPHA_POOL,
    investorId: conf[CONF_ENV].ALPHA_POOL,
    receipt: {
      name: conf[CONF_ENV].ALPHA_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHA_POOL_RECEIPT,
    },
    assetTypes: {
      token: '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHA_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].ALPHA_POOL_LIQUIDITY_CHANGE_EVENT,
      withdrawV2EventType: conf[CONF_ENV].ALPHA_POOL_WITHDRAW_V2_EVENT,
      afterTransactionEventType: conf[CONF_ENV].ALPHA_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
    },
    lockIcon: 'https://images.alphafi.xyz/adminweb/lock.svg',
    retired: false,
  },
  2: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-DEEP',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_DEEP_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_DEEP_POOL,
    investorId: conf[CONF_ENV].NAVI_DEEP_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_DEEP_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_DEEP_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['DEEP'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_DEEP_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_DEEP_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
    },
    retired: false,
  },
  3: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-WAL',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_WAL_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_WAL_POOL,
    investorId: conf[CONF_ENV].NAVI_WAL_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_WAL_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_WAL_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['WAL'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_AUSD_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_AUSD_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/ausd.png',
    },
    retired: false,
  },
  4: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-WAL-USDC',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_WAL_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WAL'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  5: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-WAL-STSUI',
    packageNumber: 6,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_WAL_STSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WAL'].type,
      token2: coinsList['STSUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/stsui.svg',
    },
    retired: false,
  },
  6: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-WAL-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_WAL_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WAL'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  7: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDC-SUIUSDT',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDC_SUIUSDT_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].USDC_SUIUSDT_POOL,
    investorId: conf[CONF_ENV].USDC_SUIUSDT_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDC_SUIUSDT_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDC_SUIUSDT_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDC'].type,
      token2: coinsList['SUIUSDT'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDC_SUIUSDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDC_SUIUSDT_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDC_SUIUSDT_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: false,
  },
  8: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_V2_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-LBTC-SUIBTC',
    packageNumber: 8,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_LBTC_SUIBTC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['LBTC'].type,
      token2: coinsList['SUIBTC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  9: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-SUI-LBTC',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUI_LBTC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUI'].type,
      token2: coinsList['LBTC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/LBTC_IC.png',
    },
    retired: false,
  },
  10: {
    packageId: conf[CONF_ENV].ALPHA_FUNGIBLE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-FUNGIBLE-STSUI-SUI',
    packageNumber: 8,
    strategyType: 'FUNGIBLE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: conf[CONF_ENV].SUI_COIN_TYPE,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/stsui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  11: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-SUIUSDT',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_SUIUSDT_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_SUIUSDT_POOL,
    investorId: conf[CONF_ENV].NAVI_SUIUSDT_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_SUIUSDT_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_SUIUSDT_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['SUIUSDT'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_SUIUSDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_SUIUSDT_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
    },
    retired: false,
  },
  12: {
    packageId: conf[CONF_ENV].ALPHA_NAVI_V2_LATEST_PACKAGE_ID,
    poolName: 'NAVI-SUIBTC',
    packageNumber: 9,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_SUIBTC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_SUIBTC_POOL,
    investorId: conf[CONF_ENV].NAVI_SUIBTC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_SUIBTC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_SUIBTC_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['SUIBTC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_SUIBTC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_SUIBTC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
    },
    retired: false,
  },
  13: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_V2_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SUIBTC-USDC',
    packageNumber: 8,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUIBTC_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUIBTC'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
    // add strategy type
  },
  14: {
    packageId: conf[CONF_ENV].ALPHA_5_LATEST_PACKAGE_ID,
    poolName: 'NAVI-LOOP-SUI-STSUI',
    packageNumber: 5,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_STSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_LOOP_SUI_STSUI_POOL,
    investorId: conf[CONF_ENV].NAVI_LOOP_SUI_STSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_SUI_STSUI_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_LOOP_SUI_STSUI_RECEIPT,
    },
    assetTypes: {
      token: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_SUI_STSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_SUI_STSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: true,
  },
  15: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-MUSD',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_MUSD_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['MUSD'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  16: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-BUCK',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_BUCK_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['BUCK'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
    // add strategy type
  },
  17: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-STSUI',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_STSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_STSUI_POOL,
    investorId: conf[CONF_ENV].NAVI_STSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_STSUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_STSUI_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['STSUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_STSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_STSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
    },
    retired: true,
  },
  18: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-DEEP-SUI',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_DEEP_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['DEEP'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  19: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-BLUE-SUI',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_BLUE_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['BLUE'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  20: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-DEEP-BLUE',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_DEEP_BLUE_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['DEEP'].type,
      token2: coinsList['BLUE'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  21: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SUIUSDT-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUIUSDT_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUIUSDT'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  22: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUIUSDT_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUIUSDT'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  23: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-SUI-USDC',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUI_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUI'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC_IC.png',
    },
    retired: false,
  },
  24: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-USDT-USDC',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_USDT_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDT'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDT.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC_IC.png',
    },
    retired: false,
  },
  25: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-ALPHA-STSUI',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_ALPHA_STSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['ALPHA'].type,
      token2: coinsList['STSUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/stsui.svg',
    },
    retired: false,
  },
  26: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-WSOL',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_WSOL_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['WSOL'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  27: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-ETH',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_ETH_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['ETH'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  28: {
    packageId: conf[CONF_ENV].ALPHA_STSUI_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-USDC',
    packageNumber: 6,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/stsui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  29: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-STSUI-SUI',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_STSUI_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['STSUI'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/stsui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  30: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-DEEP-SUI',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_DEEP_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['DEEP'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/deep.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  31: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-WBTC-SUI',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_WBTC_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WBTC'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/BTCB.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  32: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SEND-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SEND_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SEND'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: '', // add send image here
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  33: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-BLUE-SUI',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_BLUE_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['BLUE'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/send.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  34: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-BLUE-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_BLUE_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['BLUE'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/send.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  35: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-NAVX',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_NAVX_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_NAVX_POOL,
    investorId: conf[CONF_ENV].NAVI_NAVX_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_NAVX_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_NAVX_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['NAVX'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_NAVX_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_NAVX_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
    },
    retired: false,
  },
  36: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-NAVX-VSUI',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_NAVX_VSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['NAVX'].type,
      token2: coinsList['VSUI'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: true,
  },
  37: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SUI-AUSD',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUI_AUSD_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUI'].type,
      token2: coinsList['AUSD'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/ausd.png',
    },
    retired: false,
  },
  38: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-ALPHA-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_ALPHA_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['ALPHA'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  39: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-WBTC-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_WBTC_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WBTC'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/BTCB.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  40: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-NS',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_NS_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_NS_POOL,
    investorId: conf[CONF_ENV].NAVI_NS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_NS_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_NS_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['NS'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_NS_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_NS_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/ns.svg',
    },
    retired: false,
  },
  41: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUSD-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_AUSD_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['AUSD'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/ausd.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  42: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SUI-BUCK',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUI_BUCK_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUI'].type,
      token2: coinsList['BUCK'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/buck.svg',
    },
    retired: false,
  },
  43: {
    packageId: conf[CONF_ENV].ALPHA_5_LATEST_PACKAGE_ID,
    poolName: 'NAVI-LOOP-USDT-USDC',
    packageNumber: 5,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_USDT_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_LOOP_USDT_USDC_POOL,
    investorId: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_USDT_USDC_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_RECEIPT,
    },
    assetTypes: {
      token: coinsList['USDT'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_CHECK_RATIO_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDT.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: true,
  },
  44: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-USDT-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_USDT_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDT'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDT.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  45: {
    packageId: conf[CONF_ENV].ALPHA_4_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-SUI-USDC',
    packageNumber: 4,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUI_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['SUI'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  46: {
    packageId: conf[CONF_ENV].ALPHA_2_LATEST_PACKAGE_ID,
    poolName: 'NAVI-LOOP-HASUI-SUI',
    packageNumber: 2,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_HASUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_LOOP_HASUI_SUI_POOL,
    investorId: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_HASUI_SUI_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_RECEIPT,
    },
    assetTypes: {
      token: coinsList['HASUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_CHECK_RATIO_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/hasui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  47: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-USDY',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_USDY_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_USDY_POOL,
    investorId: conf[CONF_ENV].NAVI_USDY_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_USDY_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_USDY_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['USDY'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_USDY_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_USDY_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/usdy.svg',
    },
    retired: true,
  },
  48: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-AUSD',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_AUSD_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_AUSD_POOL,
    investorId: conf[CONF_ENV].NAVI_AUSD_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_AUSD_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_AUSD_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['AUSD'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_AUSD_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_AUSD_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/ausd.png',
    },
    retired: true,
  },
  49: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'NAVI-ETH',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_ETH_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_ETH_POOL,
    investorId: conf[CONF_ENV].NAVI_ETH_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_ETH_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_ETH_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['ETH'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_ETH_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_ETH_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/eth 2.png',
    },
    retired: true,
  },
  50: {
    packageId: conf[CONF_ENV].ALPHA_3_LATEST_PACKAGE_ID,
    poolName: 'BUCKET-BUCK',
    packageNumber: 3,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'BUCKET',
    parentPoolId: conf[CONF_ENV].BUCKET_PROTOCOL,
    poolId: conf[CONF_ENV].BUCKET_BUCK_POOL,
    investorId: conf[CONF_ENV].BUCKET_BUCK_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].BUCKET_BUCK_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].BUCKET_BUCK_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['BUCK'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].BUCKET_BUCK_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].BUCKET_BUCK_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].BUCKET_BUCK_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/bucket_protocol.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/buck.svg',
    },
    retired: false,
  },
  51: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'BUCK-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].BUCK_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].BUCK_SUI_POOL,
    investorId: conf[CONF_ENV].BUCK_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].BUCK_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].BUCK_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['BUCK'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].BUCK_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].BUCK_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].BUCK_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/buck.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: true,
  },
  52: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDC-ETH',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDC_ETH_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].USDC_ETH_POOL,
    investorId: conf[CONF_ENV].USDC_ETH_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDC_ETH_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDC_ETH_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDC'].type,
      token2: coinsList['ETH'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDC_ETH_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDC_ETH_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDC_ETH_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/eth 2.png',
    },
    retired: false,
  },
  53: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'DEEP-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].DEEP_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].DEEP_SUI_POOL,
    investorId: conf[CONF_ENV].DEEP_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].DEEP_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].DEEP_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['DEEP'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].DEEP_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].DEEP_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].DEEP_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/deep.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  54: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'ALPHA-USDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].ALPHA_USDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].ALPHA_USDC_POOL,
    investorId: conf[CONF_ENV].ALPHA_USDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHA_USDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHA_USDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['ALPHA'].type,
      token2: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHA_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHA_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHA_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: true,
  },
  55: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDC-WUSDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDC_WUSDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].USDC_WUSDC_POOL,
    investorId: conf[CONF_ENV].USDC_WUSDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDC_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDC_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDC'].type,
      token2: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDC_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDC_WUSDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDC_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: false,
  },
  56: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDC-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDC_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].USDC_SUI_POOL,
    investorId: conf[CONF_ENV].USDC_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDC_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDC_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDC'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDC_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDC_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDC_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  57: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDC-USDT',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDC_USDT_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].USDC_USDT_POOL,
    investorId: conf[CONF_ENV].USDC_USDT_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDC_USDT_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDC_USDT_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDC'].type,
      token2: coinsList['USDT'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDC_USDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDC_USDT_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDC_USDT_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDT.svg',
    },
    retired: false,
  },
  58: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-USDC',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_USDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_USDC_POOL,
    investorId: conf[CONF_ENV].NAVI_USDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_USDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_USDC_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: false,
  },
  59: {
    packageId: conf[CONF_ENV].ALPHA_2_LATEST_PACKAGE_ID,
    poolName: 'NAVI-LOOP-USDC-USDT',
    packageNumber: 2,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_USDT_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_LOOP_USDC_USDT_POOL,
    investorId: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_USDC_USDT_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_RECEIPT,
    },
    assetTypes: {
      token: coinsList['USDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_CHECK_RATIO_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDT.svg',
    },
    retired: true,
  },
  60: {
    packageId: conf[CONF_ENV].ALPHA_2_LATEST_PACKAGE_ID,
    poolName: 'NAVI-LOOP-SUI-VSUI',
    packageNumber: 2,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_VSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_LOOP_SUI_VSUI_POOL,
    investorId: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_SUI_VSUI_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_RECEIPT,
    },
    assetTypes: {
      token: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_CHECK_RATIO_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: true,
  },
  61: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-SUI',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_SUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_SUI_POOL,
    investorId: conf[CONF_ENV].NAVI_SUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVI_SUI_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: true,
  },
  62: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-VSUI',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_VSUI_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_VSUI_POOL,
    investorId: conf[CONF_ENV].NAVI_VSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_VSUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_VSUI_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['VSUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_VSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_VSUI_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVI_VSUI_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: true,
  },
  63: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-WETH',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_WETH_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_WETH_POOL,
    investorId: conf[CONF_ENV].NAVI_WETH_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_WETH_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_WETH_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['WETH'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_WETH_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_WETH_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVI_WETH_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  64: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-USDT',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_USDT_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_USDT_POOL,
    investorId: conf[CONF_ENV].NAVI_USDT_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_USDT_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_USDT_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['USDT'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_USDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_USDT_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVI_USDT_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDT.svg',
    },
    retired: false,
  },
  65: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVI-WUSDC',
    packageNumber: 1,
    strategyType: 'SINGLE-ASSET-POOL',
    parentProtocolName: 'NAVI',
    parentPoolId: conf[CONF_ENV].NAVI_WUSDC_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_NAVI_WUSDC_POOL,
    investorId: conf[CONF_ENV].NAVI_WUSDC_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVI_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVI_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVI_WUSDC_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: true,
  },
  // "NAVI-HASUI": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "NAVI",
  //   parentPoolId: conf[CONF_ENV].NAVI_HASUI_POOL,
  //   poolId: conf[CONF_ENV].ALPHAFI_NAVI_HASUI_POOL,
  //   investorId: conf[CONF_ENV].NAVI_HASUI_INVESTOR,
  //   receiptName: conf[CONF_ENV].NAVI_HASUI_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].NAVI_HASUI_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].NAVI_HASUI_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: undefined,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].NAVI_HASUI_POOL_LIQUIDITY_CHANGE_EVENT,
  //   afterTransactionEventType:
  //     conf[CONF_ENV].NAVI_HASUI_POOL_AFTER_TRANSACTION_EVENT,
  // },
  66: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'ALPHA-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].ALPHA_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].ALPHA_SUI_POOL,
    investorId: conf[CONF_ENV].ALPHA_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHA_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHA_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['ALPHA'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHA_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHA_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHA_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].ALPHA_SUI_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: true,
  },
  // "HASUI-SUI": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "CETUS",
  //   parentPoolId: conf[CONF_ENV].HASUI_SUI_CETUS_POOL_ID,
  //   poolId: conf[CONF_ENV].HASUI_SUI_POOL,
  //   investorId: conf[CONF_ENV].HASUI_SUI_CETUS_INVESTOR,
  //   receiptName: conf[CONF_ENV].HASUI_SUI_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].HASUI_SUI_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].HASUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: conf[CONF_ENV].HASUI_SUI_POOL_REBALANCE_EVENT,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].HASUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
  //   afterTransactionEventType:
  //     conf[CONF_ENV].HASUI_SUI_POOL_AFTER_TRANSACTION_EVENT,
  // },
  67: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'USDT-WUSDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].USDT_WUSDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].WUSDC_USDT_POOL,
    investorId: conf[CONF_ENV].USDT_WUSDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].USDT_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].USDT_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['USDT'].type,
      token2: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].USDT_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].USDT_WUSDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].USDT_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].USDT_WUSDC_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDT.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: false,
  },
  // "USDY-WUSDC": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "CETUS",
  //   parentPoolId: conf[CONF_ENV].USDY_WUSDC_CETUS_POOL_ID,
  //   poolId: conf[CONF_ENV].USDY_WUSDC_POOL,
  //   investorId: conf[CONF_ENV].USDY_WUSDC_CETUS_INVESTOR,
  //   receiptName: conf[CONF_ENV].USDY_WUSDC_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].USDY_WUSDC_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].USDY_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: conf[CONF_ENV].USDY_WUSDC_POOL_REBALANCE_EVENT,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].USDY_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
  //   afterTransactionEventType:
  //     conf[CONF_ENV].USDY_WUSDC_POOL_AFTER_TRANSACTION_EVENT,
  // },
  68: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'WUSDC-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].WUSDC_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].WUSDC_SUI_POOL,
    investorId: conf[CONF_ENV].WUSDC_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].WUSDC_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].WUSDC_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WUSDC'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].WUSDC_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].WUSDC_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].WUSDC_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].WUSDC_SUI_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl1: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: false,
  },
  69: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'WETH-WUSDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].WETH_WUSDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].WETH_WUSDC_POOL,
    investorId: conf[CONF_ENV].WETH_WUSDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].WETH_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].WETH_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WETH'].type,
      token2: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].WETH_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].WETH_WUSDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].WETH_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].WETH_WUSDC_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/weth.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: true,
  },
  70: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'WUSDC-WBTC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].WUSDC_WBTC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].WUSDC_WBTC_POOL,
    investorId: conf[CONF_ENV].WUSDC_WBTC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].WUSDC_WBTC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].WUSDC_WBTC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WUSDC'].type,
      token2: coinsList['WBTC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].WUSDC_WBTC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].WUSDC_WBTC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].WUSDC_WBTC_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].WUSDC_WBTC_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/BTCB.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: true,
  },
  71: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'NAVX-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].NAVX_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].NAVX_SUI_POOL,
    investorId: conf[CONF_ENV].NAVX_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].NAVX_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].NAVX_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['NAVX'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVX_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].NAVX_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].NAVX_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      afterTransactionEventType: conf[CONF_ENV].NAVX_SUI_POOL_AFTER_TRANSACTION_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/navi_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  // "BUCK-WUSDC": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "CETUS",
  //   parentPoolId: conf[CONF_ENV].BUCK_WUSDC_CETUS_POOL_ID,
  //   poolId: conf[CONF_ENV].BUCK_WUSDC_POOL,
  //   investorId: conf[CONF_ENV].BUCK_WUSDC_CETUS_INVESTOR,
  //   receiptName: conf[CONF_ENV].BUCK_WUSDC_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].BUCK_WUSDC_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].BUCK_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: conf[CONF_ENV].BUCK_WUSDC_POOL_REBALANCE_EVENT,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].BUCK_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
  //   afterTransactionEventType:
  //     conf[CONF_ENV].BUCK_WUSDC_POOL_AFTER_TRANSACTION_EVENT,
  // },
  72: {
    packageId: conf[CONF_ENV].ALPHA_2_LATEST_PACKAGE_ID,
    poolName: 'CETUS-SUI',
    packageNumber: 2,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].CETUS_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].CETUS_SUI_POOL,
    investorId: conf[CONF_ENV].CETUS_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].CETUS_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].CETUS_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['CETUS'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].CETUS_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].CETUS_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].CETUS_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/cetus_token.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  73: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'ALPHA-WUSDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].ALPHA_WUSDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].ALPHA_WUSDC_POOL,
    investorId: conf[CONF_ENV].ALPHA_WUSDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHA_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHA_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['ALPHA'].type,
      token2: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHA_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHA_WUSDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHA_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/logo192.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: false,
  },
  74: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'WSOL-WUSDC',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].WSOL_WUSDC_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].WSOL_WUSDC_POOL,
    investorId: conf[CONF_ENV].WSOL_WUSDC_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].WSOL_WUSDC_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].WSOL_WUSDC_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['WSOL'].type,
      token2: coinsList['WUSDC'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].WSOL_WUSDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].WSOL_WUSDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].WSOL_WUSDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/wsol.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/wusdc.svg',
    },
    retired: true,
  },
  75: {
    packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
    poolName: 'FUD-SUI',
    packageNumber: 1,
    strategyType: 'DOUBLE-ASSET-POOL',
    parentProtocolName: 'CETUS',
    parentPoolId: conf[CONF_ENV].FUD_SUI_CETUS_POOL_ID,
    poolId: conf[CONF_ENV].FUD_SUI_POOL,
    investorId: conf[CONF_ENV].FUD_SUI_CETUS_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].FUD_SUI_POOL_RECEIPT_NAME,
      type: conf[CONF_ENV].FUD_SUI_POOL_RECEIPT,
    },
    assetTypes: {
      token1: coinsList['FUD'].type,
      token2: coinsList['SUI'].type,
    },
    events: {
      autoCompoundingEventType: conf[CONF_ENV].FUD_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].FUD_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].FUD_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/fud.png',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: true,
  },
  // "BLUB-SUI": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "CETUS",
  //   parentPoolId: conf[CONF_ENV].BLUB_SUI_CETUS_POOL_ID,
  //   poolId: conf[CONF_ENV].BLUB_SUI_POOL,
  //   investorId: conf[CONF_ENV].BLUB_SUI_CETUS_INVESTOR,
  //   receiptName: conf[CONF_ENV].BLUB_SUI_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].BLUB_SUI_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].BLUB_SUI_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: conf[CONF_ENV].BLUB_SUI_POOL_REBALANCE_EVENT,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].BLUB_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
  // },
  // "SCA-SUI": {
  //   packageId: conf[CONF_ENV].ALPHA_LATEST_PACKAGE_ID,
  //   packageNumber: 1,
  //   parentProtocolName: "CETUS",
  //   parentPoolId: conf[CONF_ENV].SCA_SUI_CETUS_POOL_ID,
  //   poolId: conf[CONF_ENV].SCA_SUI_POOL,
  //   investorId: conf[CONF_ENV].SCA_SUI_CETUS_INVESTOR,
  //   receiptName: conf[CONF_ENV].SCA_SUI_POOL_RECEIPT_NAME,
  //   receiptType: conf[CONF_ENV].SCA_SUI_POOL_RECEIPT,
  //   autoCompoundingEventType:
  //     conf[CONF_ENV].SCA_SUI_POOL_AUTO_COMPOUNDING_EVENT,
  //   rebalanceEventType: conf[CONF_ENV].SCA_SUI_POOL_REBALANCE_EVENT,
  //   liquidityChangeEventType:
  //     conf[CONF_ENV].SCA_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
  // },
};

// Helper functions to differentiate between NAVI-LOOP and single asset NAVI pools

/**
 * Checks if a pool is a NAVI-LOOP pool using strategy type
 * @param poolDetails - The pool details to check
 * @returns true if the pool is a NAVI-LOOP pool
 */
export function isNaviLoopPool(poolDetails: PoolDetails): boolean {
  return (
    poolDetails.parentProtocolName === 'NAVI' && poolDetails.strategyType === 'SINGLE-ASSET-LOOPING'
  );
}

/**
 * Checks if a pool is a single asset NAVI pool (non-looping)
 * @param poolDetails - The pool details to check
 * @returns true if the pool is a single asset NAVI pool
 */
export function isSingleAssetNaviPool(poolDetails: PoolDetails): boolean {
  return (
    poolDetails.parentProtocolName === 'NAVI' && poolDetails.strategyType === 'SINGLE-ASSET-POOL'
  );
}

/**
 * Checks if a pool is a NAVI-LOOP pool using pool name
 * @param poolName - The pool name to check
 * @returns true if the pool name indicates a NAVI-LOOP pool
 */
export function isNaviLoopPoolByName(poolName: string): boolean {
  return poolName.includes('NAVI-LOOP');
}

/**
 * Checks if a pool is a single asset NAVI pool (non-looping) using pool name
 * @param poolName - The pool name to check
 * @returns true if the pool name indicates a single asset NAVI pool
 */
export function isSingleAssetNaviPoolByName(poolName: string): boolean {
  return poolName.startsWith('NAVI-') && !poolName.includes('NAVI-LOOP');
}

/**
 * Gets all NAVI-LOOP pools from the pool details map
 * @returns Array of pool details for NAVI-LOOP pools
 */
export function getNaviLoopPools(): PoolDetails[] {
  return Object.values(poolDetailsMap).filter(isNaviLoopPool);
}

/**
 * Gets all single asset NAVI pools (non-looping) from the pool details map
 * @returns Array of pool details for single asset NAVI pools
 */
export function getSingleAssetNaviPools(): PoolDetails[] {
  return Object.values(poolDetailsMap).filter(isSingleAssetNaviPool);
}

/**
 * Gets all NAVI pools (both looping and single asset) from the pool details map
 * @returns Array of pool details for all NAVI pools
 */
export function getAllNaviPools(): PoolDetails[] {
  return Object.values(poolDetailsMap).filter((pool) => pool.parentProtocolName === 'NAVI');
}

/**
 * Gets NAVI-LOOP pool names
 * @returns Array of NAVI-LOOP pool names
 */
export function getNaviLoopPoolNames(): string[] {
  return getNaviLoopPools().map((pool) => pool.poolName);
}

/**
 * Gets single asset NAVI pool names
 * @returns Array of single asset NAVI pool names
 */
export function getSingleAssetNaviPoolNames(): string[] {
  return getSingleAssetNaviPools().map((pool) => pool.poolName);
}

/**
 * Categorizes a NAVI pool as either looping or single asset
 * @param poolDetails - The pool details to categorize
 * @returns "looping" | "single-asset" | "not-navi"
 */
export function categorizeNaviPool(
  poolDetails: PoolDetails,
): 'looping' | 'single-asset' | 'not-navi' {
  if (poolDetails.parentProtocolName !== 'NAVI') {
    return 'not-navi';
  }

  if (isNaviLoopPool(poolDetails)) {
    return 'looping';
  }

  if (isSingleAssetNaviPool(poolDetails)) {
    return 'single-asset';
  }

  return 'not-navi';
}
