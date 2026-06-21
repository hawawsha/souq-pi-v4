/**
 * Souq Pi - Stellar Blockchain Client
 * Dynamic - Supports both testnet and mainnet via env vars
 */

const StellarSdk = require('stellar-sdk');
const { getHorizonUrl, getNetworkPassphrase } = require('./pi-config');
const logger = require('./logger');

class StellarClient {
  constructor() {
    this.server = new StellarSdk.Server(getHorizonUrl());
    this.networkPassphrase = getNetworkPassphrase();
  }

  async loadAccount(publicKey) {
    try {
      const account = await this.server.loadAccount(publicKey);
      logger.info('Account loaded', { publicKey: publicKey.substring(0, 8) + '...' });
      return account;
    } catch (error) {
      logger.error('Account load failed', { publicKey, error: error.message });
      throw error;
    }
  }

  async fetchBaseFee() {
    try {
      return await this.server.fetchBaseFee();
    } catch (error) {
      logger.error('Fetch base fee failed', { error: error.message });
      throw error;
    }
  }

  async fetchTimebounds(timeout = 180) {
    try {
      return await this.server.fetchTimebounds(timeout);
    } catch (error) {
      logger.error('Fetch timebounds failed', { error: error.message });
      throw error;
    }
  }

  async buildPaymentTransaction({ sourcePublicKey, sourceSecretKey, destination, amount, paymentId }) {
    try {
      const account = await this.loadAccount(sourcePublicKey);
      const baseFee = await this.fetchBaseFee();
      const timebounds = await this.fetchTimebounds(180);

      const payment = StellarSdk.Operation.payment({
        destination: destination,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      });

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: baseFee,
        networkPassphrase: this.networkPassphrase,
        timebounds: timebounds,
      })
        .addOperation(payment)
        .addMemo(StellarSdk.Memo.text(paymentId))
        .build();

      const keypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
      transaction.sign(keypair);

      logger.info('Transaction built and signed', { 
        destination: destination.substring(0, 8) + '...',
        amount 
      });

      return transaction;
    } catch (error) {
      logger.error('Transaction build failed', { error: error.message });
      throw error;
    }
  }

  async submitTransaction(transaction) {
    try {
      const result = await this.server.submitTransaction(transaction);
      logger.info('Transaction submitted', { txid: result.id });
      return result;
    } catch (error) {
      logger.error('Transaction submission failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  }

  async processRefund({ sourcePublicKey, sourceSecretKey, destination, amount, refundId }) {
    const transaction = await this.buildPaymentTransaction({
      sourcePublicKey,
      sourceSecretKey,
      destination,
      amount,
      paymentId: `REFUND-${refundId}`,
    });

    return await this.submitTransaction(transaction);
  }

  async verifyTransaction(txid) {
    try {
      return await this.server.transactions().transactionId(txid).call();
    } catch (error) {
      logger.error('Transaction verification failed', { txid, error: error.message });
      throw error;
    }
  }
}

module.exports = new StellarClient();
