import dotenv from 'dotenv';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Blockchain, type DynamicFieldNode } from '../src/models/blockchain.js';
import type { TransferRequest } from '../src/models/types.js';
import { ALPHAFI_RECEIPT_TYPE, ALPHAFI_TRANSFER_REQUEST_KEY_TYPE } from '../src/utils/constants.js';

dotenv.config();

const USER_ADDRESS =
  process.env.USER_ADDRESS ?? '0xe136f0b6faf27ee707725f38f2aeefc51c6c31cc508222bee5cbc4f5fcf222c3';

function receiptIdFromJson(r: unknown): string | null {
  const fields = (r as Record<string, unknown>) ?? {};
  const id = fields.id;
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && typeof (id as Record<string, unknown>).id === 'string') {
    return (id as Record<string, unknown>).id as string;
  }
  return null;
}

/** Mirrors StrategyContext.parseTransferRequestField + extractDynamicFieldValueFields */
function parseTransferRequestField(node: DynamicFieldNode | null): TransferRequest | null {
  if (!node?.value) return null;

  const value = node.value;
  let valueFields: Record<string, unknown> | null = null;
  if (value.__typename === 'MoveObject') {
    const json = value.contents?.json;
    valueFields = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  } else if (value.__typename === 'MoveValue') {
    const json = value.json;
    valueFields = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  }
  if (!valueFields) return null;

  const transferRequest =
    (valueFields.fields as Record<string, unknown> | undefined) ?? valueFields;

  const objectIdField = transferRequest.id;
  const id =
    typeof objectIdField === 'string'
      ? objectIdField
      : typeof (objectIdField as Record<string, unknown> | undefined)?.id === 'string'
        ? ((objectIdField as Record<string, unknown>).id as string)
        : (node.address ?? '');
  const receiver = typeof transferRequest.receiver === 'string' ? transferRequest.receiver : '';
  const receiptId =
    typeof transferRequest.receipt_id === 'string' ? transferRequest.receipt_id : '';
  const autoAcceptTimestampRaw = transferRequest.auto_accept_timestamp;

  if (!receiver || autoAcceptTimestampRaw === undefined) return null;

  return {
    id,
    receiptId,
    autoAcceptTimestamp: Number(autoAcceptTimestampRaw),
    receiver,
  };
}

function parseTransferRequestFromJsonRpcFields(fields: unknown): TransferRequest | null {
  if (!fields || typeof fields !== 'object') return null;
  const wrapper = ((fields as Record<string, unknown>).fields ?? fields) as Record<string, unknown>;
  const inner = (wrapper.value as Record<string, unknown> | undefined)?.fields ?? wrapper.value;
  if (!inner || typeof inner !== 'object') return null;
  const transfer = inner as Record<string, unknown>;
  const receiver = typeof transfer.receiver === 'string' ? transfer.receiver : '';
  const receiptId = typeof transfer.receipt_id === 'string' ? transfer.receipt_id : '';
  const autoAcceptTimestampRaw = transfer.auto_accept_timestamp;
  if (!receiver || autoAcceptTimestampRaw === undefined) return null;
  const objectIdField = transfer.id;
  const id =
    typeof objectIdField === 'string'
      ? objectIdField
      : typeof (objectIdField as Record<string, unknown> | undefined)?.id === 'string'
        ? ((objectIdField as Record<string, unknown>).id as string)
        : typeof wrapper.id === 'string'
          ? wrapper.id
          : '';
  return {
    id,
    receiptId,
    autoAcceptTimestamp: Number(autoAcceptTimestampRaw),
    receiver,
  };
}

async function jsonRpcWrapperFields(parentId: string) {
  const client = new SuiJsonRpcClient({
    url: 'https://fullnode.mainnet.sui.io/',
    network: 'mainnet',
  });
  const fields = await client.getDynamicFields({ parentId });
  const match = fields.data.find((f) =>
    (f.name?.type ?? '').includes(ALPHAFI_TRANSFER_REQUEST_KEY_TYPE),
  );
  if (!match) return null;
  const obj = await client.getObject({
    id: match.objectId,
    options: { showContent: true },
  });
  if (!obj?.data?.content || obj.data.content.dataType !== 'moveObject') return null;
  return obj.data.content.fields;
}

async function main() {
  console.log('User:', USER_ADDRESS);
  console.log('Key fragment:', ALPHAFI_TRANSFER_REQUEST_KEY_TYPE);

  const blockchain = new Blockchain({ network: 'mainnet' });

  const receiptJsons = await blockchain.getReceipt(USER_ADDRESS, ALPHAFI_RECEIPT_TYPE);
  console.log(`AlphaFi receipts: ${receiptJsons?.length ?? 0}`);

  const receiptIds = (receiptJsons ?? []).map(receiptIdFromJson).filter((id): id is string => !!id);
  console.log('Receipt IDs:', receiptIds);

  let tested = 0;
  for (const parentId of receiptIds) {
    const node = await blockchain.getDynamicFieldByKeyType(
      parentId,
      ALPHAFI_TRANSFER_REQUEST_KEY_TYPE,
    );
    if (!node) {
      console.log(`\n[${parentId}] no TransferRequest dynamic field`);
      continue;
    }

    tested++;
    console.log(`\n=== Testing receipt ${parentId} ===`);
    console.log('GraphQL node:', JSON.stringify(node, null, 2));

    const rpcFields = await jsonRpcWrapperFields(parentId);
    console.log('JSON-RPC wrapper fields:', JSON.stringify(rpcFields, null, 2));

    const gqlParsed = parseTransferRequestField(node);
    const rpcParsed = parseTransferRequestFromJsonRpcFields(rpcFields);
    console.log('GraphQL parsed TransferRequest:', JSON.stringify(gqlParsed, null, 2));
    console.log('JSON-RPC parsed TransferRequest:', JSON.stringify(rpcParsed, null, 2));

    const same = JSON.stringify(gqlParsed) === JSON.stringify(rpcParsed);
    console.log(`Parsed outputs match: ${same ? 'YES' : 'NO'}`);

    if (!same) {
      console.error('FAIL: GraphQL and JSON-RPC parsed TransferRequest differ');
      process.exit(2);
    }

    if (!gqlParsed) {
      console.error('FAIL: dynamic field exists but GraphQL parse returned null');
      process.exit(2);
    }
  }

  if (tested === 0) {
    console.log('\nNo receipts with TransferRequest dynamic field found for this user.');
    process.exit(0);
  }

  console.log(`\nDone. Tested ${tested} receipt(s) with TransferRequest dynamic fields.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
