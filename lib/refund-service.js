/**
 * Souq Pi - Refund Service
 * Dynamic Network Support with Automatic Retry Mechanism
 */

const { v4: uuidv4 } = require('uuid');
const piClient = require('./pi-client');
const stellarClient = require('./stellar-client');
const { getRetryConfig, getNetworkConfig } = require('./pi-config');
const { Refund, Order, Balance, Notification } = require('./models');
const { connectDB } = require('./db');
const logger = require('./logger');

class RefundService {
  constructor() {
    this.retryConfig = getRetryConfig();
    this.networkConfig = getNetworkConfig();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processRefund({ orderId, reason }) {
    await connectDB();
    const refundId = uuidv4();

    try {
      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      if (order.payment.status === 'refunded') {
        throw new Error('Order already refunded');
      }

      const refund = new Refund({
        refundId,
        orderId,
        paymentId: order.payment.paymentId,
        amount: order.payment.amount,
        recipientAddress: order.buyer.walletAddress,
        reason,
        status: 'pending',
        retryCount: 0,
        retryHistory: [],
      });

      await refund.save();
      logger.info('Refund record created', { refundId, orderId, amount: order.payment.amount });

      const result = await this.executeRefundWithRetry(refund, order);
      return result;

    } catch (error) {
      logger.error('Refund process failed', { refundId, orderId, error: error.message });
      throw error;
    }
  }

  async executeRefundWithRetry(refund, order) {
    const maxRetries = this.retryConfig.maxRetries;
    const retryDelay = this.retryConfig.retryDelay;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.info(`Attempting refund execution`, { 
          refundId: refund.refundId, 
          attempt, 
          maxRetries: maxRetries + 1 
        });

        const txResult = await this.executeBlockchainRefund(refund);

        refund.status = 'completed';
        refund.txid = txResult.id;
        refund.processedAt = new Date();
        await refund.save();

        order.payment.status = 'refunded';
        order.status = 'refunded';
        await order.save();

        await this.releaseEscrow(order);
        await this.sendRefundNotification(order, refund, 'success');

        logger.info('Refund completed successfully', { 
          refundId: refund.refundId, 
          txid: txResult.id 
        });

        return {
          success: true,
          refundId: refund.refundId,
          txid: txResult.id,
          status: 'completed',
          attempts: attempt,
          network: this.networkConfig.network,
        };

      } catch (error) {
        const retryEntry = {
          attempt,
          timestamp: new Date(),
          error: error.message,
        };

        refund.retryHistory.push(retryEntry);
        refund.retryCount = attempt;

        if (attempt <= maxRetries) {
          const delayMs = retryDelay * attempt;
          refund.status = `retry_${attempt}`;
          await refund.save();

          logger.warn(`Refund attempt ${attempt} failed, retrying in ${delayMs}ms`, {
            refundId: refund.refundId,
            error: error.message,
          });

          await this.delay(delayMs);

        } else {
          refund.status = 'manual_refund_needed';
          await refund.save();

          order.payment.status = 'manual_refund_needed';
          await order.save();

          await this.sendRefundNotification(order, refund, 'manual');

          logger.error('Refund failed after all retries, manual intervention required', {
            refundId: refund.refundId,
            totalAttempts: attempt,
            errors: refund.retryHistory.map(r => r.error),
          });

          return {
            success: false,
            refundId: refund.refundId,
            status: 'manual_refund_needed',
            attempts: attempt,
            errors: refund.retryHistory.map(r => r.error),
            network: this.networkConfig.network,
          };
        }
      }
    }
  }

  async executeBlockchainRefund(refund) {
    const serverPublicKey = process.env.SERVER_WALLET_PUBLIC_KEY;
    const serverSecretKey = process.env.SERVER_WALLET_SECRET_KEY;

    if (!serverPublicKey || !serverSecretKey) {
      throw new Error('Server wallet credentials not configured');
    }

    if (!refund.recipientAddress) {
      throw new Error('Recipient wallet address not available');
    }

    const transaction = await stellarClient.buildPaymentTransaction({
      sourcePublicKey: serverPublicKey,
      sourceSecretKey: serverSecretKey,
      destination: refund.recipientAddress,
      amount: refund.amount,
      paymentId: refund.refundId,
    });

    return await stellarClient.submitTransaction(transaction);
  }

  async releaseEscrow(order) {
    try {
      const buyerBalance = await Balance.findOne({ uid: order.buyer.uid });
      if (buyerBalance) {
        const escrowTx = buyerBalance.escrow.transactions.find(
          t => t.orderId === order.orderId && t.status === 'locked'
        );

        if (escrowTx) {
          escrowTx.status = 'refunded';
          buyerBalance.escrow.totalLocked -= escrowTx.amount;
          buyerBalance.balances.PI += escrowTx.amount;
          await buyerBalance.save();

          logger.info('Escrow released for refund', { 
            orderId: order.orderId, 
            amount: escrowTx.amount 
          });
        }
      }
    } catch (error) {
      logger.error('Escrow release failed', { orderId: order.orderId, error: error.message });
    }
  }

  async sendRefundNotification(order, refund, type) {
    try {
      const notification = new Notification({
        notificationId: uuidv4(),
        uid: order.buyer.uid,
        type: 'refund',
        title: type === 'success' ? 'Refund Processed' : 'Refund Requires Manual Review',
        message: type === 'success' 
          ? `Your refund of ${refund.amount} PI for order #${order.orderId} has been processed. Transaction ID: ${refund.txid}`
          : `Your refund request for order #${order.orderId} requires manual review. Our team will contact you shortly.`,
        data: {
          orderId: order.orderId,
          refundId: refund.refundId,
          amount: refund.amount,
          txid: refund.txid,
          status: refund.status,
        },
      });

      await notification.save();
      logger.info('Refund notification sent', { uid: order.buyer.uid, type });
    } catch (error) {
      logger.error('Refund notification failed', { error: error.message });
    }
  }

  async getManualRefunds() {
    await connectDB();
    return await Refund.find({ status: 'manual_refund_needed' }).sort({ createdAt: -1 });
  }

  async retryManualRefund(refundId) {
    await connectDB();

    const refund = await Refund.findOne({ refundId });
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'manual_refund_needed') {
      throw new Error('Refund is not in manual refund status');
    }

    refund.retryCount = 0;
    refund.retryHistory = [];
    refund.status = 'pending';
    await refund.save();

    const order = await Order.findOne({ orderId: refund.orderId });
    return await this.executeRefundWithRetry(refund, order);
  }

  async processBatchRefunds(orderIds, reason) {
    const results = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.processRefund({ orderId, reason });
        results.push({ orderId, success: true, result });
      } catch (error) {
        results.push({ orderId, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new RefundService();
