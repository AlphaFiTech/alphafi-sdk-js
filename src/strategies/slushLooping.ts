/**
 * SlushLooping Strategy
 *
 * Slush looping strategy implemented in a separate contract
 * (`alphafi_slush_stsui_sui_loop_pool`). Unlike the other slush strategies it
 * uses its own package, version object and position-cap type, and passes an
 * extra LST info object to deposit/withdraw. Withdrawals are immediate
 * (one-shot) like SlushLending — there is no delayed withdrawal queue.
 *
 * Pool: alphalend-slush-stsui-loop
 */

import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, ProtocolType, StringMap } from './strategy.js';
import { PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { getConf as getStsuiConf, stSuiExchangeRate } from '@alphafi/stsui-sdk';
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  GLOBAL_CONFIGS,
  IMAGE_URLS,
  SLUSH_LOOP_POSITION_CAP_TYPE,
  STSUI,
  SUI_SYSTEM_STATE,
} from '../utils/constants.js';

// The original stSUI/SUI loop pool deployed on the standalone test package. Pools other than
// this one run on the main `alphalend_slush` package, whose autocompound collects stSUI rewards
// itself (no external collect/swap) and which uses a config-driven version + shared cap type.
const OLD_SLUSH_LOOP_POOL_ID = '0x1124c5e7b1fb1f3cfa02cad5934dc27785e083f2b4a49bde3cc41ba66ff9113c';

/**
 * SlushLooping Strategy for the stSUI/SUI loop pool (separate contract).
 */
export class SlushLoopingStrategy extends BaseStrategy<
  SlushLoopingPoolObject,
  never, // Investor is embedded in PoolObject
  never,
  SlushLoopingReceiptObject
