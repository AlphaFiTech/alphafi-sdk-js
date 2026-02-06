import { Decimal } from 'decimal.js';
import { AlphaMiningData, BaseStrategy, StringMap, ProtocolType } from './strategy.js';
import { AlphaFiReceipt, PoolBalance, PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';
import { DepositOptions, WithdrawOptions } from '../core/types.js';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES,
  CLOCK_PACKAGE_ID,
  PACKAGE_IDS,
  POOLS,
  VERSIONS,
} from '../utils/constants.js';
import { AlphalendClient, getConstants, getUserPositionCapId } from '@alphafi/alphalend-sdk';

/**
 * AlphaVault Strategy
 */
export class AlphaVaultStrategy extends BaseStrategy<
  AlphaVaultPoolObject,
  AlphaVaultInvestorObject,
  never, // AlphaVault doesn't have parent pool objects
  AlphaVaultReceiptObject
> {
  private poolLabel: AlphaVaultPoolLabel;
  private poolObject: AlphaVaultPoolObject;
  private investorObject: AlphaVaultInvestorObject;
  private legacyReceiptObjects: AlphaVaultLegacyReceiptObject[] = [];
  private receiptObjects: AlphaVaultReceiptObject[] = [];
  private context: StrategyContext;

  constructor(
    poolLabel: AlphaVaultPoolLabel,
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

  getPoolLabel(): AlphaVaultPoolLabel {
    return this.poolLabel;
  }

  getOtherAmount(_amount: string, _isAmountA: boolean): [string, string] {
    throw new Error('getOtherAmount is not supported for single-asset AlphaVault strategy');
  }

  updateReceipts(legacyReceipts: any[], receipts: any[]): void {
    this.legacyReceiptObjects = this.parseLegacyReceiptObjects(legacyReceipts);
    this.receiptObjects = this.parseReceiptObjects(receipts);
  }

  /**
   * Get data needed for alpha mining rewards calculation.
   * Uses positions (receiptObjects) or legacy receipts if available.
   */
  protected getAlphaMiningData(): AlphaMiningData {
    // Get receipt data from positions or legacy receipts
    const position = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;
    const legacyReceipt =
      this.legacyReceiptObjects.length > 0 ? this.legacyReceiptObjects[0] : null;

    let receiptData = null;
    if (position) {
      receiptData = {
        lastAccRewardPerXtoken: position.lastAccRewardPerXtoken,
        pendingRewards: position.pendingRewards,
        xTokenBalance: position.xTokens,
      };
    } else if (legacyReceipt) {
      receiptData = {
        lastAccRewardPerXtoken: legacyReceipt.lastAccRewardPerXtoken,
        pendingRewards: legacyReceipt.pendingRewards,
        xTokenBalance: legacyReceipt.xTokenBalance,
      };
    }

    return {
      poolId: this.poolLabel.poolId,
      accRewardsPerXtoken: this.poolObject.accRewardsPerXtoken,
      xTokenSupply: this.poolObject.xTokenSupply,
      receipt: receiptData,
    };
  }

  /**
   * Calculate exchange rate: tokens_invested / xtoken_supply
   * Returns 1 if no tokens are supplied.
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
   * Get pool summary data including APR and TVL
   */
  async getData(): Promise<PoolData> {
    const [alphafi, apr] = await Promise.all([
      this.getTvl(),
      this.context.getAprData(this.poolLabel.poolId),
    ]);
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr,
      tvl: {
        alphafi,
        parent: alphafi,
      },
    };
  }

  /**
   * Calculate TVL in USD using token amount and price
   */
  async getTvl(): Promise<SingleTvl> {
    const coinType = this.poolLabel.asset.type;
    const decimals = await this.context.getCoinDecimals(coinType);
    const price = await this.context.getCoinPrice(coinType);
    const tokenAmount = new Decimal(this.poolObject.tokensInvested).div(
      new Decimal(10).pow(decimals),
    );
    const usdValue = tokenAmount.mul(price);
    return { tokenAmount, usdValue };
  }

  async getParentTvl(): Promise<SingleTvl> {
    throw new Error('AlphaVault strategy does not have a parent pool');
  }

  /**
   * Get user's balance including staked amount, pending deposits, withdrawals, and claimable airdrop
   * @param userAddress - User's wallet address
   */
  async getBalance(userAddress: string): Promise<PoolBalance> {
    // Get all required data concurrently
    const [tokenDecimals, tokenPrice, pendingDepositsOption, withdrawalData, claimableAirdrop] =
      await Promise.all([
        this.getTokenDecimals(),
        this.getTokenPriceUsd(),
        this.getPendingDeposits(userAddress),
        this.getWithdrawals(),
        this.getUserClaimableAirdropAmount(),
      ]);

    const totalAirdropClaimed = this.getUserTotalAirdropClaimed();
    const position = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;

    // If no receipts and no position, return zeros
    if (this.legacyReceiptObjects.length === 0 && !position) {
      return {
        stakedAlphaAmount: new Decimal(0),
        stakedAlphaUsdValue: new Decimal(0),
        pendingDeposits: new Decimal(0),
        withdrawals: [],
        claimableAirdrop: new Decimal(0),
        totalAirdropClaimed: new Decimal(0),
      };
    }

    // Get staked xtokens from position if available, otherwise from receipts
    let stakedXtokens: Decimal;
    if (position) {
      stakedXtokens = new Decimal(position.xTokens || '0');
    } else {
      stakedXtokens = new Decimal(this.legacyReceiptObjects[0]?.xTokenBalance || '0');
    }

    const exchangeRate = this.exchangeRate();

    // Calculate staked alpha amount
    let stakedAlphaAmount = stakedXtokens.mul(exchangeRate).div(new Decimal(10).pow(tokenDecimals));

    // Add pending deposits
    const pendingDeposits = pendingDepositsOption || new Decimal(0);
    stakedAlphaAmount = stakedAlphaAmount.add(pendingDeposits);

    // Subtract pending withdrawals (status == 0)
    for (const withdrawal of withdrawalData) {
      if (withdrawal.status === 0) {
        stakedAlphaAmount = stakedAlphaAmount.sub(new Decimal(withdrawal.alphaAmount || '0'));
      }
    }

    return {
      stakedAlphaAmount,
      stakedAlphaUsdValue: stakedAlphaAmount.mul(tokenPrice),
      pendingDeposits,
      withdrawals: withdrawalData,
      claimableAirdrop,
      totalAirdropClaimed,
    };
  }

  /**
   * Get token decimals for the pool's asset
   */
  async getTokenDecimals(): Promise<number> {
    return this.context.getCoinDecimals(this.poolLabel.asset.type);
  }

  /**
   * Get token price in USD for the pool's asset
   */
  async getTokenPriceUsd(): Promise<Decimal> {
    return this.context.getCoinPrice(this.poolLabel.asset.type);
  }

  /**
   * Get pending deposits amount by checking recently_updated_alphafi_receipts
   * @param userAddress - User's wallet address
   */
  async getPendingDeposits(userAddress: string): Promise<Decimal> {
    const alphafiReceipts = await this.context.getAlphaFiReceipts(userAddress);
    if (alphafiReceipts.length === 0) {
      return new Decimal(0);
    }

    const receiptId = alphafiReceipts[0].id;
    const entry = this.poolObject.recentlyUpdatedAlphafiReceipts.find(
      (item) => item.key === receiptId,
    );

    if (!entry) {
      return new Decimal(0);
    }

    // Parse the xtokensToAdd from the entry value
    const xtokensToAdd = entry.value.xtokensToAdd;
    if (xtokensToAdd === '0' || !xtokensToAdd) {
      return new Decimal(0);
    }

    const [exchangeRate, decimals] = await Promise.all([
      Promise.resolve(this.exchangeRate()),
      this.getTokenDecimals(),
    ]);

    const result = new Decimal(xtokensToAdd).mul(exchangeRate).div(new Decimal(10).pow(decimals));

    return result;
  }

  /**
   * Get all withdrawal requests with status and ETA timestamps
   * Status: 0 = pending, 1 = accepted, 2 = claimable
   */
  async getWithdrawals(): Promise<
    {
      ticketId: string;
      alphaAmount: string;
      status: number; // 0 for pending, 1 for accepted, 2 for claimable
      withdrawalEtaTimestamp: number;
    }[]
  > {
    const position = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;
    if (!position) {
      return [];
    }

    const decimals = await this.getTokenDecimals();
    const nowMs = Date.now();
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    const numDaysFromNextSunday = 7 - dayOfWeek;

    const results: {
      ticketId: string;
      alphaAmount: string;
      status: number; // 0 for pending, 1 for accepted, 2 for claimable
      withdrawalEtaTimestamp: number;
    }[] = [];

    for (const entry of position.withdrawRequests) {
      const timeOfUnlock = parseInt(entry.value.timeOfUnlock || '0', 10);
      const timeOfRequest = parseInt(entry.value.timeOfRequest || '0', 10);
      const lockingPeriod = parseInt(this.poolObject.lockingPeriod || '0', 10);

      // Determine status: 2 if claimable (time_of_unlock > 0 and passed), else use stored status
      let status: number;
      if (timeOfUnlock > 0 && nowMs >= timeOfUnlock) {
        status = 2; // claimable
      } else {
        status = parseInt(entry.value.status || '0', 10);
      }

      // Calculate ETA
      let eta: number;
      if (timeOfUnlock === 0) {
        eta = timeOfRequest + lockingPeriod + numDaysFromNextSunday * 86400000;
      } else {
        eta = timeOfUnlock;
      }

      const tokenAmount = entry.value.tokenAmount || '0';
      const alphaAmount = new Decimal(tokenAmount).div(new Decimal(10).pow(decimals)).toString();

      results.push({
        ticketId: entry.key,
        alphaAmount,
        status, // 0 = pending, 1 = accepted, 2 = claimable
        withdrawalEtaTimestamp: eta,
      });
    }

    return results;
  }

  /**
   * Calculate user's claimable SUI airdrop based on accrued rewards per xtoken and pending rewards
   */
  async getUserClaimableAirdropAmount(): Promise<Decimal> {
    const rewardType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

    const rewardDecimals = await this.context.getCoinDecimals(rewardType);

    // Get current accumulated rewards per xtoken from pool
    const curAccEntry = this.poolObject.accRewardsPerXtoken.find(
      (item) => item.key === rewardType.slice(2),
    );
    const curAcc = new Decimal(curAccEntry?.value || '0');

    // Get user's position
    const position = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;

    // Get user's last accumulated reward per xtoken
    const userLastAccEntry = position?.lastAccRewardPerXtoken.find(
      (item) => item.key === rewardType.slice(2),
    );
    const userLastAcc = new Decimal(userLastAccEntry?.value || '0');

    // Get user's xtokens
    let userXtokens: Decimal;
    if (position) {
      userXtokens = new Decimal(position.xTokens || '0');
    } else if (this.legacyReceiptObjects.length > 0) {
      userXtokens = new Decimal(this.legacyReceiptObjects[0].xTokenBalance || '0');
    } else {
      userXtokens = new Decimal(0);
    }

    // Get pending rewards
    const pendingRewardsEntry = position?.pendingRewards.find(
      (item) => item.key === rewardType.slice(2),
    );
    const pendingRewards = new Decimal(pendingRewardsEntry?.value || '0');

    // Calculate: (((curAcc - userLastAcc) / 1e18) * userXtokens + pendingRewards) / 10^rewardDecimals
    const accDiff = curAcc.sub(userLastAcc).div(new Decimal(10).pow(18));
    const claimable = accDiff.mul(userXtokens).add(pendingRewards);
    return claimable.div(new Decimal(10).pow(rewardDecimals));
  }

  /**
   * Get user's total SUI airdrop claimed so far
   */
  getUserTotalAirdropClaimed(): Decimal {
    const rewardType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

    const position = this.receiptObjects.length > 0 ? this.receiptObjects[0] : null;
    if (!position) {
      return new Decimal(0);
    }

    const totalClaimedEntry = position.totalCollectedRewards.find(
      (item) => item.key === rewardType.slice(2),
    );
    const totalClaimed = new Decimal(totalClaimedEntry?.value || '0');

    // SUI has 9 decimals
    return totalClaimed.div(new Decimal(10).pow(9));
  }

  /**
   * Get total SUI airdrop distributed from the pool
   */
  getTotalAirdropDistributed(): Decimal {
    const rewardType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

    // totalDistributed is stored as a string, but in Rust it's VecMap<TypeName, u64>
    // If it's a single value, use it directly; otherwise search the array
    let totalDistributedValue = '0';

    if (typeof this.poolObject.totalDistributed === 'string') {
      // If it's stored as a simple string
      totalDistributedValue = this.poolObject.totalDistributed;
    } else if (Array.isArray(this.poolObject.totalDistributed)) {
      // If it's stored as an array of key-value pairs
      const entry = (this.poolObject.totalDistributed as unknown as StringMap[]).find(
        (item) => item.key === rewardType.slice(2),
      );
      totalDistributedValue = entry?.value || '0';
    }

    const totalDistributed = new Decimal(totalDistributedValue);
    // SUI has 9 decimals
    return totalDistributed.div(new Decimal(10).pow(9));
  }

  /**
   * Parse VecMap of position updates into structured entries
   */
  private parsePositionUpdateVecMap(vecMapField: any): PositionUpdateEntry[] {
    const contents = vecMapField?.fields?.contents ?? vecMapField?.contents ?? vecMapField;
    if (!Array.isArray(contents)) {
      return [];
    }

    return contents
      .map((entry: any) => {
        const ef = entry?.fields ?? entry ?? {};
        const key = this.getStringField(ef, 'key');
        const valueFields = ef.value?.fields ?? ef.value ?? {};
        return {
          key,
          value: {
            xtokensToAdd:
              this.getStringField(valueFields, 'xtokens_to_add') ||
              this.getStringField(valueFields, 'xtokensToAdd') ||
              '0',
            xtokensToRemove:
              this.getStringField(valueFields, 'xtokens_to_remove') ||
              this.getStringField(valueFields, 'xtokensToRemove') ||
              '0',
          },
        };
      })
      .filter((e: PositionUpdateEntry) => e.key);
  }

  /**
   * Parse pool object from blockchain response
   */
  parsePoolObject(response: any): AlphaVaultPoolObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply: this.getStringField(fields, 'xTokenSupply'),
        tokensInvested: this.getStringField(fields, 'tokensInvested'),
        unsuppliedBalance: this.getStringField(fields, 'unsupplied_balance'),
        claimableBalance: this.getStringField(fields, 'claimable_balance'),
        positions: (() => {
          const idVal = this.getNestedField(fields, 'positions.id');
          const sizeVal = this.getNestedField(fields, 'positions.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        recentlyUpdatedAlphafiReceipts: this.parsePositionUpdateVecMap(
          fields.recently_updated_alphafi_receipts || {},
        ),
        withdrawRequests: fields.withdraw_requests?.contents?.map((entry: any) => ({
          timestamp: entry.key,
          leftoverAmount: this.getNestedField(entry, 'value.leftover_amount'),
          totalAmountToWithdraw: this.getNestedField(entry, 'value.total_amount_to_withdraw'),
        })),
        feeCollected: this.getStringField(fields, 'fee_collected'),
        lastDistributionTime: this.getStringField(fields, 'last_distribution_time'),
        lastAutocompoundTime: this.getStringField(fields, 'last_autocompound_time'),
        lockingPeriod: this.getStringField(fields, 'locking_period'),
        timeFromLockingPeriodForUnstakingToStart: this.getStringField(
          fields,
          'time_from_locking_period_for_unstaking_to_start',
        ),
        currentExchangeRate: this.getNestedField(fields, 'current_exchange_rate.value'),
        rewards: (() => {
          const idVal = this.getNestedField(fields, 'rewards.id');
          const sizeVal = this.getNestedField(fields, 'rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken).map(
          (item) =>
            ({
              key: item.key,
              value: item.value.value,
            }) as StringMap,
        ),
        totalDistributed: this.parseVecMap(fields.total_distributed || {}),
        depositFee: this.getStringField(fields, 'deposit_fee') || '0',
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap') || '0',
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee') || '0',
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap') || '0',
        feeAddress: this.getStringField(fields, 'fee_address'),
        isDepositPaused: this.getBooleanField(fields, 'is_deposit_paused', false),
        isWithdrawPaused: this.getBooleanField(fields, 'is_withdraw_paused', false),
        alphafiPartnerCap: this.getNestedField(fields, 'alphafi_partner_cap.id'),
        activeInvestorId: this.getStringField(fields, 'active_investor_id'),
        additionalFields: (() => {
          const idVal = this.getNestedField(fields, 'additional_fields.id');
          const sizeVal = this.getNestedField(fields, 'additional_fields.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
      };
    }, 'Failed to parse AlphaVault pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): AlphaVaultInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);
      const allowedCoinTypesArray = fields.allowed_coin_types_for_swap?.contents;
      const withdrawTicketsArray = fields.withdraw_tickets?.contents;

      const parseWithdrawTicketInner = (val: any): WithdrawalRequest | null => {
        const vf = val?.fields ?? val ?? {};
        return {
          owner: this.getStringField(vf, 'owner'),
          receiver: this.getStringField(vf, 'receiver'),
          shares: this.getStringField(vf, 'shares'),
          estimatedWithdrawAmount: this.getStringField(vf, 'estimated_withdraw_amount'),
          timestamp: this.getStringField(vf, 'timestamp'),
          sequenceNumber: this.getStringField(vf, 'sequence_number'),
        };
      };

      const withdrawTickets = withdrawTicketsArray
        .map((entry: any) => {
          const key = this.getNestedField(entry, 'key.@variant');
          const innerContents = entry.value?.contents;
          const value: WithdrawalRequest[] = innerContents
            .map((inner: any) => {
              const innerVal = parseWithdrawTicketInner(inner.value);
              return innerVal;
            })
            .filter((v: WithdrawalRequest | null): v is WithdrawalRequest => v !== null);
          return { key, value };
        })
        .filter(
          (
            v: { key: string; value: WithdrawalRequest[] } | null,
          ): v is {
            key: string;
            value: WithdrawalRequest[];
          } => v !== null,
        );

      return {
        id: this.getStringField(fields, 'id'),
        unsuppliedBalance: this.getStringField(fields, 'unsupplied_balance'),
        claimableBalance: this.getStringField(fields, 'claimable_balance'),
        alphalendPositionCap: {
          positionId: this.getNestedField(fields, 'alphalend_position_cap.id'),
        },
        curDebt: this.getStringField(fields, 'cur_debt'),
        currentDebtToSupplyRatio: this.getNestedField(fields, 'current_debt_to_supply_ratio.value'),
        borrowTokenToTokenRatio: this.getNestedField(fields, 'borrow_token_to_token_ratio.value'),
        safeBorrowPercentage: this.getStringField(fields, 'safe_borrow_percentage'),
        allowedCoinTypesForSwap: Array.isArray(allowedCoinTypesArray)
          ? allowedCoinTypesArray
              .map((entry: any) => {
                const ef = entry?.fields ?? entry ?? {};
                const value = ef.value;
                if (value !== true) return null;
                const keyName = ef.key?.fields?.name ?? ef.key?.name ?? ef.key;
                return typeof keyName === 'string' ? keyName : null;
              })
              .filter((v: string | null): v is string => Boolean(v))
          : [],
        minimumSwapAmount: this.getStringField(fields, 'minimum_swap_amount'),
        primaryMarketId: this.getStringField(fields, 'primary_market_id'),
        borrowMarketId: this.getStringField(fields, 'borrow_market_id'),
        resupplyMarketId: this.getStringField(fields, 'resupply_market_id'),
        freeRewards: (() => {
          const idVal = this.getNestedField(fields, 'free_rewards.id');
          const sizeVal = this.getNestedField(fields, 'free_rewards.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
        withdrawReceiversAddress: this.getStringField(fields, 'withdraw_receivers_address'),
        withdrawTickets,
        totalPendingWithdrawals: this.getStringField(fields, 'total_pending_withdrawals'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        performanceFeeCap: this.getStringField(fields, 'performance_fee_cap'),
        additionalFields: (() => {
          const idVal = this.getNestedField(fields, 'additional_fields.id');
          const sizeVal = this.getNestedField(fields, 'additional_fields.size');
          return { id: String(idVal), size: String(sizeVal) };
        })(),
      };
    }, 'Failed to parse AlphaVault investor object');
  }

  /**
   * Parse parent pool object from blockchain response (not applicable for AlphaVault)
   */
  parseParentPoolObject(_response: any): never {
    throw new Error('AlphaVault strategy does not have parent pool objects');
  }

  /**
   * Parse legacy receipt objects from blockchain responses
   */
  parseLegacyReceiptObjects(responses: any[]): AlphaVaultLegacyReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        return {
          id: this.getStringField(fields, 'id'),
          imageUrl: this.getStringField(fields, 'image_url'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          lockedBalance: {
            id: this.getNestedField(fields, 'locked_balance.id'),
            size: this.getNestedField(fields, 'locked_balance.size'),
            head: this.getNestedField(fields, 'locked_balance.head'),
            tail: this.getNestedField(fields, 'locked_balance.tail'),
          },
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          unlockedXtokens: this.getStringField(fields, 'unlocked_xtokens'),
          xTokenBalance: this.getStringField(fields, 'xTokenBalance'),
        };
      }, `Failed to parse AlphaVault receipt object at index ${index}`);
    });
  }

  /**
   * Parse AlphaVault receipt objects
   */
  parseReceiptObjects(responses: any[]): AlphaVaultReceiptObject[] {
    return responses.map((response, index) => {
      return this.safeParseObject(() => {
        const fields = this.extractFields(response);

        const parseTableInfo = (tableField: any): TableInfo => {
          return {
            id: this.getStringField(tableField, 'id'),
            size: this.getStringField(tableField, 'size'),
          };
        };

        const totalCollectedRewards = this.parseVecMap(fields.total_collected_rewards || {});

        // Parse withdraw_requests as VecMap<ID, UserWithdrawRequest> - matches Rust's structure
        const parseWithdrawRequestKV = (
          kv: any,
        ): {
          key: string;
          value: UserWithdrawRequest;
        } | null => {
          const key = this.getStringField(kv, 'key');
          const valFields = kv.value;
          const value: UserWithdrawRequest = {
            id: this.getStringField(valFields, 'id'),
            timeOfRequest: this.getStringField(valFields, 'time_of_request'),
            timeOfAcceptance: this.getStringField(valFields, 'time_of_acceptance'),
            timeOfClaim: this.getStringField(valFields, 'time_of_claim'),
            timeOfUnlock: this.getStringField(valFields, 'time_of_unlock'),
            status: this.getStringField(valFields, 'status'),
            tokenAmount: this.getStringField(valFields, 'token_amount'),
          };
          return { key, value };
        };

        const withdrawRequestsKV = fields.withdraw_requests.contents.map(parseWithdrawRequestKV);

        return {
          id: this.getStringField(fields, 'id'),
          alphafiReceiptId: this.getStringField(fields, 'alphafi_receipt_id'),
          poolId: this.getStringField(fields, 'pool_id'),
          coinType: this.getNestedField(fields, 'coin_type.name'),
          xTokens: this.getStringField(fields, 'xtokens'),
          withdrawRequests: withdrawRequestsKV as {
            key: string;
            value: UserWithdrawRequest;
          }[],
          allWithdrawals: parseTableInfo(fields.all_withdrawals),
          allDeposits: parseTableInfo(fields.all_deposits),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken).map(
            (item) =>
              ({
                key: item.key,
                value: item.value.value,
              }) as StringMap,
          ),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          totalCollectedRewards,
        };
      }, `Failed to parse AlphaVault position object at index ${index}`);
    });
  }

  async deposit(tx: Transaction, options: DepositOptions) {
    const depositCoin = await this.context.blockchain.getCoinObject(
      tx,
      this.poolLabel.asset.type,
      options.address,
      options.amount,
    );

    const alphafiReceipts = await this.context.getAlphaFiReceipts(options.address);
    const legacyReceipt =
      this.legacyReceiptObjects.length > 0 ? this.legacyReceiptObjects[0] : null;

    if (alphafiReceipts.length === 0) {
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);

      // Convert alpha receipt to ember position if alpha receipt exists
      if (legacyReceipt) {
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
          typeArguments: [this.poolLabel.asset.type],
          arguments: [
            tx.object(VERSIONS.ALPHA_EMBER),
            tx.object(this.poolLabel.poolId),
            alphafiReceiptObj,
            tx.object(legacyReceipt.id),
            tx.object(POOLS.ALPHA_LEGACY),
          ],
        });
      }

      // Deposit to ember pool
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::user_deposit`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          alphafiReceiptObj,
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${PACKAGE_IDS.ALPHAFI_RECEIPT}::alphafi_receipt::transfer_receipt_to_new_owner`,
        arguments: [
          alphafiReceiptObj,
          tx.pure.address(options.address),
          tx.object(ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES),
        ],
      });
    } else {
      // Convert alpha receipt to ember position if needed
      if (legacyReceipt && this.receiptObjects.length === 0) {
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
          typeArguments: [this.poolLabel.asset.type],
          arguments: [
            tx.object(VERSIONS.ALPHA_EMBER),
            tx.object(this.poolLabel.poolId),
            tx.object(alphafiReceipts[0].id),
            tx.object(legacyReceipt.id),
            tx.object(POOLS.ALPHA_LEGACY),
          ],
        });
      }
      // Deposit to ember pool
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::user_deposit`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          tx.object(alphafiReceipts[0].id),
          tx.object(this.poolLabel.poolId),
          depositCoin,
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  private async getAlphaTotalShares(alphafiReceipt: AlphaFiReceipt): Promise<string> {
    const entry = alphafiReceipt.positionPoolMap.find(
      (item) => item.value.poolId === this.poolLabel.poolId,
    );
    if (!entry) {
      console.error('no position for pool id found');
      return '0';
    }
    const position = await this.context.blockchain.getObject(entry.key);
    return (position as any).data?.content.fields.xtokens.toString();
  }

  async withdraw(tx: Transaction, options: WithdrawOptions) {
    const { amount, withdrawMax, address } = options;
    const alphafiReceipts = await this.context.getAlphaFiReceipts(address);
    const legacyReceipt =
      this.legacyReceiptObjects.length > 0 ? this.legacyReceiptObjects[0] : undefined;
    if (alphafiReceipts.length === 0 && !legacyReceipt) {
      throw new Error(`No AlphaFi receipts or receit found for address ${address}`);
    }

    // Calculate xtokens based on amount or withdrawMax
    let xtokens = new Decimal(amount)
      .div(new Decimal(this.poolObject.currentExchangeRate).div(1e18))
      .ceil()
      .toNumber();
    if (withdrawMax) {
      if (alphafiReceipts.length === 0 && legacyReceipt) {
        xtokens = Number(legacyReceipt.xTokenBalance);
      } else {
        const positionUpdate = this.poolObject.recentlyUpdatedAlphafiReceipts.find(
          (item) => item.key === alphafiReceipts[0].id,
        );
        xtokens =
          Number(await this.getAlphaTotalShares(alphafiReceipts[0])) -
          (positionUpdate
            ? Number(positionUpdate.value.xtokensToRemove) -
              Number(positionUpdate.value.xtokensToAdd)
            : 0);
      }
    }

    if (alphafiReceipts.length === 0) {
      // Create new AlphaFi receipt
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);
      if (!legacyReceipt) {
        throw new Error('No alphafi receipt and no alpha receipt found');
      }

      // Convert alpha receipt to ember position
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          tx.object(this.poolLabel.poolId),
          alphafiReceiptObj,
          tx.object(legacyReceipt.id),
          tx.object(POOLS.ALPHA_LEGACY),
        ],
      });

      // Initiate withdrawal
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::user_initiate_withdraw`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          alphafiReceiptObj,
          tx.object(this.poolLabel.poolId),
          tx.pure.u64(xtokens),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });

      tx.moveCall({
        target: `${PACKAGE_IDS.ALPHAFI_RECEIPT}::alphafi_receipt::transfer_receipt_to_new_owner`,
        arguments: [
          alphafiReceiptObj,
          tx.pure.address(address),
          tx.object(ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES),
        ],
      });
    } else {
      const existingReceipt = alphafiReceipts[0];
      const isPresent = this.receiptObjects.length > 0;

      if (!isPresent && !legacyReceipt) {
        throw new Error('No position or old alpha receipt found');
      }

      // Convert alpha receipt to ember position if needed
      if (!isPresent && legacyReceipt) {
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
          typeArguments: [this.poolLabel.asset.type],
          arguments: [
            tx.object(VERSIONS.ALPHA_EMBER),
            tx.object(this.poolLabel.poolId),
            tx.object(existingReceipt.id),
            tx.object(legacyReceipt.id),
            tx.object(POOLS.ALPHA_LEGACY),
          ],
        });
      }

      // Initiate withdrawal
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::user_initiate_withdraw`,
        typeArguments: [this.poolLabel.asset.type],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          tx.object(existingReceipt.id),
          tx.object(this.poolLabel.poolId),
          tx.pure.u64(xtokens),
          tx.object(CLOCK_PACKAGE_ID),
        ],
      });
    }
  }

  async claimWithdraw(tx: Transaction, ticketId: string, address: string) {
    const alphafiReceipts = await this.context.getAlphaFiReceipts(address);

    if (alphafiReceipts.length === 0) {
      throw new Error('No Alphafi receipt found!');
    }

    const coin = tx.moveCall({
      target: `${this.poolLabel.packageId}::alphafi_ember_pool::user_claim_withdraw`,
      typeArguments: [this.poolLabel.asset.type],
      arguments: [
        tx.object(VERSIONS.ALPHA_EMBER),
        tx.object(alphafiReceipts[0].id),
        tx.object(this.poolLabel.poolId),
        tx.pure.id(ticketId),
        tx.object(CLOCK_PACKAGE_ID),
      ],
    });
    tx.transferObjects([coin], address);
  }

  async claimAirdrop(tx: Transaction, address: string, transferToWallet: boolean) {
    const alphalendClient = new AlphalendClient('mainnet', this.context.blockchain.suiClient);
    let airdropCoin;
    const [suiCoin, alphaCoin] = await this.context.getCoinsBySymbols(['SUI', 'ALPHA']);
    const airdropCoinMarketId = '1';
    const airdropCoinType = suiCoin.coinType;
    const legacyReceipt =
      this.legacyReceiptObjects.length > 0 ? this.legacyReceiptObjects[0] : undefined;
    const alphafiReceipts = await this.context.getAlphaFiReceipts(address);
    if (alphafiReceipts.length === 0) {
      // Create new AlphaFi receipt
      const alphafiReceiptObj = this.createAlphaFiReceipt(tx);

      if (!legacyReceipt) {
        throw new Error('No alphafi receipt and no alpha receipt found');
      }

      // Convert alpha receipt to ember position
      tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
        typeArguments: [alphaCoin.coinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          tx.object(this.poolLabel.poolId),
          alphafiReceiptObj,
          tx.object(legacyReceipt.id),
          tx.object(POOLS.ALPHA_LEGACY),
        ],
      });

      // Get user rewards
      airdropCoin = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::get_user_rewards`,
        typeArguments: [alphaCoin.coinType, airdropCoinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          alphafiReceiptObj,
          tx.object(this.poolLabel.poolId),
        ],
      });

      tx.moveCall({
        target: `${PACKAGE_IDS.ALPHAFI_RECEIPT}::alphafi_receipt::transfer_receipt_to_new_owner`,
        arguments: [
          alphafiReceiptObj,
          tx.pure.address(address),
          tx.object(ALPHAFI_RECEIPT_WHITELISTED_ADDRESSES),
        ],
      });
    } else {
      const existingReceipt = alphafiReceipts[0];
      const isPresent = this.receiptObjects.length > 0;

      if (!isPresent && !legacyReceipt) {
        throw new Error('No position or old alpha receipt found');
      }

      // Convert alpha receipt to ember position if needed
      if (!isPresent && legacyReceipt) {
        tx.moveCall({
          target: `${this.poolLabel.packageId}::alphafi_ember_pool::migrate_alpha_receipt_to_new_alpha_strategy`,
          typeArguments: [alphaCoin.coinType],
          arguments: [
            tx.object(VERSIONS.ALPHA_EMBER),
            tx.object(this.poolLabel.poolId),
            tx.object(existingReceipt.id),
            tx.object(legacyReceipt.id),
            tx.object(POOLS.ALPHA_LEGACY),
          ],
        });
      }

      // Get user rewards
      airdropCoin = tx.moveCall({
        target: `${this.poolLabel.packageId}::alphafi_ember_pool::get_user_rewards`,
        typeArguments: [alphaCoin.coinType, airdropCoinType],
        arguments: [
          tx.object(VERSIONS.ALPHA_EMBER),
          tx.object(existingReceipt.id),
          tx.object(this.poolLabel.poolId),
        ],
      });
    }

    if (!transferToWallet) {
      await alphalendClient.updatePrices(tx, ['0x2::sui::SUI']);
      const alphalendConstants = getConstants('mainnet');
      const userPositionCapId = await getUserPositionCapId(
        this.context.blockchain.suiClient,
        'mainnet',
        address,
      );
      if (!userPositionCapId) {
        const positionCap = alphalendClient.createPosition(tx);
        tx.moveCall({
          target: `${alphalendConstants.ALPHALEND_LATEST_PACKAGE_ID}::alpha_lending::add_collateral`,
          typeArguments: [airdropCoinType],
          arguments: [
            tx.object(alphalendConstants.LENDING_PROTOCOL_ID), // Protocol object
            positionCap, // Position capability
            tx.pure.u64(airdropCoinMarketId), // Market ID
            airdropCoin, // Coin to supply as collateral
            tx.object(alphalendConstants.SUI_CLOCK_OBJECT_ID), // Clock object
          ],
        });
        tx.transferObjects([positionCap], address);
      } else {
        const portfolio =
          await alphalendClient.getUserPortfolioFromPositionCapId(userPositionCapId);
        if (portfolio && portfolio.borrowedAmounts.has(Number(airdropCoinMarketId))) {
          airdropCoin = tx.moveCall({
            target: `${alphalendConstants.ALPHALEND_LATEST_PACKAGE_ID}::alpha_lending::repay`,
            typeArguments: [airdropCoinType],
            arguments: [
              tx.object(alphalendConstants.LENDING_PROTOCOL_ID), // Protocol object
              tx.object(userPositionCapId), // Position capability
              tx.pure.u64(airdropCoinMarketId), // Market ID
              airdropCoin, // Coin to repay with
              tx.object(alphalendConstants.SUI_CLOCK_OBJECT_ID), // Clock object
            ],
          });
          tx.transferObjects([airdropCoin], address);
        } else {
          tx.moveCall({
            target: `${alphalendConstants.ALPHALEND_LATEST_PACKAGE_ID}::alpha_lending::add_collateral`,
            typeArguments: [airdropCoinType],
            arguments: [
              tx.object(alphalendConstants.LENDING_PROTOCOL_ID), // Protocol object
              tx.object(userPositionCapId), // Position capability
              tx.pure.u64(airdropCoinMarketId), // Market ID
              airdropCoin, // Coin to supply as collateral
              tx.object(alphalendConstants.SUI_CLOCK_OBJECT_ID), // Clock object
            ],
          });
        }
      }
    } else {
      tx.transferObjects([airdropCoin], address);
    }

    return tx;
  }

  async claimRewards(_tx: Transaction, _alphaReceipt: TransactionResult) {
    return;
  }
}

