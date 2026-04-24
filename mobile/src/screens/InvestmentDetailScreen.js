import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import {
  getInvestmentAssetDetail,
  getAIRecommendation,
  buyInvestment,
  sellInvestment,
} from '../services/investmentService';

export default function InvestmentDetailScreen({ route, navigation }) {
  const { assetId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  
  // Trade modal
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [quantity, setQuantity] = useState('');
  const [trading, setTrading] = useState(false);

  useEffect(() => {
    loadAssetDetail();
    loadAIRecommendation();
  }, [assetId]);

  const loadAssetDetail = async () => {
    try {
      setLoading(true);
      const response = await getInvestmentAssetDetail(assetId);
      
      if (response.success) {
        setAsset(response.asset);
        setPriceHistory(response.price_history);
      } else {
        Alert.alert('Hata', 'Varlık detayı yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Load asset detail error:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadAIRecommendation = async () => {
    try {
      setLoadingAI(true);
      const response = await getAIRecommendation(assetId);
      
      if (response.success) {
        setAiRecommendation(response.recommendation);
      }
    } catch (error) {
      console.error('Load AI recommendation error:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleTrade = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir miktar girin');
      return;
    }

    const qty = parseFloat(quantity);
    const totalAmount = qty * asset.current_price;

    Alert.alert(
      `${tradeType === 'buy' ? 'Alım' : 'Satım'} Onayı`,
      `${asset.name} - ${qty} adet\nToplam: ${totalAmount.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
      })} ₺\n\n${tradeType === 'buy' ? 'Almak' : 'Satmak'} istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              setTrading(true);
              
              const response = tradeType === 'buy'
                ? await buyInvestment(assetId, qty, asset.current_price, totalAmount)
                : await sellInvestment(assetId, qty, asset.current_price, totalAmount);

              if (response.success) {
                Alert.alert(
                  'Başarılı',
                  response.message || `${tradeType === 'buy' ? 'Alım' : 'Satım'} işlemi tamamlandı`,
                  [
                    {
                      text: 'Tamam',
                      onPress: () => {
                        setTradeModalVisible(false);
                        setQuantity('');
                        navigation.goBack();
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Trade error:', error);
              Alert.alert('Hata', error.response?.data?.detail || 'İşlem başarısız');
            } finally {
              setTrading(false);
            }
          },
        },
      ]
    );
  };

  const renderPriceChart = () => {
    if (!priceHistory) return null;

    const data = priceHistory[selectedPeriod] || [];
    if (data.length === 0) return null;

    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Fiyat Grafiği</Text>
          <View style={styles.periodSelector}>
            {['7d', '30d', '90d'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === '7d' ? '7G' : period === '30d' ? '30G' : '90G'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.chart}>
          {data.map((point, index) => {
            const heightPercent = priceRange > 0
              ? ((point.price - minPrice) / priceRange) * 100
              : 50;

            return (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor:
                        point.change_percent >= 0 ? '#16A34A' : '#DC2626',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>
            Min: {minPrice.toLocaleString('tr-TR')} ₺
          </Text>
          <Text style={styles.chartFooterText}>
            Max: {maxPrice.toLocaleString('tr-TR')} ₺
          </Text>
        </View>
      </View>
    );
  };

  const renderAIRecommendation = () => {
    if (loadingAI) {
      return (
        <View style={styles.aiLoadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.aiLoadingText}>AI analiz yapıyor...</Text>
        </View>
      );
    }

    if (!aiRecommendation) return null;

    const recommendationColors = {
      AL: { bg: '#DCFCE7', text: '#16A34A', icon: 'trending-up' },
      SAT: { bg: '#FEE2E2', text: '#DC2626', icon: 'trending-down' },
      BEKLE: { bg: '#FEF3C7', text: '#EA580C', icon: 'pause' },
    };

    const config = recommendationColors[aiRecommendation.recommendation] || recommendationColors.BEKLE;

    return (
      <View style={styles.aiContainer}>
        <View style={styles.aiHeader}>
          <Ionicons name="bulb" size={24} color={colors.primary} />
          <Text style={styles.aiTitle}>AI Öneri</Text>
        </View>

        <LinearGradient
          colors={[config.bg, config.bg]}
          style={styles.aiCard}
        >
          <View style={styles.aiRecommendation}>
            <Ionicons name={config.icon} size={32} color={config.text} />
            <Text style={[styles.aiRecommendationText, { color: config.text }]}>
              {aiRecommendation.recommendation}
            </Text>
          </View>

          <View style={styles.aiConfidence}>
            <Text style={styles.aiConfidenceLabel}>Güven: </Text>
            <Text style={styles.aiConfidenceValue}>
              %{(aiRecommendation.confidence * 100).toFixed(0)}
            </Text>
          </View>

          <Text style={styles.aiReason}>{aiRecommendation.reason}</Text>

          <View style={styles.aiDetails}>
            <Text style={styles.aiDetailsTitle}>Detaylı Analiz:</Text>
            <Text style={styles.aiDetailsText}>
              {aiRecommendation.detailed_analysis}
            </Text>
          </View>

          <View style={styles.aiPriceTargets}>
            <View style={styles.aiPriceTarget}>
              <Text style={styles.aiPriceTargetLabel}>Hedef</Text>
              <Text style={styles.aiPriceTargetValue}>
                {aiRecommendation.target_price?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.aiPriceTarget}>
              <Text style={styles.aiPriceTargetLabel}>Stop Loss</Text>
              <Text style={styles.aiPriceTargetValue}>
                {aiRecommendation.stop_loss?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>

          <View style={styles.aiRiskBadge}>
            <Text style={styles.aiRiskText}>
              Risk: {aiRecommendation.risk_level === 'low' ? 'Düşük' : aiRecommendation.risk_level === 'medium' ? 'Orta' : 'Yüksek'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTradeModal = () => (
    <Modal
      visible={tradeModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setTradeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {tradeType === 'buy' ? 'Satın Al' : 'Sat'}
            </Text>
            <TouchableOpacity onPress={() => setTradeModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.assetInfoModal}>
              <Text style={styles.assetNameModal}>{asset?.name}</Text>
              <Text style={styles.assetPriceModal}>
                {asset?.current_price.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })} ₺
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Miktar</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            {quantity && parseFloat(quantity) > 0 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Toplam Tutar</Text>
                <Text style={styles.totalValue}>
                  {(parseFloat(quantity) * asset?.current_price).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })} ₺
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.tradeButton}
              onPress={handleTrade}
              disabled={trading}
            >
              <LinearGradient
                colors={tradeType === 'buy' ? ['#16A34A', '#15803D'] : ['#DC2626', '#B91C1C']}
                style={styles.tradeButtonGradient}
              >
                {trading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.tradeButtonText}>
                    {tradeType === 'buy' ? 'Satın Al' : 'Sat'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Yükleniyor..." onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={styles.container}>
        <Header title="Hata" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Varlık bulunamadı</Text>
        </View>
      </View>
    );
  }

  const isPositive = asset.change_percent >= 0;

  return (
    <View style={styles.container}>
      <Header title={asset.name} subtitle={asset.symbol} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content}>
        {/* Fiyat Kartı */}
        <View style={styles.priceCard}>
          <Text style={styles.currentPriceLabel}>Güncel Fiyat</Text>
          <Text style={styles.currentPrice}>
            {asset.current_price.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })} ₺
          </Text>
          <View
            style={[
              styles.changeContainer,
              { backgroundColor: isPositive ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={20}
              color={isPositive ? '#16A34A' : '#DC2626'}
            />
            <Text
              style={[
                styles.changeText,
                { color: isPositive ? '#16A34A' : '#DC2626' },
              ]}
            >
              {isPositive ? '+' : ''}
              {asset.change_percent.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Grafik */}
        {renderPriceChart()}

        {/* AI Öneri */}
        {renderAIRecommendation()}

        {/* İşlem Butonları */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setTradeType('buy');
              setTradeModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Satın Al</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setTradeType('sell');
              setTradeModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="remove-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Sat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderTradeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  priceCard: {
    backgroundColor: 'white',
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPriceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  currentPrice: {
    fontSize: fontSize.xxl * 1.5,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  changeText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: 'white',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: spacing.sm,
  },
  chartBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
  },
  chartBarFill: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartFooterText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  aiLoadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  aiContainer: {
    backgroundColor: 'white',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  aiCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  aiRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiRecommendationText: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
  aiConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiConfidenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  aiConfidenceValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  aiReason: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  aiDetails: {
    marginBottom: spacing.md,
  },
  aiDetailsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aiDetailsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiPriceTargets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  aiPriceTarget: {
    alignItems: 'center',
  },
  aiPriceTargetLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  aiPriceTargetValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  aiRiskBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  aiRiskText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    paddingBottom: spacing.lg,
  },
  assetInfoModal: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  assetNameModal: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  assetPriceModal: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: colors.primary,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  tradeButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  tradeButtonGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  tradeButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
});
