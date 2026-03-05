/**
 * Looping Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  NAVI_CONFIG,
  POOLS,
  PYTH_STATE_ID,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
  WORMHOLE_STATE_ID,
} from '../utils/constants.js';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { stSuiExchangeRate, getConf as getStSuiConf } from '@alphafi/stsui-sdk';
import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';

/**
 * Looping Strategy for leveraged positions with automated compounding
 */
export class LoopingStrategy extends BaseStrategy<
  LoopingPoolObject,
  LoopingInvestorObject,
  never, // Looping doesn't have parent pool objects
  LoopingReceiptObject
> {
  private poolLabel: LoopingPoolLabel;
  private poolObject: LoopingPoolObject;
  private investorObject: LoopingInvestorObject;
  private receiptObjects: LoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LoopingPoolLabel,
    poolObject: any,
    investorObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
  }

  getPoolLabel(): LoopingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset Looping strategy');
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Get alpha mining data including pool and receipt information
   */
  protected getAlphaMiningData(): AlphaMiningData {
    const receipt = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;

    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: this.poolObject.accRewardsPerXtoken,
      xTokenSupply: this.poolObject.xTokenSupply,
      receipt: receipt
        ? {
            lastAccRewardPerXtoken: receipt.lastAccRewardPerXtoken,
            pendingRewards: receipt.pendingRewards,
            xTokenBalance: receipt.xTokenBalance,
          }
        : null,
    };
  }

  /**
   * Get the exchange rate for xtoken to underlying token ratio
   * Adjusted for current debt-to-supply ratio in leveraged positions
   */
  exchangeRate(): Decimal {
    const currentDebtToSupplyRatio = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const tokensInvested = new Decimal(this.investorObject.tokensDeposited).mul(
      new Decimal(1).minus(currentDebtToSupplyRatio.div(new Decimal(10).pow(20))),
    );
    const xtokenSupply = new Decimal(this.poolObject.xTokenSupply);

    if (xtokenSupply.isZero()) {
      return new Decimal(1); // Default exchange rate when no tokens are supplied
    }

    return tokensInvested.div(xtokenSupply);
  }

  /**
   * Get comprehensive pool data including TVL and APR information
   */
  async getData(): Promise<PoolData> {
    const [alphafi, parent, apr] = await Promise.all([
      this.getTvl(),
      this.getParentTvl(),
      this.context.getAprData(this.poolLabel.poolId),
    ]);
    return {
      poolId: this.poolLabel.poolId,
      strategyType: this.poolLabel.strategyType,
      coinType: this.poolLabel.userDepositAsset.type,
      poolName: this.poolLabel.poolName,
      apr,
      tvl: {
        alphafi,
        parent,
      },
    };
  }

  /**
   * Calculate total value locked adjusted for leveraged position
   * Accounts for debt-to-supply ratio and protocol-specific scaling
   */
  async getTvl(): Promise<SingleTvl> {
    const supplyType = this.poolLabel.supplyAsset.type;
    const userDepositType = this.poolLabel.userDepositAsset.type;
    const cdsr = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    let tokensInvested = new Decimal(this.poolObject.tokensInvested).mul(
      new Decimal(1).minus(cdsr.div(new Decimal(10).pow(20))),
    );

    if (this.poolLabel.parentProtocol === 'Navi') {
      tokensInvested = tokensInvested.div(new Decimal(10).pow(9));
    } else {
      const supplyDecimals =
        (await this.context.coinInfoProvider.getCoinByType(supplyType))?.decimals ?? 9;
      tokensInvested = tokensInvested.div(new Decimal(10).pow(supplyDecimals));
    }

    const supplyPrice = await this.context.getCoinPrice(supplyType);
    const userDepositPrice = await this.context.getCoinPrice(userDepositType);

    const tokenAmount = tokensInvested.mul(supplyPrice).div(userDepositPrice);
    const usdValue = tokensInvested.mul(userDepositPrice);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL based on protocol type (Navi/Alphalend)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const coinType = this.poolLabel.supplyAsset.type;
    const price = await this.context.getCoinPrice(coinType);
    if (protocol === 'Navi') {
      const tokenAmountUsd = await this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    } else if (protocol === 'Alphalend') {
      const tokenAmount = await this.context.getAlphaLendTvl(coinType);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Includes leverage adjustment and protocol-specific scaling
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const exchangeRate = this.exchangeRate();
    let tokens = xTokens.mul(exchangeRate);

    if (this.poolLabel.parentProtocol === 'Navi') {
      tokens = tokens.div(new Decimal(10).pow(9));
    } else {
      const supplyDecimals = await this.context.getCoinDecimals(this.poolLabel.supplyAsset.type);
      tokens = tokens.div(new Decimal(10).pow(supplyDecimals));
    }

    const [supplyPrice, userDepositPrice] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.supplyAsset.type),
      this.context.getCoinPrice(this.poolLabel.userDepositAsset.type),
    ]);
    const amount = tokens.mul(supplyPrice).div(userDepositPrice);
    return { tokenAmount: amount, usdValue: amount.mul(userDepositPrice) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        rewards: (() => {
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
      };
    }, 'Failed to parse Looping pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LoopingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        currentDebtToSupplyRatio: this.getStringField(fields, 'current_debt_to_supply_ratio'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        loops: this.getStringField(fields, 'loops'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        naviAccCap: {
          id: this.getNestedField(fields, 'navi_acc_cap.id'),
          owner: this.getNestedField(fields, 'navi_acc_cap.owner'),
        },
        performanceFee: this.getStringField(fields, 'performance_fee'),
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokensDeposited:
          this.getStringField(fields, 'tokens_deposited') ||
          this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse Looping investor object');
  }

  /**
   * Parse parent pool object (not applicable for Looping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('Looping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LoopingReceiptObject[] {
    return responses
      .map((response, index) => {
        return this.safeParseObject(() => {
          const fields = this.extractFields(response);

          return {
            id: this.getStringField(fields, 'id'),
            imageUrl: this.getStringField(fields, 'image_url'),
            lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
            name: this.getStringField(fields, 'name'),
            owner: this.getStringField(fields, 'owner'),
            pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
            poolId: this.getStringField(fields, 'pool_id'),
            xTokenBalance: this.getStringField(fields, 'xTokenBalance'),
          };
        }, `Failed to parse Looping receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }

  private async getAvailableRewards(address: string): Promise<Record<string, any[]>> {
    try {
      // Call the integration API
      const apiUrl = this.context.apiBaseUrl;
      const response = await fetch(
        `${apiUrl}/navi-params/rewards?address=${encodeURIComponent(address)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed to fetch rewards: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // The API returns { address, rewards, timestamp }
      // We just need the rewards object
      return data.rewards || {};
    } catch (error: any) {
      console.error('Error fetching Navi rewards from API:', error);
      throw new Error(`Failed to fetch Navi rewards: ${error.message}`);
    }
  }

  private async collectAndSwapRewardsTxb(
    tx: Transaction,
    rewardCoinSet: Set<string>,
    claimableRewards: any[] | undefined,
  ) {
    if (!claimableRewards) {
      return;
    }
    const [navxCoin, vsuiCoin, stsuiCoin] = await this.context.getCoinsBySymbols([
      'NAVX',
      'vSUI',
      'stSUI',
    ]);

    for (const reward of claimableRewards) {
      if (rewardCoinSet.has(reward.rewardCoinType) === false) {
        if (this.poolLabel.supplyAsset.name === 'vSUI') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_sui_vsui_investor::collect_reward_with_two_swaps_v2`,
              typeArguments: [navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(NAVI_CONFIG.VOLO.STAKE_POOL),
                tx.object(NAVI_CONFIG.VOLO.METADATA),
                tx.object(SUI_SYSTEM_STATE),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'vSUI', 'cetus'),
                ),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_sui_vsui_investor::collect_reward_with_no_swap`,
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
              ],
            });
          }
        } else if (this.poolLabel.supplyAsset.name === 'HASUI') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_hasui_sui_investor::collect_reward_with_two_swaps`,
              typeArguments: [navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(NAVI_CONFIG.HAEDEL_STAKING),
                tx.object(SUI_SYSTEM_STATE),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('HASUI', 'SUI', 'cetus'),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_hasui_sui_investor::collect_reward_with_two_swaps`,
              typeArguments: [vsuiCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(NAVI_CONFIG.HAEDEL_STAKING),
                tx.object(SUI_SYSTEM_STATE),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('HASUI', 'SUI', 'cetus'),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          }
        } else if (this.poolLabel.supplyAsset.name === 'stSUI') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_bluefin`,
              typeArguments: [navxCoin.coinType],
              arguments: [
                tx.object(VERSIONS.ALPHA_VERSIONS[5]),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(STSUI.LST_INFO),
                tx.object(SUI_SYSTEM_STATE),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'bluefin'),
                ),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps`,
              typeArguments: [vsuiCoin.coinType],
              arguments: [
                tx.object(VERSIONS.ALPHA_VERSIONS[5]),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(STSUI.LST_INFO),
                tx.object(SUI_SYSTEM_STATE),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(GLOBAL_CONFIGS.CETUS),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          } else if (reward.rewardCoinType === stsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap`,
              arguments: [
                tx.object(VERSIONS.ALPHA_VERSIONS[5]),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.stSUI),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          }
        } else if (this.poolLabel.supplyAsset.name === 'USDC') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_native_usdc_usdt_investor::collect_reward_with_two_swaps`,
              typeArguments: [navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_native_usdc_usdt_investor::collect_reward_with_two_swaps`,
              typeArguments: [vsuiCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[2]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          }
        }
        rewardCoinSet.add(reward.reward_coin_type);
      }
    }
  }

  private async collectAndSwapRewards(tx: Transaction) {
    const rewardCoinSet = new Set<string>();

    if (this.poolLabel.supplyAsset.name === 'vSUI') {
      const claimableRewards = await this.getAvailableRewards(
        NAVI_CONFIG.ACCOUNT_ADDRESSES.SUI_VSUI_LOOP,
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[this.poolLabel.supplyAsset.type],
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[
          '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
        ],
      );
    } else if (this.poolLabel.supplyAsset.name === 'HASUI') {
      const claimableRewards = await this.getAvailableRewards(
        NAVI_CONFIG.ACCOUNT_ADDRESSES.HASUI_SUI_LOOP,
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[this.poolLabel.supplyAsset.type],
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[
          '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
        ],
      );
    } else if (this.poolLabel.supplyAsset.name === 'stSUI') {
      const claimableRewards = await this.getAvailableRewards('');
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[this.poolLabel.supplyAsset.type],
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[
          '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
        ],
      );
    } else if (this.poolLabel.supplyAsset.name === 'USDC') {
      const claimableRewards = await this.getAvailableRewards(
        NAVI_CONFIG.ACCOUNT_ADDRESSES.USDC_USDT_LOOP,
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[this.poolLabel.supplyAsset.type],
      );
      await this.collectAndSwapRewardsTxb(
        tx,
        rewardCoinSet,
        claimableRewards[this.poolLabel.borrowAsset.type],
      );
    }
  }

  private async updateSingleTokenPrice(tx: Transaction, pythPriceInfo: string, feedId: string) {
    const pythClient = new SuiPythClient(
      this.context.blockchain.suiClient,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID,
    );
    const pythConnection = new SuiPriceServiceConnection('https://hermes.pyth.network');

    const priceFeedUpdateData = await pythConnection.getPriceFeedsUpdateData([pythPriceInfo]);
    const priceInfoObjectIds = await pythClient.updatePriceFeeds(tx, priceFeedUpdateData, [
      pythPriceInfo,
    ]);

    tx.moveCall({
      target:
        '0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83::oracle_pro::update_single_price',
      arguments: [
        tx.object(CLOCK_PACKAGE_ID),
        tx.object(NAVI_CONFIG.ORACLE_CONFIG),
        tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
        tx.object(NAVI_CONFIG.SUPRA_ORACLE_HOLDER),
        tx.object(priceInfoObjectIds[0]),
        tx.pure.address(feedId),
      ],
    });
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    // get Coin Object
    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.userDepositAsset.type,
      options.address,
      options.amount,
    );

    const receiptOption = this.context.blockchain.getOptionReceipt(
      tx,
      this.poolLabel.poolId,
      options.address,
    );

    if (this.poolLabel.parentProtocol === 'Alphalend') {
      const [alphaCoin, blueCoin] = await this.context.getCoinsBySymbols(['ALPHA', 'BLUE']);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
        typeArguments: [alphaCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'STSUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
        typeArguments: [blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::user_deposit_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      return;
    }

    await this.updateSingleTokenPrice(
      tx,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.supplyAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .pythPriceInfo,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.supplyAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .feedId,
    );
    await this.updateSingleTokenPrice(
      tx,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.borrowAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .pythPriceInfo,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.borrowAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .feedId,
    );
    await this.collectAndSwapRewards(tx);

    if (this.poolLabel.supplyAsset.name === 'vSUI') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_vsui_pool::user_deposit_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.vSUI),
          tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
          tx.object(NAVI_CONFIG.VOLO.STAKE_POOL),
          tx.object(NAVI_CONFIG.VOLO.METADATA),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(NAVI_CONFIG.KRIYA.VSUI_SUI_POOL),
          tx.object(NAVI_CONFIG.KRIYA.VERSION),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.supplyAsset.name === 'HASUI') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_hasui_sui_pool::user_deposit_v2`, // change package id for testing
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]), // change version object id for testing
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.HASUI),
          tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('HASUI', 'SUI', 'cetus')),
          tx.object(NAVI_CONFIG.HAEDEL_STAKING),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.supplyAsset.name === 'USDC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_native_usdc_usdt_pool::user_deposit_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
          tx.object(NAVI_CONFIG.INCENTIVE_V1_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(NAVI_CONFIG.FUNDS_POOLS.vSUI),
          tx.object(NAVI_CONFIG.FUNDS_POOLS.NAVX),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDT', 'USDC', 'bluefin')),
          tx.pure.bool(true),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.supplyAsset.name === 'USDT') {
      const [navxCoin] = await this.context.getCoinsBySymbols(['NAVX']);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_usdt_usdc_pool::user_deposit_v3`,
        typeArguments: [navxCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
          tx.object(NAVI_CONFIG.INCENTIVE_V1_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(NAVI_CONFIG.FUNDS_POOLS.vSUI),
          tx.object(NAVI_CONFIG.FUNDS_POOLS.NAVX),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  private async fetchVoloExchangeRate(): Promise<NaviVoloData> {
    const apiUrl = 'https://open-api.naviprotocol.io/api/volo/stats';
    const default_volo_data: NaviVoloData = {
      data: {
        operatorBalance: '',
        collectableFee: '',
        pendingStakes: '',
        poolTotalRewards: '0',
        unstakeTicketSupply: '',
        totalStaked: '',
        activeStake: '',
        calcTotalRewards: '',
        currentEpoch: '',
        validators: {},
        exchangeRate: (1 / 0.973).toString(),
        totalSupply: '',
        apy: '',
        sortedValidators: [''],
        maxInstantUnstake: '',
        maxNoFeeUnstake: '',
      },
      code: 0,
    };
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as NaviVoloData;
      return data;
    } catch (error) {
      console.error('error in api', error);
      return default_volo_data;
    }
  }

  private async coinAmountToXToken(amount: Decimal): Promise<string> {
    const exchangeRate = this.exchangeRate();
    if (this.poolLabel.poolName === 'NAVI-LOOP-SUI-VSUI') {
      const voloExchRate = await this.fetchVoloExchangeRate();
      amount = amount.div(parseFloat(voloExchRate.data.exchangeRate));
    } else if (this.poolLabel.poolName === 'ALPHALEND-LOOP-SUI-STSUI') {
      const suiTostSuiExchangeRate = await stSuiExchangeRate(getStSuiConf().LST_INFO, true);
      amount = amount.div(suiTostSuiExchangeRate);
    }
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found');
    }

    let xtokenAmount = await this.coinAmountToXToken(new Decimal(options.amount));
    if (options.withdrawMax) {
      xtokenAmount = this.receiptObjects[0].xTokenBalance;
    }

    const noneAlphaReceipt = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [
        '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
      ],
      arguments: [],
    });

    if (this.poolLabel.parentProtocol === 'Alphalend') {
      const [stsuiCoin, suiCoin, alphaCoin, blueCoin] = await this.context.getCoinsBySymbols([
        'stSUI',
        'SUI',
        'ALPHA',
        'BLUE',
      ]);
      const alphalendClient = new AlphalendClient('mainnet', this.context.blockchain.suiClient);
      await alphalendClient.updatePrices(tx, [stsuiCoin.coinType, suiCoin.coinType]);

      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_one_swap`,
        typeArguments: [alphaCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'STSUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_no_swap_v2`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::collect_v3_rewards_with_two_swaps_v2`,
        typeArguments: [blueCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'cetus')),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      const [stsui_coin] = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::user_withdraw_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.pure.u64(xtokenAmount),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `0x2::transfer::public_transfer`,
        typeArguments: [`0x2::coin::Coin<${suiCoin.coinType}>`],
        arguments: [stsui_coin, tx.pure.address(options.address)],
      });
      return;
    }

    await this.updateSingleTokenPrice(
      tx,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.supplyAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .pythPriceInfo,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.supplyAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .feedId,
    );
    await this.updateSingleTokenPrice(
      tx,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.borrowAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .pythPriceInfo,
      NAVI_CONFIG.PRICE_FEED[this.poolLabel.borrowAsset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
        .feedId,
    );
    await this.collectAndSwapRewards(tx);

    if (this.poolLabel.supplyAsset.name === 'vSUI') {
      const [vsui_coin] = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_sui_vsui_pool::user_withdraw_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.pure.u64(xtokenAmount),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.vSUI),
          tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
          tx.object(NAVI_CONFIG.VOLO.STAKE_POOL),
          tx.object(NAVI_CONFIG.VOLO.METADATA),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(NAVI_CONFIG.KRIYA.VSUI_SUI_POOL),
          tx.object(NAVI_CONFIG.KRIYA.VERSION),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `0x2::transfer::public_transfer`,
        typeArguments: [`0x2::coin::Coin<${this.poolLabel.borrowAsset.type}>`],
        arguments: [vsui_coin, tx.pure.address(options.address)],
      });
    } else if (this.poolLabel.supplyAsset.name === 'HASUI') {
      const [hasuiCoin] = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_hasui_sui_pool::user_withdraw_v2`, // change package id for testing
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]), // change  version object id for testing
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.pure.u64(xtokenAmount),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.HASUI),
          tx.object(NAVI_CONFIG.NAVI_POOLS.SUI),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('HASUI', 'SUI', 'cetus')),
          tx.object(NAVI_CONFIG.HAEDEL_STAKING),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `0x2::transfer::public_transfer`,
        typeArguments: [`0x2::coin::Coin<${this.poolLabel.supplyAsset.type}>`],
        arguments: [hasuiCoin, tx.pure.address(options.address)],
      });
    } else if (this.poolLabel.supplyAsset.name === 'USDC') {
      const [usdcCoin] = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_native_usdc_usdt_pool::user_withdraw_v4`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[2]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.pure.u256(xtokenAmount),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus')),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDT', 'USDC', 'bluefin')),
          tx.pure.bool(true),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `0x2::transfer::public_transfer`,
        typeArguments: [`0x2::coin::Coin<${this.poolLabel.supplyAsset.type}>`],
        arguments: [usdcCoin, tx.pure.address(options.address)],
      });
    } else if (this.poolLabel.supplyAsset.name === 'USDT') {
      const [usdtCoin] = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_usdt_usdc_pool::user_withdraw_v3`,
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[5]),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          tx.object(this.receiptObjects[0].id),
          noneAlphaReceipt,
          tx.object(POOLS.ALPHA_LEGACY),
          tx.object(this.poolLabel.poolId),
          tx.pure.u256(xtokenAmount),
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDT),
          tx.object(NAVI_CONFIG.NAVI_POOLS.USDC),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(GLOBAL_CONFIGS.CETUS),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'USDT', 'cetus')),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `0x2::transfer::public_transfer`,
        typeArguments: [`0x2::coin::Coin<${this.poolLabel.supplyAsset.type}>`],
        arguments: [usdtCoin, tx.pure.address(options.address)],
      });
    }
  }

  async claimRewards(tx: Transaction, alphaReceipt: TransactionResult) {
    let target, version;
    if (this.poolLabel.poolName == 'NAVI-LOOP-USDT-USDC') {
      target = `${this.poolLabel.packageId}::alphafi_navi_usdt_usdc_pool::get_user_rewards_all`;
      version = VERSIONS.ALPHA_VERSIONS[5];
    } else if (this.poolLabel.poolName == 'ALPHALEND-LOOP-SUI-STSUI') {
      target = `${this.poolLabel.packageId}::alphafi_navi_sui_stsui_pool::get_user_rewards_all`;
      version = VERSIONS.ALPHA_VERSIONS[5];
    } else if (this.poolLabel.poolName == 'NAVI-LOOP-SUI-VSUI') {
      target = `${this.poolLabel.packageId}::alphafi_navi_sui_vsui_pool::get_user_rewards_all`;
      version = VERSIONS.ALPHA_VERSIONS[2];
    } else if (this.poolLabel.poolName == 'NAVI-LOOP-USDC-USDT') {
      target = `${this.poolLabel.packageId}::alphafi_navi_native_usdc_usdt_pool::get_user_rewards_all`;
      version = VERSIONS.ALPHA_VERSIONS[2];
    } else if (this.poolLabel.poolName == 'NAVI-LOOP-HASUI-SUI') {
      target = `${this.poolLabel.packageId}::alphafi_navi_hasui_sui_pool::get_user_rewards_all`;
      version = VERSIONS.ALPHA_VERSIONS[2];
    }
    if (version && target) {
      this.receiptObjects.forEach((receipt) => {
        alphaReceipt = tx.moveCall({
          target,
          arguments: [
            tx.object(version),
            tx.object(VERSIONS.ALPHA_VERSIONS[1]),
            tx.object(receipt.id),
            alphaReceipt,
            tx.object(this.poolLabel.poolId),
            tx.object(POOLS.ALPHA_LEGACY),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      });
    }
  }
}

/**
 * Looping Pool object data structure
 */