// ===== Types =====

/**
 * AlphaVault Pool object data structure
 */

interface TableInfo {
  id: string;
  size: string;
}

interface PositionUpdateEntry {
  key: string; // Receipt ID
  value: {
    xtokensToAdd: string;
    xtokensToRemove: string;
  };
}

export interface AlphaVaultPoolObject {
  id: string;
  xTokenSupply: string;
  tokensInvested: string;
  unsuppliedBalance: string;
  claimableBalance: string;
  positions: TableInfo;
  recentlyUpdatedAlphafiReceipts: PositionUpdateEntry[];
  withdrawRequests: {
    timestamp: string;
    leftoverAmount: string;
    totalAmountToWithdraw: string;
  }[];
  feeCollected: string;
  lastDistributionTime: string;
  lastAutocompoundTime: string;
  lockingPeriod: string;
  timeFromLockingPeriodForUnstakingToStart: string;
  currentExchangeRate: string;
  rewards: {
    id: string;
    size: string;
  };
  accRewardsPerXtoken: StringMap[];
  totalDistributed: StringMap[];
  depositFee: string;
  depositFeeMaxCap: string;
  withdrawalFee: string;
  withdrawFeeMaxCap: string;
  feeAddress: string;
  isDepositPaused: boolean;
  isWithdrawPaused: boolean;
  alphafiPartnerCap: string;
  activeInvestorId: string;
  additionalFields: TableInfo;
}

