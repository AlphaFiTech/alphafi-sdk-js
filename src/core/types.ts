import { SuiClient } from '@mysten/sui/client';

/**
 * Configuration options for the AlphaFi SDK
 */
export interface AlphaFiSDKConfig {
  suiClient: SuiClient;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

/**
 * Options for deposit operations
 */
export interface DepositOptions {
  poolId: string;
  address: string;
  amount: bigint;
  isAmountA?: boolean; // For double asset pools
}

/**
 * Options for estimate lp amounts operations
 */
export interface EstimateLpAmountsOptions {
  poolId: string;
  amount: string;
  isAmountA: boolean;
}

/**
 * Options for withdraw operations
 */
export interface WithdrawOptions {
  poolId: string;
  address: string;
  amount: string;
  isAmountA?: boolean;
  withdrawMax: boolean;
}

/**
 * Options for zap deposit operations
 */
export interface ZapDepositOptions {
  poolId: string;
  inputCoinAmount: bigint;
  isInputA: boolean;
  address: string;
  slippage: number;
}

/**
 * Options for zap deposit quote operations
 */
export interface ZapDepositQuoteOptions {
  poolId: string;
  inputCoinAmount: bigint;
  isInputA: boolean;
  slippage: number;
}

/**
 * Options for claim operations
 */
export interface ClaimOptions {
  poolId?: string;
  address: string;
}
