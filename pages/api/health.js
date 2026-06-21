/**
 * Souq Pi - Health Check API
 * Dynamic Network Support
 */

import { connectDB } from '../../lib/db';
import { getNetworkConfig } from '../../lib/pi-config';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const networkConfig = getNetworkConfig();

    let dbStatus = 'connected';
    try {
      await connectDB();
    } catch (error) {
      dbStatus = 'disconnected';
      logger.error('Health check DB failed', { error: error.message });
    }

    const envChecks = {
      piAppId: !!process.env.PI_APP_ID,
      piAppSecret: !!process.env.PI_APP_SECRET,
      piApiKey: !!process.env.PI_API_KEY,
      serverWallet: !!process.env.SERVER_WALLET_PUBLIC_KEY && !!process.env.SERVER_WALLET_SECRET_KEY,
      mongodbUri: !!process.env.MONGODB_URI,
      jwtSecret: !!process.env.JWT_SECRET,
    };

    const allEnvOk = Object.values(envChecks).every(v => v);

    const healthStatus = {
      success: true,
      status: dbStatus === 'connected' && allEnvOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      network: {
        name: networkConfig.network,
        isProduction: networkConfig.isProduction,
        apiBaseUrl: networkConfig.apiBaseUrl,
        horizonUrl: networkConfig.horizonUrl,
        passphrase: networkConfig.networkPassphrase,
      },
      services: {
        database: dbStatus,
        environment: allEnvOk ? 'configured' : 'missing_variables',
      },
      environmentChecks: envChecks,
      version: '2.0.0',
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
}
