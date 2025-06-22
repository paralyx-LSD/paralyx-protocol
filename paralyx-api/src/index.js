const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectRedis } = require('./utils/redis');
const { initializeScheduler } = require('./services/scheduler');

// Import routes
const userRoutes = require('./routes/user');
const protocolRoutes = require('./routes/protocol');
const marketsRoutes = require('./routes/markets');
const ratesRoutes = require('./routes/rates');
const bridgeRoutes = require('./routes/bridge');
const healthRoutes = require('./routes/health');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { validateApiKey } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration FIRST - before any other middleware
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Manual CORS headers as fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Security middleware - configure helmet to allow CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Documentation
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerDocument = require('../docs/swagger.json');
  
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Paralyx API Documentation',
    customCss: '.swagger-ui .topbar { display: none }'
  }));
}

// Health check (no rate limiting)
app.use('/health', healthRoutes);

// API routes with optional authentication
app.use('/api/user', validateApiKey, userRoutes);
app.use('/api/protocol', validateApiKey, protocolRoutes);
app.use('/api/markets', validateApiKey, marketsRoutes);
app.use('/api/rates', validateApiKey, ratesRoutes);
app.use('/api/bridge', validateApiKey, bridgeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Paralyx Protocol API',
    version: '1.0.0',
    description: 'Backend API for Paralyx Protocol - Cross-chain LSD lending platform',
    status: 'operational',
    endpoints: {
      health: '/health',
      documentation: '/docs',
      api: {
        user: '/api/user/:walletAddress',
        protocol: '/api/protocol/stats',
        markets: '/api/markets',
        rates: '/api/rates',
        bridge: '/api/bridge/status'
      }
    },
    links: {
      website: 'https://paralyx.finance',
      github: 'https://github.com/paralyx-protocol',
      documentation: '/docs'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /docs',
      'GET /api/user/:walletAddress',
      'GET /api/protocol/stats',
      'GET /api/markets',
      'GET /api/rates',
      'GET /api/bridge/status'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close Redis connection
    if (global.redisClient) {
      global.redisClient.quit(() => {
        logger.info('Redis connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Initialize server
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');
    
    // Initialize background scheduler
    await initializeScheduler();
    logger.info('Background scheduler initialized');
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Paralyx API server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Documentation available at: http://localhost:${PORT}/docs`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    return server;
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; 