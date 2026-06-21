# Souq Pi - Dynamic Network Support

## Overview
Souq Pi is a fully functional marketplace that supports **both Testnet and Mainnet** dynamically through environment variables. No code changes required to switch networks.

## Features
- **Dynamic Network Support**: Switch between testnet and mainnet via `PI_NETWORK` env var
- **Automatic Retry Mechanism**: Refunds retry up to 2 times before manual fallback
- **Production Security**: Security headers (without COEP/COOP to prevent ERR_BLOCKED_BY_RESPONSE)
- **A2U Payments**: Full Pi payment flow with blockchain verification
- **Escrow System**: Secure balance locking and release
- **Real-time Notifications**: Order, payment, and refund notifications
- **Health Monitoring**: System health check endpoint with network info

## Verified Network Configuration (June 2026)

### Testnet (Verified)
| Setting | Value |
|---------|-------|
| API Base URL | `https://api.minepi.com` |
| Horizon URL | `https://api.testnet.minepi.com` |
| Network Passphrase | `Pi Testnet` |
| Protocol Version | 26 |

### Mainnet (Verified)
| Setting | Value |
|---------|-------|
| API Base URL | `https://api.minepi.com` |
| Horizon URL | `https://api.mainnet.minepi.com` |
| Network Passphrase | `Pi Network` |
| Protocol Version | 24 |

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Set to 'testnet' or 'mainnet'
PI_NETWORK=testnet

# Application Credentials (from Pi Developer Portal)
PI_APP_ID=your_app_id
PI_APP_SECRET=your_app_secret
PI_API_KEY=your_api_key

# Server Wallet (from Pi Wallet)
SERVER_WALLET_PUBLIC_KEY=G_...
SERVER_WALLET_SECRET_KEY=S_...

# Database
MONGODB_URI=mongodb+srv://...

# Security
JWT_SECRET=your_jwt_secret

# Refund Settings
REFUND_MAX_RETRIES=2
REFUND_RETRY_DELAY_MS=5000
```

## API Endpoints

### Payments
- `POST /api/payment` - Create payment
- `POST /api/pi/complete-payment` - Complete payment
- `GET /api/payment` - Get payment status

### Refunds
- `POST /api/refund` - Process refund (with auto-retry)
- `GET /api/refund` - Get refund status
- `PUT /api/refund?refundId=...` - Retry manual refund

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product

### Orders
- `GET /api/orders/my-orders` - Get user orders

### Balance
- `GET /api/balance` - Get balance
- `POST /api/balance` - Update balance

### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings` - Get product ratings

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications` - Mark as read

### Health
- `GET /api/health` - System health check (shows current network)

### Pi Price
- `GET /api/pi/price` - Get current Pi price

## Refund Retry Mechanism

The refund system implements an automatic retry mechanism:

1. **First Attempt**: Execute blockchain refund
2. **Retry 1 (5s delay)**: If first attempt fails, retry after 5 seconds
3. **Retry 2 (10s delay)**: If second attempt fails, retry after 10 seconds
4. **Manual Fallback**: If all retries fail, status changes to `manual_refund_needed`

## Security Features

- **No COEP/COOP headers**: Prevents ERR_BLOCKED_BY_RESPONSE with third-party scripts
- JWT authentication
- Security headers (HSTS, X-Frame-Options, X-XSS-Protection)
- Input validation
- Structured logging (Winston, no console.log)

## Switching Networks

To switch from Testnet to Mainnet (or vice versa):

1. **Update environment variables in Vercel:**
   ```
   PI_NETWORK=mainnet
   PI_APP_ID=your_mainnet_app_id
   PI_APP_SECRET=your_mainnet_secret
   PI_API_KEY=your_mainnet_api_key
   SERVER_WALLET_PUBLIC_KEY=G_MAINNET_...
   SERVER_WALLET_SECRET_KEY=S_MAINNET_...
   ```

2. **Redeploy:**
   ```bash
   vercel --prod
   ```

No code changes required!

## Deployment

### Vercel
```bash
vercel --prod
```

### Local Development
```bash
npm install
npm run dev
```

## License
MIT
