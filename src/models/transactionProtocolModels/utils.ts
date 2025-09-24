import { Transaction } from '@mysten/sui/transactions/index.js';
import { Blockchain } from '../blockchain.js';
import { coinsListByType } from 'src/common/coinsList.js';
import { CoinStruct } from '@mysten/sui/client/index.js';
import { ClmmPoolUtil, LiquidityInput } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { BluefinInvestorType, BluefinParentPoolType } from 'src/utils/parsedTypes.js';
import { getConf } from '../../common/constants.js';
import BN from 'bn.js';

export class TransactionUtils {
  private blockchain: Blockchain;

  // Navi Asset Map
  static readonly naviAssetMap: Record<string, number> = {
    SUI: 0,
    USDC: 1,
    USDT: 2,
    WETH: 3,
    WBTC: 4,
    VSUI: 5,
    HASUI: 6,
    STSUI: 7,
    NAVX: 8,
    NS: 9,
    DEEP: 10,
    WAL: 11,
    SUIBTC: 12,
    SUIUSDT: 13,
  };

  // Navi Price Feed Map
  static readonly naviPriceFeedMap: Record<string, { feedId: string; pythPriceInfo: string }> = {
    SUI: {
      feedId: getConf().SUI_FEED_ID,
      pythPriceInfo: getConf().SUI_PYTH_PRICE_INFO,
    },
    USDC: {
      feedId: getConf().USDC_FEED_ID,
      pythPriceInfo: getConf().USDC_PYTH_PRICE_INFO,
    },
    USDT: {
      feedId: getConf().USDT_FEED_ID,
      pythPriceInfo: getConf().USDT_PYTH_PRICE_INFO,
    },
    WETH: {
      feedId: getConf().WETH_FEED_ID,
      pythPriceInfo: getConf().WETH_PYTH_PRICE_INFO,
    },
    WBTC: {
      feedId: getConf().WBTC_FEED_ID,
      pythPriceInfo: getConf().WBTC_PYTH_PRICE_INFO,
    },
    VSUI: {
      feedId: getConf().VSUI_FEED_ID,
      pythPriceInfo: getConf().VSUI_PYTH_PRICE_INFO,
    },
    HASUI: {
      feedId: getConf().HASUI_FEED_ID,
      pythPriceInfo: getConf().HASUI_PYTH_PRICE_INFO,
    },
    STSUI: {
      feedId: getConf().STSUI_FEED_ID,
      pythPriceInfo: getConf().STSUI_PYTH_PRICE_INFO,
    },
    NAVX: {
      feedId: getConf().NAVX_FEED_ID,
      pythPriceInfo: getConf().NAVX_PYTH_PRICE_INFO,
    },
    NS: {
      feedId: getConf().NS_FEED_ID,
      pythPriceInfo: getConf().NS_PYTH_PRICE_INFO,
    },
    DEEP: {
      feedId: getConf().DEEP_FEED_ID,
      pythPriceInfo: getConf().DEEP_PYTH_PRICE_INFO,
    },
    BLUE: {
      feedId: getConf().BLUE_FEED_ID,
      pythPriceInfo: getConf().BLUE_PYTH_PRICE_INFO,
    },
    BUCK: {
      feedId: getConf().BUCK_FEED_ID,
      pythPriceInfo: getConf().BUCK_PYTH_PRICE_INFO,
    },
    SUIUSDT: {
      feedId: getConf().SUIUSDT_FEED_ID,
      pythPriceInfo: getConf().SUIUSDT_PYTH_PRICE_INFO,
    },
    SUIBTC: {
      feedId: getConf().SUIBTC_FEED_ID,
      pythPriceInfo: getConf().SUIBTC_PYTH_PRICE_INFO,
    },
    WAL: {
      feedId: getConf().HASUI_FEED_ID, //todo: change when real ids for wal are found
      pythPriceInfo: getConf().HASUI_PYTH_PRICE_INFO,
    },
    DMC: {
      feedId: getConf().DMC_FEED_ID,
      pythPriceInfo: getConf().DMC_PYTH_PRICE_INFO,
    },
  };

