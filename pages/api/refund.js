/**
 * Souq Pi - Refund API Endpoint
 * Dynamic Network Support with Automatic Retry Mechanism
 */

import refundService from '../../lib/refund-service';
import { validateNetwork } from '../../lib/pi-config';
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
      error: 'Network configuration error',
      message: error.message 
    });
  }

  switch (req.method) {
    case 'POST':
      return await handleRefundRequest(req, res);
    case 'GET':
      return await getRefundStatus(req, res);
    case 'PUT':
      return await retryRefund(req, res);
    default:
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
  }
}

async function handleRefundRequest(req, res) {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId and reason are required',
      });
    }

    if (reason.length < 5 || reason.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Reason must be between 5 and 500 characters',
      });
    }

    logger.info('Refund request received', { orderId, reason: reason.substring(0, 50) });

    const result = await refundService.processRefund({ orderId, reason });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: result.refundId,
          txid: result.txid,
          status: result.status,
          attempts: result.attempts,
          network: result.network,
        },
      });
    } else {
      return res.status(202).json({
        success: false,
        message: 'Refund requires manual review after automatic retries',
        data: {
          refundId: result.refundId,
          status: result.status,
          attempts: result.attempts,
          errors: result.errors,
          network: result.network,
        },
      });
    }

  } catch (error) {
    logger.error('Refund request failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

async function getRefundStatus(req, res) {
  try {
    const { refundId, orderId } = req.query;

    if (!refundId && !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Either refundId or orderId is required',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        refundId: refundId || null,
        orderId: orderId || null,
        status: 'pending',
        network: process.env.PI_NETWORK || 'testnet',
      },
    });

  } catch (error) {
    logger.error('Get refund status failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

async function retryRefund(req, res) {
  try {
    const { refundId } = req.query;

    if (!refundId) {
      return res.status(400).json({
        success: false,
        error: 'refundId is required',
      });
    }

    logger.info('Manual refund retry requested', { refundId });

    const result = await refundService.retryManualRefund(refundId);

    return res.status(200).json({
      success: true,
      message: 'Refund retry initiated',
      data: result,
    });

  } catch (error) {
    logger.error('Refund retry failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Refund retry failed',
      message: error.message,
    });
  }
}
