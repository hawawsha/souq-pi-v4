/**
 * Souq Pi - Payment API Endpoint
 * Dynamic Network Support - A2U Payment Processing
 */

import piClient from '../../lib/pi-client';
import stellarClient from '../../lib/stellar-client';
import { validateNetwork } from '../../lib/pi-config';
import { Order, Balance, Notification } from '../../lib/models';
import { connectDB } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../lib/logger';

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

  switch (req.method) {
    case 'POST':
      return await createPayment(req, res);
    case 'GET':
      return await getPaymentStatus(req, res);
    default:
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
  }
}

async function createPayment(req, res) {
  try {
    await connectDB();

    const { 
      productId, productName, amount, 
      buyerUid, buyerUsername, buyerWalletAddress,
      sellerUid, sellerUsername, shippingAddress 
    } = req.body;

    if (!productId || !amount || !buyerUid || !sellerUid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (amount <= 0 || amount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be between 0 and 10000 PI',
      });
    }

    const orderId = uuidv4();
    const network = process.env.PI_NETWORK || 'testnet';

    logger.info('Creating payment', { 
      orderId, amount, buyer: buyerUid, seller: sellerUid, network 
    });

    const piPayment = await piClient.createPayment({
      payment: {
        amount: amount,
        memo: `Order: ${orderId}`,
        metadata: { orderId, productId },
        uid: buyerUid,
      },
    });

    const order = new Order({
      orderId,
      buyer: { uid: buyerUid, username: buyerUsername, walletAddress: buyerWalletAddress },
      seller: { uid: sellerUid, username: sellerUsername },
      product: { productId, name: productName || 'Unknown Product', price: amount },
      payment: {
        paymentId: piPayment.identifier,
        amount,
        status: 'pending',
        network,
      },
      status: 'pending_payment',
      shippingAddress: shippingAddress || {},
    });

    await order.save();
    await lockEscrow(buyerUid, orderId, amount);
    await sendPaymentNotification(buyerUid, orderId, amount, 'pending');

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        orderId,
        paymentId: piPayment.identifier,
        amount,
        status: 'pending_payment',
        network,
        piPayment,
      },
    });

  } catch (error) {
    logger.error('Payment creation failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Payment creation failed',
      message: error.message,
    });
  }
}

async function getPaymentStatus(req, res) {
  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required',
      });
    }

    const payment = await piClient.getPayment(paymentId);

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment.identifier,
        status: payment.status,
        amount: payment.amount,
        txid: payment.transaction?.txid || null,
        network: process.env.PI_NETWORK || 'testnet',
      },
    });

  } catch (error) {
    logger.error('Get payment status failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
    });
  }
}

async function lockEscrow(uid, orderId, amount) {
  try {
    const balance = await Balance.findOne({ uid });
    if (balance) {
      balance.escrow.totalLocked += amount;
      balance.escrow.transactions.push({ orderId, amount, status: 'locked' });
      await balance.save();
      logger.info('Escrow locked', { uid, orderId, amount });
    }
  } catch (error) {
    logger.error('Escrow lock failed', { error: error.message });
  }
}

async function sendPaymentNotification(uid, orderId, amount, status) {
  try {
    const notification = new Notification({
      notificationId: uuidv4(),
      uid,
      type: 'payment',
      title: `Payment ${status}`,
      message: `Payment of ${amount} PI for order #${orderId} is ${status}`,
      data: { orderId, amount, status },
    });
    await notification.save();
  } catch (error) {
    logger.error('Notification failed', { error: error.message });
  }
}