  // Looping Account Addresses Map
  static readonly loopingAccountAddresses: { [key: string]: string } = {
    'NAVI-LOOP-USDC-USDT': getConf().NAVI_USDC_USDT_LOOP_ACCOUNT_ADDRESS,
    'NAVI-LOOP-USDT-USDC': getConf().NAVI_USDT_USDC_LOOP_ACCOUNT_ADDRESS,
    'NAVI-LOOP-SUI-VSUI': getConf().NAVI_SUI_VSUI_LOOP_ACCOUNT_ADDRESS,
    'NAVI-LOOP-HASUI-SUI': getConf().NAVI_HASUI_SUI_LOOP_ACCOUNT_ADDRESS,
    'NAVI-LOOP-SUI-STSUI': getConf().NAVI_SUI_VSUI_LOOP_ACCOUNT_ADDRESS, // Using VSUI address as placeholder
  };

  // Cetus Pool Map
  static readonly cetusPoolMap: { [key: string]: string } = {
    'WUSDC-SUI': getConf().WUSDC_SUI_CETUS_POOL_ID,
    'USDC-SUI': getConf().USDC_SUI_CETUS_POOL_ID,
    'USDC-USDT': getConf().USDC_USDT_CETUS_POOL_ID,
    'CETUS-SUI': getConf().CETUS_SUI_CETUS_POOL_ID,
    'USDT-WUSDC': getConf().USDT_WUSDC_CETUS_POOL_ID,
    'USDY-WUSDC': getConf().USDY_WUSDC_CETUS_POOL_ID,
    'HASUI-SUI': getConf().HASUI_SUI_CETUS_POOL_ID,
    'ALPHA-SUI': getConf().ALPHA_SUI_CETUS_POOL_ID,
    'WETH-WUSDC': getConf().WETH_WUSDC_CETUS_POOL_ID,
    'WUSDC-WBTC': getConf().WUSDC_WBTC_CETUS_POOL_ID,
    'VSUI-SUI': getConf().VSUI_SUI_CETUS_POOL_ID,
    'NAVX-SUI': getConf().NAVX_SUI_CETUS_POOL_ID,
    'WUSDC-CETUS': getConf().WUSDC_CETUS_CETUS_POOL_ID,
    'BUCK-WUSDC': getConf().BUCK_WUSDC_CETUS_POOL_ID,
    'ALPHA-WUSDC': getConf().ALPHA_WUSDC_CETUS_POOL_ID,
    'WSOL-WUSDC': getConf().WSOL_WUSDC_CETUS_POOL_ID,
    'SCA-SUI': getConf().SCA_SUI_CETUS_POOL_ID,
    'ALPHA-USDC': getConf().ALPHA_USDC_CETUS_POOL_ID,
    'USDC-WUSDC': getConf().USDC_WUSDC_CETUS_POOL_ID,
    'FUD-SUI': getConf().FUD_SUI_CETUS_POOL_ID,
    'USDC-ETH': getConf().USDC_ETH_CETUS_POOL_ID,
    'DEEP-SUI': getConf().DEEP_SUI_CETUS_POOL_ID,
    'BUCK-SUI': getConf().BUCK_SUI_CETUS_POOL_ID,
    'USDC-BUCK': getConf().USDC_BUCK_CETUS_POOL_ID,
    'USDC-AUSD': getConf().USDC_AUSD_CETUS_POOL_ID,
    'NS-SUI': getConf().NS_SUI_CETUS_POOL_ID,
    'AUSD-SUI': getConf().AUSD_SUI_CETUS_POOL_ID,
    'USDC-WBTC': getConf().USDC_WBTC_CETUS_POOL_ID,
    'NAVX-VSUI': getConf().NAVX_VSUI_CETUS_POOL_ID,
    'BLUE-SUI': getConf().BLUE_SUI_CETUS_POOL_ID,
    'BLUE-USDC': getConf().BLUE_USDC_CETUS_POOL_ID,
    'USDC-SEND': getConf().USDC_SEND_CETUS_POOL_ID,
    'WBTC-SUI': getConf().WBTC_SUI_CETUS_POOL_ID,
    'STSUI-SUI': getConf().STSUI_SUI_CETUS_POOL_ID,
    'USDC-SUIUSDT': getConf().USDC_SUIUSDT_CETUS_POOL_ID,
    'BLUE-DEEP': getConf().BLUE_DEEP_CETUS_POOL_ID,
    'ETH-SUI': getConf().ETH_SUI_CETUS_POOL_ID,
    'WSOL-SUI': getConf().WSOL_SUI_CETUS_POOL_ID,
    'MUSD-SUI': getConf().MUSD_SUI_CETUS_POOL_ID,
    'USDC-SUIBTC': getConf().USDC_SUIBTC_CETUS_POOL_ID,
    'SUIUSDT-SUI': getConf().SUIUSDT_SUI_CETUS_POOL_ID,
    'LBTC-SUI': getConf().LBTC_SUI_CETUS_POOL_ID,
    'SUIBTC-SUI': getConf().SUIBTC_SUI_CETUS_POOL_ID,
    'SUIBTC-LBTC': getConf().SUIBTC_LBTC_CETUS_POOL_ID,
    'WAL-SUI': getConf().WAL_SUI_CETUS_POOL_ID,
    'USDC-WAL': getConf().USDC_WAL_CETUS_POOL_ID,
    'USDT-USDC': getConf().USDT_WUSDC_CETUS_POOL_ID, // Using WUSDC pool as placeholder
  };

