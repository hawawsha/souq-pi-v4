/**
 * Souq Pi - Complete Payment Webhook
 * Dynamic Network Support
 */

import piClient from '../../../lib/pi-client';
import stellarClient from '../../../lib/stellar-client';
import { validateNetwork } from '../../../lib/pi-config';
import { Order, Balance, Notification } from '../../../lib/models';
import { connectDB } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    validateNetwork();
  } catch (error) {
    logger.error('Network validation failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Network configuration error' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    await connectDB();

    const { paymentId, txid } = req.body;

    if (!paymentId || !txid) {
      return res.status(400).json({
        success: false,
        error: 'paymentId and txid are required',
      });
    }

    logger.info('Completing payment', { paymentId, txid });

    const verifiedTx = await stellarClient.verifyTransaction(txid);
    if (!verifiedTx) {
      return res.status(400).json({
        success: false,
        error: 'Transaction verification failed',
      });
    }

    const completedPayment = await piClient.completePayment(paymentId, txid);

    const order = await Order.findOne({ 'payment.paymentId': paymentId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    order.payment.status = 'completed';
    order.payment.txid = txid;
    order.status = 'payment_received';
    await order.save();

    await releaseEscrowToSeller(order);
    await sendNotification(order.buyer.uid, 'Payment Completed', 
      `Your payment of ${order.payment.amount} PI for order #${order.orderId} has been completed.`);
    await sendNotification(order.seller.uid, 'Payment Received', 
      `You received ${order.payment.amount} PI for order #${order.orderId}.`);

    return res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        paymentId,
        txid,
        orderId: order.orderId,
        status: 'completed',
        network: process.env.PI_NETWORK || 'testnet',
      },
    });

  } catch (error) {
    logger.error('Payment completion failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Payment completion failed',
      message: error.message,
    });
  }
}

async function releaseEscrowToSeller(order) {
  try {
    const sellerBalance = await Balance.findOne({ uid: order.seller.uid });
    if (sellerBalance) {
      sellerBalance.balances.PI += order.payment.amount;
      sellerBalance.totalEarned += order.payment.amount;
      await sellerBalance.save();
      logger.info('Escrow released to seller', { 
        sellerUid: order.seller.uid, orderId: order.orderId, amount: order.payment.amount 
      });
    }
  } catch (error) {
    logger.error('Escrow release failed', { error: error.message });
  }
}

async function sendNotification(uid, title, message) {
  try {
    const notification = new Notification({
      notificationId: uuidv4(),
      uid,
      type: 'payment',
      title,
      message,
      data: { timestamp: new Date() },
    });
    await notification.save();
  } catch (error) {
    logger.error('Notification failed', { error: error.message });
  }
}
