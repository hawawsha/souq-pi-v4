/**
 * Souq Pi - My Orders API Endpoint
 * Dynamic Network Support
 */

import { Order } from '../../../lib/models';
import { connectDB } from '../../../lib/db';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    await connectDB();

    const { uid, role = 'buyer', page = 1, limit = 20 } = req.query;

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'uid is required',
      });
    }

    const query = role === 'seller' 
      ? { 'seller.uid': uid } 
      : { 'buyer.uid': uid };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        network: process.env.PI_NETWORK || 'testnet',
      },
    });
  } catch (error) {
    logger.error('Get orders failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders' 
    });
  }
}
