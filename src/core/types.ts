/**
 * Core types and configuration interfaces for the AlphaFi SDK.
 * These types define the structure for all SDK operations.
 */

import { SuiClient } from '@mysten/sui/client';
import { RouterDataV3 } from '@cetusprotocol/aggregator-sdk';

/**
 * Configuration required to initialize the AlphaFi SDK.
 */
export interface AlphaFiSDKConfig {
  /** Sui blockchain client for network operations */
  suiClient: SuiClient;
  /** Target Sui network environment */
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  /** Base URL for the AlphaFi API (defaults to 'https://api.alphafi.xyz') */
  apiBaseUrl?: string;
}

/**
 * Configuration for depositing assets into DeFi pools.
 */
export interface DepositOptions {
  /** Unique identifier of the target pool */
  poolId: string;
  /** User's wallet address */
  address: string;
  /** Amount to deposit in the asset's base units */
  amount: bigint;
  /** For LP pools: true to deposit token A, false for token B */
  isAmountA?: boolean;
}

/**
 * Configuration for estimating required amounts for LP deposits.
 * Used to calculate how much of each token is needed for balanced LP positions.
 */
export interface EstimateLpAmountsOptions {
  /** Unique identifier of the target LP pool */
  poolId: string;
  /** Amount of the input token */
  amount: string;
  /** True if amount refers to token A, false for token B */
  isAmountA: boolean;
}

/**
 * Configuration for withdrawing assets from DeFi pools.
 */
export interface WithdrawOptions {
  /** Unique identifier of the target pool */
  poolId: string;
  /** User's wallet address */
  address: string;
  /** Amount to withdraw (ignored if withdrawMax is true) */
  amount: string;
  /** For LP pools: true to specify withdrawal in terms of token A */
  isAmountA?: boolean;
  /** If true, withdraw entire position regardless of amount */
  withdrawMax: boolean;
}

/**
 * Configuration for zap deposits (single-token to LP conversion).
 * Allows depositing one token and automatically converting to balanced LP position.
 */
export interface ZapDepositOptions {
  /** Unique identifier of the target LP pool */
  poolId: string;
  /** Amount of input token in base units */
  inputCoinAmount: bigint;
  /** True if input token is token A, false for token B */
  isInputA: boolean;
  /** User's wallet address */
  address: string;
  /** Maximum acceptable slippage as decimal (e.g., 0.005 = 0.5%) */
  slippage: number;
}

/**
 * Configuration for getting zap deposit quotes.
 * Returns expected output amounts before executing the zap deposit.
 */
export interface ZapDepositQuoteOptions {
  /** Unique identifier of the target LP pool */
  poolId: string;
  /** Amount of input token in base units */
  inputCoinAmount: bigint;
  /** True if input token is token A, false for token B */
  isInputA: boolean;
}

/**
 * Configuration for claiming rewards from pools.
 */
export interface ClaimOptions {
  /** Optional pool ID (if not specified, claims from all pools) */
  poolId?: string;
  /** User's wallet address */
  address: string;
}

/**
 * Configuration for claiming airdrop rewards.
 */
export interface ClaimAirdropOptions {
  /** User's wallet address */
  address: string;
  /** Whether to transfer tokens directly to wallet */
  transferToWallet: boolean;
}

/**
 * Configuration for claiming ALPHA token withdrawals.
 */
export interface ClaimWithdrawAlphaOptions {
  /** Unique identifier of the withdrawal ticket */
  ticketId: string;
  /** User's wallet address */
  address: string;
}

/**
 * Configuration for claiming Slush token withdrawals.
 */
export interface ClaimWithdrawSlushOptions {
  /** Unique identifier of the withdrawal ticket/request */
  withdrawRequestId: string;
  /** Unique identifier of the target pool */
  poolId: string;
  /** User's wallet address */
  address: string;
}

/**
 * Configuration for getting Cetus swap quotes.
 */
export interface CetusSwapQuoteOptions {
  /** Source token type/address */
  from: string;
  /** Destination token type/address */
  target: string;
  /** Amount to swap in source token units */
  amount: string;
  /** True to fix input amount, false to fix output amount */
  byAmountIn: boolean;
}

/**
 * Configuration for executing Cetus token swaps.
 */
export interface CetusSwapOptions {
  /** Router data from getCetusSwapQuote containing swap path */
  router: RouterDataV3;
  /** Maximum acceptable slippage as decimal (e.g., 0.01 = 1%) */
  slippage: number;
}

// Re-export domain types for external consumers
export type { AlphaFiReceipt } from '../models/types.js';