/**
 * AlphaVault Investor object data structure
 */
interface WithdrawalRequest {
  owner: string;
  receiver: string;
  shares: string;
  estimatedWithdrawAmount: string;
  timestamp: string;
  sequenceNumber: string;
}

export interface AlphaVaultInvestorObject {
  id: string;
  unsuppliedBalance: string;
  claimableBalance: string;
  alphalendPositionCap: {
    positionId: string;
  };
  curDebt: string;
  allowedCoinTypesForSwap: string[];
  currentDebtToSupplyRatio: string;
  borrowTokenToTokenRatio: string;
  safeBorrowPercentage: string;
  minimumSwapAmount: string;
  primaryMarketId: string;
  borrowMarketId: string;
  resupplyMarketId: string;
  freeRewards: {
    id: string;
    size: string;
  };
  withdrawReceiversAddress: string;
  withdrawTickets: Array<{
    key: string;
    value: WithdrawalRequest[];
  }>;
  totalPendingWithdrawals: string;
  performanceFee: string;
  performanceFeeCap: string;
  additionalFields: TableInfo;
}

/**
 * UserWithdrawRequest - Used in AlphaVaultPositionObject's withdraw_requests
 * Matches Rust's UserWithdrawRequest struct
 */
export interface UserWithdrawRequest {
  id: string;
  timeOfRequest: string;
  timeOfAcceptance: string;
  timeOfClaim: string;
  timeOfUnlock: string;
  status: string; // 0 for requested, 1 for accepted, 2 for claimed
  tokenAmount: string;
}