> {
  private poolLabel: SlushLoopingPoolLabel;
  private poolObject: SlushLoopingPoolObject;
  private receiptObjects: SlushLoopingReceiptObject[] = [];
  private context: StrategyContext;

  constructor(poolLabel: SlushLoopingPoolLabel, poolObject: any, context: StrategyContext) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.context = context;
  }

  getPoolLabel(): SlushLoopingPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset SlushLooping strategy');
  }

  updateReceipts(receipts: any[]): void {
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Returns alpha mining data - SlushLooping pools do not support alpha mining
   */
  protected getAlphaMiningData(): AlphaMiningData {
    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: [],
      xTokenSupply: '0',
      receipt: null,
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
      return new Decimal(1);
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
      coinType: this.poolLabel.asset.type,
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
    const [price, decimals] = await Promise.all([
      this.context.getCoinPrice(coinType),
      this.context.getCoinDecimals(coinType),
    ]);
    const stsuiAmount = new Decimal(this.poolObject.tokensInvested).div(
      new Decimal(10).pow(decimals),
    );
    const tokenAmount = await this.toAssetAmount(stsuiAmount);
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  /**
   * Calculate parent protocol TVL (Alphalend only)
   */
  async getParentTvl(): Promise<SingleTvl> {
    const protocol = this.poolLabel.parentProtocol;
    if (protocol !== 'Alphalend') {
      throw new Error(`Unsupported parent protocol for SlushLooping: ${protocol}`);
    }
    const [tokenAmount, price] = await Promise.all([
      this.context.getAlphaLendTvl(this.poolLabel.asset.type),
      this.context.getCoinPrice(this.poolLabel.asset.type),
    ]);
    return { tokenAmount, usdValue: tokenAmount.mul(price) };
  }

  /**
   * Calculate user's current pool balance from xToken balance
   * Converts xTokens to underlying tokens via exchange rate
   */
  async getBalance(_userAddress: string): Promise<PoolBalance> {
    if (this.receiptObjects.length === 0 || this.receiptObjects[0].xTokens === '0') {
      return { tokenAmount: new Decimal(0), usdValue: new Decimal(0) };
    }
    const xTokens = new Decimal(this.receiptObjects[0].xTokens);
    const [price, exchangeRate, decimals] = await Promise.all([
      this.context.getCoinPrice(this.poolLabel.asset.type),
      Promise.resolve(this.exchangeRate()),
      this.context.getCoinDecimals(this.poolLabel.asset.type),
    ]);
    const stsuiTokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(decimals));
    const tokens = await this.toAssetAmount(stsuiTokens);
    return { tokenAmount: tokens, usdValue: tokens.mul(price) };
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): SlushLoopingPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply:
          this.getNestedField(fields, 'x_token_supply.value') ||
          this.getNestedField(fields, 'xTokenSupply.value'),
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        positionCount: this.getNestedField(fields, 'positions.size'),
        positionsTableId: this.getNestedField(fields, 'positions.id'),
        feeCollected: this.getStringField(fields, 'fee_collected'),
        paused: this.getBooleanField(fields, 'paused', false),
        investor: {
          id: this.getStringField(fields.investor, 'id'),
          marketId: this.getStringField(fields.investor, 'market_id'),
          borrowMarketId: this.getStringField(fields.investor, 'borrow_market_id'),
          positionCap: {
            clientAddress: this.getNestedField(
              fields,
              'investor.alphalend_position_cap.client_address',
            ),
            id: this.getNestedField(fields, 'investor.alphalend_position_cap.id'),
            imageUrl: this.getNestedField(fields, 'investor.alphalend_position_cap.image_url'),
            positionId: this.getNestedField(fields, 'investor.alphalend_position_cap.position_id'),
          },
        },
      };
    }, 'Failed to parse SlushLooping pool object');
  }

  /**
   * Parse investor object (not applicable as it is embedded in pool)
   */
  parseInvestorObject(_: any): never {
    throw new Error('Investor object embedded in pool for SlushLooping');
  }

  /**
   * Parse parent pool object (not applicable)
   */
  parseParentPoolObject(_: any): never {
    throw new Error('Parent pool object not used for SlushLooping');
  }

  /**
   * Parse receipt objects from blockchain responses
   */
  parseReceiptObjects(responses: any[]): SlushLoopingReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          positionCapId: this.getStringField(fields, 'position_cap_id'),
          poolId: this.getStringField(fields, 'pool_id'),
          coinType: this.getNestedField(fields, 'coin_type.name'),
          principal: this.getStringField(fields, 'principal'),
          xTokens:
            this.getStringField(fields, 'xtokens') ||
            this.getStringField(fields, 'x_token_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
        };
      }, `Failed to parse SlushLooping receipt object at index ${index}`);
    });
  }

  createPositionCap(tx: Transaction): TransactionResult {
    const urlBytes = Array.from(new TextEncoder().encode(IMAGE_URLS.SLUSH_POSITION_CAP));
    const positionCap = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphalend_slush_pool::create_position_cap`,
      arguments: [tx.pure.vector('u8', urlBytes)],
    });

    return positionCap;
  }

  private coinAmountToXToken(amount: string): string {
    const exchangeRate = this.exchangeRate();
    return new Decimal(amount).div(exchangeRate).floor().toString();
  }

  /** Whether this pool is the legacy test-package deployment. */
  private get isOldPool(): boolean {
    return this.poolLabel.poolId === OLD_SLUSH_LOOP_POOL_ID;
  }

  /**
   * Contract balances are always in stSUI. A SUI-asset pool reports SUI amounts (converted via
   * the stSUI exchange rate); a stSUI-asset pool reports stSUI amounts directly.
   */
  private get isSuiAsset(): boolean {
    return normalizeStructTag(this.poolLabel.asset.type) === normalizeStructTag('0x2::sui::SUI');
  }

  /** stSUI amount -> display amount: scale by the stSUI exchange rate only for a SUI-asset pool. */
  private async toAssetAmount(stsuiAmount: Decimal): Promise<Decimal> {
    if (!this.isSuiAsset) {
      return stsuiAmount;
    }
    const rate = new Decimal(await stSuiExchangeRate(getStsuiConf().LST_INFO, false));
    return stsuiAmount.mul(rate);
  }

  /**
   * Resolve this pool's position cap id. The legacy pool has its own cap type; new pools share
   * the main package cap type with the other slush strategies.
   */
  private async getPositionCapId(address: string): Promise<string | undefined> {
    const caps = this.isOldPool
      ? await this.context.getSlushPositionCaps(address, SLUSH_LOOP_POSITION_CAP_TYPE)
      : await this.context.getSlushPositionCaps(address);
    return caps[0]?.id;
  }

  /**
   * Collect rewards from the position and swap them to SUI (the borrow asset).
   *
   * Uses the rewards-loop pattern (iterate `portfolio.rewardsToClaim`) as in
   * SlushLending, but with the loop contract's move signature
   * (`collect_reward_and_swap_bluefin`, no oracle / slippage args).
   */
  private async collectAndSwapRewards(tx: Transaction) {
    // New pools collect stSUI rewards inside the contract's autocompound, so nothing to do here.
    // Only the legacy pool needs external reward collection + swap.
    if (!this.isOldPool) {
      return;
    }
    const positionId = this.poolObject.investor.positionCap.positionId;
    const alphalendClient = this.context.alphalendClient;

    const portfolio = await alphalendClient.getUserPortfolioFromPosition(positionId);
    const rewards = portfolio?.rewardsToClaim;

    if (!rewards || rewards.length === 0) {
      console.log('no rewards for pool id: ', this.poolLabel.poolId);
      return;
    }

    const [suiCoin] = await this.context.getCoinsBySymbols(['SUI']);

    for (const reward of rewards) {
      if (reward.coinType === suiCoin.coinType) {
        continue;
      }
      alphalendClient.updatePrices(tx, [reward.coinType, suiCoin.coinType]);
      // reward -> SUI
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_slush_stsui_sui_loop_pool::collect_reward_and_swap_bluefin`,
        typeArguments: [reward.coinType, suiCoin.coinType],
        arguments: [
          tx.object(this.poolLabel.versionId),
          tx.object(this.poolLabel.poolId),
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(
            await this.context.getPoolIdByTypesAndProtocol(
              reward.coinType,
              suiCoin.coinType,
              'bluefin',
            ),
          ),
          tx.object(GLOBAL_CONFIGS.BLUEFIN),
          tx.pure.bool(true),
          tx.pure.bool(true),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const alphalendClient = this.context.alphalendClient;
    const [suiCoin] = await this.context.getCoinsBySymbols(['SUI']);
    const stsuiType = getStsuiConf().STSUI_COIN_TYPE;
    await alphalendClient.updatePrices(tx, [stsuiType, suiCoin.coinType]);

    await this.collectAndSwapRewards(tx);

    // The contract only takes stSUI. Default to the pool's asset type when no coinType is given:
    // SUI -> mint to stSUI; stSUI -> deposit directly; anything else is unsupported.
    const effectiveCoinType = options.coinType ?? this.poolLabel.asset.type;
    let depositCoin: any;
    if (normalizeStructTag(effectiveCoinType) === normalizeStructTag(suiCoin.coinType)) {
      const suiDepositCoin = this.context.blockchain.getCoinObject(
        tx,
        suiCoin.coinType,
        options.address,
        BigInt(options.amount),
      );
      [depositCoin] = tx.moveCall({
        target: getStsuiConf().STSUI_LATEST_PACKAGE_ID + '::liquid_staking::mint',
        arguments: [
          tx.object(getStsuiConf().LST_INFO),
          tx.object(getStsuiConf().SUI_SYSTEM_STATE_OBJECT_ID),
          suiDepositCoin,
        ],
        typeArguments: [stsuiType],
      });
    } else if (normalizeStructTag(effectiveCoinType) === normalizeStructTag(stsuiType)) {
      depositCoin = this.context.blockchain.getCoinObject(
        tx,
        stsuiType,
        options.address,
        BigInt(options.amount),
      );
    } else {
      throw new Error(`Unsupported coin type for SlushLooping deposit: ${effectiveCoinType}`);
    }

    const existingCapId = await this.getPositionCapId(options.address);
    const target = `${this.poolLabel.packageId}::alphafi_slush_stsui_sui_loop_pool::user_deposit`;

    if (!existingCapId) {
      const positionCap: TransactionResult = this.createPositionCap(tx);
      tx.moveCall({
        target,
        arguments: [
          tx.object(this.poolLabel.versionId),
          positionCap,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
      tx.transferObjects([positionCap], options.address);
    } else {
      tx.moveCall({
        target,
        arguments: [
          tx.object(this.poolLabel.versionId),
          tx.object(existingCapId),
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
          tx.object(STSUI.LST_INFO),
          tx.object(SUI_SYSTEM_STATE),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    if (this.receiptObjects.length === 0) {
      throw new Error('No receipt found for withdraw');
    }

    const alphalendClient = this.context.alphalendClient;
    const [suiCoin] = await this.context.getCoinsBySymbols(['SUI']);
    const stsuiType = getStsuiConf().STSUI_COIN_TYPE;
    await alphalendClient.updatePrices(tx, [stsuiType, suiCoin.coinType]);

    let xTokenAmount = this.coinAmountToXToken(options.amount);
    if (options.withdrawMax) {
      xTokenAmount = this.receiptObjects[0].xTokens;
    }

    await this.collectAndSwapRewards(tx);

    const capId = await this.getPositionCapId(options.address);
    if (!capId) {
      throw new Error('No position cap found for withdraw');
    }
    const [slushCoin] = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_slush_stsui_sui_loop_pool::user_withdraw`,
      arguments: [
        tx.object(this.poolLabel.versionId),
        tx.object(capId),
        tx.object(this.poolLabel.poolId),
        tx.pure.u64(xTokenAmount),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    // The contract always returns stSUI. Default to the pool's asset type when no coinType is
    // given: SUI -> redeem to SUI; stSUI -> return directly; anything else is unsupported.
    const effectiveCoinType = options.coinType ?? this.poolLabel.asset.type;
    if (normalizeStructTag(effectiveCoinType) === normalizeStructTag(suiCoin.coinType)) {
      const [sui] = tx.moveCall({
        target: getStsuiConf().STSUI_LATEST_PACKAGE_ID + '::liquid_staking::redeem',
        arguments: [
          tx.object(getStsuiConf().LST_INFO),
          slushCoin,
          tx.object(getStsuiConf().SUI_SYSTEM_STATE_OBJECT_ID),
        ],
        typeArguments: [stsuiType],
      });
      this.context.blockchain.sendCoinToAddressBalance(tx, suiCoin.coinType, options.address, sui);
    } else if (normalizeStructTag(effectiveCoinType) === normalizeStructTag(stsuiType)) {
      this.context.blockchain.sendCoinToAddressBalance(tx, stsuiType, options.address, slushCoin);
    } else {
      throw new Error(`Unsupported coin type for SlushLooping withdraw: ${effectiveCoinType}`);
    }
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

/**
 * SlushLooping Pool object data structure
 */
export interface SlushLoopingPoolObject {
  id: string;
  xTokenSupply: string;
  tokensInvested: string;
  positionCount: string;
  positionsTableId: string;
  feeCollected: string;
  paused: boolean;
  investor: {
    id: string;
    marketId: string;
    borrowMarketId: string;
    positionCap: {
      clientAddress: string;
      id: string;
      imageUrl: string;
      positionId: string;
    };
  };
}

/**
 * SlushLooping Receipt object data structure
 */
export interface SlushLoopingReceiptObject {
  id: string;
  positionCapId: string;
  poolId: string;
  coinType: string;
  principal: string;
  xTokens: string;
}

/**
 * SlushLooping Pool Label configuration
 */
export interface SlushLoopingPoolLabel {
  poolId: string;
  packageId: string;
  packageNumber: number;
  versionId: string;
  strategyType: 'SlushLooping';
  parentProtocol: ProtocolType;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
