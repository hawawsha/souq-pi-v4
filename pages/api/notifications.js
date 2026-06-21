/**
 * Souq Pi - Notifications API Endpoint
 * Dynamic Network Support
 */

import { Notification } from '../../lib/models';
import { connectDB } from '../../lib/db';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getNotifications(req, res);
      case 'PUT':
        return await markAsRead(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    logger.error('Notifications API error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function getNotifications(req, res) {
  try {
    const { uid, page = 1, limit = 20, unreadOnly = false } = req.query;

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'uid is required',
      });
    }

    const query = { uid };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ uid, isRead: false });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
    logger.error('Get notifications failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
}

async function markAsRead(req, res) {
  try {
    const { notificationId } = req.query;
    const { uid } = req.body;

    if (!notificationId || !uid) {
      return res.status(400).json({
        success: false,
        error: 'notificationId and uid are required',
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { notificationId, uid },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error('Mark as read failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notification as read' 
    });
  }
}
