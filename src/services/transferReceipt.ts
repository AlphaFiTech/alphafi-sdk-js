import { Transaction } from '@mysten/sui/transactions';
import { CLOCK_PACKAGE_ID, PACKAGE_IDS } from '../utils/constants.js';
import {
  CancelTransferRequestOptions,
  CreateTransferRequestOptions,
  FulfillTransferRequestOptions,
} from '../core/types.js';

const RECEIPT_MODULE = `${PACKAGE_IDS.ALPHAFI_RECEIPT}::alphafi_receipt`;

/** Initiates a receipt transfer — creates an on-chain TransferRequest and starts the cooldown. */
export function buildCreateTransferRequestTx(options: CreateTransferRequestOptions): Transaction {
  const tx = options.tx ?? new Transaction();

  tx.moveCall({
    target: `${RECEIPT_MODULE}::create_request_transfer`,
    arguments: [
      tx.object(options.receiptId),
      tx.pure.address(options.receiver),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });

  return tx;
}

/** Cancels a pending transfer request. Can be called at any stage (cooldown or confirm). */
export function buildCancelTransferRequestTx(options: CancelTransferRequestOptions): Transaction {
  const tx = options.tx ?? new Transaction();

  tx.moveCall({
    target: `${RECEIPT_MODULE}::cancel_request_transfer`,
    arguments: [tx.object(options.receiptId)],
  });

  return tx;
}

/** Confirms the transfer after the cooldown has passed, sending the receipt to the receiver. */
export function buildFulfillTransferRequestTx(options: FulfillTransferRequestOptions): Transaction {
  const tx = options.tx ?? new Transaction();

  tx.moveCall({
    target: `${RECEIPT_MODULE}::fulfill_transfer_request`,
    arguments: [tx.object(options.receiptId), tx.object(CLOCK_PACKAGE_ID)],
  });

  return tx;
}
