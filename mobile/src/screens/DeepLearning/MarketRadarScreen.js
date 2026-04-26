import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

const { width } = Dimensions.get('window');

const ASSETS = [
  { id: 'gold', name: 'Altın', emoji: '🥇' },
  { id: 'usd', name: 'Dolar', emoji: '💵' },
  { id: 'eur', name: 'Euro', emoji: '💶' },
  { id: 'bist100', name: 'BIST', emoji: '📈' },
  { id: 'btc', name: 'Bitcoin', emoji: '₿' },
];

export default function MarketRadarScreen({ navigation }) {
  const [selectedAssets, setSelectedAssets] = useState(['gold', 'usd', 'eur', 'bist100']);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalysis();
  }, [selectedAssets]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const assetsParam = selectedAssets.join(',');
      const response = await api.get(`/deep-learning/market-transformer?assets=${assetsParam}&days=7`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Market analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysis();
    setRefreshing(false);
  };

  const toggleAsset = (assetId) => {
    if (selectedAssets.includes(assetId)) {
      if (selectedAssets.length > 1) {
        setSelectedAssets(selectedAssets.filter(a => a !== assetId));
      }
    } else {
      setSelectedAssets([...selectedAssets, assetId]);
    }
  };

  const renderAssetSelector = () => (
    <View style={styles.assetSelector}>
      <Text style={styles.selectorTitle}>Analiz Edilecek Varlıklar</Text>
      <View style={styles.assetGrid}>
        {ASSETS.map((asset) => (
          <TouchableOpacity
            key={asset.id}
            style={[
              styles.assetChip,
              selectedAssets.includes(asset.id) && styles.assetChipActive
            ]}
            onPress={() => toggleAsset(asset.id)}
          >
            <Text style={styles.assetEmoji}>{asset.emoji}</Text>
            <Text style={[
              styles.assetName,
              selectedAssets.includes(asset.id) && styles.assetNameActive
            ]}>
              {asset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSentiment = () => {
    if (!analysis?.market_sentiment) return null;
    const sentiment = analysis.market_sentiment;

    return (
      <View style={styles.sentimentCard}>
        <Text style={styles.sentimentEmoji}>{sentiment.emoji}</Text>
        <View style={styles.sentimentInfo}>
          <Text style={styles.sentimentTitle}>Piyasa Duygusu</Text>
          <Text style={styles.sentimentValue}>{sentiment.overall}</Text>
        </View>
        <View style={styles.sentimentCounts}>
          <View style={styles.sentimentCount}>
            <Text style={[styles.countValue, { color: '#22C55E' }]}>{sentiment.bullish_count}</Text>
            <Text style={styles.countLabel}>Yükseliş</Text>
          </View>
          <View style={styles.sentimentCount}>
            <Text style={[styles.countValue, { color: '#EF4444' }]}>{sentiment.bearish_count}</Text>
            <Text style={styles.countLabel}>Düşüş</Text>
          </View>
          <View style={styles.sentimentCount}>
            <Text style={[styles.countValue, { color: '#F59E0B' }]}>{sentiment.neutral_count}</Text>
            <Text style={styles.countLabel}>Nötr</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAssetAnalysis = (assetData) => {
    const { asset, info, current_price, changes, technical_indicators, recommendation, confidence_score } = assetData;

    return (
      <View key={asset} style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <View style={styles.assetTitle}>
            <Text style={styles.assetCardEmoji}>{info?.emoji}</Text>
            <View>
              <Text style={styles.assetCardName}>{info?.name}</Text>
              <Text style={styles.assetCategory}>{info?.category}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {current_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.priceUnit}>{info?.unit}</Text>
          </View>
        </View>

        {/* Değişimler */}
        <View style={styles.changesRow}>
          <View style={styles.changeItem}>
            <Text style={styles.changeLabel}>Günlük</Text>
            <Text style={[
              styles.changeValue,
              changes?.daily >= 0 ? styles.positive : styles.negative
            ]}>
              {changes?.daily >= 0 ? '+' : ''}{changes?.daily?.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.changeItem}>
            <Text style={styles.changeLabel}>Haftalık</Text>
            <Text style={[
              styles.changeValue,
              changes?.weekly >= 0 ? styles.positive : styles.negative
            ]}>
              {changes?.weekly >= 0 ? '+' : ''}{changes?.weekly?.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.changeItem}>
            <Text style={styles.changeLabel}>Aylık</Text>
            <Text style={[
              styles.changeValue,
              changes?.monthly >= 0 ? styles.positive : styles.negative
            ]}>
              {changes?.monthly >= 0 ? '+' : ''}{changes?.monthly?.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Teknik Göstergeler */}
        <View style={styles.indicatorsRow}>
          <View style={styles.indicator}>
            <Text style={styles.indicatorLabel}>RSI</Text>
            <Text style={[
              styles.indicatorValue,
              technical_indicators?.rsi > 70 ? styles.overbought :
              technical_indicators?.rsi < 30 ? styles.oversold : styles.neutral
            ]}>
              {technical_indicators?.rsi?.toFixed(1)}
            </Text>
          </View>
          <View style={styles.indicator}>
            <Text style={styles.indicatorLabel}>Volatilite</Text>
            <Text style={styles.indicatorValue}>
              %{technical_indicators?.volatility?.toFixed(1)}
            </Text>
          </View>
          <View style={styles.indicator}>
            <Text style={styles.indicatorLabel}>Güven</Text>
            <Text style={[styles.indicatorValue, { color: '#3B82F6' }]}>
              %{(confidence_score * 100).toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Trend */}
        <View style={styles.trendRow}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Kısa Vade</Text>
            <Text style={styles.trendValue}>{technical_indicators?.short_term_trend}</Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Uzun Vade</Text>
            <Text style={styles.trendValue}>{technical_indicators?.long_term_trend}</Text>
          </View>
        </View>

        {/* Öneri */}
        <View style={styles.recommendationContainer}>
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      </View>
    );
  };

  const renderPortfolio = () => {
    if (!analysis?.portfolio_recommendation) return null;
    const portfolio = analysis.portfolio_recommendation;

    return (
      <View style={styles.portfolioCard}>
        <Text style={styles.portfolioTitle}>🎯 Portföy Önerisi</Text>
        
        <View style={styles.allocationContainer}>
          {Object.entries(portfolio.suggested_allocation || {}).map(([asset, percentage]) => {
            const assetInfo = ASSETS.find(a => a.id === asset);
            return (
              <View key={asset} style={styles.allocationItem}>
                <Text style={styles.allocationEmoji}>{assetInfo?.emoji || '📊'}</Text>
                <View style={styles.allocationBarContainer}>
                  <View style={[styles.allocationBar, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.allocationPercent}>%{percentage}</Text>
              </View>
            );
          })}
        </View>

        {portfolio.reasons?.length > 0 && (
          <View style={styles.reasonsContainer}>
            {portfolio.reasons.map((reason, index) => (
              <Text key={index} style={styles.reasonText}>• {reason}</Text>
            ))}
          </View>
        )}

        <View style={styles.portfolioFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={styles.footerText}>Risk: {portfolio.risk_level}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="refresh" size={16} color="#3B82F6" />
            <Text style={styles.footerText}>{portfolio.rebalance_frequency}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCorrelation = () => {
    if (!analysis?.correlation_matrix) return null;
    const correlations = Object.entries(analysis.correlation_matrix);

    if (correlations.length === 0) return null;

    return (
      <View style={styles.correlationCard}>
        <Text style={styles.correlationTitle}>🔗 Korelasyon Matrisi</Text>
        {correlations.map(([pair, value]) => {
          const [asset1, asset2] = pair.split('_');
          const emoji1 = ASSETS.find(a => a.id === asset1)?.emoji || '';
          const emoji2 = ASSETS.find(a => a.id === asset2)?.emoji || '';

          return (
            <View key={pair} style={styles.correlationItem}>
              <Text style={styles.correlationPair}>{emoji1} - {emoji2}</Text>
              <View style={styles.correlationBarContainer}>
                <View style={[
                  styles.correlationBar,
                  { 
                    width: `${Math.abs(value) * 100}%`,
                    backgroundColor: value >= 0 ? '#22C55E' : '#EF4444'
                  }
                ]} />
              </View>
              <Text style={styles.correlationValue}>{value.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderModelInfo = () => (
    <View style={styles.modelCard}>
      <Text style={styles.modelTitle}>🧠 Transformer Encoder</Text>
      <View style={styles.modelDetails}>
        <Text style={styles.modelText}>• Multi-Head Attention: 4 heads</Text>
        <Text style={styles.modelText}>• Model Dimension: 64</Text>
        <Text style={styles.modelText}>• Feed-Forward: 256</Text>
        <Text style={styles.modelText}>• Layers: 2</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📡 Piyasa Radar</Text>
          <Text style={styles.headerSubtitle}>Transformer Analizi</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {renderAssetSelector()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Transformer modeli çalışıyor...</Text>
          </View>
        ) : (
          <>
            {renderSentiment()}
            
            {analysis?.asset_analyses?.map(renderAssetAnalysis)}
            
            {renderPortfolio()}
            {renderCorrelation()}
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
  assetSelector: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
  },
  selectorTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 10,
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  assetChipActive: {
    backgroundColor: '#3B82F6',
  },
  assetEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  assetName: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  assetNameActive: {
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
  sentimentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  sentimentInfo: {
    flex: 1,
  },
  sentimentTitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  sentimentValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sentimentCounts: {
    flexDirection: 'row',
  },
  sentimentCount: {
    alignItems: 'center',
    marginLeft: 15,
  },
  countValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  countLabel: {
    color: '#6B7280',
    fontSize: 10,
  },
  assetCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  assetTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetCardEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  assetCardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assetCategory: {
    color: '#6B7280',
    fontSize: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceUnit: {
    color: '#6B7280',
    fontSize: 11,
  },
  changesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  changeItem: {
    alignItems: 'center',
  },
  changeLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22C55E',
  },
  negative: {
    color: '#EF4444',
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  indicator: {
    alignItems: 'center',
    flex: 1,
  },
  indicatorLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  indicatorValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overbought: {
    color: '#EF4444',
  },
  oversold: {
    color: '#22C55E',
  },
  neutral: {
    color: '#F59E0B',
  },
  trendRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  trendItem: {
    flex: 1,
  },
  trendLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  trendValue: {
    color: '#fff',
    fontSize: 13,
  },
  recommendationContainer: {
    backgroundColor: '#3B82F620',
    borderRadius: 8,
    padding: 10,
  },
  recommendationText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  portfolioCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
  },
  portfolioTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  allocationContainer: {
    marginBottom: 15,
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  allocationEmoji: {
    fontSize: 20,
    width: 30,
  },
  allocationBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    marginHorizontal: 10,
  },
  allocationBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  allocationPercent: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  reasonsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  reasonText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  portfolioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 6,
  },
  correlationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
  },
  correlationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  correlationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  correlationPair: {
    color: '#fff',
    fontSize: 16,
    width: 60,
  },
  correlationBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  correlationBar: {
    height: '100%',
    borderRadius: 4,
  },
  correlationValue: {
    color: '#9CA3AF',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  modelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    marginBottom: 30,
  },
  modelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modelDetails: {},
  modelText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
});
