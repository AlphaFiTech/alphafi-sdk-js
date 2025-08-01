import { coinsList } from './coinsList.js';
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
  assetTypes: string[];
  events: {
    autoCompoundingEventType: string;
    rebalanceEventType: string | undefined;
    liquidityChangeEventType: string;
    withdrawV2EventType?: string;
    afterTransactionEventType?: string;
    checkRatioEventType?: string;
  };
  loopingPoolCoinMap?: {
    supplyCoin: string;
    borrowCoin: string;
  };
  fungibleCoinType?: string;
  images?: {
    imageUrl1?: string;
    imageUrl2?: string;
  };
  lockIcon?: string;
  retired: boolean;
};

export const poolDetailsMap: Record<string, PoolDetails> = {
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_POOL]: {
    packageId: conf[CONF_ENV].ALPHA_BLUEFIN_AUTOBALANCE_LATEST_PACKAGE_ID,
    poolName: 'BLUEFIN-AUTOBALANCE-SUIUSDT-USDC-ZERO-ZERO',
    packageNumber: 7,
    strategyType: 'BLUEFIN-AUTOBALANCE-DOUBLE-ASSET-POOL',
    parentProtocolName: 'BLUEFIN',
    parentPoolId: conf[CONF_ENV].BLUEFIN_SUIUSDT_USDC_ZERO_ZERO_POOL,
    poolId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_POOL,
    investorId: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_RECEIPT,
    },
    assetTypes: [coinsList['SUIUSDT'].type, coinsList['USDC'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV]
          .ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV]
          .ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_ZERO_ZERO_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHA_POOL]: {
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
    assetTypes: [
      '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA',
    ],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_DEEP_POOL]: {
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
    assetTypes: [coinsList['DEEP'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_WAL_POOL]: {
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
    assetTypes: [coinsList['WAL'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL]: {
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
    assetTypes: [coinsList['WAL'].type, coinsList['USDC'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_WAL_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_STSUI_POOL]: {
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
    assetTypes: [coinsList['WAL'].type, coinsList['STSUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL]: {
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
    assetTypes: [coinsList['WAL'].type, coinsList['USDC'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_WAL_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].USDC_SUIUSDT_POOL]: {
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
    assetTypes: [coinsList['USDC'].type, coinsList['SUIUSDT'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL]: {
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
    assetTypes: [coinsList['LBTC'].type, coinsList['SUIBTC'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_LBTC_SUIBTC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_LBTC_POOL]: {
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
    assetTypes: [coinsList['SUI'].type, coinsList['LBTC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['SUI'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_FUNGIBLE_STSUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    fungibleCoinType: coinsList['AlphaFi stSUI-SUI LP'].type,
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/stsui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_NAVI_SUIUSDT_POOL]: {
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
    assetTypes: [coinsList['SUIUSDT'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_SUIBTC_POOL]: {
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
    assetTypes: [coinsList['SUIBTC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIBTC_USDC_POOL]: {
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
    assetTypes: [coinsList['SUIBTC'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_POOL]: {
    packageId: conf[CONF_ENV].ALPHA_5_LATEST_PACKAGE_ID,
    poolName: 'ALPHALEND-LOOP-SUI-STSUI',
    packageNumber: 5,
    strategyType: 'SINGLE-ASSET-LOOPING',
    parentProtocolName: 'ALPHALEND',
    parentPoolId: conf[CONF_ENV].NAVI_STSUI_POOL,
    poolId: conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_POOL,
    investorId: conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_INVESTOR,
    receipt: {
      name: conf[CONF_ENV].ALPHALEND_SUI_STSUI_LOOP_RECEIPT_NAME,
      type: conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_RECEIPT,
    },
    assetTypes: [coinsList['SUI'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].ALPHALEND_LOOP_SUI_STSUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    loopingPoolCoinMap: {
      supplyCoin: coinsList['STSUI'].type,
      borrowCoin: coinsList['SUI'].type,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['MUSD'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_MUSD_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_BUCK_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['BUCK'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_STSUI_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL]: {
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
    assetTypes: [coinsList['DEEP'].type, coinsList['SUI'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL]: {
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
    assetTypes: [coinsList['BLUE'].type, coinsList['SUI'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_BLUE_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL]: {
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
    assetTypes: [coinsList['DEEP'].type, coinsList['BLUE'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_DEEP_BLUE_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL]: {
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
    assetTypes: [coinsList['SUIUSDT'].type, coinsList['USDC'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_SUIUSDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUIUSDT_USDC_POOL]: {
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
    assetTypes: [coinsList['SUIUSDT'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_SUI_USDC_POOL]: {
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
    assetTypes: [coinsList['SUI'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUTOBALANCE_USDT_USDC_POOL]: {
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
    assetTypes: [coinsList['USDT'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_STSUI_POOL]: {
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
    assetTypes: [coinsList['ALPHA'].type, coinsList['STSUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['WSOL'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_WSOL_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['ETH'].type],
    events: {
      autoCompoundingEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_REBALANCE_EVENT,
      liquidityChangeEventType:
        conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_ETH_POOL_LIQUIDITY_CHANGE_EVENT,
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_USDC_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_STSUI_SUI_POOL]: {
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
    assetTypes: [coinsList['STSUI'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_DEEP_SUI_POOL]: {
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
    assetTypes: [coinsList['DEEP'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_SUI_POOL]: {
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
    assetTypes: [coinsList['WBTC'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SEND_USDC_POOL]: {
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
    assetTypes: [coinsList['SEND'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_SUI_POOL]: {
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
    assetTypes: [coinsList['BLUE'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_BLUE_USDC_POOL]: {
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
    assetTypes: [coinsList['BLUE'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_NAVX_POOL]: {
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
    assetTypes: [coinsList['NAVX'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_NAVX_VSUI_POOL]: {
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
    assetTypes: [coinsList['NAVX'].type, coinsList['VSUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_AUSD_POOL]: {
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
    assetTypes: [coinsList['SUI'].type, coinsList['AUSD'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_ALPHA_USDC_POOL]: {
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
    assetTypes: [coinsList['ALPHA'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_WBTC_USDC_POOL]: {
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
    assetTypes: [coinsList['WBTC'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_NS_POOL]: {
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
    assetTypes: [coinsList['NS'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_AUSD_USDC_POOL]: {
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
    assetTypes: [coinsList['AUSD'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_BUCK_POOL]: {
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
    assetTypes: [coinsList['SUI'].type, coinsList['BUCK'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_LOOP_USDT_USDC_POOL]: {
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
    assetTypes: [coinsList['USDT'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_USDT_USDC_POOL_CHECK_RATIO_EVENT,
    },
    loopingPoolCoinMap: {
      supplyCoin: coinsList['USDT'].type,
      borrowCoin: coinsList['USDC'].type,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDT.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDC.svg',
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_USDT_USDC_POOL]: {
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
    assetTypes: [coinsList['USDT'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_BLUEFIN_SUI_USDC_POOL]: {
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
    assetTypes: [coinsList['SUI'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_LOOP_HASUI_SUI_POOL]: {
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
    assetTypes: [coinsList['HASUI'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_HASUI_SUI_POOL_CHECK_RATIO_EVENT,
    },
    loopingPoolCoinMap: {
      supplyCoin: coinsList['HASUI'].type,
      borrowCoin: coinsList['SUI'].type,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/hasui.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
    },
    retired: false,
  },
  [conf[CONF_ENV].ALPHAFI_NAVI_USDY_POOL]: {
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
    assetTypes: [coinsList['USDY'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_AUSD_POOL]: {
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
    assetTypes: [coinsList['AUSD'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_ETH_POOL]: {
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
    assetTypes: [coinsList['ETH'].type],
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
  [conf[CONF_ENV].BUCKET_BUCK_POOL]: {
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
    assetTypes: [coinsList['BUCK'].type],
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
  [conf[CONF_ENV].BUCK_SUI_POOL]: {
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
    assetTypes: [coinsList['BUCK'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].USDC_ETH_POOL]: {
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
    assetTypes: [coinsList['USDC'].type, coinsList['ETH'].type],
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
  [conf[CONF_ENV].DEEP_SUI_POOL]: {
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
    assetTypes: [coinsList['DEEP'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHA_USDC_POOL]: {
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
    assetTypes: [coinsList['ALPHA'].type, coinsList['USDC'].type],
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
  [conf[CONF_ENV].USDC_WUSDC_POOL]: {
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
    assetTypes: [coinsList['USDC'].type, coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].USDC_SUI_POOL]: {
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
    assetTypes: [coinsList['USDC'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].USDC_USDT_POOL]: {
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
    assetTypes: [coinsList['USDC'].type, coinsList['USDT'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_USDC_POOL]: {
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
    assetTypes: [coinsList['USDC'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_LOOP_USDC_USDT_POOL]: {
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
    assetTypes: [coinsList['USDC'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_USDC_USDT_POOL_CHECK_RATIO_EVENT,
    },
    loopingPoolCoinMap: {
      supplyCoin: coinsList['USDC'].type,
      borrowCoin: coinsList['USDT'].type,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/USDC.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/USDT.svg',
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_NAVI_LOOP_SUI_VSUI_POOL]: {
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
    assetTypes: [coinsList['SUI'].type],
    events: {
      autoCompoundingEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_AUTO_COMPOUNDING_EVENT,
      rebalanceEventType: undefined,
      liquidityChangeEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_LIQUIDITY_CHANGE_EVENT,
      checkRatioEventType: conf[CONF_ENV].NAVI_LOOP_SUI_VSUI_POOL_CHECK_RATIO_EVENT,
    },
    loopingPoolCoinMap: {
      supplyCoin: coinsList['VSUI'].type,
      borrowCoin: coinsList['SUI'].type,
    },
    images: {
      imageUrl1: 'https://images.alphafi.xyz/adminweb/sui-logo1.svg',
      imageUrl2: 'https://images.alphafi.xyz/adminweb/vsui.png',
    },
    retired: true,
  },
  [conf[CONF_ENV].ALPHAFI_NAVI_SUI_POOL]: {
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
    assetTypes: [coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_VSUI_POOL]: {
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
    assetTypes: [coinsList['VSUI'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_WETH_POOL]: {
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
    assetTypes: [coinsList['WETH'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_USDT_POOL]: {
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
    assetTypes: [coinsList['USDT'].type],
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
  [conf[CONF_ENV].ALPHAFI_NAVI_WUSDC_POOL]: {
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
    assetTypes: [coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].ALPHA_SUI_POOL]: {
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
    assetTypes: [coinsList['ALPHA'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].WUSDC_USDT_POOL]: {
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
    assetTypes: [coinsList['USDT'].type, coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].WUSDC_SUI_POOL]: {
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
    assetTypes: [coinsList['WUSDC'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].WETH_WUSDC_POOL]: {
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
    assetTypes: [coinsList['WETH'].type, coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].WUSDC_WBTC_POOL]: {
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
    assetTypes: [coinsList['WUSDC'].type, coinsList['WBTC'].type],
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
  [conf[CONF_ENV].NAVX_SUI_POOL]: {
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
    assetTypes: [coinsList['NAVX'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].CETUS_SUI_POOL]: {
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
    assetTypes: [coinsList['CETUS'].type, coinsList['SUI'].type],
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
  [conf[CONF_ENV].ALPHA_WUSDC_POOL]: {
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
    assetTypes: [coinsList['ALPHA'].type, coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].WSOL_WUSDC_POOL]: {
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
    assetTypes: [coinsList['WSOL'].type, coinsList['WUSDC'].type],
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
  [conf[CONF_ENV].FUD_SUI_POOL]: {
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
    assetTypes: [coinsList['FUD'].type, coinsList['SUI'].type],
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

export const poolDetailsMapByPoolName = Object.values(poolDetailsMap).reduce(
  (acc, pool) => {
    acc[pool.poolName] = pool;
    return acc;
  },
  {} as Record<string, PoolDetails>,
);

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
