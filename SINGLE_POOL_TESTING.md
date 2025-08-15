# Single Pool Testing Guide

Test deposit and withdraw operations for any specific pool ID in the AlphaFi SDK.

## Quick Start

```bash
# Test pool ID 1 (ALPHA pool)
npm run test:single-pool 1

# Test pool ID 45 (Alphalend SUI-STSUI Loop)
npm run test:single-pool 45

# Test pool ID 53 (DEEP-SUI double asset)
npm run test:single-pool 53
```

## Available Pool Examples

| Pool ID | Pool Name | Protocol | Type |
|---------|-----------|----------|------|
| 1 | ALPHA | ALPHAFI | Single Asset |
| 2 | NAVI-DEEP | NAVI | Single Asset |
| 16 | BLUEFIN-STSUI-BUCK | BLUEFIN | Double Asset |
| 45 | ALPHALEND-LOOP-SUI-STSUI | ALPHALEND | Looping |
| 50 | BUCKET-BUCK | BUCKET | Single Asset |
| 53 | DEEP-SUI | CETUS | Double Asset |
| 58 | NAVI-SUI | NAVI | Single Asset |

## What Gets Tested

### ✅ **Deposit Operations**
- Basic deposit transaction creation
- Double asset deposits (Asset A & Asset B) for applicable pools
- Multiple deposit amounts (small, medium, large)
- Dry run mode validation

### ✅ **Withdraw Operations**
- Withdraw by xTokens amount
- Withdraw by percentage (10%, 25%, 50%, 75%, 100%)
- Different withdrawal scenarios

### ✅ **Pool Validation**
- Pool configuration validation
- Asset type verification
- Protocol-specific feature testing
- Looping pool configuration (if applicable)

### ✅ **Error Handling**
- Invalid amounts handling
- Invalid xTokens handling
- Missing pool scenarios

### ✅ **Performance Testing**
- Transaction building speed
- Operation timing validation

## Configuration

### Change Target Pool

Edit the `TARGET_POOL_ID` in `src/__tests__/singlePool.test.ts`:

```typescript
// 🎯 CONFIGURE YOUR TEST HERE
const TARGET_POOL_ID = '45'; // Change this to test any pool ID
const TEST_CONFIG = {
  poolId: TARGET_POOL_ID,
  depositAmount: '1000000', // 1 token (assuming 6 decimals)
  withdrawXTokens: '500000', // 0.5 xTokens
  withdrawPercentage: 25, // 25% withdrawal
  enableDryRun: true, // Set to false for actual network testing
  testDoubleAsset: true, // Test both isAmountA true/false for double asset pools
};
```

### Test Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `depositAmount` | Amount to deposit (smallest unit) | `'1000000'` |
| `withdrawXTokens` | xTokens to withdraw | `'500000'` |
| `withdrawPercentage` | Percentage withdrawal test | `25` |
| `enableDryRun` | Use dry run mode | `true` |
| `testDoubleAsset` | Test both assets for double asset pools | `true` |

## Usage Examples

### Test Specific Pool Types

```bash
# Test single asset pool (ALPHA)
npm run test:single-pool 1

# Test double asset pool (DEEP-SUI)  
npm run test:single-pool 53

# Test looping pool (Alphalend)
npm run test:single-pool 45

# Test NAVI protocol pool
npm run test:single-pool 58

# Test Bluefin protocol pool
npm run test:single-pool 16
```

### Run with Jest Directly

```bash
# Run the test file directly
jest src/__tests__/singlePool.test.ts --verbose

# Run with specific pool ID as environment variable
TARGET_POOL_ID=45 jest src/__tests__/singlePool.test.ts --verbose
```

## Expected Results

### ✅ **Success Scenarios**
- Transaction objects created successfully
- No TypeScript/compilation errors
- Pool configuration validation passes
- Protocol routing works correctly

### ⚠️ **Expected "Failures"** (Normal in Test Environment)
- Receipt not found errors
- Insufficient balance errors
- Network connection timeouts
- Missing coin objects

These failures are **expected** in a test environment with mocked data and don't indicate actual problems with the SDK.

## Debugging Pool Issues

### 1. **Pool Not Found**
```bash
❌ Error: Pool ID 999 not found in poolDetailsMap
```
**Solution:** Use a valid pool ID from the available pools list.

### 2. **Protocol Routing Errors**
```bash
❌ Unknown protocol: SOMEPROTOCOL
```
**Solution:** Check if the protocol has a transaction handler in `TransactionManager`.

### 3. **Asset Type Errors**
```bash
❌ No coin type found for this pool
```
**Solution:** Verify the pool's `assetTypes` configuration in `poolDetailsMap`.

### 4. **Receipt Errors**
```bash
❌ No receipt found!
```
**Solution:** This is expected in test environment - indicates receipt handling logic is working.

## Advanced Usage

### Custom Pool Testing

To test a pool not in the examples list:

1. Find the pool ID in `src/common/maps.ts` (search for `poolDetailsMap`)
2. Run: `npm run test:single-pool [YOUR_POOL_ID]`

### Network Testing

To test against actual network (not recommended for automated testing):

1. Set `enableDryRun: false` in the test configuration
2. Ensure you have valid SUI client configuration
3. Have sufficient balance in test wallet

### Protocol-Specific Testing

Each protocol has unique features tested automatically:

- **NAVI**: Looping vs single asset detection
- **ALPHALEND**: Looping configuration validation  
- **BLUEFIN/CETUS**: Double asset handling
- **BUCKET**: BUCK-specific operations

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Run `npm run lint` to check for syntax issues
2. **Jest Configuration**: Ensure `jest.config.cjs.js` is properly configured
3. **Missing Dependencies**: Run `npm install` to ensure all packages are installed
4. **Pool Configuration**: Check `poolDetailsMap` for valid pool structure

### Getting Help

- Check the test output for specific error messages
- Review the pool configuration in `src/common/maps.ts`
- Examine existing working pools for configuration patterns
- Look at protocol-specific transaction handlers in `src/models/transactionProtocolModels/`

## Contributing

When adding support for new pools:

1. Add pool configuration to `poolDetailsMap`
2. Ensure protocol transaction handler exists
3. Test with this single pool test suite
4. Add to the available pools list in the test runner