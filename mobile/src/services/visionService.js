import api from '../config/api';

export const analyzeImage = async (imageBase64) => {
  try {
    const response = await api.post('/vision/analyze', {
      image_base64: imageBase64,
    });
    return response.data;
  } catch (error) {
    console.error('Vision analyze error:', error);
    throw error;
  }
};

export const getFinancialAdvice = async (objectData, priceData) => {
  try {
    const response = await api.post('/vision/financial-advice', {
      object_data: objectData,
      price_data: priceData,
    });
    return response.data;
  } catch (error) {
    console.error('Financial advice error:', error);
    throw error;
  }
};
