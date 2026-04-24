import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

export default function FinancialDecisionScreen({ route, navigation }) {
  const { productName, productCategory, selectedPrice, selectedSite, visionData } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [smartInvestment, setSmartInvestment] = useState(null);

  useEffect(() => {
    makeDecision();
  }, []);

  const makeDecision = async () => {
    try {
      setLoading(true);
      
      // Finansal karar al
      const response = await api.post('/vision/financial-decision', {
        product_name: productName,
        product_category: productCategory,
        selected_price: selectedPrice,
        selected_site: selectedSite
      });

      const success = response.data?.success !== false;
      const decisionData = response.data?.data || response.data;
      
      if (success && decisionData) {
        setDecision(decisionData);
        
        // Akıllı yatırım önerisi al (arka planda)
        try {
          const investResponse = await api.get('/smart-investment/market-analysis');
          if (investResponse.data?.success) {
            setSmartInvestment(investResponse.data.data);
          }
        } catch (e) {
          console.log('Smart investment data not available');
        }
      } else {
        Alert.alert('Analiz Yapılamadı', decisionData?.message || 'Lütfen tekrar deneyin');
      }
    } catch (error) {
      console.error('Decision error:', error);
      Alert.alert('Bağlantı Hatası', 'Finansal analiz yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option, type) => {
    setSelectedOption({ ...option, selectedType: type });
  };

  const handleContinue = () => {
    if (!selectedOption) {
      Alert.alert('Uyarı', 'Lütfen bir seçenek seçin');
      return;
    }

    const { action, selectedType } = selectedOption;

    // Akıllı Yatırım seçildiyse
    if (selectedType === 'smart_investment') {
      navigation.navigate('SmartInvestment', {
        targetAmount: selectedPrice,
        productName: productName,
        monthlyIncome: decision?.user_analysis?.monthly_capacity ? decision.user_analysis.monthly_capacity * 2 : 50000,
        monthlyExpenses: decision?.user_analysis?.monthly_capacity || 25000
      });
      return;
    }

    // Diğer seçenekler
    switch (action) {
      case 'cash_payment':
        navigation.navigate('PaymentConfirmation', {
          method: 'cash',
          amount: selectedOption.total_cost,
          productName,
          selectedPrice
        });
        break;
      
      case 'credit_card_installment':
      case 'credit_card_interest':
        navigation.navigate('InstallmentSelection', {
          productName,
          price: selectedPrice,
          term: selectedOption.term_months,
          monthly_payment: selectedOption.monthly_payment,
          interest_rate: selectedOption.interest_rate || 0
        });
        break;
      
      case 'bank_loan':
        navigation.navigate('LoanApplication', {
          productName,
          price: selectedPrice,
          loan_type: selectedOption.loan_type,
          term: selectedOption.term_months,
          monthly_payment: selectedOption.monthly_payment,
          interest_rate: selectedOption.interest_rate
        });
        break;
      
      case 'savings_plan_credit_card':
      case 'savings_plan_loan':
        navigation.navigate('SavingsPlan', {
          productName,
          price: selectedPrice,
          plan: selectedOption
        });
        break;
      
      default:
        Alert.alert('Bilgi', 'Bu özellik yakında eklenecek');
    }
  };

  const getIcon = (type) => {
    const icons = {
      'cash': 'cash-outline',
      'installment': 'card-outline',
      'installment_interest': 'card-outline',
      'loan': 'business-outline',
      'savings_cc': 'wallet-outline',
      'savings_loan': 'trending-up-outline',
      'smart_investment': 'sparkles'
    };
    return icons[type] || 'help-circle-outline';
  };

  const getRiskColor = (level) => {
    const colorMap = {
      'low': colors.success,
      'medium': colors.warning,
      'high': colors.error
    };
    return colorMap[level] || colors.textSecondary;
  };

  const getRiskText = (level) => {
    const textMap = {
      'low': 'Düşük Risk',
      'medium': 'Orta Risk',
      'high': 'Yüksek Risk'
    };
    return textMap[level] || 'Bilinmiyor';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Finansal Analiz" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analiz yapılıyor...</Text>
          <Text style={styles.loadingSubtext}>
            Mali durumunuz değerlendiriliyor ve size en uygun seçenekler belirleniyor
          </Text>
        </View>
      </View>
    );
  }

  const recommendation = decision?.recommendation;
  const alternatives = decision?.alternatives || [];

  // Akıllı Yatırım Seçeneği oluştur
  const smartInvestmentOption = {
    type: 'smart_investment',
    title: '🤖 Akıllı Yatırım ile Biriktir',
    description: smartInvestment 
      ? `Dolar (${smartInvestment.currencies?.USD?.price?.toFixed(2)}₺), Euro (${smartInvestment.currencies?.EUR?.price?.toFixed(2)}₺) ve Altın (${smartInvestment.metals?.gold?.price?.toLocaleString('tr-TR')}₺/gr) yatırımları ile hedefinize ulaşın`
      : 'Dolar, Euro ve Altın yatırımları ile paranızı değerlendirip hedefinize daha hızlı ulaşın',
    monthly_payment: Math.round(selectedPrice / 18),
    total_cost: selectedPrice,
    term_months: 18,
    risk_level: 'medium',
    action: 'smart_investment',
    pros: [
      'Enflasyona karşı koruma',
      'Yatırım getirisi ile hedefe daha hızlı ulaşma',
      'Faiz ödemesi yok'
    ],
    cons: [
      'Piyasa riski mevcut',
      'Sabır gerektirir'
    ],
    investment_tips: smartInvestment ? [
      smartInvestment.currencies?.USD?.trend === 'up' ? '📈 Dolar yükseliş trendinde' : smartInvestment.currencies?.USD?.trend === 'down' ? '📉 Dolar düşüş trendinde' : '➡️ Dolar stabil',
      smartInvestment.currencies?.EUR?.trend === 'up' ? '📈 Euro yükseliş trendinde' : smartInvestment.currencies?.EUR?.trend === 'down' ? '📉 Euro düşüş trendinde' : '➡️ Euro stabil',
      smartInvestment.metals?.gold?.trend === 'up' ? '📈 Altın yükseliş trendinde' : smartInvestment.metals?.gold?.trend === 'down' ? '📉 Altın düşüş trendinde' : '➡️ Altın stabil',
    ] : []
  };

  return (
    <View style={styles.container}>
      <Header title="Ödeme Seçenekleri" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ürün Özeti */}
        <View style={styles.productSummary}>
          <Text style={styles.productName}>{productName}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.siteText}>{selectedSite}</Text>
            <Text style={styles.priceText}>{selectedPrice?.toLocaleString('tr-TR')} TL</Text>
          </View>
        </View>

        {/* AI Mesajı */}
        {decision?.message && (
          <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Ionicons name="bulb" size={24} color={colors.warning} />
              <Text style={styles.messageTitle}>Size Özel Öneri</Text>
            </View>
            <Text style={styles.messageText}>{decision.message}</Text>
          </View>
        )}

        {/* Seçenek Seçimi Bilgisi */}
        <View style={styles.selectionInfo}>
          <Ionicons name="hand-left" size={20} color={colors.primary} />
          <Text style={styles.selectionInfoText}>
            Aşağıdaki seçeneklerden birine dokunarak seçim yapın
          </Text>
        </View>

        {/* 🌟 AKILLI YATIRIM SEÇENEĞİ - EN ÜSTTE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>Akıllı Yatırım Önerisi</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.optionCard,
              styles.smartInvestmentCard,
              selectedOption?.selectedType === 'smart_investment' && styles.optionCardSelected
            ]}
            onPress={() => handleOptionSelect(smartInvestmentOption, 'smart_investment')}
            activeOpacity={0.7}
          >
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={styles.aiBadgeText}>AI Önerisi</Text>
            </View>

            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.smartIconContainer}
                >
                  <Ionicons name="trending-up" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.optionTitleContainer}>
                  <Text style={styles.optionTitle}>{smartInvestmentOption.title}</Text>
                  <Text style={styles.smartSubtitle}>Dolar • Euro • Altın Yatırımı</Text>
                </View>
              </View>
              
              <View style={[styles.radioButton, selectedOption?.selectedType === 'smart_investment' && styles.radioButtonSelected]}>
                {selectedOption?.selectedType === 'smart_investment' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>

            <Text style={styles.optionDescription}>{smartInvestmentOption.description}</Text>

            {/* Güncel Piyasa Bilgileri */}
            {smartInvestment && (
              <View style={styles.marketPreview}>
                <View style={styles.marketItem}>
                  <Text style={styles.marketLabel}>💵 Dolar</Text>
                  <Text style={styles.marketValue}>{smartInvestment.currencies?.USD?.price?.toFixed(2)} ₺</Text>
                  <Text style={[styles.marketTrend, { color: smartInvestment.currencies?.USD?.trend === 'up' ? '#10B981' : smartInvestment.currencies?.USD?.trend === 'down' ? '#EF4444' : '#6B7280' }]}>
                    {smartInvestment.currencies?.USD?.trend === 'up' ? '↑' : smartInvestment.currencies?.USD?.trend === 'down' ? '↓' : '→'}
                  </Text>
                </View>
                <View style={styles.marketItem}>
                  <Text style={styles.marketLabel}>💶 Euro</Text>
                  <Text style={styles.marketValue}>{smartInvestment.currencies?.EUR?.price?.toFixed(2)} ₺</Text>
                  <Text style={[styles.marketTrend, { color: smartInvestment.currencies?.EUR?.trend === 'up' ? '#10B981' : smartInvestment.currencies?.EUR?.trend === 'down' ? '#EF4444' : '#6B7280' }]}>
                    {smartInvestment.currencies?.EUR?.trend === 'up' ? '↑' : smartInvestment.currencies?.EUR?.trend === 'down' ? '↓' : '→'}
                  </Text>
                </View>
                <View style={styles.marketItem}>
                  <Text style={styles.marketLabel}>🥇 Altın</Text>
                  <Text style={styles.marketValue}>{(smartInvestment.metals?.gold?.price / 1000)?.toFixed(1)}K ₺</Text>
                  <Text style={[styles.marketTrend, { color: smartInvestment.metals?.gold?.trend === 'up' ? '#10B981' : smartInvestment.metals?.gold?.trend === 'down' ? '#EF4444' : '#6B7280' }]}>
                    {smartInvestment.metals?.gold?.trend === 'up' ? '↑' : smartInvestment.metals?.gold?.trend === 'down' ? '↓' : '→'}
                  </Text>
                </View>
              </View>
            )}

            {/* Detaylar */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tahmini Süre:</Text>
                <Text style={styles.detailValue}>{smartInvestmentOption.term_months} ay</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Aylık Birikim (örnek):</Text>
                <Text style={styles.detailValue}>
                  {smartInvestmentOption.monthly_payment.toLocaleString('tr-TR')} TL
                </Text>
              </View>
            </View>

            {/* Avantajlar */}
            <View style={styles.prosContainer}>
              <Text style={styles.prosTitle}>✓ Avantajlar</Text>
              {smartInvestmentOption.pros.map((pro, index) => (
                <Text key={index} style={styles.prosText}>• {pro}</Text>
              ))}
            </View>

            <View style={[styles.riskBadge, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={[styles.riskText, { color: '#10B981' }]}>
                Enflasyona Karşı Koruma
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Önerilen Kredi/Taksit Seçeneği */}
        {recommendation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <Text style={styles.sectionTitle}>Kredi / Taksit Seçenekleri</Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.recommendedCard,
                selectedOption?.type === recommendation.type && selectedOption?.selectedType !== 'smart_investment' && styles.optionCardSelected
              ]}
              onPress={() => handleOptionSelect(recommendation, recommendation.type)}
              activeOpacity={0.7}
            >
              <View style={styles.recommendedBadge}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.recommendedText}>Önerilen</Text>
              </View>

              <View style={styles.optionHeader}>
                <View style={styles.optionTitleRow}>
                  <Ionicons name={getIcon(recommendation.type)} size={28} color={colors.primary} />
                  <Text style={styles.optionTitle}>{recommendation.title}</Text>
                </View>
                
                <View style={[styles.radioButton, selectedOption?.type === recommendation.type && selectedOption?.selectedType !== 'smart_investment' && styles.radioButtonSelected]}>
                  {selectedOption?.type === recommendation.type && selectedOption?.selectedType !== 'smart_investment' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>

              <Text style={styles.optionDescription}>{recommendation.description}</Text>

              <View style={styles.detailsContainer}>
                {recommendation.monthly_payment > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aylık Ödeme:</Text>
                    <Text style={styles.detailValue}>
                      {recommendation.monthly_payment.toLocaleString('tr-TR')} TL
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Toplam Maliyet:</Text>
                  <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '700' }]}>
                    {recommendation.total_cost.toLocaleString('tr-TR')} TL
                  </Text>
                </View>

                {recommendation.term_months > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vade:</Text>
                    <Text style={styles.detailValue}>{recommendation.term_months} ay</Text>
                  </View>
                )}
              </View>

              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(recommendation.risk_level) + '20' }]}>
                <Ionicons name="shield-checkmark" size={14} color={getRiskColor(recommendation.risk_level)} />
                <Text style={[styles.riskText, { color: getRiskColor(recommendation.risk_level) }]}>
                  {getRiskText(recommendation.risk_level)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Diğer Seçenekler */}
        {alternatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diğer Seçenekler</Text>
            
            {alternatives.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  selectedOption?.type === option.type && selectedOption?.selectedType !== 'smart_investment' && styles.optionCardSelected
                ]}
                onPress={() => handleOptionSelect(option, option.type)}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.optionTitleRow}>
                    <Ionicons name={getIcon(option.type)} size={24} color={colors.textSecondary} />
                    <Text style={styles.optionTitle}>{option.title}</Text>
                  </View>
                  
                  <View style={[styles.radioButton, selectedOption?.type === option.type && selectedOption?.selectedType !== 'smart_investment' && styles.radioButtonSelected]}>
                    {selectedOption?.type === option.type && selectedOption?.selectedType !== 'smart_investment' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>

                <Text style={styles.optionDescription}>{option.description}</Text>

                <View style={styles.detailsContainer}>
                  {option.monthly_payment > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Aylık Ödeme:</Text>
                      <Text style={styles.detailValue}>
                        {option.monthly_payment.toLocaleString('tr-TR')} TL
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Toplam:</Text>
                    <Text style={styles.detailValue}>
                      {option.total_cost.toLocaleString('tr-TR')} TL
                    </Text>
                  </View>
                </View>

                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(option.risk_level) + '20' }]}>
                  <Ionicons name="shield-checkmark" size={14} color={getRiskColor(option.risk_level)} />
                  <Text style={[styles.riskText, { color: getRiskColor(option.risk_level) }]}>
                    {getRiskText(option.risk_level)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Seçili Seçenek Özeti */}
        {selectedOption && (
          <View style={styles.selectedSummary}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.selectedSummaryText}>
              Seçilen: {selectedOption.title}
            </Text>
          </View>
        )}

        {/* Devam Butonu */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedOption && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedOption}
          >
            <LinearGradient
              colors={!selectedOption ? ['#9CA3AF', '#9CA3AF'] : [colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                {selectedOption 
                  ? (selectedOption.selectedType === 'smart_investment' ? 'Yatırım Planı Oluştur' : 'Devam Et')
                  : 'Bir seçenek seçin'}
              </Text>
              {selectedOption && (
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  productSummary: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  messageCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  messageTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: spacing.sm,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: '#92400E',
    lineHeight: 20,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  selectionInfoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  smartInvestmentCard: {
    borderColor: '#10B98140',
    backgroundColor: '#10B98108',
  },
  recommendedCard: {
    position: 'relative',
  },
  aiBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  smartSubtitle: {
    fontSize: fontSize.xs,
    color: '#10B981',
    marginTop: 2,
  },
  smartIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  marketPreview: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    justifyContent: 'space-around',
  },
  marketItem: {
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  marketValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  marketTrend: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  detailsContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  prosContainer: {
    marginBottom: spacing.sm,
  },
  prosTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 4,
  },
  prosText: {
    fontSize: fontSize.xs,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  riskText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  selectedSummaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#065F46',
  },
  bottomContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  continueButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
