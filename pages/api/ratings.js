/**
 * Souq Pi - Ratings API Endpoint
 * Dynamic Network Support
 */

import { Rating, Product, Order } from '../../lib/models';
import { connectDB } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await connectDB();

    switch (req.method) {
      case 'POST':
        return await submitRating(req, res);
      case 'GET':
        return await getRatings(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    logger.error('Ratings API error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function submitRating(req, res) {
  try {
    const { orderId, productId, reviewer, seller, rating, comment } = req.body;

    if (!orderId || !productId || !reviewer || !seller || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Can only rate delivered orders',
      });
    }

    const existingRating = await Rating.findOne({ orderId, 'reviewer.uid': reviewer.uid });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: 'Order already rated',
      });
    }

    const newRating = new Rating({
      ratingId: uuidv4(),
      orderId,
      productId,
      reviewer: {
        uid: reviewer.uid,
        username: reviewer.username,
      },
      seller: {
        uid: seller.uid,
      },
      rating,
      comment: comment || '',
    });

    await newRating.save();

    const productRatings = await Rating.find({ productId });
    const avgRating = productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length;

    await Product.updateOne(
      { productId },
      { 
        'ratings.average': Math.round(avgRating * 10) / 10,
        'ratings.count': productRatings.length,
      }
    );

    logger.info('Rating submitted', { ratingId: newRating.ratingId, productId, rating });

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: newRating,
    });
  } catch (error) {
    logger.error('Submit rating failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to submit rating' 
    });
  }
}

async function getRatings(req, res) {
  try {
    const { productId, page = 1, limit = 20 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const ratings = await Rating.find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({ productId });

    const avgRating = await Rating.aggregate([
      { $match: { productId } },
      { $group: { _id: null, average: { $avg: '$rating' } } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ratings,
        average: avgRating[0]?.average || 0,
        total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        network: process.env.PI_NETWORK || 'testnet',
      },
    });
  } catch (error) {
    logger.error('Get ratings failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ratings' 
    });
  }
}
