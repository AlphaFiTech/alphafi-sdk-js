/**
 * SingleAssetLooping Strategy
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { AlphalendClient } from '@alphafi/alphalend-sdk';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  DISTRIBUTOR_OBJECT_ID,
  GLOBAL_CONFIGS,
  POOLS,
  VERSIONS,
} from '../utils/constants.js';

/**
 * SingleAssetLooping Strategy for leveraged positions on single assets
 */
export class SingleAssetLoopingStrategy extends BaseStrategy<
  SingleAssetLoopingPoolObject,
  SingleAssetLoopingInvestorObject,
  never, // SingleAssetLooping doesn't have parent pool objects
  SingleAssetLoopingReceiptObject
> {
  private poolLabel: SingleAssetLoopingPoolLabel;
  private poolObject: SingleAssetLoopingPoolObject;
  private investorObject: SingleAssetLoopingInvestorObject;
  private receiptObjects: SingleAssetLoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: SingleAssetLoopingPoolLabel,
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

  getPoolLabel(): SingleAssetLoopingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset SingleAssetLooping strategy');
  }

  updateReceipts(receipts: any[]) {
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
   * Adjusted for current debt-to-supply ratio in leveraged single-asset position
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
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const decimals = await this.context.getCoinDecimals(coinType);
    const price = await this.context.getCoinPrice(coinType);
    const currentDebtToSupplyRatio = new Decimal(this.investorObject.currentDebtToSupplyRatio);
    const scaling = new Decimal(10).pow(20);
    const adjustedTokensInvested = new Decimal(this.poolObject.tokensInvested).mul(
      new Decimal(1).minus(currentDebtToSupplyRatio.div(scaling)),
    );

    const tokenAmount = adjustedTokensInvested.div(new Decimal(10).pow(decimals));
    const usdValue = tokenAmount.mul(price);

    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL based on protocol type (Alphalend/Navi)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    const coinType = this.poolLabel.asset.type;
    const price = await this.context.getCoinPrice(coinType);
    if (protocol === 'Alphalend') {
      const tokenAmount = await this.context.getAlphaLendTvl(coinType);
      return { tokenAmount, usdValue: tokenAmount.mul(price) };
    } else if (protocol === 'Navi') {
      const tokenAmountUsd = await this.context.getNaviTvlByPoolId(this.poolLabel.poolId);
      return { tokenAmount: tokenAmountUsd.div(price), usdValue: tokenAmountUsd };
    }
    throw new Error(`Unsupported parent protocol: ${protocol}`);
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Includes leverage adjustment for single-asset position
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokenBalance === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }

    const xTokens = new Decimal(this.receiptObjects[0].xTokenBalance);
    const [exchangeRate, tokenDecimals, tokenPrice] = await Promise.all([
      Promise.resolve(this.exchangeRate()),
      this.context.getCoinDecimals(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    const tokens = xTokens.mul(exchangeRate);
    const amount = tokens.div(new Decimal(10).pow(tokenDecimals));
    return { tokenAmount: amount, usdValue: amount.mul(tokenPrice) };
  }

  private coinAmountToXToken(amount: string): string {
    const exchangeRate = this.exchangeRate();
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SingleAssetLoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        depositFee: this.getStringField(fields, 'deposit_fee'),
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap'),
        id: this.getStringField(fields, 'id'),
        imageUrl: this.getStringField(fields, 'image_url'),
        investorId: this.getStringField(fields, 'investor_id'),
        maxSupply: this.getStringField(fields, 'max_supply'),
        name: this.getStringField(fields, 'name'),
        paused: this.getBooleanField(fields, 'paused', false),
        rewards: (() => {
          // Parse rewards PoolRewardsInfo { id, size }
          const rewardsId = this.getNestedField(fields, 'rewards.id');
          const rewardsSize = this.getNestedField(fields, 'rewards.size');
          return { id: String(rewardsId), size: String(rewardsSize) };
        })(),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap'),
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
      };
    }, 'Failed to parse SingleAssetLooping pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): SingleAssetLoopingInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        assetLtv: this.getStringField(fields, 'asset_ltv'),
        curDebt: this.getStringField(fields, 'cur_debt'),
        currentDebtToSupplyRatio: this.getStringField(fields, 'current_debt_to_supply_ratio'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        id: this.getStringField(fields, 'id'),
        marketId: this.getStringField(fields, 'market_id'),
        maxCapPerformanceFee: this.getStringField(fields, 'max_cap_performance_fee'),
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        positionCap: {
          clientAddress: this.getNestedField(fields, 'position_cap.client_address'),
          id: this.getNestedField(fields, 'position_cap.id'),
          imageUrl: this.getNestedField(fields, 'position_cap.image_url'),
          positionId: this.getNestedField(fields, 'position_cap.position_id'),
        },
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        tokensDeposited: this.getStringField(fields, 'tokensDeposited'),
      };
    }, 'Failed to parse SingleAssetLooping investor object');
  }

  /**
   * Parse parent pool object (not applicable for SingleAssetLooping)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('SingleAssetLooping strategy does not have parent pool objects');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SingleAssetLoopingReceiptObject[] {
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
            xTokenBalance:
              this.getStringField(fields, 'xtoken_balance') ||
              this.getStringField(fields, 'xTokenBalance'),
          };
        }, `Failed to parse SingleAssetLooping receipt object at index ${index}`);
      })
      .filter((receipt) => receipt.poolId === this.poolLabel.poolId);
  }

  private async collectAndSwapRewards(tx: Transaction) {
    const [
      alphaCoin,
      stsuiCoin,
      suiCoin,
      blueCoin,
      deepCoin,
      usdcCoin,
      walCoin,
      tbtcCoin,
      suibtcCoin,
      xaumCoin,
    ] = await this.context.getCoinsBySymbols([
      'ALPHA',
      'stSUI',
      'SUI',
      'BLUE',
      'DEEP',
      'USDC',
      'WAL',
      'tBTC',
      'wBTC',
      'XAUm',
    ]);

    if (this.poolLabel.asset.name === 'tBTC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, alphaCoin.coinType, stsuiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'stSUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, stsuiCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, blueCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, suiCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [tbtcCoin.coinType, tbtcCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('tBTC', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.name === 'wBTC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [suibtcCoin.coinType, alphaCoin.coinType, stsuiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'stSUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(false),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [suibtcCoin.coinType, blueCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [suibtcCoin.coinType, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [suibtcCoin.coinType, suiCoin.coinType, suibtcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'wBTC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.name === 'XAUm') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [xaumCoin.coinType, alphaCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('ALPHA', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [xaumCoin.coinType, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [xaumCoin.coinType, blueCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('BLUE', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [xaumCoin.coinType, suiCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('SUI', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_mmt`,
        typeArguments: [xaumCoin.coinType, xaumCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('XAUm', 'USDC', 'mmt')),
          tx.object(VERSIONS.MMT),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.pure.u64(10),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.name === 'WBTC') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, deepCoin.coinType, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [this.poolLabel.asset.type, this.poolLabel.asset.type, usdcCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('WBTC', 'USDC', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.name === 'DEEP') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [deepCoin.coinType, stsuiCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [deepCoin.coinType, deepCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('DEEP', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    } else if (this.poolLabel.asset.name === 'WAL') {
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [walCoin.coinType, stsuiCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('stSUI', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [walCoin.coinType, walCoin.coinType, suiCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
          tx.object(this.poolLabel.investorId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(await this.context.getPoolIdBySymbolsAndProtocol('WAL', 'SUI', 'bluefin')),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(false),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const alphalendClient = new AlphalendClient(
      this.context.blockchain.network,
      this.context.blockchain.suiClient,
    );

    // get Coin Object
    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      options.amount,
    );

    const receiptOption = this.context.blockchain.getOptionReceipt(
      tx,
      this.poolLabel.receipt.type,
      this.receiptObjects.length > 0 ? this.receiptObjects[0].id : undefined,
    );

    await alphalendClient.updatePrices(tx, [this.poolLabel.asset.type]);
    await this.collectAndSwapRewards(tx);

    tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::user_deposit`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.ALPHALEND_VERSION),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        receiptOption,
        tx.object(this.poolLabel.poolId),
        depositCoin,
        tx.object(this.poolLabel.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found');
    }
    const alphalendClient = new AlphalendClient(
      this.context.blockchain.network,
      this.context.blockchain.suiClient,
    );
    alphalendClient.updatePrices(tx, [this.poolLabel.asset.type]);

    let xTokens = this.coinAmountToXToken(options.amount);
    if (options.withdrawMax) {
      xTokens = this.receiptObjects[0].xTokenBalance;
    }

    await this.collectAndSwapRewards(tx);

    const noneAlphaReceipt = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [
        '0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt',
      ],
      arguments: [],
    });
    const [coin] = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::user_withdraw`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.ALPHALEND_VERSION),
        tx.object(VERSIONS.ALPHA_VERSIONS[1]),
        tx.object(this.receiptObjects[0].id),
        noneAlphaReceipt,
        tx.object('0x6ee8f60226edf48772f81e5986994745dae249c2605a5b12de6602ef1b05b0c1'),
        tx.object(this.poolLabel.poolId),
        tx.pure.u64(xTokens),
        tx.object(this.poolLabel.investorId),
        tx.object(DISTRIBUTOR_OBJECT_ID),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.transferObjects([coin], options.address);
  }

  async claimRewards(tx: Transaction, alphaReceipt: TransactionResult) {
    this.receiptObjects.forEach((receipt) => {
      alphaReceipt = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_alphalend_single_loop_pool::get_user_rewards_all`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHALEND_VERSION),
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

/**
 * SingleAssetLooping Pool object data structure
 */
export interface SingleAssetLoopingPoolObject {
  accRewardsPerXtoken: StringMap[];
  depositFee: string;
  depositFeeMaxCap: string;
  id: string;
  imageUrl: string;
  investorId: string;
  maxSupply: string;
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
 * SingleAssetLooping Investor object data structure
 */
export interface SingleAssetLoopingInvestorObject {
  assetLtv: string;
  curDebt: string;
  currentDebtToSupplyRatio: string;
  freeRewards: {
    id: string;
    size: string;
  };
  id: string;
  marketId: string;
  maxCapPerformanceFee: string;
  minimumSwapAmount: string;
  performanceFee: string;
  positionCap: {
    clientAddress: string;
    id: string;
    imageUrl: string;
    positionId: string;
  };
  safeBorrowPercentage: string;
  tokensDeposited: string;
}

/**
 * SingleAssetLooping Receipt object data structure
 */
export interface SingleAssetLoopingReceiptObject {
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
 * SingleAssetLooping Pool Label configuration
 */
export interface SingleAssetLoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'SingleAssetLooping';
  parentProtocol: ProtocolType;
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
