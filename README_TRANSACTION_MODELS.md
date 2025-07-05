# Transaction Protocol Models

This document describes the new transaction protocol models added to the AlphaFi SDK for JavaScript.

## Overview

The SDK now includes transaction protocol models for multiple DeFi protocols:

- **Bluefin**: DEX with concentrated liquidity pools
- **Navi**: Lending and borrowing protocol  
- **Cetus**: Automated market maker (AMM) DEX

## Usage

### Basic Setup

```typescript
import { TransactionManager, Blockchain } from '@alphafi/alphafi-sdk-js';

const address = "0x..."; // Your wallet address
const blockchain = new Blockchain(); // Initialize blockchain connection
const txManager = new TransactionManager(address, blockchain);
```

### Protocol-Specific Usage

#### Navi Protocol (Single Asset Pools)

```typescript
// Deposit to NAVI pool
const depositTx = await txManager.deposit("navi", "1000000", 2); // Pool ID 2

// Withdraw from NAVI pool  
const withdrawTx = await txManager.withdraw("navi", "500000", 2);

// Direct access to NAVI methods
const naviHandler = txManager.getProtocolHandler("navi");
const customTx = await naviHandler.depositNaviTx("1000000", 2);
```

#### Cetus Protocol (Double Asset Pools)

```typescript
// Deposit to CETUS pool
const depositTx = await txManager.deposit("cetus", "1000000", 72, { isAmountA: true });

// Withdraw from CETUS pool
const withdrawTx = await txManager.withdraw("cetus", "500000", 72);

// Direct access to CETUS methods
const cetusHandler = txManager.getProtocolHandler("cetus");
const customTx = await cetusHandler.depositCetusTx("1000000", 72, true);
```

#### Bluefin Protocol

```typescript
// Bluefin requires direct method calls due to multiple pool types
const bluefinHandler = txManager.getProtocolHandler("bluefin");

// For type 1 pools
const withdrawTx = await bluefinHandler.withdrawBluefinSuiFirstTxb("500000", 6);

// For fungible token pools
const withdrawFungibleTx = await bluefinHandler.withdrawFungible("500000", "BLUEFIN-STSUI-SUI");
```

### Utility Methods

```typescript
// Check available protocols
const protocols = txManager.getAvailableProtocols();
console.log(protocols); // ["bluefin", "navi", "cetus"]

// Check if protocol is supported
const isSupported = txManager.isProtocolSupported("navi");
console.log(isSupported); // true
```

## Pool ID Reference

Pool IDs are numeric identifiers for different pools. Refer to the `poolDetailsMap` in `common/maps.ts` for a complete mapping of pool IDs to their configurations.

Example pool IDs:
- Pool 1: ALPHA vault
- Pool 2: NAVI-DEEP  
- Pool 6: BLUEFIN-WAL-USDC
- Pool 72: CETUS-SUI

## Limitations

This is an initial implementation with some limitations:

1. **NAVI**: Currently only supports SUI deposits. Other coin types will throw an error suggesting use of the main SDK.

2. **CETUS**: Currently only supports basic SUI pair pools. Complex multi-coin deposits are not yet implemented.

3. **Bluefin**: Implementation follows the existing pattern but may need refinement for specific pool types.

## Error Handling

The transaction models include proper error handling:

```typescript
try {
  const tx = await txManager.deposit("navi", "1000000", 2);
  // Execute transaction...
} catch (error) {
  if (error.message.includes("not yet implemented")) {
    console.log("Use the main AlphaFi SDK for full functionality");
  } else {
    console.error("Transaction error:", error.message);
  }
}
```

## Future Enhancements

- Full coin type support for all protocols
- Advanced pool configurations
- Batch transaction support
- Additional protocol integrations
- Enhanced error handling and recovery

## Contributing

When adding new protocols or enhancing existing ones:

1. Create a new file in `src/models/transactionProtocolModels/`
2. Follow the established patterns for imports and class structure
3. Update the `TransactionManager` to include the new protocol
4. Add exports to `src/models/index.ts`
5. Update this documentation

## Related Files

- `src/models/transaction.ts` - Main TransactionManager
- `src/models/transactionProtocolModels/` - Protocol-specific implementations
- `src/common/maps.ts` - Pool configurations and mappings
- `src/common/constants.ts` - Protocol constants and configuration 