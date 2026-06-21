/**
 * Souq Pi - Pi Network API Client
 * Dynamic - Supports both testnet and mainnet via env vars
 */

const axios = require('axios');
const { 
  getNetworkConfig, 
  getPiApiHeaders, 
  getApiUrl,
  validateNetwork 
} = require('./pi-config');
const logger = require('./logger');

class PiClient {
  constructor() {
    validateNetwork();

    const config = getNetworkConfig();

    this.client = axios.create({
      baseURL: `${config.apiBaseUrl}/${config.apiVersion}`,
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (request) => {
        const apiKey = process.env.PI_API_KEY;
        if (apiKey) {
          request.headers['Authorization'] = `Key ${apiKey}`;
        }
        return request;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Pi API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async createPayment(paymentData) {
    try {
      const response = await this.client.post('/payments', paymentData);
      logger.info('Payment created', { 
        paymentId: response.data.identifier,
        amount: paymentData.amount 
      });
      return response.data;
    } catch (error) {
      logger.error('Payment creation failed', { error: error.message });
      throw error;
    }
  }

  async getPayment(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      logger.error('Get payment failed', { paymentId, error: error.message });
      throw error;
    }
  }

  async approvePayment(paymentId) {
    try {
      const response = await this.client.post(`/payments/${paymentId}/approve`);
      logger.info('Payment approved', { paymentId });
      return response.data;
    } catch (error) {
      logger.error('Payment approval failed', { paymentId, error: error.message });
      throw error;
    }
  }

  async completePayment(paymentId, txid) {
    try {
      const response = await this.client.post(`/payments/${paymentId}/complete`, { txid });
      logger.info('Payment completed', { paymentId, txid });
      return response.data;
    } catch (error) {
      logger.error('Payment completion failed', { paymentId, txid, error: error.message });
      throw error;
    }
  }

  async cancelPayment(paymentId) {
    try {
      const response = await this.client.post(`/payments/${paymentId}/cancel`);
      logger.info('Payment cancelled', { paymentId });
      return response.data;
    } catch (error) {
      logger.error('Payment cancellation failed', { paymentId, error: error.message });
      throw error;
    }
  }

  async getUser(accessToken) {
    try {
      const response = await axios.get(getApiUrl('/me'), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      logger.error('Get user failed', { error: error.message });
      throw error;
    }
  }

  async verifyToken(accessToken) {
    try {
      await this.getUser(accessToken);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new PiClient();
