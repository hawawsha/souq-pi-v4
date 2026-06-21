/**
 * Souq Pi - Balance API Endpoint
 * Dynamic Network Support
 */

import { Balance } from '../../lib/models';
import { connectDB } from '../../lib/db';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getBalance(req, res);
      case 'POST':
        return await updateBalance(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    logger.error('Balance API error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function getBalance(req, res) {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'uid is required',
      });
    }

    const balance = await Balance.findOne({ uid });

    if (!balance) {
      return res.status(200).json({
        success: true,
        data: {
          uid,
          balances: { PI: 0 },
          escrow: { totalLocked: 0, transactions: [] },
          totalEarned: 0,
          totalSpent: 0,
          network: process.env.PI_NETWORK || 'testnet',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Get balance failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch balance' 
    });
  }
}

async function updateBalance(req, res) {
  try {
    const { uid, amount, type } = req.body;

    if (!uid || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    let balance = await Balance.findOne({ uid });

    if (!balance) {
      balance = new Balance({
        uid,
        balances: { PI: 0 },
      });
    }

    if (type === 'credit') {
      balance.balances.PI += amount;
      balance.totalEarned += amount;
    } else if (type === 'debit') {
      if (balance.balances.PI < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
        });
      }
      balance.balances.PI -= amount;
      balance.totalSpent += amount;
    }

    balance.updatedAt = new Date();
    await balance.save();

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Update balance failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update balance' 
    });
  }
}