/**
 * AlphaVault Legacy Receipt object data structure
 */
export interface AlphaVaultLegacyReceiptObject {
  id: string;
  imageUrl: string;
  lastAccRewardPerXtoken: StringMap[];
  lockedBalance: {
    id: string;
    size: string;
    head: string;
    tail: string;
  };
  name: string;
  owner: string;
  pendingRewards: StringMap[];
  poolId: string;
  unlockedXtokens: string;
  xTokenBalance: string;
}

/**
 * AlphaVault Receipt object data structure
 */
export interface AlphaVaultReceiptObject {
  id: string;
  alphafiReceiptId: string;
  poolId: string;
  coinType: string;
  xTokens: string;
  withdrawRequests: {
    key: string;
    value: UserWithdrawRequest;
  }[];
  allWithdrawals: TableInfo;
  allDeposits: TableInfo;
  lastAccRewardPerXtoken: StringMap[];
  pendingRewards: StringMap[];
  totalCollectedRewards: StringMap[];
}

// ===== Pool Label =====

/**
 * AlphaVault Pool Label - Configuration for AlphaVault strategy pools
 */
export interface AlphaVaultPoolLabel {
  poolId: string;
  investorId: string;
  packageId: string;
  packageNumber: number;
  strategyType: 'AlphaVault';
  parentProtocol: ProtocolType;
  receipt: StringMap;
  asset: StringMap;
  events: {
    autocompoundEventType: string;
    liquidityChangeEventType: string;
    withdrawV2EventType: string;
    afterTransactionEventType: string;
    airdropAddEventType: string;
  };
  isActive: boolean;
  poolName: string;
  isNative: boolean;
}
