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
import {
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
  GLOBAL_CONFIGS,
  IMAGE_URLS,
  SLUSH_LOOP_POSITION_CAP_TYPE,
  STSUI,
  SUI_SYSTEM_STATE,
  VERSIONS,
} from '../utils/constants.js';

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
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(
      new Decimal(10).pow(decimals),
    );
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
    const tokens = xTokens.mul(exchangeRate).div(new Decimal(10).pow(decimals));
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

  /**
   * Collect rewards from the position and swap them to SUI (the borrow asset).
   *
   * Uses the rewards-loop pattern (iterate `portfolio.rewardsToClaim`) as in
   * SlushLending, but with the loop contract's move signature
   * (`collect_reward_and_swap_bluefin`, no oracle / slippage args).
   */
  private async collectAndSwapRewards(tx: Transaction) {
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
          tx.object(VERSIONS.SLUSH_LOOP),
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
    await alphalendClient.updatePrices(tx, [this.poolLabel.asset.type, suiCoin.coinType]);

    await this.collectAndSwapRewards(tx);

    // Get coin object
    const depositCoin = this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      BigInt(options.amount),
    );

    const positionCaps = await this.context.getSlushPositionCaps(
      options.address,
      SLUSH_LOOP_POSITION_CAP_TYPE,
    );
    const target = `${this.poolLabel.packageId}::alphafi_slush_stsui_sui_loop_pool::user_deposit`;

    if (positionCaps.length === 0) {
      const positionCap: TransactionResult = this.createPositionCap(tx);
      tx.moveCall({
        target,
        arguments: [
          tx.object(VERSIONS.SLUSH_LOOP),
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
          tx.object(VERSIONS.SLUSH_LOOP),
          tx.object(positionCaps[0].id),
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
    await alphalendClient.updatePrices(tx, [this.poolLabel.asset.type, suiCoin.coinType]);

    let xTokenAmount = this.coinAmountToXToken(options.amount);
    if (options.withdrawMax) {
      xTokenAmount = this.receiptObjects[0].xTokens;
    }

    await this.collectAndSwapRewards(tx);

    const positionCaps = await this.context.getSlushPositionCaps(
      options.address,
      SLUSH_LOOP_POSITION_CAP_TYPE,
    );
    const [slushCoin] = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_slush_stsui_sui_loop_pool::user_withdraw`,
      arguments: [
        tx.object(VERSIONS.SLUSH_LOOP),
        tx.object(positionCaps[0].id),
        tx.object(this.poolLabel.poolId),
        tx.pure.u64(xTokenAmount),
        tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
        tx.object(STSUI.LST_INFO),
        tx.object(SUI_SYSTEM_STATE),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });

    this.context.blockchain.sendCoinToAddressBalance(
      tx,
      this.poolLabel.asset.type,
      options.address,
      slushCoin,
    );
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
