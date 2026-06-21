/**
 * Souq Pi - Pi Price API Endpoint
 * Dynamic Network Support
 */

import { PiPrice } from '../../../lib/models';
import { connectDB } from '../../../lib/db';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    await connectDB();

    const latestPrice = await PiPrice.findOne().sort({ timestamp: -1 });

    if (latestPrice && (Date.now() - latestPrice.timestamp.getTime()) < 300000) {
      return res.status(200).json({
        success: true,
        data: {
          price: latestPrice.price,
          currency: latestPrice.currency,
          source: latestPrice.source,
          timestamp: latestPrice.timestamp,
          network: process.env.PI_NETWORK || 'testnet',
        },
      });
    }

    const mockPrice = 314.159;

    const newPrice = new PiPrice({
      currency: 'USD',
      price: mockPrice,
      source: 'oracle',
      timestamp: new Date(),
    });

    await newPrice.save();

    return res.status(200).json({
      success: true,
      data: {
        price: mockPrice,
        currency: 'USD',
        source: 'oracle',
        timestamp: new Date().toISOString(),
        network: process.env.PI_NETWORK || 'testnet',
      },
    });
  } catch (error) {
    logger.error('Price fetch failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch price' 
    });
  }
}
