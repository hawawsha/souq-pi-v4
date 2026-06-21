/**
 * Souq Pi - Database Models
 */

const mongoose = require('mongoose');

// Product Schema
const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0.0000001 },
  priceCurrency: { type: String, default: 'PI' },
  category: { type: String, required: true, index: true },
  images: [{ type: String }],
  stock: { type: Number, default: 0, min: 0 },
  seller: {
    uid: { type: String, required: true },
    username: { type: String, required: true },
    walletAddress: { type: String },
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['active', 'inactive', 'sold_out'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Order Schema
const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  buyer: {
    uid: { type: String, required: true },
    username: { type: String, required: true },
    walletAddress: { type: String },
  },
  seller: {
    uid: { type: String, required: true },
    username: { type: String, required: true },
  },
  product: {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  payment: {
    paymentId: { type: String },
    txid: { type: String },
    amount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'completed', 'failed', 'refunded', 'manual_refund_needed'],
      default: 'pending'
    },
    network: { type: String, default: process.env.PI_NETWORK || 'testnet' },
  },
  status: {
    type: String,
    enum: ['pending_payment', 'payment_received', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending_payment',
  },
  shippingAddress: {
    country: String,
    city: String,
    address: String,
    postalCode: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Refund Schema
const RefundSchema = new mongoose.Schema({
  refundId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  paymentId: { type: String, required: true },
  txid: { type: String },
  amount: { type: Number, required: true },
  recipientAddress: { type: String, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'retry_1', 'retry_2', 'completed', 'failed', 'manual_refund_needed'],
    default: 'pending',
  },
  retryCount: { type: Number, default: 0 },
  retryHistory: [{
    attempt: Number,
    timestamp: Date,
    error: String,
  }],
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// User Balance Schema
const BalanceSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  walletAddress: { type: String },
  balances: {
    PI: { type: Number, default: 0 },
  },
  escrow: {
    totalLocked: { type: Number, default: 0 },
    transactions: [{
      orderId: String,
      amount: Number,
      status: { type: String, enum: ['locked', 'released', 'refunded'] },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// Rating Schema
const RatingSchema = new mongoose.Schema({
  ratingId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  productId: { type: String, required: true },
  reviewer: {
    uid: { type: String, required: true },
    username: { type: String, required: true },
  },
  seller: {
    uid: { type: String, required: true },
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  uid: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['order', 'payment', 'refund', 'system', 'rating'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Pi Price Schema
const PiPriceSchema = new mongoose.Schema({
  currency: { type: String, default: 'USD' },
  price: { type: Number, required: true },
  source: { type: String, default: 'oracle' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = {
  Product: mongoose.models.Product || mongoose.model('Product', ProductSchema),
  Order: mongoose.models.Order || mongoose.model('Order', OrderSchema),
  Refund: mongoose.models.Refund || mongoose.model('Refund', RefundSchema),
  Balance: mongoose.models.Balance || mongoose.model('Balance', BalanceSchema),
  Rating: mongoose.models.Rating || mongoose.model('Rating', RatingSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema),
  PiPrice: mongoose.models.PiPrice || mongoose.model('PiPrice', PiPriceSchema),
};
