/**
 * Alpha Strategy Implementation
 * Single-asset pool strategy for SUI deposits with Alpha token rewards
 * Based on alphafi-sdk-rust/src/strategies/alpha.rs
 */

import { Decimal } from 'decimal.js';
import { BaseStrategy, KeyValuePair, ProtocolType, NameType } from './strategy.js';
import { PoolData, SingleTvl } from '../models/types.js';
import { StrategyContext } from '../models/strategyContext.js';

// ===== Alpha Strategy Class =====

/**
 * AlphaVault Strategy for single-asset pools with SUI deposits and Alpha token rewards
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
  private legacyReceiptObjects: AlphaVaultLegacyReceiptObject[];
  private receiptObjects: AlphaVaultReceiptObject[];
  private context: StrategyContext;

  constructor(
    poolLabel: AlphaVaultPoolLabel,
    poolObject: any,
    investorObject: any,
    legacyReceiptObjects: any[],
    receiptObjects: any[],
    context: StrategyContext,
  ) {
    super();
    this.poolLabel = poolLabel;
    this.poolObject = this.parsePoolObject(poolObject);
    this.investorObject = this.parseInvestorObject(investorObject);
    this.context = context;
    this.legacyReceiptObjects = this.parseLegacyReceiptObjects(legacyReceiptObjects);
    this.receiptObjects = this.parseReceiptObjects(receiptObjects);
  }

  // ===== Strategy Interface Implementation =====

  /**
   * Get the exchange rate for AlphaVault strategy (xtoken to underlying token ratio)
   * Exchange rate = tokens_invested / xtoken_supply
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
   * Stubbed getData similar to Rust get_data; returns zero/empty placeholders
   */
  async getData(): Promise<PoolData> {
    const alphafi = await this.getTvl();
    return {
      poolId: this.poolLabel.poolId,
      poolName: this.poolLabel.poolName,
      apr: this.context.getAprData(this.poolLabel.poolId),
      tvl: {
        alphafi,
        parent: alphafi,
      },
    };
  }

  /**
   * Compute TVL in quote currency using coin price data.
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
   * Compute user's current AlphaVault balance.
   * Mirrors Rust's get_balance implementation with full breakdown.
   * @param userAddress - The user's wallet address
   */
  async getBalance(userAddress: string): Promise<{
    stakedAlphaAmount: Decimal;
    stakedAlphaUsdValue: Decimal;
    pendingDeposits: Decimal;
    withdrawals: {
      ticketId: string;
      alphaAmount: string;
      status: number; // 0 for pending, 1 for accepted, 2 for claimable
      withdrawalEtaTimestamp: number;
    }[];
    claimableAirdrop: Decimal;
    totalAirdropClaimed: Decimal;
  }> {
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

  // ===== Helper Functions (similar to Rust SDK alpha.rs) =====

  /**
   * Gets token decimals for the pool's asset
   */
  async getTokenDecimals(): Promise<number> {
    return this.context.getCoinDecimals(this.poolLabel.asset.type);
  }

  /**
   * Gets token price in USD for the pool's asset
   */
  async getTokenPriceUsd(): Promise<Decimal> {
    return this.context.getCoinPrice(this.poolLabel.asset.type);
  }

  /**
   * Gets pending deposits for a user.
   * Checks recently_updated_alphafi_receipts for xtokens_to_add.
   * @param userAddress - The user's wallet address
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
   * Gets withdrawals status for a user.
   * Returns an array of UserWithdrawalStatus with ticket_id, alpha_amount, status, and eta.
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
   * Gets the user's claimable airdrop amount (in SUI).
   * Calculates based on acc_rewards_per_xtoken difference and pending rewards.
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
   * Gets the user's total airdrop claimed amount (in SUI).
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
   * Gets the total airdrop distributed from the pool (in SUI).
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
      const entry = (this.poolObject.totalDistributed as unknown as KeyValuePair[]).find(
        (item) => item.key === rewardType.slice(2),
      );
      totalDistributedValue = entry?.value || '0';
    }

    const totalDistributed = new Decimal(totalDistributedValue);
    // SUI has 9 decimals
    return totalDistributed.div(new Decimal(10).pow(9));
  }

  // ===== Parsing Functions (similar to Rust SDK) =====

  /**
   * Parse VecMap<ID, PositionUpdate> to PositionUpdateEntry[]
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

      const parseTableInfo = (tableField: any, fallbackId: string): TableInfo => {
        const tf = tableField?.fields ?? tableField ?? {};
        return {
          id: this.getStringField(tf, 'id') || fallbackId,
          size: this.getStringField(tf, 'size') || '0',
        };
      };

      return {
        id: this.getStringField(fields, 'id'),
        xTokenSupply:
          this.getStringField(fields, 'x_token_supply') ||
          this.getStringField(fields, 'xtoken_supply') ||
          this.getStringField(fields, 'xTokenSupply'),
        tokensInvested:
          this.getStringField(fields, 'tokens_invested') ||
          this.getStringField(fields, 'tokensInvested'),
        unsuppliedBalance: this.getStringField(fields, 'unsupplied_balance') || '0',
        claimableBalance: this.getStringField(fields, 'claimable_balance') || '0',
        positions: parseTableInfo(fields.positions, 'positions_unknown'),
        recentlyUpdatedAlphafiReceipts: this.parsePositionUpdateVecMap(
          fields.recently_updated_alphafi_receipts || {},
        ),
        withdrawRequests: this.parseVecMap(fields.withdraw_requests || {}),
        feeCollected: this.getStringField(fields, 'fee_collected') || '0',
        lastDistributionTime: this.getStringField(fields, 'last_distribution_time') || '0',
        lastAutocompoundTime: this.getStringField(fields, 'last_autocompound_time') || '0',
        lockingPeriod: this.getStringField(fields, 'locking_period') || '0',
        timeFromLockingPeriodForUnstakingToStart:
          this.getStringField(fields, 'time_from_locking_period_for_unstaking_to_start') || '0',
        currentExchangeRate:
          (fields.current_exchange_rate?.fields?.value as string) ||
          this.getStringField(fields.current_exchange_rate, 'value') ||
          this.getStringField(fields, 'current_exchange_rate') ||
          '0',
        rewards: (() => {
          const rfields = fields.rewards?.fields ?? fields.rewards ?? {};
          return {
            id: this.getStringField(rfields?.id ?? rfields, 'id'),
            size: this.getStringField(rfields, 'size'),
          };
        })(),
        accRewardsPerXtoken: this.parseVecMap(fields.acc_rewards_per_xtoken || {}),
        totalDistributed: this.getStringField(fields, 'total_distributed') || '0',
        depositFee: this.getStringField(fields, 'deposit_fee') || '0',
        depositFeeMaxCap: this.getStringField(fields, 'deposit_fee_max_cap') || '0',
        withdrawalFee: this.getStringField(fields, 'withdrawal_fee') || '0',
        withdrawFeeMaxCap: this.getStringField(fields, 'withdraw_fee_max_cap') || '0',
        feeAddress: this.getStringField(fields, 'fee_address'),
        isDepositPaused: this.getBooleanField(fields, 'is_deposit_paused', false),
        isWithdrawPaused: this.getBooleanField(fields, 'is_withdraw_paused', false),
        alphafiPartnerCap: this.getStringField(fields, 'alphafi_partner_cap'),
        activeInvestorId: this.getStringField(fields, 'active_investor_id'),
        additionalFields: parseTableInfo(fields.additional_fields, 'additional_fields_unknown'),
      };
    }, 'Failed to parse AlphaVault pool object');
  }

  /**
   * Parse investor object from blockchain response
   */
  parseInvestorObject(response: any): AlphaVaultInvestorObject {
    return this.safeParseObject(() => {
      const fields = this.extractFields(response);

      const alphalendPositionCapFields = fields.alphalend_position_cap?.fields ?? {};
      const allowedCoinTypesArray =
        fields.allowed_coin_types_for_swap?.fields?.contents ??
        fields.allowed_coin_types_for_swap?.contents ??
        [];
      const withdrawTicketsArray =
        fields.withdraw_tickets?.fields?.contents ?? fields.withdraw_tickets?.contents ?? [];

      const parseAdditionalFields = (obj: any): TableInfo => {
        const o = obj?.fields ?? obj ?? {};
        return {
          id: this.getStringField(o?.id ?? o, 'id'),
          size: this.getStringField(o, 'size') || '0',
        };
      };

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

      const withdrawTickets = Array.isArray(withdrawTicketsArray)
        ? withdrawTicketsArray
            .map((entry: any) => {
              const ef = entry?.fields ?? entry ?? {};
              const key = this.getStringField(ef, 'key');
              const innerContents = ef.value?.fields?.contents ?? ef.value?.contents ?? [];
              const value: WithdrawalRequest[] = Array.isArray(innerContents)
                ? innerContents
                    .map((inner: any) => {
                      const inf = inner?.fields ?? inner ?? {};
                      const innerVal = parseWithdrawTicketInner(inf.value);
                      return innerVal || null;
                    })
                    .filter((v: WithdrawalRequest | null): v is WithdrawalRequest => v !== null)
                : [];
              if (!key) return null;
              return { key, value };
            })
            .filter(
              (
                v: { key: string; value: WithdrawalRequest[] } | null,
              ): v is {
                key: string;
                value: WithdrawalRequest[];
              } => v !== null,
            )
        : [];

      return {
        id: this.getStringField(fields, 'id'),
        unsuppliedBalance: this.getStringField(fields, 'unsupplied_balance'),
        claimableBalance: this.getStringField(fields, 'claimable_balance'),
        alphalendPositionCap: {
          positionId: this.getStringField(alphalendPositionCapFields, 'position_id'),
        },
        curDebt: this.getStringField(fields, 'cur_debt'),
        currentDebtToSupplyRatio:
          this.getStringField(fields?.current_debt_to_supply_ratio?.fields ?? {}, 'value') || '0',
        borrowTokenToTokenRatio:
          this.getStringField(fields?.borrow_token_to_token_ratio?.fields ?? {}, 'value') || '0',
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
          const fr = fields.free_rewards?.fields ?? fields.free_rewards ?? {};
          const id = this.getStringField(fr?.id ?? fr, 'id');
          const sizeRaw = fr.size ?? this.getStringField(fr, 'size');
          return {
            id,
            size: typeof sizeRaw === 'string' ? sizeRaw : sizeRaw ? String(sizeRaw) : '',
          };
        })(),
        withdrawReceiversAddress: this.getStringField(fields, 'withdraw_receivers_address'),
        withdrawTickets,
        totalPendingWithdrawals: this.getStringField(fields, 'total_pending_withdrawals'),
        performanceFee: this.getStringField(fields, 'performance_fee'),
        performanceFeeCap: this.getStringField(fields, 'performance_fee_cap'),
        additionalFields: parseAdditionalFields(
          fields.additional_fields?.fields ?? fields.additional_fields ?? {},
        ),
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
          lockedBalance: (() => {
            const lb = fields.locked_balance?.fields ?? fields.locked_balance ?? {};
            const idVal = lb.id?.id ?? lb.id ?? '';
            const sizeVal = lb.size ?? '';
            const headVal = lb.head ?? '';
            const tailVal = lb.tail ?? '';
            return {
              id: String(idVal),
              size: String(sizeVal),
              head: String(headVal),
              tail: String(tailVal),
            };
          })(),
          name: this.getStringField(fields, 'name'),
          owner: this.getStringField(fields, 'owner'),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          poolId: this.getStringField(fields, 'pool_id'),
          unlockedXtokens: this.getStringField(fields, 'unlocked_xtokens'),
          xTokenBalance:
            this.getStringField(fields, 'xtoken_balance') ||
            this.getStringField(fields, 'xTokenBalance'),
          type: this.getStringField(fields, 'type'),
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

        const parseTableInfo = (tableField: any, fallbackId: string): TableInfo => {
          const tf = tableField?.fields ?? tableField ?? {};
          return {
            id: this.getStringField(tf?.id ?? tf, 'id') || fallbackId,
            size: this.getStringField(tf, 'size') || '0',
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
          const f = kv?.fields ?? kv ?? {};
          const key = this.getStringField(f, 'key');
          const valFields = f.value?.fields ?? f.value ?? {};
          const value: UserWithdrawRequest = {
            id:
              this.getStringField(valFields?.id?.fields ?? valFields?.id ?? {}, 'id') ||
              this.getStringField(valFields, 'id') ||
              '',
            timeOfRequest: this.getStringField(valFields, 'time_of_request') || '0',
            timeOfAcceptance: this.getStringField(valFields, 'time_of_acceptance') || '0',
            timeOfClaim: this.getStringField(valFields, 'time_of_claim') || '0',
            timeOfUnlock: this.getStringField(valFields, 'time_of_unlock') || '0',
            status: this.getStringField(valFields, 'status') || '0',
            tokenAmount: this.getStringField(valFields, 'token_amount') || '0',
          };
          return key ? { key, value } : null;
        };

        const withdrawRequestsKV = Array.isArray(
          fields.withdraw_requests?.fields?.contents ?? fields.withdraw_requests?.contents,
        )
          ? (fields.withdraw_requests.fields?.contents ?? fields.withdraw_requests.contents)
              .map(parseWithdrawRequestKV)
              .filter(Boolean)
          : [];

        return {
          id: this.getStringField(fields, 'id'),
          alphafiReceiptId: this.getStringField(fields, 'alphafi_receipt_id'),
          poolId: this.getStringField(fields, 'pool_id'),
          coinType: this.getStringField(fields, 'coin_type'),
          xTokens: this.getStringField(fields, 'xtokens'),
          withdrawRequests: withdrawRequestsKV as {
            key: string;
            value: UserWithdrawRequest;
          }[],
          allWithdrawals: parseTableInfo(fields.all_withdrawals, 'all_withdrawals_unknown'),
          allDeposits: parseTableInfo(fields.all_deposits, 'all_deposits_unknown'),
          lastAccRewardPerXtoken: this.parseVecMap(fields.last_acc_reward_per_xtoken || {}),
          pendingRewards: this.parseVecMap(fields.pending_rewards || {}),
          totalCollectedRewards,
        };
      }, `Failed to parse AlphaVault position object at index ${index}`);
    });
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
  withdrawRequests: KeyValuePair[];
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
  accRewardsPerXtoken: KeyValuePair[];
  totalDistributed: string;
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
  lastAccRewardPerXtoken: KeyValuePair[];
  lockedBalance: {
    id: string;
    size: string;
    head: string;
    tail: string;
  };
  name: string;
  owner: string;
  pendingRewards: KeyValuePair[];
  poolId: string;
  unlockedXtokens: string;
  xTokenBalance: string;
  type: string;
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
  lastAccRewardPerXtoken: KeyValuePair[];
  pendingRewards: KeyValuePair[];
  totalCollectedRewards: KeyValuePair[];
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
  receipt: NameType;
  asset: NameType;
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
