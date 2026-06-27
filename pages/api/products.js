/**
 * Souq Pi - Products API Endpoint
 * Dynamic Network Support
 */

import { Product } from '../../lib/models';
import { connectDB } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await listProducts(req, res);
      case 'POST':
        return await createProduct(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    logger.error('Products API error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function listProducts(req, res) {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;

    const query = { status: 'active' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        products,
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
    logger.error('List products failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products' 
    });
  }
}

async function createProduct(req, res) {
  const adminSecret = req.headers["x-admin-secret"];

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }

  try {
    const { name, description, price, category, images, stock, seller } = req.body;

    if (!name || !description || !price || !category || !seller) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const product = new Product({
      productId: uuidv4(),
      name,
      description,
      price,
      category,
      images: images || [],
      stock: stock || 0,
      seller: {
        uid: seller.uid,
        username: seller.username,
        walletAddress: seller.walletAddress,
      },
      status: 'active',
    });

    await product.save();

    logger.info('Product created', { productId: product.productId, name });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    logger.error('Create product failed', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create product' 
    });
  }
}
