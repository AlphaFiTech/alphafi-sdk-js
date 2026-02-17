/**
 * Lending Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  BUCKET_CONFIG,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  NAVI_CONFIG,
  POOLS,
  PYTH_STATE_ID,
  SUI_SYSTEM_STATE,
  VERSIONS,
  WORMHOLE_STATE_ID,
} from '../utils/constants.js';
import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';

/**
 * Lending Strategy for single-asset pools with lending protocol integration
 */
export class LendingStrategy extends BaseStrategy<
  LendingPoolObject,
  LendingInvestorObject,
  LendingParentPoolObject,
  LendingReceiptObject
> {
  private poolLabel: LendingPoolLabel;
  private poolObject: LendingPoolObject;
  private investorObject: LendingInvestorObject;
  private parentPoolObject: LendingParentPoolObject;
  private receiptObjects: LendingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: LendingPoolLabel,
    poolObject: any,
    investorObject: any,
    parentPoolObject: any,
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.parentPoolObject = this.parseParentPoolObject(parentPoolObject);
  }

  getPoolLabel(): LendingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset Lending strategy');
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
   * Calculated as tokens_invested / xtoken_supply
   */
  exchangeRate(): Decimal {
    const tokensInvested = new Decimal(this.poolObject.tokensInvested);
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
      poolName: this.poolLabel.poolName,
      apr,
      tvl: {
        alphafi,
        parent,
      },
    };
  }

  /**
   * Calculate total value locked using current asset price
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const price = await this.context.getCoinPrice(coinType);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(new Decimal(10).pow(9));
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL based on protocol type (Bucket/Navi/Alphalend)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const price = await this.context.getCoinPrice(this.poolLabel.asset.type);
    if (protocol === 'Bucket') {
      const tokenAmount = await this.context.getBucketTvl();
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Navi') {
      const tokenAmountUsd = await this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    } else if (protocol === 'Alphalend') {
      const tokenAmount = await this.context.getAlphaLendTvl(this.poolLabel.asset.type);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Converts xTokens to underlying tokens via exchange rate
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [price, exchangeRate] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      Promise.resolve(this.exchangeRate()),
    ]);
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(9));
    return { tokenAmount: tokens, usdValue: tokens.mul(price) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): LendingPoolObject {
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
    }, 'Failed to parse Lending pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): LendingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        naviAccCap: (() => {
          const idVal = this.getNestedField(fields, 'navi_acc_cap.id');
          const ownerVal = this.getNestedField(fields, 'navi_acc_cap.owner');
          return { id: String(idVal), owner: String(ownerVal) };
        })(),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        tokensDeposited: this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse Lending investor object');
  }

  /**
   * Parse parent pool object from blockchain response
   */
  parseParentPoolObject(response: any): LendingParentPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        balance: this.getStringField(fields, 'balance'),
        decimal: this.getNumberField(fields, 'decimal'),
        id: this.getStringField(fields, 'id'),
        treasuryBalance: this.getStringField(fields, 'treasury_balance'),
      };
    }, 'Failed to parse Lending parent pool object');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): LendingReceiptObject[] {
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
        }, `Failed to parse Lending receipt object at index ${index}`);
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

  private async collectAndClaimRewards(tx: Transaction) {
    const claimableRewards = await this.getAvailableRewards(
      NAVI_CONFIG.ACCOUNT_ADDRESSES[
        this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ACCOUNT_ADDRESSES
      ],
    );
    const [navxCoin, suiCoin, vsuiCoin, deepCoin, usdcCoin, wusdcCoin] =
      await this.context.getCoinsBySymbols(['NAVX', 'SUI', 'vSUI', 'DEEP', 'USDC', 'wUSDC']);

    if (claimableRewards) {
      for (const reward of claimableRewards[this.poolLabel.asset.type]
        ? claimableRewards[this.poolLabel.asset.type]
        : []) {
        if (this.poolLabel.asset.name === 'wBTC') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, navxCoin.coinType],
              arguments: [
                tx.object(VERSIONS.ALPHA_NAVI_V2),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    'SUI',
                    this.poolLabel.asset.name,
                    'bluefin',
                  ),
                ),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          } else if (reward.rewardCoinType === deepCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, deepCoin.coinType],
              arguments: [
                tx.object(VERSIONS.ALPHA_NAVI_V2),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.DEEP),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    'SUI',
                    this.poolLabel.asset.name,
                    'bluefin',
                  ),
                ),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::collect_reward_with_two_swaps_bluefin`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, vsuiCoin.coinType],
              arguments: [
                tx.object(VERSIONS.ALPHA_NAVI_V2),
                tx.object(this.poolLabel.investorId),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    'SUI',
                    this.poolLabel.asset.name,
                    'bluefin',
                  ),
                ),
                tx.object(CLOCK_PACKAGE_ID),
              ],
            });
          }
        } else if (this.poolLabel.asset.name === 'WETH' || this.poolLabel.asset.name === 'USDT') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
              typeArguments: [
                this.poolLabel.asset.type,
                wusdcCoin.coinType,
                suiCoin.coinType,
                navxCoin.coinType,
              ],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('wUSDC', 'SUI', 'cetus'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'wUSDC',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
              typeArguments: [
                this.poolLabel.asset.type,
                wusdcCoin.coinType,
                suiCoin.coinType,
                vsuiCoin.coinType,
              ],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('wUSDC', 'SUI', 'cetus'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'wUSDC',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          }
        } else if (this.poolLabel.asset.name === 'wUSDC') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin`,
              typeArguments: [this.poolLabel.asset.type, usdcCoin.coinType, navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'USDC', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'USDC',
                    'bluefin',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin_v2`,
              typeArguments: [this.poolLabel.asset.type, usdcCoin.coinType, vsuiCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'USDC', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'USDC',
                    'bluefin',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
              ],
            });
          }
        } else if (this.poolLabel.asset.name === 'USDC') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'SUI',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_two_swaps`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, vsuiCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'SUI',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          }
        } else if (this.poolLabel.asset.name === 'USDY') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
              typeArguments: [
                this.poolLabel.asset.type,
                wusdcCoin.coinType,
                suiCoin.coinType,
                navxCoin.coinType,
              ],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('wUSDC', 'SUI', 'cetus'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'wUSDC',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_three_swaps`,
              typeArguments: [
                this.poolLabel.asset.type,
                wusdcCoin.coinType,
                suiCoin.coinType,
                vsuiCoin.coinType,
              ],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
                tx.object(await this.context.getPoolIdBySymbolsAndProtocol('vSUI', 'SUI', 'cetus')),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('wUSDC', 'SUI', 'cetus'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'wUSDC',
                    'cetus',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.CETUS),
              ],
            });
          }
        } else if (this.poolLabel.asset.name === 'vSUI') {
          if (reward.rewardCoinType === navxCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_two_swaps_bluefin`,
              typeArguments: [this.poolLabel.asset.type, suiCoin.coinType, navxCoin.coinType],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.NAVX),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol('NAVX', 'SUI', 'bluefin'),
                ),
                tx.object(
                  await this.context.getPoolIdBySymbolsAndProtocol(
                    this.poolLabel.asset.name,
                    'SUI',
                    'bluefin',
                  ),
                ),
                tx.object(GLOBAL_CONFIGS.BLUEFIN),
              ],
            });
          } else if (reward.rewardCoinType === vsuiCoin.coinType) {
            tx.moveCall({
              target: `${this.poolLabel.packageId}::alphafi_navi_investor::collect_v3_rewards_with_no_swap`,
              typeArguments: [this.poolLabel.asset.type],
              arguments: [
                tx.object(this.poolLabel.investorId),
                tx.object(VERSIONS.ALPHA_VERSIONS[1]),
                tx.object(CLOCK_PACKAGE_ID),
                tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
                tx.pure.u8(
                  Number(
                    NAVI_CONFIG.ASSET_MAP[
                      this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
                    ],
                  ),
                ),
                tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
                tx.object(NAVI_CONFIG.REWARDS_POOL.vSUI),
              ],
            });
          }
        }
      }
    }
  }

  private coinAmountToXToken(amount: string): string {
    const exchangeRate = this.exchangeRate();
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      BigInt(options.amount),
    );

    const receiptOption = this.context.blockchain.getOptionReceipt(
      tx,
      this.poolLabel.receipt.type,
      this.receiptObjects.length > 0 ? this.receiptObjects[0].id : undefined,
    );

    if (this.poolLabel.packageNumber === 3) {
      if (this.poolLabel.parentProtocol === 'Bucket') {
        tx.moveCall({
          target: `0xfd661c66a4386827528fa4fa55e3f759da69feaf507d64cae5df6a55c1c06fb4::alphafi_bucket_investor_v1::collect_and_convert_reward_to_buck`,
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(this.poolLabel.investorId),
            tx.object(BUCKET_CONFIG.PROTOCOL_ID),
            tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
            tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        tx.moveCall({
          target: `0xfd661c66a4386827528fa4fa55e3f759da69feaf507d64cae5df6a55c1c06fb4::alphafi_bucket_pool_v1::user_deposit`,
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(VERSIONS.ALPHA_VERSIONS[1]),
            receiptOption,
            tx.object(this.poolLabel.poolId),
            depositCoin,
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(BUCKET_CONFIG.PROTOCOL_ID),
            tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
            tx.object(BUCKET_CONFIG.FLASK_ID),
            tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
      } else {
        throw new Error('Deposit not supported for Navi Lending strategy - Package Number 3');
      }
    } else if (this.poolLabel.asset.name === 'wBTC') {
      await this.updateSingleTokenPrice(
        tx,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name].pythPriceInfo,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name].feedId,
      );

      await this.collectAndClaimRewards(tx);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::user_deposit_v3`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_NAVI_V2),
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(this.poolLabel.parentPoolId),
          tx.pure.u8(
            Number(
              NAVI_CONFIG.ASSET_MAP[
                this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
              ],
            ),
          ),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      await this.updateSingleTokenPrice(
        tx,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
          .pythPriceInfo,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
          .feedId,
      );

      await this.collectAndClaimRewards(tx);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_pool::user_deposit_v2`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_VERSIONS[1]),
          receiptOption,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(this.poolLabel.investorId),
          tx.object(DISTRIBUTOR_OBJECT_ID),
          tx.object(NAVI_CONFIG.PRICE_ORACLE_ID),
          tx.object(NAVI_CONFIG.NAVI_STORAGE_ID),
          tx.object(this.poolLabel.parentPoolId),
          tx.pure.u8(
            Number(
              NAVI_CONFIG.ASSET_MAP[
                this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
              ],
            ),
          ),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
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

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found');
    }

    let xtokenAmount = this.coinAmountToXToken(options.amount);
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

    if (this.poolLabel.packageNumber === 3) {
      if (this.poolLabel.parentProtocol === 'Bucket') {
        const [buckCoin] = await this.context.getCoinsBySymbols(['BUCK']);
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bucket_investor_v1::collect_and_convert_reward_to_buck`,
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(this.poolLabel.investorId),
            tx.object(BUCKET_CONFIG.PROTOCOL_ID),
            tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
            tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
            tx.object(GLOBAL_CONFIGS.BLUEFIN),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        const [buck] = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_bucket_pool_v1::user_withdraw`,
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(VERSIONS.ALPHA_VERSIONS[1]),
            tx.object(this.receiptObjects[0].id),
            noneAlphaReceipt,
            tx.object(POOLS.ALPHA_LEGACY),
            tx.object(this.poolLabel.poolId),
            tx.pure.u64(xtokenAmount),
            tx.object(this.poolLabel.investorId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
            tx.object(BUCKET_CONFIG.PROTOCOL_ID),
            tx.object(BUCKET_CONFIG.FOUNTAIN_ID),
            tx.object(BUCKET_CONFIG.FLASK_ID),
            tx.object(await this.context.getPoolIdBySymbolsAndProtocol('USDC', 'SUI', 'cetus')),
            tx.object(GLOBAL_CONFIGS.CETUS),
            tx.object(CLOCK_PACKAGE_ID),
          ],
        });
        tx.moveCall({
          target: `0x2::transfer::public_transfer`,
          typeArguments: [`0x2::coin::Coin<${buckCoin.coinType}>`],
          arguments: [buck, tx.pure.address(options.address)],
        });
      } else {
        const [withdrawnCoin, alphaCoin] = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::user_emergency_withdraw`,
          typeArguments: [this.poolLabel.asset.type],
          arguments: [
            tx.object(VERSIONS.ALPHA_VERSIONS[3]),
            tx.object(this.receiptObjects[0].id),
            tx.object(this.poolLabel.poolId),
            tx.object(this.poolLabel.parentPoolId),
            tx.object(DISTRIBUTOR_OBJECT_ID),
          ],
        });
        tx.moveCall({
          target: `0x1::option::destroy_none`,
          typeArguments: [
            '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
          ],
          arguments: [noneAlphaReceipt],
        });
        tx.transferObjects([withdrawnCoin, alphaCoin], options.address);
      }
    } else if (this.poolLabel.asset.name === 'wBTC') {
      await this.updateSingleTokenPrice(
        tx,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name].pythPriceInfo,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name].feedId,
      );

      await this.collectAndClaimRewards(tx);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_pool_v2::user_withdraw_v3`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_NAVI_V2),
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
          tx.object(this.poolLabel.parentPoolId),
          tx.pure.u8(
            Number(
              NAVI_CONFIG.ASSET_MAP[
                this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
              ],
            ),
          ),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else {
      await this.updateSingleTokenPrice(
        tx,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
          .pythPriceInfo,
        NAVI_CONFIG.PRICE_FEED[this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.PRICE_FEED]
          .feedId,
      );

      await this.collectAndClaimRewards(tx);
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_navi_pool::user_withdraw_v2`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
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
          tx.object(this.poolLabel.parentPoolId),
          tx.pure.u8(
            Number(
              NAVI_CONFIG.ASSET_MAP[
                this.poolLabel.asset.name as keyof typeof NAVI_CONFIG.ASSET_MAP
              ],
            ),
          ),
          tx.object(NAVI_CONFIG.INCENTIVE_V3_ID),
          tx.object(NAVI_CONFIG.INCENTIVE_V2_ID),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async claimRewards(tx: Transaction, alphaReceipt: TransactionResult) {
    let target, version;
    if (this.poolLabel.packageNumber === 3) {
      if (this.poolLabel.parentProtocol === 'Bucket') {
        target = `${this.poolLabel.packageId}::alphafi_bucket_pool_v1::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[3];
      } else if (this.poolLabel.parentProtocol === 'Navi') {
        target = `${this.poolLabel.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`;
        version = VERSIONS.ALPHA_VERSIONS[3];
      }
    } else if (this.poolLabel.packageNumber === 9) {
      target = `${this.poolLabel.packageId}::alphafi_navi_pool_v2::get_user_rewards_all`;
      version = VERSIONS.ALPHA_NAVI_V2;
    } else {
      this.receiptObjects.forEach((receipt) => {
        alphaReceipt = tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_navi_pool::get_user_rewards_all`,
          typeArguments: [this.poolLabel.asset.type],
          arguments: [
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
 * Lending Pool object data structure
 */
export interface LendingPoolObject {
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
 * Lending Investor object data structure
 */
export interface LendingInvestorObject {
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  naviAccCap: {
    id: string;
    owner: string;
  };
  performanceFee: string;
  tokensDeposited: string;
}

/**
 * Lending Parent Pool object data structure
 */
export interface LendingParentPoolObject {
  balance: string;
  decimal: number;
  id: string;
  treasuryBalance: string;
}

/**
 * Lending Receipt object data structure
 */
export interface LendingReceiptObject {
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
 * Lending Pool Label configuration
 */
export interface LendingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'Lending';
  parentProtocol: ProtocolType;
  parentPoolId: string;
  investorId: string;
  receipt: StringMap;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
