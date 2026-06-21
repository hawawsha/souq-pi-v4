/**
 * Souq Pi - Database Connection Module
 */

const mongoose = require('mongoose');
const logger = require('./logger');

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.error('MONGODB_URI not set in environment variables');
    throw new Error('Database connection string not configured');
  }

  try {
    const connection = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    logger.info('Database connected successfully', { 
      network: process.env.PI_NETWORK || 'testnet' 
    });

    return connection;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
}

module.exports = { connectDB };
