import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

const { width } = Dimensions.get('window');

const ASSETS = [
  { id: 'gold', name: 'Altın', emoji: '🥇', color: '#F59E0B' },
  { id: 'usd', name: 'Dolar', emoji: '💵', color: '#22C55E' },
  { id: 'eur', name: 'Euro', emoji: '💶', color: '#3B82F6' },
  { id: 'bist100', name: 'BIST 100', emoji: '📈', color: '#8B5CF6' },
  { id: 'btc', name: 'Bitcoin', emoji: '₿', color: '#F97316' },
];

export default function AIPredictionCenterScreen({ navigation }) {
  const [selectedAsset, setSelectedAsset] = useState('gold');
  const [predictionDays, setPredictionDays] = useState(7);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    fetchPrediction();
    fetchModelInfo();
  }, [selectedAsset, predictionDays]);

  const fetchModelInfo = async () => {
    try {
      const response = await api.get('/deep-learning/models');
      setModelInfo(response.data);
    } catch (error) {
      console.error('Model info error:', error);
    }
  };

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/deep-learning/predict/real/${selectedAsset}?days=${predictionDays}`);
      setPrediction(response.data);
    } catch (error) {
      console.error('Prediction error:', error);
      // Fallback to regular prediction
      try {
        const fallback = await api.get(`/deep-learning/price-prediction?asset=${selectedAsset}&days=${predictionDays}`);
        setPrediction(fallback.data);
      } catch (e) {
        console.error('Fallback error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrediction();
    setRefreshing(false);
  };

  const renderAssetSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetScroll}>
      {ASSETS.map((asset) => (
        <TouchableOpacity
          key={asset.id}
          style={[
            styles.assetButton,
            selectedAsset === asset.id && { backgroundColor: asset.color }
          ]}
          onPress={() => setSelectedAsset(asset.id)}
        >
          <Text style={styles.assetEmoji}>{asset.emoji}</Text>
          <Text style={[
            styles.assetName,
            selectedAsset === asset.id && styles.assetNameActive
          ]}>
            {asset.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderDaysSelector = () => (
    <View style={styles.daysContainer}>
      {[7, 14, 30].map((days) => (
        <TouchableOpacity
          key={days}
          style={[
            styles.dayButton,
            predictionDays === days && styles.dayButtonActive
          ]}
          onPress={() => setPredictionDays(days)}
        >
          <Text style={[
            styles.dayText,
            predictionDays === days && styles.dayTextActive
          ]}>
            {days} Gün
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPredictionCard = () => {
    if (!prediction || !prediction.success) return null;

    const summary = prediction.summary || {};
    const currentPrice = prediction.current_price || 0;
    const predictions = prediction.predictions || [];
    const lastPrediction = predictions[predictions.length - 1];
    const changePercent = summary.expected_change_percent || 0;

    return (
      <View style={styles.predictionCard}>
        <View style={styles.currentPriceRow}>
          <View>
            <Text style={styles.priceLabel}>Güncel Fiyat</Text>
            <Text style={styles.currentPrice}>
              {currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </Text>
          </View>
          <View style={styles.changeContainer}>
            <Text style={styles.changeLabel}>{predictionDays} Gün Sonra</Text>
            <Text style={[
              styles.changePercent,
              changePercent >= 0 ? styles.positive : styles.negative
            ]}>
              {changePercent >= 0 ? '📈' : '📉'} {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Trend Bilgisi */}
        <View style={styles.trendContainer}>
          <Text style={styles.trendEmoji}>{summary.trend_emoji || '📊'}</Text>
          <View style={styles.trendInfo}>
            <Text style={styles.trendLabel}>Trend Analizi</Text>
            <Text style={styles.trendValue}>
              {summary.trend?.replace('_', ' ').toUpperCase() || 'Analiz Ediliyor'}
            </Text>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Güven</Text>
            <Text style={styles.confidenceValue}>
              {((summary.model_confidence || 0) * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Öneri */}
        {summary.recommendation && (
          <View style={styles.recommendationContainer}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.recommendationText}>{summary.recommendation}</Text>
          </View>
        )}

        {/* Tahmin Listesi */}
        <Text style={styles.predictionsTitle}>📅 Günlük Tahminler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {predictions.slice(0, 7).map((pred, index) => (
            <View key={index} style={styles.predictionItem}>
              <Text style={styles.predDay}>Gün {pred.day}</Text>
              <Text style={styles.predPrice}>
                {pred.predicted_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.predConfidence}>
                %{(pred.confidence * 100).toFixed(0)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRealDataInfo = () => {
    if (!prediction?.real_data) return null;

    const realData = prediction.real_data;
    return (
      <View style={styles.realDataCard}>
        <Text style={styles.realDataTitle}>📊 Gerçek Veri Bilgisi</Text>
        <View style={styles.realDataRow}>
          <View style={styles.realDataItem}>
            <Text style={styles.realDataLabel}>Canlı Fiyat</Text>
            <Text style={styles.realDataValue}>
              {realData.current_live_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </Text>
          </View>
          <View style={styles.realDataItem}>
            <Text style={styles.realDataLabel}>Kaynak</Text>
            <Text style={styles.realDataValue}>{realData.data_source || 'API'}</Text>
          </View>
        </View>
        <View style={styles.realDataRow}>
          <View style={styles.realDataItem}>
            <Text style={styles.realDataLabel}>Min ({realData.historical_days} gün)</Text>
            <Text style={styles.realDataValue}>
              {realData.historical_min?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.realDataItem}>
            <Text style={styles.realDataLabel}>Max</Text>
            <Text style={styles.realDataValue}>
              {realData.historical_max?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderModelInfo = () => (
    <View style={styles.modelInfoCard}>
      <Text style={styles.modelInfoTitle}>🧠 LSTM Neural Network</Text>
      <Text style={styles.modelInfoText}>
        • Framework: PyTorch{"\n"}
        • Sequence Length: 30 gün{"\n"}
        • Hidden Size: 64{"\n"}
        • Layers: 2
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>🧠 AI Tahmin Merkezi</Text>
          <Text style={styles.headerSubtitle}>LSTM Fiyat Tahmini</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {renderAssetSelector()}
        {renderDaysSelector()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>LSTM modeli çalışıyor...</Text>
          </View>
        ) : (
          <>
            {renderPredictionCard()}
            {renderRealDataInfo()}
            {renderModelInfo()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  assetScroll: {
    marginVertical: 15,
  },
  assetButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  assetEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  assetName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  assetNameActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dayButton: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 5,
  },
  dayButtonActive: {
    backgroundColor: '#3B82F6',
  },
  dayText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 15,
  },
  predictionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  currentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  currentPrice: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  changeContainer: {
    alignItems: 'flex-end',
  },
  changeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  changePercent: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22C55E',
  },
  negative: {
    color: '#EF4444',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  trendEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  trendInfo: {
    flex: 1,
  },
  trendLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  trendValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  confidenceValue: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  recommendationText: {
    color: '#F59E0B',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  predictionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  predictionItem: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  predDay: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  predPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  predConfidence: {
    color: '#3B82F6',
    fontSize: 11,
  },
  realDataCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  realDataTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  realDataRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  realDataItem: {
    flex: 1,
  },
  realDataLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  realDataValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modelInfoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
    marginBottom: 30,
  },
  modelInfoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modelInfoText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 22,
  },
});