export interface LoopingPoolObject {
  accRewardsPerXtoken: StringMap[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  name: string;
  paused: boolean;
  rewards: {
    id: string;
    size: string;
  };
  tokensInvested: string;
  withdrawFeeMaxCap: string;
  withdrawalFee: string;
  xTokenSupply: string;
}

/**
 * Looping Investor object data structure
 */
export interface LoopingInvestorObject {
  currentDebtToSupplyRatio: string;
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  loops: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  naviAccCap: {
    id: string;
    owner: string;
  };
  performanceFee: string;
  safeBorrowPercentage: string;
  tokensDeposited: string;
}

/**
 * Looping Receipt object data structure
 */
export interface LoopingReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: StringMap[];
  name: string;
  owner: string;
  pendingRewards: StringMap[];
  poolId: string;
  xTokenBalance: string;
}

/**
 * Looping Pool Label configuration
 */
export interface LoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Looping';
  parentProtocol: ProtocolType;
  investorId: string;
  receipt: StringMap;
  supplyAsset: StringMap;
  borrowAsset: StringMap;
  userDepositAsset: StringMap;
  userWithdrawAsset: StringMap;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
    checkRatioEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}

export interface NaviVoloData {
  data: {
    operatorBalance: string;
    collectableFee: string;
    pendingStakes: string;
    poolTotalRewards: string;
    unstakeTicketSupply: string;
    totalStaked: string;
    activeStake: string;
    calcTotalRewards: string;
    currentEpoch: string;
    validators: object;
    exchangeRate: string;
    totalSupply: string;
    apy: string;
    sortedValidators: string[];
    maxInstantUnstake: string;
    maxNoFeeUnstake: string;
  };
  code: number;
}