  // Bluefin Pool Map
  static readonly bluefinPoolMap: { [key: string]: string } = {
    'SUI-USDC': getConf().BLUEFIN_SUI_USDC_POOL,
    'DEEP-SUI': getConf().BLUEFIN_DEEP_SUI_POOL,
    'USDT-USDC': getConf().BLUEFIN_USDT_USDC_POOL,
    'SUI-BUCK': getConf().BLUEFIN_SUI_BUCK_POOL,
    'AUSD-USDC': getConf().BLUEFIN_AUSD_USDC_POOL,
    'SUI-AUSD': getConf().BLUEFIN_SUI_AUSD_POOL,
    'ALPHA-USDC': getConf().BLUEFIN_ALPHA_USDC_POOL,
    'WBTC-USDC': getConf().BLUEFIN_WBTC_USDC_POOL,
    'NAVX-VSUI': getConf().BLUEFIN_NAVX_VSUI_POOL,
    'BLUE-SUI': getConf().BLUEFIN_BLUE_SUI_POOL,
    'BLUE-USDC': getConf().BLUEFIN_BLUE_USDC_POOL,
    'BLUE-SUI-AUTOCOMPOUND': getConf().BLUEFIN_BLUE_SUI_POOL_AUTOCOMPOUND,
    'SEND-USDC': getConf().BLUEFIN_SEND_USDC_POOL,
    'WBTC-SUI': getConf().BLUEFIN_WBTC_SUI_POOL,
    'STSUI-SUI': getConf().BLUEFIN_STSUI_SUI_POOL,
    'STSUI-SUI-ZERO-ZERO': getConf().BLUEFIN_STSUI_SUI_ZERO_ZERO_POOL,
    'STSUI-USDC': getConf().BLUEFIN_STSUI_USDC_POOL,
    'STSUI-ETH': getConf().BLUEFIN_STSUI_ETH_POOL,
    'STSUI-WSOL': getConf().BLUEFIN_STSUI_WSOL_POOL,
    'ALPHA-STSUI': getConf().BLUEFIN_ALPHA_STSUI_POOL,
    'SUI-ALPHA': getConf().BLUEFIN_SUI_ALPHA_POOL,
    'SUIUSDT-USDC': getConf().BLUEFIN_SUIUSDT_USDC_POOL,
    'DEEP-BLUE': getConf().BLUEFIN_DEEP_BLUE_POOL,
    'SUI-ETH': getConf().BLUEFIN_SUI_ETH_POOL,
    'SUI-WSOL': getConf().BLUEFIN_SUI_WSOL_POOL,
    'SUI-MUSD': getConf().BLUEFIN_SUI_MUSD_POOL,
    'STSUI-MUSD': getConf().BLUEFIN_STSUI_MUSD_POOL,
    'SUIBTC-USDC': getConf().BLUEFIN_SUIBTC_USDC_POOL,
    'SUI-SUIBTC': getConf().BLUEFIN_SUI_SUIBTC_POOL,
    'VSUI-SUI': getConf().BLUEFIN_VSUI_SUI_POOL,
    'SUI-LBTC': getConf().BLUEFIN_SUI_LBTC_POOL,
    'LBTC-SUIBTC': getConf().BLUEFIN_LBTC_SUIBTC_POOL,
    'WAL-USDC': getConf().BLUEFIN_WAL_USDC_POOL,
    'SUI-WAL': getConf().BLUEFIN_SUI_WAL_POOL,
    'WAL-STSUI': getConf().BLUEFIN_WAL_STSUI_POOL,
    'SUIUSDT-USDC-ZERO-ZERO': getConf().BLUEFIN_SUIUSDT_USDC_ZERO_ZERO_POOL,
    'WAL-SUI': getConf().BLUEFIN_WAL_SUI_POOL,
    'NAVX-SUI': getConf().BLUEFIN_NAVX_SUI_POOL,
    'NAVX-USDC': getConf().BLUEFIN_NAVX_USDC_POOL,
    'VSUI-USDC': getConf().BLUEFIN_VSUI_USDC_POOL,
    'TBTC-USDC': getConf().BLUEFIN_TBTC_USDC_POOL,
    'SUI-USDC-175': getConf().BLUEFIN_SUI_USDC_175_POOL,
    'DEEP-SUI-175': getConf().BLUEFIN_DEEP_SUI_175_POOL,
    'XAUM-XBTC': getConf().BLUEFIN_XAUM_XBTC_POOL,
    'XAUM-USDC': getConf().BLUEFIN_XAUM_USDC_POOL,
    'XBTC-USDC': getConf().BLUEFIN_XBTC_USDC_POOL,
  };

