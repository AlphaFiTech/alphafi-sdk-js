# AlphaFi SDK for JavaScript

This SDK provides a comprehensive set of tools to interact with the AlphaFi platform.

## Installation

```bash
npm install @alphafi/sdk
```

## Usage

```typescript
import { AlphaFiSDK } from '@alphafi/sdk';

// Initialize the SDK
const sdk = new AlphaFiSDK();

// Use SDK methods
// ...
```

## Environment Configuration

The SDK uses environment variables for configuration. Create a `.env` file in your project root with the following variables:

### Required Environment Variables

```bash
# Network Configuration
NETWORK=mainnet              # Options: mainnet, testnet, devnet

# Private Key (Base64 encoded)
PK_B64=your_base64_private_key_here

# Testing Configuration
DRY_RUN=true                 # Set to false for real transactions
VERBOSE_LOGGING=true         # Enable detailed logging
SKIP_BALANCE_CHECK=false     # Skip balance verification before transactions
```

### Optional Test Pool IDs

```bash
# Test Pool IDs for different protocols
TEST_BLUEFIN_POOL_ID=45      # Bluefin protocol pool ID
TEST_NAVI_POOL_ID=2          # Navi protocol pool ID  
TEST_CETUS_POOL_ID=3         # Cetus protocol pool ID
```

### Test Deposit Amounts

```bash
# Test amounts in smallest unit (e.g., 1000000 = 1 SUI)
TEST_DEPOSIT_AMOUNT_SUI=1000000    # 1 SUI
TEST_DEPOSIT_AMOUNT_USDC=1000000   # 1 USDC
TEST_DEPOSIT_AMOUNT_USDT=1000000   # 1 USDT
```

### Test Withdraw Configuration

```bash
# Withdraw testing parameters
TEST_WITHDRAW_XTOKENS=1000000      # Amount of xTokens to withdraw
TEST_WITHDRAW_PERCENTAGE=50        # Percentage of balance to withdraw (50%)
TEST_PARTIAL_WITHDRAW=true         # Test partial withdrawals
TEST_FULL_WITHDRAW=true            # Test full withdrawals
```

### Additional Configuration (Optional)

```bash
# API Keys
HOP_API_KEY=your_hop_api_key_here
SUIVISION_API_KEY=your_suivision_api_key_here
COIN_GECKO_API_KEY=your_coingecko_api_key_here

# AWS Configuration (for advanced features)
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1
DYNAMODB_MAX_RETRIES=3
DYNAMODB_RETRY_DELAY=100
IS_LOCAL=false

# Telegram Bot Configuration (for monitoring)
AUTOCOMPOUND_MONITOR_BOT_TOKEN=your_telegram_bot_token
AUTOCOMPOUND_MONITOR_GROUP_ID=your_telegram_group_id
LOOPING_PROFITABILITY_BOT_TOKEN=your_telegram_bot_token
LOOPING_PROFITABILITY_GROUP_ID=your_telegram_group_id
```

### Example .env File

```bash
# Basic configuration for testing
NETWORK=mainnet
PK_B64=your_base64_private_key_here
DRY_RUN=true
VERBOSE_LOGGING=true
SKIP_BALANCE_CHECK=false

# Test configuration
TEST_BLUEFIN_POOL_ID=45
TEST_NAVI_POOL_ID=2
TEST_CETUS_POOL_ID=3

# Test amounts
TEST_DEPOSIT_AMOUNT_SUI=1000000
TEST_DEPOSIT_AMOUNT_USDC=1000000
TEST_DEPOSIT_AMOUNT_USDT=1000000

# Withdraw testing
TEST_WITHDRAW_XTOKENS=1000000
TEST_WITHDRAW_PERCENTAGE=50
TEST_PARTIAL_WITHDRAW=true
TEST_FULL_WITHDRAW=true
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Run deposit tests
npm run test:deposits

# Run withdraw tests
npm run test:withdraws

# Generate documentation
npm run docs
```

### Environment Setup for Testing

1. Copy the example `.env` file above to your project root
2. Replace `your_base64_private_key_here` with your actual Base64-encoded private key
3. Adjust pool IDs and amounts as needed for your testing
4. Set `DRY_RUN=false` when ready to execute real transactions

### Private Key Setup

To get your Base64-encoded private key:

```bash
# If you have a private key in hex format
echo -n "your_hex_private_key" | base64

# Or use the Sui CLI to export your key
sui client export your_address --key-identity your_key_name
```

### Network Configuration

The SDK supports multiple networks:
- `mainnet` - Production Sui network
- `testnet` - Sui testnet for testing
- `devnet` - Development network

### Testing Different Protocols

The SDK includes test scripts for various DeFi protocols:
- **Bluefin**: Automated market maker and liquidity provision
- **Navi**: Lending and borrowing protocol
- **Cetus**: Concentrated liquidity DEX

### Project Structure

- `src/core/` - Core SDK functionality
- `src/models/` - TypeScript interfaces and types
- `src/utils/` - Utility functions and parsers
- `src/constants/` - Constants and configuration
- `src/common/` - Common utilities and maps
- `scripts/` - Test scripts and utilities

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for sensitive data like private keys
- Always test with `DRY_RUN=true` before executing real transactions
- Use testnet for development and testing

## License

ISC
