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

export default function SimpleFinancialScreen({ route, navigation }) {
  const { productName, productCategory, selectedPrice, selectedSite, visionData } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [marketData, setMarketData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Piyasa verileri
      const marketResponse = await api.get('/smart-investment/market-analysis');
      if (marketResponse.data?.success) {
        setMarketData(marketResponse.data.data);
      }
    } catch (error) {
      console.log('Market data not available');
    } finally {
      setLoading(false);
    }
  };

  // Hesaplamalar
  const monthlyPayment12 = Math.round(selectedPrice / 12);
  const monthlyPayment24 = Math.round(selectedPrice / 24);
  const monthlyPayment36 = Math.round(selectedPrice / 36);
  const loanInterest = 3.5; // %3.5 aylık faiz
  const loanTotal = Math.round(selectedPrice * 1.42); // 12 ay için toplam
  const loanMonthly = Math.round(loanTotal / 12);

  const options = [
    {
      id: 'investment',
      icon: 'trending-up',
      iconColor: '#10B981',
      title: 'Biriktir ve Al',
      subtitle: 'Yatırım yaparak biriktir',
      description: `Aylık ${monthlyPayment12.toLocaleString('tr-TR')} TL biriktirerek 12 ayda hedefe ulaşın`,
      badge: '✨ Önerilen',
      badgeColor: '#10B981',
      details: [
        { label: 'Aylık Birikim', value: `${monthlyPayment12.toLocaleString('tr-TR')} TL` },
        { label: 'Süre', value: '12 ay' },
        { label: 'Faiz Ödemesi', value: 'Yok ✓', highlight: true },
      ],
      action: 'investment'
    },
    {
      id: 'installment',
      icon: 'card',
      iconColor: '#3B82F6',
      title: 'Taksitle Al',
      subtitle: 'Kredi kartı ile taksitli alım',
      description: 'Kredi kartınızla faizsiz taksit imkanı',
      details: [
        { label: '12 Taksit', value: `${monthlyPayment12.toLocaleString('tr-TR')} TL/ay` },
        { label: '24 Taksit', value: `${monthlyPayment24.toLocaleString('tr-TR')} TL/ay` },
        { label: '36 Taksit', value: `${monthlyPayment36.toLocaleString('tr-TR')} TL/ay` },
      ],
      action: 'installment'
    },
    {
      id: 'loan',
      icon: 'business',
      iconColor: '#8B5CF6',
      title: 'Kredi Çek',
      subtitle: 'İhtiyaç kredisi ile hemen al',
      description: `12 ay vadeli ihtiyaç kredisi`,
      details: [
        { label: 'Kredi Tutarı', value: `${selectedPrice.toLocaleString('tr-TR')} TL` },
        { label: 'Aylık Ödeme', value: `${loanMonthly.toLocaleString('tr-TR')} TL` },
        { label: 'Toplam Ödeme', value: `${loanTotal.toLocaleString('tr-TR')} TL` },
      ],
      action: 'loan'
    }
  ];

  const handleContinue = () => {
    if (!selectedOption) {
      Alert.alert('Uyarı', 'Lütfen bir seçenek seçin');
      return;
    }

    switch (selectedOption.action) {
      case 'investment':
        navigation.navigate('SmartInvestment', {
          targetAmount: selectedPrice,
          productName: productName,
          monthlyIncome: 50000,
          monthlyExpenses: 25000
        });
        break;
      
      case 'installment':
        navigation.navigate('InstallmentSelection', {
          productName,
          price: selectedPrice,
          term: 12,
          monthly_payment: monthlyPayment12,
          interest_rate: 0
        });
        break;
      
      case 'loan':
        navigation.navigate('LoanApplication', {
          productName,
          price: selectedPrice,
          loan_type: 'ihtiyac',
          term: 12,
          monthly_payment: loanMonthly,
          interest_rate: loanInterest
        });
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Finansman Seçenekleri" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Seçenekler hazırlanıyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Nasıl Almak İstersiniz?" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ürün Özeti */}
        <LinearGradient
          colors={['#7C3AED', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.productCard}
        >
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{productName}</Text>
            <Text style={styles.productSite}>{selectedSite}</Text>
          </View>
          <Text style={styles.productPrice}>{selectedPrice?.toLocaleString('tr-TR')} ₺</Text>
        </LinearGradient>

        {/* Seçenekler */}
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = selectedOption?.id === option.id;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelectedOption(option)}
                activeOpacity={0.7}
              >
                {/* Badge */}
                {option.badge && (
                  <View style={[styles.badge, { backgroundColor: option.badgeColor }]}>
                    <Text style={styles.badgeText}>{option.badge}</Text>
                  </View>
                )}

                {/* Header */}
                <View style={styles.optionHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: option.iconColor + '20' }]}>
                    <Ionicons name={option.icon} size={24} color={option.iconColor} />
                  </View>
                  
                  <View style={styles.optionTitleContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>

                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>

                {/* Detaylar */}
                <View style={styles.detailsBox}>
                  {option.details.map((detail, index) => (
                    <View key={index} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{detail.label}</Text>
                      <Text style={[
                        styles.detailValue,
                        detail.highlight && styles.detailHighlight
                      ]}>
                        {detail.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Piyasa Bilgisi (Yatırım seçildiyse) */}
        {selectedOption?.action === 'investment' && marketData && (
          <View style={styles.marketInfo}>
            <Text style={styles.marketTitle}>📊 Güncel Piyasa</Text>
            <View style={styles.marketRow}>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Dolar</Text>
                <Text style={styles.marketValue}>
                  {marketData.currencies?.USD?.price?.toFixed(2)} ₺
                </Text>
              </View>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Euro</Text>
                <Text style={styles.marketValue}>
                  {marketData.currencies?.EUR?.price?.toFixed(2)} ₺
                </Text>
              </View>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Altın</Text>
                <Text style={styles.marketValue}>
                  {(marketData.metals?.gold?.price / 1000)?.toFixed(1)}K ₺
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Devam Butonu */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedOption && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedOption}
          >
            <LinearGradient
              colors={!selectedOption ? ['#9CA3AF', '#9CA3AF'] : ['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {selectedOption ? 'Devam Et' : 'Seçim Yapın'}
              </Text>
              {selectedOption && <Ionicons name="arrow-forward" size={20} color="#fff" />}
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  productCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  productSite: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  productPrice: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#fff',
  },
  optionsContainer: {
    paddingHorizontal: spacing.md,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  detailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
  detailHighlight: {
    color: '#10B981',
  },
  marketInfo: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
  },
  marketTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  marketItem: {
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  marketValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  bottomContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  continueButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
});
