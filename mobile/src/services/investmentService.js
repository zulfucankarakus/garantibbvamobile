import api from '../config/api';

/**
 * Investment Service - Yatırım API çağrıları
 */

export const getAllInvestmentAssets = async () => {
  try {
    const response = await api.get('/investments/assets');
    return response.data;
  } catch (error) {
    console.error('Get all investment assets error:', error);
    throw error;
  }
};

export const getInvestmentAssetDetail = async (assetId) => {
  try {
    const response = await api.get(`/investments/asset/${assetId}`);
    return response.data;
  } catch (error) {
    console.error('Get asset detail error:', error);
    throw error;
  }
};

export const getAIRecommendation = async (assetId) => {
  try {
    const response = await api.get(`/investments/ai-recommendation/${assetId}`);
    return response.data;
  } catch (error) {
    console.error('Get AI recommendation error:', error);
    throw error;
  }
};

export const buyInvestment = async (investmentId, quantity, price, totalAmount) => {
  try {
    const response = await api.post('/investments/buy', {
      investment_id: investmentId,
      transaction_type: 'buy',
      quantity,
      price,
      total_amount: totalAmount
    });
    return response.data;
  } catch (error) {
    console.error('Buy investment error:', error);
    throw error;
  }
};

export const sellInvestment = async (investmentId, quantity, price, totalAmount) => {
  try {
    const response = await api.post('/investments/sell', {
      investment_id: investmentId,
      transaction_type: 'sell',
      quantity,
      price,
      total_amount: totalAmount
    });
    return response.data;
  } catch (error) {
    console.error('Sell investment error:', error);
    throw error;
  }
};

export const getInvestmentPortfolio = async () => {
  try {
    const response = await api.get('/investments/portfolio');
    return response.data;
  } catch (error) {
    console.error('Get portfolio error:', error);
    throw error;
  }
};

export const getInvestmentTransactions = async () => {
  try {
    const response = await api.get('/investments/transactions');
    return response.data;
  } catch (error) {
    console.error('Get investment transactions error:', error);
    throw error;
  }
};

export const scrapePrices = async (productName, category, urls = null) => {
  try {
    const response = await api.post('/vision/scrape-prices', {
      product_name: productName,
      category,
      urls
    });
    return response.data;
  } catch (error) {
    console.error('Scrape prices error:', error);
    throw error;
  }
};
