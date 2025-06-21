# Paralyx Protocol API

Backend API service for Paralyx Protocol - A cross-chain LSD (Liquid Staking Derivatives) lending platform bridging Ethereum assets to Stellar.

## Overview

The Paralyx API provides comprehensive data access for the Paralyx Protocol, including:

- **User Positions**: Account balances, lending positions, and health metrics
- **Protocol Statistics**: Global protocol metrics, liquidity, and utilization rates
- **Market Data**: Available lending markets with real-time APY rates
- **Interest Rates**: Current and historical interest rate data
- **Bridge Status**: Cross-chain bridge operational status and transactions
- **Real-time Data**: Live updates with optimized caching layer

## Features

-  **High Performance**: Redis caching with background data refresh
-  **Real-time Data**: Live blockchain data from Stellar network
-  **Cross-chain**: Bridge status and transaction monitoring
-  **Analytics**: Historical data and trend analysis
-  **Robust**: Comprehensive error handling and logging
-  **Documentation**: Swagger/OpenAPI documentation
-  **Secure**: Rate limiting, input validation, and optional API keys

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- Access to Stellar Testnet/Mainnet

### Installation

```bash
# Clone the repository
git clone https://github.com/paralyx-protocol/paralyx-api
cd paralyx-api

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Edit configuration
nano .env
```

### Configuration

Update `.env` file with your settings:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Contract Addresses (from deployment)
LENDING_POOL_CONTRACT=CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP
S_TOKEN_CONTRACT=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
PRICE_ORACLE_CONTRACT=CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR

# Bridge Configuration
ETHEREUM_LOCKBOX_CONTRACT=0xcB0260dc37eb2577D1fF538690296c49823F25B8
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Redis Configuration
REDIS_URL=redis://localhost:6379
DEFAULT_CACHE_TTL=300
```

### Running the API

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and available endpoints |
| `/health` | GET | Basic health check |
| `/health/detailed` | GET | Detailed health with dependencies |
| `/docs` | GET | Swagger API documentation |

### User Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/:walletAddress` | GET | Complete user position and portfolio |
| `/api/user/:walletAddress/transactions` | GET | User transaction history |
| `/api/user/:walletAddress/balance` | GET | Account balances |
| `/api/user/:walletAddress/health` | GET | Position health metrics |

### Protocol Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/protocol/stats` | GET | Overall protocol statistics |
| `/api/protocol/overview` | GET | Comprehensive protocol overview |
| `/api/protocol/health` | GET | Protocol health metrics |
| `/api/protocol/contracts` | GET | Deployed contract information |

### Market Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/markets` | GET | Available lending markets |
| `/api/markets/:marketId` | GET | Specific market details |
| `/api/markets/:marketId/history` | GET | Market historical data |

### Interest Rates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rates` | GET | Current interest rates |
| `/api/rates/calculate` | POST | Calculate projected interest |
| `/api/rates/history` | GET | Historical rate data |
| `/api/rates/model` | GET | Interest rate model parameters |

### Bridge Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bridge/status` | GET | Cross-chain bridge status |
| `/api/bridge/transactions` | GET | Recent bridge transactions |
| `/api/bridge/fees` | GET | Bridge fee structure |
| `/api/bridge/analytics` | GET | Bridge usage analytics |

## Example Usage

### Get User Position

```javascript
// Fetch user's lending position
const response = await fetch('/api/user/GBEXAMPLE123...ABC');
const userData = await response.json();

console.log('User Position:', userData.position);
console.log('Health Factor:', userData.position.healthFactor);
```

### Get Protocol Statistics

```javascript
// Fetch global protocol metrics
const response = await fetch('/api/protocol/stats');
const stats = await response.json();

console.log('Total Value Locked:', stats.totalSupply);
console.log('Utilization Rate:', stats.utilizationPercentage + '%');
```

### Calculate Interest

```javascript
// Calculate projected interest for a loan
const response = await fetch('/api/rates/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    principal: 1000,
    durationDays: 30,
    type: 'borrow',
    market: 'pstETH'
  })
});

const calculation = await response.json();
console.log('Interest Cost:', calculation.results.compoundInterest);
```

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Redis (caching)
- **Blockchain**: Stellar SDK
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Validation**: Joi

### Key Components

1. **Stellar Service**: Blockchain interaction and contract calls
2. **Redis Cache**: High-performance data caching with TTL
3. **Background Scheduler**: Automated data refresh and cleanup
4. **Route Handlers**: REST API endpoint implementations
5. **Middleware**: Authentication, rate limiting, error handling

### Caching Strategy

- **Protocol Stats**: 5-minute cache, refreshed every 5 minutes
- **Interest Rates**: 2-minute cache, refreshed every 2 minutes  
- **Asset Prices**: 1-minute cache, refreshed every minute
- **User Data**: 2-minute cache, on-demand refresh
- **Bridge Status**: 1-minute cache, real-time monitoring

## Development

### Project Structure

```
paralyx-api/
├── src/
│   ├── index.js              # Main application entry
│   ├── routes/               # API route handlers
│   │   ├── user.js          # User-specific endpoints
│   │   ├── protocol.js      # Protocol statistics
│   │   ├── markets.js       # Market data
│   │   ├── rates.js         # Interest rates
│   │   ├── bridge.js        # Bridge status
│   │   └── health.js        # Health checks
│   ├── services/            # Business logic
│   │   ├── stellar.js       # Stellar blockchain service
│   │   └── scheduler.js     # Background data refresh
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication
│   │   └── errorHandler.js  # Error handling
│   └── utils/               # Utility functions
│       ├── logger.js        # Winston logging
│       └── redis.js         # Redis client and caching
├── docs/                    # API documentation
├── logs/                    # Application logs
├── package.json            # Dependencies and scripts
├── env.example             # Environment configuration template
└── README.md              # This file
```

### Adding New Endpoints

1. Create route handler in `src/routes/`
2. Add route to main application in `src/index.js`
3. Implement caching strategy if needed
4. Add Swagger documentation
5. Write tests

### Error Handling

The API uses comprehensive error handling:

- **Validation Errors**: 400 status with field-specific messages
- **Not Found**: 404 status for missing resources
- **Rate Limiting**: 429 status when limits exceeded
- **Server Errors**: 500 status with logged details
- **Service Unavailable**: 503 status when dependencies fail

## Monitoring

### Health Checks

- `/health` - Basic liveness probe
- `/health/detailed` - Comprehensive health with dependencies
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

### Logging

Structured logging with Winston:

- **Console**: Development environments
- **File**: Production logs with rotation
- **Error Tracking**: Separate error log file
- **Request Logging**: HTTP access logs with Morgan

### Metrics

- System metrics (memory, CPU, uptime)
- Request metrics (count, response time, errors)
- Cache metrics (hit rate, performance)
- Blockchain metrics (call success rate, latency)

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables

Production environment requires:

- `NODE_ENV=production`
- `REDIS_URL` - Redis connection string
- `STELLAR_*` - Stellar network configuration
- `*_CONTRACT` - Deployed contract addresses
- `LOG_LEVEL=info` - Production log level

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paralyx-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: paralyx-api
  template:
    metadata:
      labels:
        app: paralyx-api
    spec:
      containers:
      - name: api
        image: paralyx/api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: paralyx-secrets
              key: redis-url
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-endpoint`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add new endpoint'`
5. Push to the branch: `git push origin feature/new-endpoint`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [API Docs](http://localhost:3001/docs)
- Issues: [GitHub Issues](https://github.com/paralyx-protocol/paralyx-api/issues)
- Email: api@paralyx.finance 