  constructor(blockchain: Blockchain) {
    this.blockchain = blockchain;
  }

  async getAmounts(poolId: string, isAmountA: boolean, amount: string): Promise<[string, string]> {
    const liquidity = await this.getLiquidity(poolId, isAmountA, amount);
    const numA = liquidity.coinAmountA.toString();
    const numB = liquidity.coinAmountB.toString();
    return [numA, numB];
  }

  async getCoinFromWallet(tx: Transaction, address: string, coinType: string) {
    if (coinsListByType[coinType].name === 'SUI') {
      return tx.gas;
    }
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;
    do {
      const response = await this.blockchain.client.getCoins({
        owner: address,
        coinType: coinType,
        cursor: currentCursor,
      });
      coins = coins.concat(response.data);

      // Check if there's a next page
      if (response.hasNextPage && response.nextCursor) {
        currentCursor = response.nextCursor;
      } else {
        // No more pages available
        break;
      }
    } while (true);

    let coin;
    [coin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins.map((c) => c.coinObjectId),
    );

    return coin;
  }

  async getReceiptObject(tx: Transaction, receiptType: string, receiptId?: string) {
    if (receiptId) {
      return tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: [receiptType],
        arguments: [tx.object(receiptId)],
      });
    }
    return tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [receiptType],
      arguments: [],
    });
  }

  private async getLiquidity(
    poolId: string,
    a2b: boolean,
    amount: string,
  ): Promise<LiquidityInput> {
    const investor = await this.blockchain.getInvestor(poolId);
    const parentPool = await this.blockchain.getParentPool(poolId);

    // Handle tick calculations for Cetus and Bluefin investors
    const upper_bound = 443636;
    let lower_tick: number = (investor as BluefinInvestorType).lower_tick;
    let upper_tick: number = (investor as BluefinInvestorType).upper_tick;

    if (lower_tick > upper_bound) {
      lower_tick = -~(lower_tick - 1);
    }
    if (upper_tick > upper_bound) {
      upper_tick = -~(upper_tick - 1);
    }

    const current_sqrt_price = new BN((parentPool as BluefinParentPoolType).current_sqrt_price);

    const liquidity = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lower_tick,
      upper_tick,
      new BN(`${Math.floor(parseFloat(amount))}`),
      a2b,
      false,
      0.5,
      current_sqrt_price,
    );

    return liquidity;
  }
}
