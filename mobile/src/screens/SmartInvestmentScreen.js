import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

const { width } = Dimensions.get('window');

// Trend ikonu
const TrendIcon = ({ trend, size = 16 }) => {
  if (trend === 'up') return <Ionicons name="trending-up" size={size} color="#10B981" />;
  if (trend === 'down') return <Ionicons name="trending-down" size={size} color="#EF4444" />;
  return <Ionicons name="remove" size={size} color="#6B7280" />;
};

// Risk seviyesi rengi
const getRiskColor = (level) => {
  switch (level) {
    case 'low': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'high': return '#EF4444';
    default: return colors.textSecondary;
  }
};

// Dağılım yüzdesi renkleri
const allocationColors = {
  tl_savings: '#6366F1',
  gold: '#F59E0B',
  usd: '#10B981',
  eur: '#3B82F6',
};

export default function SmartInvestmentScreen({ route, navigation }) {
  const { 
    targetAmount: initialTarget, 
    productName: initialProduct,
    monthlyIncome: initialIncome,
    monthlyExpenses: initialExpenses,
    planId: existingPlanId,
    action: initialAction
  } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [investmentPlan, setInvestmentPlan] = useState(null);
  const [strategies, setStrategies] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditRecommendation, setCreditRecommendation] = useState(null);
  const [existingPlan, setExistingPlan] = useState(null);
  const [showContributeModal, setShowContributeModal] = useState(initialAction === 'contribute');
  const [contributeAmount, setContributeAmount] = useState('');
  const [selectedCreditOption, setSelectedCreditOption] = useState(null); // Seçilen kredi seçeneği
  
  // Milestone Kredi Popup State
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [milestoneNotification, setMilestoneNotification] = useState(null);

  // Form state
  const [productName, setProductName] = useState(initialProduct || '');
  const [targetAmount, setTargetAmount] = useState(initialTarget?.toString() || '');
  const [monthlyIncome, setMonthlyIncome] = useState(initialIncome?.toString() || '');
  const [monthlyExpenses, setMonthlyExpenses] = useState(initialExpenses?.toString() || '');
  const [existingSavings, setExistingSavings] = useState('0');
  const [riskTolerance, setRiskTolerance] = useState('medium');
  const [durationMonths, setDurationMonths] = useState('12');
  const [investmentMode, setInvestmentMode] = useState('auto'); // 'auto' or 'manual'
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [customAllocation, setCustomAllocation] = useState({
    tl_savings: 25,
    gold: 25,
    usd: 25,
    eur: 25
  });
  
  // Varlık alım state'leri
  const [showBuyAssetModal, setShowBuyAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [marketPrices, setMarketPrices] = useState(null);

  useEffect(() => {
    loadMarketData();
    loadStrategies();
    if (existingPlanId) {
      loadExistingPlan();
      loadMarketPrices();
    }
  }, [existingPlanId]);

  const loadMarketPrices = async () => {
    try {
      const response = await api.get('/savings-investment/market-prices');
      if (response.data.success) {
        setMarketPrices(response.data);
      }
    } catch (error) {
      console.error('Market prices error:', error);
    }
  };

  const loadExistingPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/savings-investment/${existingPlanId}`);
      if (response.data.success) {
        setExistingPlan(response.data);
        // Mevcut plan varsa direkt plan görünümüne git
        setInvestmentPlan({
          estimate: response.data.investment_summary,
          allocation: response.data.plan?.allocation,
          can_reach_target: response.data.progress?.on_track,
          ai_recommendation: response.data.plan?.ai_recommendation
        });
        setCreditRecommendation(response.data.credit_recommendation);
        setStep(4); // Plan detay görünümü
        
        // Milestone bildirimi varsa popup göster
        if (response.data.milestone_check?.milestone_changed && response.data.milestone_check?.notification) {
          setMilestoneNotification({
            title: response.data.milestone_check.notification.title,
            body: response.data.milestone_check.notification.body,
            previousProgress: response.data.milestone_check.previous_progress,
            currentProgress: response.data.milestone_check.current_progress,
            productName: response.data.plan?.product_name
          });
          setShowMilestonePopup(true);
        }
      }
    } catch (error) {
      console.error('Load existing plan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategies = async () => {
    try {
      const response = await api.get('/savings-investment/strategies');
      if (response.data.success) {
        setStrategies(response.data);
      }
    } catch (error) {
      console.error('Strategies load error:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      const response = await api.get('/smart-investment/market-analysis');
      if (response.data.success) {
        setMarketData(response.data.data);
      }
    } catch (error) {
      console.error('Market data error:', error);
    }
  };

  const handleContribute = async () => {
    const amount = parseFloat(parseNumber(contributeAmount));
    if (!amount || amount <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/savings-investment/${existingPlanId}/contribute`, {
        amount: amount,
        note: 'Manuel ekleme'
      });

      if (response.data.success) {
        setShowContributeModal(false);
        setContributeAmount('');
        
        // Milestone bildirimi varsa popup göster
        if (response.data.milestone_notification?.sent) {
          setMilestoneNotification({
            title: response.data.milestone_notification.title,
            body: `Birikiminizin %${Math.round(response.data.milestone_notification.previous_progress)}'inden %${Math.round(response.data.milestone_notification.current_progress)}'ine ulaştınız! Şimdi kredi çekerek hedefinize kavuşabilirsiniz.`,
            previousProgress: response.data.milestone_notification.previous_progress,
            currentProgress: response.data.milestone_notification.current_progress,
            productName: existingPlan?.plan?.product_name
          });
          setShowMilestonePopup(true);
        } else {
          Alert.alert(
            '✅ Para Eklendi',
            response.data.message || `${amount.toLocaleString('tr-TR')} TL başarıyla eklendi.`,
            [{ text: 'Tamam' }]
          );
        }
        
        loadExistingPlan(); // Planı yeniden yükle
      }
    } catch (error) {
      console.error('Contribute error:', error);
      Alert.alert('Hata', 'Para eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyAsset = async () => {
    const amount = parseFloat(parseNumber(buyAmount));
    if (!amount || amount <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tutar girin');
      return;
    }

    if (!selectedAsset) {
      Alert.alert('Uyarı', 'Lütfen bir varlık seçin');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/savings-investment/${existingPlanId}/buy-asset`, {
        asset_type: selectedAsset.key,
        amount_tl: amount
      });

      if (response.data.success) {
        const result = response.data;
        Alert.alert(
          `${result.asset_info.emoji} ${result.asset_info.name} Alındı!`,
          `${result.units_bought.toFixed(4)} ${result.asset_info.unit} satın aldınız.\n\nBirim Fiyat: ${result.unit_price.toLocaleString('tr-TR')} TL`,
          [{ text: 'Tamam', onPress: () => {
            setShowBuyAssetModal(false);
            setBuyAmount('');
            setSelectedAsset(null);
            loadExistingPlan(); // Planı yeniden yükle
            loadMarketPrices(); // Fiyatları güncelle
          }}]
        );
      }
    } catch (error) {
      console.error('Buy asset error:', error);
      Alert.alert('Hata', 'Varlık satın alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (text) => {
    const num = text.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseNumber = (text) => {
    return text.replace(/\./g, '');
  };

  const generatePlan = async () => {
    const target = parseFloat(parseNumber(targetAmount));
    const income = parseFloat(parseNumber(monthlyIncome));
    const duration = parseInt(durationMonths) || 12;
    
    if (!target || target <= 0) {
      Alert.alert('Uyarı', 'Lütfen hedef tutarı girin');
      return;
    }
    if (!income || income <= 0) {
      Alert.alert('Uyarı', 'Lütfen aylık gelirinizi girin');
      return;
    }

    try {
      setLoading(true);
      setStep(2);

      // Yeni birikim + yatırım endpoint'i kullan
      const requestData = {
        product_name: productName || 'Hedef',
        target_amount: target,
        monthly_contribution: income - (parseFloat(parseNumber(monthlyExpenses)) || 0),
        duration_months: duration,
        risk_profile: riskTolerance,
        existing_savings: parseFloat(parseNumber(existingSavings)) || 0,
        auto_invest: true,
        use_ai_allocation: investmentMode === 'auto'  // AI modunda AI önerisi kullan
      };

      // Manuel mod seçildiyse strateji veya özel dağılım ekle
      if (investmentMode === 'manual') {
        requestData.use_ai_allocation = false;
        if (selectedStrategy) {
          requestData.strategy = selectedStrategy;
        } else {
          requestData.custom_allocation = customAllocation;
        }
      }

      const response = await api.post('/savings-investment/estimate', requestData);

      if (response.data.success) {
        setInvestmentPlan(response.data);
        setCreditRecommendation(response.data.credit_recommendation);
        setStep(3);
      } else {
        Alert.alert('Hata', 'Plan oluşturulamadı');
        setStep(1);
      }
    } catch (error) {
      console.error('Plan generation error:', error);
      Alert.alert('Hata', 'Plan oluşturulurken bir hata oluştu');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const applyPlan = async () => {
    try {
      const target = parseFloat(parseNumber(targetAmount));
      const income = parseFloat(parseNumber(monthlyIncome));
      const duration = parseInt(durationMonths) || 12;
      const monthlyContribution = income - (parseFloat(parseNumber(monthlyExpenses)) || 0);

      const requestData = {
        product_name: productName || 'Akıllı Birikim Planı',
        target_amount: target,
        monthly_contribution: monthlyContribution,
        duration_months: duration,
        risk_profile: riskTolerance,
        existing_savings: parseFloat(parseNumber(existingSavings)) || 0,
        auto_invest: true,
        use_ai_allocation: investmentMode === 'auto'  // AI modunda AI önerisi kullan
      };

      if (investmentMode === 'manual') {
        requestData.use_ai_allocation = false;
        if (selectedStrategy) {
          requestData.strategy = selectedStrategy;
        } else {
          requestData.custom_allocation = customAllocation;
        }
      }

      const response = await api.post('/savings-investment/create', requestData);

      if (response.data.success) {
        Alert.alert(
          '✅ Birikim + Yatırım Planı Oluşturuldu',
          `${productName || 'Hedef'} için ${duration} aylık plan başlatıldı.\n\nAylık ${monthlyContribution.toLocaleString('tr-TR')} TL otomatik olarak yatırım araçlarına dağıtılacak.`,
          [{ text: 'Tamam', onPress: () => navigation.navigate('Main') }]
        );
      }
    } catch (error) {
      console.error('Apply plan error:', error);
      Alert.alert('Hata', 'Plan kaydedilemedi');
    }
  };

  const applyCreditAndPlan = async () => {
    // Seçili kredi seçeneğini veya best_option'ı kullan
    const creditOption = selectedCreditOption || creditRecommendation?.best_option;
    
    if (!creditOption) {
      Alert.alert('Uyarı', 'Lütfen bir kredi seçeneği seçin');
      return;
    }

    try {
      // Önce planı oluştur
      await applyPlan();

      // Sonra kredi başvurusu yap
      const creditResponse = await api.post('/credit/apply', {
        loan_type: 'consumer_loan',
        amount: creditOption.monthly_payment * creditOption.duration_months,
        term: creditOption.duration_months,
        monthly_payment: creditOption.monthly_payment,
        interest_rate: creditOption.interest_rate || creditRecommendation?.annual_rate || 48,
        purpose: `${productName} alımı`
      });

      if (creditResponse.data.success) {
        setShowCreditModal(false);
        setSelectedCreditOption(null);
        Alert.alert(
          '🏦 Kredi Başvurusu Alındı',
          `Plan oluşturuldu ve ${creditOption.duration_months} ay vadeli kredi başvurunuz değerlendirmeye alındı.`,
          [{ text: 'Tamam', onPress: () => navigation.navigate('Main') }]
        );
      }
    } catch (error) {
      console.error('Credit application error:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  // Step 1: Form
  const renderForm = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#00A19A', '#00857F', '#007A75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="sparkles" size={28} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Akıllı Birikim Asistanı</Text>
          <Text style={styles.heroSubtitle}>
            Hedefinize ulaşmak için en uygun yatırım stratejisini belirleyin
          </Text>
        </View>
        
        {/* Animated dots */}
        <View style={styles.heroDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </LinearGradient>

      {/* Piyasa Kartları */}
      {marketData && (
        <View style={styles.marketCardsContainer}>
          <Text style={styles.marketTitle}>Güncel Piyasa</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.marketScroll}
            contentContainerStyle={styles.marketScrollContent}
          >
            {/* Dolar */}
            <View style={[styles.marketCard, { backgroundColor: '#ECFDF5' }]}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardEmoji}>💵</Text>
                <TrendIcon trend={marketData.currencies?.USD?.trend} size={20} />
              </View>
              <Text style={styles.marketCardLabel}>Dolar</Text>
              <Text style={styles.marketCardValue}>{marketData.currencies?.USD?.price?.toFixed(2)} ₺</Text>
            </View>
            
            {/* Euro */}
            <View style={[styles.marketCard, { backgroundColor: '#EFF6FF' }]}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardEmoji}>💶</Text>
                <TrendIcon trend={marketData.currencies?.EUR?.trend} size={20} />
              </View>
              <Text style={styles.marketCardLabel}>Euro</Text>
              <Text style={styles.marketCardValue}>{marketData.currencies?.EUR?.price?.toFixed(2)} ₺</Text>
            </View>
            
            {/* Altın */}
            <View style={[styles.marketCard, { backgroundColor: '#FFFBEB' }]}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardEmoji}>🥇</Text>
                <TrendIcon trend={marketData.metals?.gold?.trend} size={20} />
              </View>
              <Text style={styles.marketCardLabel}>Altın (gr)</Text>
              <Text style={styles.marketCardValue}>{marketData.metals?.gold?.price?.toLocaleString('tr-TR')} ₺</Text>
            </View>
            
            {/* Gümüş */}
            <View style={[styles.marketCard, { backgroundColor: '#F3F4F6' }]}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardEmoji}>🥈</Text>
                <TrendIcon trend={marketData.metals?.silver?.trend} size={20} />
              </View>
              <Text style={styles.marketCardLabel}>Gümüş (gr)</Text>
              <Text style={styles.marketCardValue}>{marketData.metals?.silver?.price?.toFixed(0)} ₺</Text>
            </View>

            {/* Enflasyon */}
            <View style={[styles.marketCard, { backgroundColor: '#FEF2F2' }]}>
              <View style={styles.marketCardHeader}>
                <Text style={styles.marketCardEmoji}>📈</Text>
                <Ionicons name="analytics" size={20} color="#EF4444" />
              </View>
              <Text style={styles.marketCardLabel}>Enflasyon</Text>
              <Text style={styles.marketCardValue}>%{marketData.inflation_rate?.toFixed(0)}</Text>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Form Section */}
      <View style={styles.formContainer}>
        {/* Hedef Kartı */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={[styles.formCardIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="flag" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.formCardTitle}>Hedefiniz</Text>
          </View>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Ne almak istiyorsunuz?</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="gift-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="Örn: iPhone 16 Pro Max"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Hedef Tutar</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>₺</Text>
                <TextInput
                  style={styles.input}
                  value={formatNumber(targetAmount)}
                  onChangeText={(text) => setTargetAmount(parseNumber(text))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            
            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Mevcut Birikim</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>₺</Text>
                <TextInput
                  style={styles.input}
                  value={formatNumber(existingSavings)}
                  onChangeText={(text) => setExistingSavings(parseNumber(text))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Finansal Durum Kartı */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={[styles.formCardIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="wallet" size={24} color="#10B981" />
            </View>
            <Text style={styles.formCardTitle}>Finansal Durumunuz</Text>
          </View>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Aylık Gelir</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>₺</Text>
                <TextInput
                  style={styles.input}
                  value={formatNumber(monthlyIncome)}
                  onChangeText={(text) => setMonthlyIncome(parseNumber(text))}
                  keyboardType="numeric"
                  placeholder="50.000"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            
            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Aylık Gider</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>₺</Text>
                <TextInput
                  style={styles.input}
                  value={formatNumber(monthlyExpenses)}
                  onChangeText={(text) => setMonthlyExpenses(parseNumber(text))}
                  keyboardType="numeric"
                  placeholder="35.000"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Tasarruf Kapasitesi Göstergesi */}
          {monthlyIncome && monthlyExpenses && (
            <View style={styles.savingsIndicator}>
              <Ionicons name="analytics" size={20} color={colors.primary} />
              <Text style={styles.savingsIndicatorText}>
                Aylık Tasarruf Kapasitesi: <Text style={styles.savingsAmount}>
                  {(parseFloat(parseNumber(monthlyIncome)) - parseFloat(parseNumber(monthlyExpenses))).toLocaleString('tr-TR')} ₺
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Birikim Süresi Kartı */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={[styles.formCardIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="calendar" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.formCardTitle}>Birikim Süresi</Text>
          </View>
          
          <View style={styles.durationOptions}>
            {[
              { value: '6', label: '6 Ay', desc: 'Kısa vadeli' },
              { value: '12', label: '1 Yıl', desc: 'Orta vadeli' },
              { value: '18', label: '18 Ay', desc: 'Uzun vadeli' },
              { value: '24', label: '2 Yıl', desc: 'Çok uzun' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationOption,
                  durationMonths === option.value && styles.durationOptionSelected
                ]}
                onPress={() => setDurationMonths(option.value)}
              >
                <Text style={[
                  styles.durationLabel,
                  durationMonths === option.value && styles.durationLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.durationDesc}>{option.desc}</Text>
                {durationMonths === option.value && (
                  <View style={styles.durationCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Yatırım Modu Kartı */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={[styles.formCardIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pie-chart" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.formCardTitle}>Yatırım Dağılımı</Text>
          </View>
          
          {/* Mod Seçimi */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeOption, investmentMode === 'auto' && styles.modeOptionSelected]}
              onPress={() => setInvestmentMode('auto')}
            >
              <Ionicons name="sparkles" size={20} color={investmentMode === 'auto' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeOptionText, investmentMode === 'auto' && styles.modeOptionTextSelected]}>
                Otomatik (AI)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modeOption, investmentMode === 'manual' && styles.modeOptionSelected]}
              onPress={() => setInvestmentMode('manual')}
            >
              <Ionicons name="settings" size={20} color={investmentMode === 'manual' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeOptionText, investmentMode === 'manual' && styles.modeOptionTextSelected]}>
                Manuel Seçim
              </Text>
            </TouchableOpacity>
          </View>

          {investmentMode === 'auto' && (
            <View style={styles.autoModeInfo}>
              <View style={styles.aiRecommendedBadge}>
                <Text style={styles.aiRecommendedBadgeText}>🤖 AI ÖNERİSİ</Text>
              </View>
              <Ionicons name="sparkles" size={24} color="#F59E0B" />
              <Text style={styles.autoModeInfoText}>
                AI, piyasa koşullarına ve risk profilinize göre dinamik dağılım önerecek
              </Text>
              <Text style={styles.autoModeInfoSubtext}>
                Sabit %25-25-25-25 yerine enflasyon, faiz ve döviz kurlarına göre optimize edilmiş önerilir
              </Text>
            </View>
          )}

          {/* Manuel Mod - Strateji Seçimi */}
          {investmentMode === 'manual' && strategies && (
            <View style={styles.strategySelector}>
              <Text style={styles.strategySelectorTitle}>Hazır Stratejiler</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {strategies.strategies?.map((strategy) => (
                  <TouchableOpacity
                    key={strategy.key}
                    style={[
                      styles.strategyCard,
                      selectedStrategy === strategy.key && styles.strategyCardSelected
                    ]}
                    onPress={() => {
                      setSelectedStrategy(strategy.key);
                      setCustomAllocation(strategy.allocation);
                    }}
                  >
                    <Text style={styles.strategyEmoji}>{strategy.emoji}</Text>
                    <Text style={[
                      styles.strategyName,
                      selectedStrategy === strategy.key && styles.strategyNameSelected
                    ]}>
                      {strategy.name}
                    </Text>
                    <Text style={styles.strategyDesc}>{strategy.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Özel Dağılım */}
              {selectedStrategy && (
                <View style={styles.allocationPreview}>
                  <Text style={styles.allocationPreviewTitle}>Dağılım:</Text>
                  <View style={styles.allocationBars}>
                    {Object.entries(customAllocation).map(([key, value]) => {
                      const labels = { tl_savings: 'TL', gold: 'Altın', usd: 'USD', eur: 'EUR' };
                      return (
                        <View key={key} style={styles.allocationBarItem}>
                          <Text style={styles.allocationBarLabel}>{labels[key]}</Text>
                          <View style={styles.allocationBarBg}>
                            <View 
                              style={[
                                styles.allocationBarFill, 
                                { width: `${value}%`, backgroundColor: allocationColors[key] }
                              ]} 
                            />
                          </View>
                          <Text style={styles.allocationBarPercent}>%{value}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Risk Tercih Kartı */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={[styles.formCardIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.formCardTitle}>Risk Tercihiniz</Text>
          </View>
          
          <View style={styles.riskOptionsContainer}>
            {[
              { 
                key: 'low', 
                label: 'Düşük Risk', 
                desc: 'Altın & TL ağırlıklı',
                icon: 'shield-checkmark',
                color: '#10B981',
                bgColor: '#ECFDF5',
                emoji: '🛡️'
              },
              { 
                key: 'medium', 
                label: 'Dengeli', 
                desc: 'Karma portföy',
                icon: 'swap-horizontal',
                color: '#F59E0B',
                bgColor: '#FFFBEB',
                emoji: '⚖️'
              },
              { 
                key: 'high', 
                label: 'Yüksek Risk', 
                desc: 'Döviz ağırlıklı',
                icon: 'rocket',
                color: '#EF4444',
                bgColor: '#FEF2F2',
                emoji: '🚀'
              },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.riskOption,
                  { backgroundColor: option.bgColor },
                  riskTolerance === option.key && styles.riskOptionSelected,
                  riskTolerance === option.key && { borderColor: option.color }
                ]}
                onPress={() => setRiskTolerance(option.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.riskEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.riskOptionLabel,
                  riskTolerance === option.key && { color: option.color }
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.riskOptionDesc}>{option.desc}</Text>
                
                {riskTolerance === option.key && (
                  <View style={[styles.riskCheckmark, { backgroundColor: option.color }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity style={styles.generateButton} onPress={generatePlan} activeOpacity={0.8}>
          <LinearGradient
            colors={['#00A19A', '#007A75']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateGradient}
          >
            <Ionicons name="sparkles" size={24} color="#fff" />
            <Text style={styles.generateButtonText}>AI ile Plan Oluştur</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          * AI, güncel piyasa verilerini analiz ederek size özel yatırım stratejisi oluşturacaktır.
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // Step 2: Analyzing
  const renderAnalyzing = () => (
    <View style={styles.analyzingContainer}>
      <LinearGradient
        colors={['#00A19A', '#007A75']}
        style={styles.analyzingGradient}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.analyzingTitle}>🤖 AI Analiz Ediyor</Text>
        <Text style={styles.analyzingSubtitle}>
          Piyasa verileri inceleniyor ve optimal strateji hesaplanıyor...
        </Text>
      </LinearGradient>
      
      <View style={styles.analyzingStepsContainer}>
        {[
          { icon: 'cash', text: 'Döviz kurları analiz ediliyor...' },
          { icon: 'trophy', text: 'Altın fiyat trendi değerlendiriliyor...' },
          { icon: 'analytics', text: 'Enflasyon etkisi hesaplanıyor...' },
          { icon: 'bulb', text: 'Optimal strateji belirleniyor...' },
        ].map((step, index) => (
          <View key={index} style={styles.analyzingStep}>
            <View style={styles.analyzingStepIcon}>
              <Ionicons name={step.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.analyzingStepText}>{step.text}</Text>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        ))}
      </View>
    </View>
  );

  // Step 3: Plan Results
  const renderPlan = () => {
    if (!investmentPlan) return null;
    
    const estimate = investmentPlan.estimate || {};
    const allocation = investmentPlan.allocation || {};
    const canReach = investmentPlan.can_reach_target;
    const shortage = investmentPlan.shortage || 0;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plan Header */}
        <LinearGradient
          colors={canReach ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planHeader}
        >
          <View style={styles.planHeaderIcon}>
            <Ionicons 
              name={canReach ? "checkmark-circle" : "alert-circle"} 
              size={48} 
              color="#fff" 
            />
          </View>
          <Text style={styles.planHeaderTitle}>
            {canReach ? 'Hedefinize Ulaşabilirsiniz!' : 'Ek Finansman Gerekebilir'}
          </Text>
          <Text style={styles.planHeaderSubtitle}>
            {investmentPlan.summary}
          </Text>
          
          <View style={styles.aiGeneratedBadge}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.aiGeneratedText}>AI Tarafından Hesaplandı</Text>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="calendar" size={28} color="#10B981" />
            <Text style={styles.statValue}>{durationMonths}</Text>
            <Text style={styles.statLabel}>Ay</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="trending-up" size={28} color="#F59E0B" />
            <Text style={styles.statValue}>
              {estimate.estimated_profit ? `+${(estimate.estimated_profit / 1000).toFixed(0)}K` : '0'}
            </Text>
            <Text style={styles.statLabel}>Tahmini Getiri</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: estimate.beats_inflation ? '#ECFDF5' : '#FEF2F2' }]}>
            <Ionicons 
              name={estimate.beats_inflation ? "shield-checkmark" : "shield"} 
              size={28} 
              color={estimate.beats_inflation ? '#10B981' : '#EF4444'} 
            />
            <Text style={[styles.statValue, { color: estimate.beats_inflation ? '#10B981' : '#EF4444' }]}>
              {estimate.beats_inflation ? 'Korumalı' : 'Riskli'}
            </Text>
            <Text style={styles.statLabel}>Enflasyon</Text>
          </View>
        </View>

        {/* Tahmini Sonuç */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📊 Tahmini Sonuç</Text>
          
          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Toplam Katkı</Text>
              <Text style={styles.resultValue}>
                {estimate.total_contribution?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Tahmini Değer</Text>
              <Text style={[styles.resultValue, { color: '#10B981' }]}>
                {estimate.estimated_value?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>

          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Yatırım Getirisi</Text>
              <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                +{estimate.estimated_profit?.toLocaleString('tr-TR')} ₺ (%{estimate.profit_percentage})
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Hedef Tutar</Text>
              <Text style={styles.resultValue}>
                {parseFloat(parseNumber(targetAmount)).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>

          {!canReach && (
            <View style={styles.shortageAlert}>
              <Ionicons name="alert-circle" size={24} color="#F59E0B" />
              <View style={styles.shortageAlertText}>
                <Text style={styles.shortageTitle}>
                  Eksik Tutar: {shortage.toLocaleString('tr-TR')} ₺
                </Text>
                <Text style={styles.shortageDesc}>
                  Hedefe ulaşmak için kredi kullanabilirsiniz
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Yatırım Dağılımı */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>💰 Yatırım Dağılımı</Text>
            {investmentPlan.ai_recommendation && (
              <View style={styles.aiPoweredBadge}>
                <Ionicons name="sparkles" size={12} color="#F59E0B" />
                <Text style={styles.aiPoweredBadgeText}>AI Önerisi</Text>
              </View>
            )}
          </View>
          
          {/* AI Gerekçesi */}
          {investmentPlan.ai_recommendation?.reasoning && (
            <View style={styles.aiReasoningBox}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.aiReasoningText}>
                {investmentPlan.ai_recommendation.reasoning}
              </Text>
            </View>
          )}
          
          {/* AI İçgörüleri */}
          {investmentPlan.ai_recommendation?.insights?.length > 0 && (
            <View style={styles.aiInsightsContainer}>
              {investmentPlan.ai_recommendation.insights.map((insight, index) => (
                <View key={index} style={styles.aiInsightItem}>
                  <Text style={styles.aiInsightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.allocationChart}>
            {Object.entries(allocation).map(([key, value]) => {
              const labels = { tl_savings: 'TL Birikim', gold: 'Altın', usd: 'Dolar', eur: 'Euro' };
              const emojis = { tl_savings: '💰', gold: '🥇', usd: '💵', eur: '💶' };
              return (
                <View key={key} style={styles.allocationItem}>
                  <View style={styles.allocationItemHeader}>
                    <Text style={styles.allocationEmoji}>{emojis[key]}</Text>
                    <Text style={styles.allocationLabel}>{labels[key]}</Text>
                    <Text style={[styles.allocationPercent, { color: allocationColors[key] }]}>%{value}</Text>
                  </View>
                  <View style={styles.allocationBarBg}>
                    <LinearGradient
                      colors={[allocationColors[key], allocationColors[key] + '80']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.allocationBar, { width: `${value}%` }]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Varlık Bazlı Tahmin */}
          {estimate.asset_breakdown && (
            <View style={styles.assetBreakdown}>
              <Text style={styles.assetBreakdownTitle}>Varlık Bazlı Tahmin ({durationMonths} ay sonra)</Text>
              {Object.entries(estimate.asset_breakdown).map(([key, value]) => {
                const labels = { tl_savings: 'TL Birikim', gold: 'Altın', usd: 'Dolar', eur: 'Euro' };
                return (
                  <View key={key} style={styles.assetBreakdownItem}>
                    <Text style={styles.assetBreakdownLabel}>{labels[key]}</Text>
                    <Text style={styles.assetBreakdownValue}>{value.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Kredi Önerisi - Her zaman göster */}
        {creditRecommendation && creditRecommendation.needs_credit && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🏦 Kredi Seçenekleri</Text>
            
            {/* Kredi Özet Bilgisi */}
            <View style={styles.creditSummaryBox}>
              <View style={styles.creditSummaryRow}>
                <View style={styles.creditSummaryItem}>
                  <Text style={styles.creditSummaryLabel}>Gerekli Kredi</Text>
                  <Text style={styles.creditSummaryValue}>
                    {(creditRecommendation.loan_amount || creditRecommendation.current_shortage)?.toLocaleString('tr-TR')} ₺
                  </Text>
                </View>
                <View style={styles.creditSummaryItem}>
                  <Text style={styles.creditSummaryLabel}>Faiz Oranı</Text>
                  <Text style={styles.creditSummaryValue}>
                    %{creditRecommendation.annual_rate || 48} (yıllık)
                  </Text>
                </View>
              </View>
            </View>

            {/* Uygunluk Durumu */}
            {creditRecommendation.affordability_summary && (
              <View style={[
                styles.affordabilityBox,
                creditRecommendation.affordability_summary.affordable_count > 0 
                  ? styles.affordabilityBoxSuccess 
                  : creditRecommendation.affordability_summary.high_risk_count > 0
                    ? styles.affordabilityBoxWarning
                    : styles.affordabilityBoxDanger
              ]}>
                <Ionicons 
                  name={
                    creditRecommendation.affordability_summary.affordable_count > 0 
                      ? "checkmark-circle" 
                      : creditRecommendation.affordability_summary.high_risk_count > 0
                        ? "alert-circle"
                        : "information-circle"
                  } 
                  size={24} 
                  color={
                    creditRecommendation.affordability_summary.affordable_count > 0 
                      ? "#10B981" 
                      : creditRecommendation.affordability_summary.high_risk_count > 0
                        ? "#F59E0B"
                        : "#6B7280"
                  } 
                />
                <View style={styles.affordabilityTextContainer}>
                  <Text style={styles.affordabilityMessage}>
                    {creditRecommendation.affordability_summary.suggestion?.message}
                  </Text>
                  <Text style={styles.affordabilityAction}>
                    {creditRecommendation.affordability_summary.suggestion?.action}
                  </Text>
                  {creditRecommendation.affordability_summary.suggestion?.timeline && (
                    <Text style={styles.affordabilityTimeline}>
                      ⏰ {creditRecommendation.affordability_summary.suggestion.timeline}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Kredi Seçenekleri Listesi */}
            <View style={styles.creditOptionsList}>
              <Text style={styles.creditOptionsListTitle}>Tüm Vade Seçenekleri</Text>
              
              {creditRecommendation.options?.slice(0, 4).map((option, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.creditOptionItem,
                    option.affordable && styles.creditOptionItemAffordable,
                    option.affordable_level === 'high_risk' && styles.creditOptionItemHighRisk
                  ]}
                >
                  <View style={styles.creditOptionItemLeft}>
                    <Text style={styles.creditOptionDuration}>{option.duration_months} Ay</Text>
                    <View style={[
                      styles.creditOptionStatusBadge,
                      option.affordable 
                        ? styles.statusBadgeSuccess 
                        : option.affordable_level === 'high_risk'
                          ? styles.statusBadgeWarning
                          : styles.statusBadgeDanger
                    ]}>
                      <Text style={[
                        styles.creditOptionStatusText,
                        option.affordable 
                          ? styles.statusTextSuccess 
                          : option.affordable_level === 'high_risk'
                            ? styles.statusTextWarning
                            : styles.statusTextDanger
                      ]}>
                        {option.affordable 
                          ? 'Uygun' 
                          : option.affordable_level === 'high_risk'
                            ? 'Yüksek Risk'
                            : `Gelir: ${option.required_income?.toLocaleString('tr-TR')} ₺`
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.creditOptionItemRight}>
                    <Text style={styles.creditOptionMonthly}>
                      {option.monthly_payment?.toLocaleString('tr-TR')} ₺/ay
                    </Text>
                    <Text style={styles.creditOptionRatio}>
                      Gelirin %{option.income_to_debt_ratio}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Tüm Seçenekleri Gör Butonu */}
            <TouchableOpacity 
              style={styles.viewAllCreditButton}
              onPress={() => setShowCreditModal(true)}
            >
              <Text style={styles.viewAllCreditButtonText}>Tüm Kredi Detaylarını Gör</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Şimdi Al Sonra Öde */}
            {creditRecommendation.buy_now_option && (
              <TouchableOpacity style={styles.buyNowOption}>
                <View style={styles.buyNowOptionContent}>
                  <Ionicons name="flash" size={24} color="#F59E0B" />
                  <View style={styles.buyNowOptionText}>
                    <Text style={styles.buyNowOptionTitle}>
                      {creditRecommendation.buy_now_option.message}
                    </Text>
                    <Text style={styles.buyNowOptionDesc}>
                      Aylık {creditRecommendation.buy_now_option.monthly_payment.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}


        {/* İpucu */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <Text style={styles.tipText}>
            💡 {creditRecommendation?.tip || 'Düzenli birikim yaparak hedefinize daha hızlı ulaşabilirsiniz.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.applyButton} onPress={applyPlan} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00A19A', '#007A75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.applyButtonText}>Planı Başlat</Text>
            </LinearGradient>
          </TouchableOpacity>

          {creditRecommendation?.needs_credit && (
            <TouchableOpacity 
              style={styles.creditPlanButton} 
              onPress={() => setShowCreditModal(true)}
            >
              <Ionicons name="card" size={20} color="#F59E0B" />
              <Text style={styles.creditPlanButtonText}>Kredi ile Birlikte Başlat</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.modifyButton} onPress={() => setStep(1)}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.modifyButtonText}>Yeniden Hesapla</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // Kredi Modal
  const renderCreditModal = () => {
    if (!creditRecommendation) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏦 Kredi Seçenekleri</Text>
            <TouchableOpacity onPress={() => setShowCreditModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Gerekli Kredi: {(creditRecommendation.loan_amount || creditRecommendation.current_shortage)?.toLocaleString('tr-TR')} ₺ | Faiz: %{creditRecommendation.annual_rate || 48} yıllık
          </Text>

          {/* Uygunluk Özeti */}
          {creditRecommendation.affordability_summary && (
            <View style={[
              styles.modalAffordabilityBox,
              creditRecommendation.affordability_summary.affordable_count > 0 
                ? styles.modalAffordabilitySuccess 
                : creditRecommendation.affordability_summary.high_risk_count > 0
                  ? styles.modalAffordabilityWarning
                  : styles.modalAffordabilityInfo
            ]}>
              <Text style={styles.modalAffordabilityText}>
                {creditRecommendation.affordability_summary.suggestion?.message}
              </Text>
              {creditRecommendation.affordability_summary.suggestion?.action && (
                <Text style={styles.modalAffordabilitySubtext}>
                  {creditRecommendation.affordability_summary.suggestion.action}
                </Text>
              )}
              {creditRecommendation.affordability_summary.suggestion?.timeline && (
                <Text style={styles.modalAffordabilitySubtext}>
                  {creditRecommendation.affordability_summary.suggestion.timeline}
                </Text>
              )}
            </View>
          )}

          <ScrollView style={styles.modalCreditList}>
            {creditRecommendation.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.creditOptionCard,
                  option.affordable && styles.creditOptionCardAffordable,
                  option.affordable_level === 'high_risk' && styles.creditOptionCardHighRisk,
                  selectedCreditOption?.duration_months === option.duration_months && styles.creditOptionCardSelected
                ]}
                onPress={() => setSelectedCreditOption(option)}
              >
                <View style={styles.creditOptionCardHeader}>
                  <Text style={styles.creditOptionCardDuration}>{option.duration_months} Ay</Text>
                  <View style={styles.creditOptionHeaderRight}>
                    {selectedCreditOption?.duration_months === option.duration_months && (
                      <View style={styles.creditSelectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.creditSelectedText}>Seçildi</Text>
                      </View>
                    )}
                    <View style={[
                      styles.creditStatusBadge,
                      option.affordable 
                        ? styles.creditStatusSuccess 
                        : option.affordable_level === 'high_risk'
                          ? styles.creditStatusWarning
                          : styles.creditStatusDanger
                    ]}>
                      <Text style={[
                        styles.creditStatusText,
                        option.affordable 
                          ? styles.creditStatusTextSuccess 
                          : option.affordable_level === 'high_risk'
                            ? styles.creditStatusTextWarning
                            : styles.creditStatusTextDanger
                      ]}>
                        {option.affordable 
                          ? '✓ Uygun' 
                          : option.affordable_level === 'high_risk'
                            ? '⚠ Yüksek Risk'
                            : `${option.required_income?.toLocaleString('tr-TR')} ₺ gelir gerekli`
                        }
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.creditOptionCardBody}>
                  <View style={styles.creditOptionCardItem}>
                    <Text style={styles.creditOptionCardLabel}>Aylık Taksit</Text>
                    <Text style={styles.creditOptionCardValue}>
                      {option.monthly_payment?.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  <View style={styles.creditOptionCardItem}>
                    <Text style={styles.creditOptionCardLabel}>Toplam Ödeme</Text>
                    <Text style={styles.creditOptionCardValue}>
                      {option.total_payment?.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  <View style={styles.creditOptionCardItem}>
                    <Text style={styles.creditOptionCardLabel}>Faiz Tutarı</Text>
                    <Text style={[styles.creditOptionCardValue, { color: '#EF4444' }]}>
                      {option.total_interest?.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                </View>

                {/* Gelir Oranı Göstergesi */}
                <View style={styles.incomeRatioBar}>
                  <Text style={styles.incomeRatioLabel}>Gelirin %{option.income_to_debt_ratio}</Text>
                  <View style={styles.incomeRatioBarBg}>
                    <View 
                      style={[
                        styles.incomeRatioBarFill,
                        { 
                          width: `${Math.min(100, option.income_to_debt_ratio)}%`,
                          backgroundColor: option.income_to_debt_ratio <= 30 
                            ? '#10B981' 
                            : option.income_to_debt_ratio <= 40 
                              ? '#F59E0B' 
                              : '#EF4444'
                        }
                      ]} 
                    />
                  </View>
                </View>

                {/* Ek Birikim Gerekli mi */}
                {option.additional_savings_needed > 0 && (
                  <View style={styles.additionalSavingsInfo}>
                    <Ionicons name="information-circle" size={16} color="#6B7280" />
                    <Text style={styles.additionalSavingsText}>
                      {option.additional_savings_needed?.toLocaleString('tr-TR')} ₺ daha birikim yaparsanız uygun olur
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Başvuru Butonları */}
          <View style={styles.modalButtonsContainer}>
            {/* Kredi Olmadan Planı Başlat */}
            <TouchableOpacity 
              style={styles.planOnlyButton}
              onPress={() => {
                setShowCreditModal(false);
                setSelectedCreditOption(null);
                applyPlan();
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.planOnlyButtonText}>Kredisiz Plan Oluştur</Text>
            </TouchableOpacity>

            {/* Seçili Kredi ile Başvur */}
            {selectedCreditOption && (
              <TouchableOpacity 
                style={styles.modalApplyButton}
                onPress={applyCreditAndPlan}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalApplyGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.modalApplyButtonText}>
                    {selectedCreditOption.duration_months} Ay Vade ile Kredi Başvurusu Yap
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Step 4: Mevcut Plan Detayı
  const renderExistingPlan = () => {
    if (!existingPlan) return null;
    
    const plan = existingPlan.plan;
    const progress = existingPlan.progress || {};
    const summary = existingPlan.investment_summary || {};
    
    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plan Header */}
        <LinearGradient
          colors={progress.on_track ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planHeader}
        >
          <View style={styles.planHeaderIcon}>
            <Ionicons 
              name={progress.on_track ? "trending-up" : "alert-circle"} 
              size={48} 
              color="#fff" 
            />
          </View>
          <Text style={styles.planHeaderTitle}>{plan?.product_name || 'Birikim Planı'}</Text>
          <Text style={styles.planHeaderSubtitle}>
            %{progress.progress_percentage?.toFixed(0)} tamamlandı
          </Text>
        </LinearGradient>

        {/* İlerleme Barı */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarLarge}>
            <LinearGradient
              colors={progress.on_track ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFillLarge, { width: `${progress.progress_percentage || 0}%` }]}
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Biriken</Text>
              <Text style={styles.progressStatValue}>
                {summary.total_current_value?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Hedef</Text>
              <Text style={styles.progressStatValue}>
                {plan?.target_amount?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Kalan</Text>
              <Text style={[styles.progressStatValue, { color: '#F59E0B' }]}>
                {progress.remaining_amount?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>
        </View>

        {/* Yatırım Dağılımı */}
        {summary.assets && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>💰 Yatırım Portföyüm</Text>
            {summary.assets.map((asset) => (
              <View key={asset.asset} style={styles.assetItem}>
                <View style={styles.assetItemHeader}>
                  <Text style={styles.assetEmoji}>{asset.emoji}</Text>
                  <View style={styles.assetLabelContainer}>
                    <Text style={styles.assetLabel}>{asset.label}</Text>
                    {asset.units > 0 && (
                      <Text style={styles.assetUnits}>
                        {asset.units.toFixed(2)} {asset.unit} @ {asset.current_price?.toLocaleString('tr-TR')} TL
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.buyAssetButton, { backgroundColor: asset.color + '20' }]}
                    onPress={() => {
                      setSelectedAsset({
                        key: asset.asset,
                        ...asset,
                        price: asset.current_price
                      });
                      setShowBuyAssetModal(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color={asset.color} />
                    <Text style={[styles.buyAssetButtonText, { color: asset.color }]}>Al</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.assetValues}>
                  <View>
                    <Text style={styles.assetValue}>{asset.current_value?.toLocaleString('tr-TR')} ₺</Text>
                    {asset.profit !== 0 && (
                      <Text style={[
                        styles.assetProfit,
                        { color: asset.profit >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {asset.profit >= 0 ? '+' : ''}{asset.profit?.toLocaleString('tr-TR')} ₺ (%{asset.profit_percent})
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.assetChange,
                    { color: asset.change_percent >= 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {asset.change_percent >= 0 ? '+' : ''}{asset.change_percent}%
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam Değer</Text>
              <Text style={styles.totalValue}>{summary.total_current_value?.toLocaleString('tr-TR')} ₺</Text>
            </View>
            
            {summary.total_profit !== 0 && (
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Yatırım Getirisi</Text>
                <Text style={[
                  styles.profitValue,
                  { color: summary.total_profit >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {summary.total_profit >= 0 ? '+' : ''}{summary.total_profit?.toLocaleString('tr-TR')} ₺ (%{summary.profit_percentage})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Hızlı Alım - Döviz ve Değerli Metaller */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏦 Hızlı Alım</Text>
          <Text style={styles.quickBuySubtitle}>Döviz ve değerli metal alarak portföyünüzü çeşitlendirin</Text>
          
          <View style={styles.quickBuyGrid}>
            {[
              { key: 'usd', name: 'Dolar', emoji: '💵', color: '#10B981', unit: 'USD' },
              { key: 'eur', name: 'Euro', emoji: '💶', color: '#3B82F6', unit: 'EUR' },
              { key: 'gbp', name: 'Sterlin', emoji: '💷', color: '#8B5CF6', unit: 'GBP' },
              { key: 'gold', name: 'Altın', emoji: '🥇', color: '#F59E0B', unit: 'gr' },
              { key: 'silver', name: 'Gümüş', emoji: '🥈', color: '#6B7280', unit: 'gr' },
            ].map((asset) => {
              const priceInfo = marketPrices?.prices?.[asset.key];
              const currentPrice = priceInfo?.price || 0;
              const changePercent = priceInfo?.change_percent || 0;
              
              return (
                <TouchableOpacity
                  key={asset.key}
                  style={[styles.quickBuyCard, { borderColor: asset.color }]}
                  onPress={() => {
                    setSelectedAsset({
                      ...asset,
                      price: currentPrice,
                      label: asset.name
                    });
                    setShowBuyAssetModal(true);
                  }}
                >
                  <Text style={styles.quickBuyEmoji}>{asset.emoji}</Text>
                  <Text style={styles.quickBuyName}>{asset.name}</Text>
                  <Text style={styles.quickBuyPrice}>
                    {currentPrice > 0 ? `${currentPrice.toLocaleString('tr-TR')} ₺` : '-'}
                  </Text>
                  <Text style={[
                    styles.quickBuyChange,
                    { color: changePercent >= 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                  </Text>
                  <View style={[styles.quickBuyButton, { backgroundColor: asset.color }]}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.quickBuyButtonText}>Al</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Kalan Süre ve Aksiyon */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ Süre Bilgisi</Text>
          <View style={styles.timeInfo}>
            <View style={styles.timeInfoItem}>
              <Text style={styles.timeInfoValue}>{progress.remaining_months || 0}</Text>
              <Text style={styles.timeInfoLabel}>Ay Kaldı</Text>
            </View>
            <View style={styles.timeInfoItem}>
              <Text style={styles.timeInfoValue}>
                {progress.required_monthly_savings?.toLocaleString('tr-TR')} ₺
              </Text>
              <Text style={styles.timeInfoLabel}>Aylık Gerekli</Text>
            </View>
          </View>
        </View>

        {/* Para Ekle Butonu */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.contributeButton}
            onPress={() => setShowContributeModal(true)}
          >
            <LinearGradient
              colors={['#00A19A', '#007A75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contributeGradient}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.contributeButtonText}>Para Ekle</Text>
            </LinearGradient>
          </TouchableOpacity>

          {creditRecommendation?.needs_credit && (
            <TouchableOpacity 
              style={styles.creditPlanButton}
              onPress={() => setShowCreditModal(true)}
            >
              <Ionicons name="card" size={20} color="#F59E0B" />
              <Text style={styles.creditPlanButtonText}>Kredi Seçenekleri</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // Para Ekleme Modalı
  const renderContributeModal = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.contributeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Para Ekle</Text>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                setShowContributeModal(false);
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.contributeModalSubtitle}>
                Planınıza eklemek istediğiniz tutarı girin
              </Text>

              <View style={styles.contributeInputContainer}>
                <Text style={styles.contributeInputPrefix}>₺</Text>
                <TextInput
            style={styles.contributeInput}
            value={formatNumber(contributeAmount)}
            onChangeText={(text) => setContributeAmount(parseNumber(text))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Hızlı Tutarlar */}
        <View style={styles.quickAmounts}>
          {[1000, 2500, 5000, 10000].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmountButton}
              onPress={() => setContributeAmount(amount.toString())}
            >
              <Text style={styles.quickAmountText}>{amount.toLocaleString('tr-TR')} ₺</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.contributeSubmitButton}
          onPress={handleContribute}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00A19A', '#007A75']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.contributeSubmitGradient}
          >
            {loading ? (
              <Text style={styles.contributeSubmitText}>Ekleniyor...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.contributeSubmitText}>Ekle</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    );

  // Varlık Alım Modalı
  const renderBuyAssetModal = () => {
    if (!selectedAsset) return null;
    
    const amount = parseFloat(parseNumber(buyAmount)) || 0;
    const unitsToBuy = selectedAsset.price > 0 ? amount / selectedAsset.price : 0;
    
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.buyAssetModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedAsset.emoji} {selectedAsset.label || selectedAsset.name} Al
                </Text>
                <TouchableOpacity onPress={() => {
                  Keyboard.dismiss();
                  setShowBuyAssetModal(false);
                  setSelectedAsset(null);
                  setBuyAmount('');
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Güncel Fiyat */}
                <View style={[styles.currentPriceBox, { backgroundColor: selectedAsset.color + '15' }]}>
                  <Text style={styles.currentPriceLabel}>Güncel Fiyat</Text>
                  <Text style={[styles.currentPriceValue, { color: selectedAsset.color }]}>
                    1 {selectedAsset.unit} = {selectedAsset.price?.toLocaleString('tr-TR')} TL
                  </Text>
                </View>

                {/* Tutar Girişi */}
                <Text style={styles.buyInputLabel}>Ne kadar almak istiyorsunuz?</Text>
          <View style={styles.buyInputContainer}>
            <Text style={styles.buyInputPrefix}>₺</Text>
            <TextInput
              style={styles.buyInput}
              value={formatNumber(buyAmount)}
              onChangeText={(text) => setBuyAmount(parseNumber(text))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Alınacak Miktar Gösterimi */}
          {amount > 0 && (
            <View style={styles.unitsPreview}>
              <Text style={styles.unitsPreviewLabel}>Alacağınız Miktar:</Text>
              <Text style={[styles.unitsPreviewValue, { color: selectedAsset.color }]}>
                {unitsToBuy.toFixed(4)} {selectedAsset.unit}
              </Text>
            </View>
          )}

          {/* Hızlı Tutarlar */}
          <View style={styles.quickAmounts}>
            {[500, 1000, 2500, 5000].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[styles.quickAmountButton, { borderColor: selectedAsset.color }]}
                onPress={() => setBuyAmount(quickAmount.toString())}
              >
                <Text style={[styles.quickAmountText, { color: selectedAsset.color }]}>
                  {quickAmount.toLocaleString('tr-TR')} ₺
                </Text>
              </TouchableOpacity>
            ))}
          </View>

              {/* Satın Al Butonu */}
                <TouchableOpacity 
                  style={styles.buySubmitButton}
                  onPress={handleBuyAsset}
                  disabled={loading || amount <= 0}
                >
                  <LinearGradient
                    colors={[selectedAsset.color, selectedAsset.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buySubmitGradient}
                  >
                    {loading ? (
                      <Text style={styles.buySubmitText}>İşleniyor...</Text>
                    ) : (
                      <>
                        <Ionicons name="cart" size={20} color="#fff" />
                        <Text style={styles.buySubmitText}>
                          {unitsToBuy > 0 ? `${unitsToBuy.toFixed(4)} ${selectedAsset.unit} Satın Al` : 'Satın Al'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title={step === 4 ? existingPlan?.plan?.product_name || "Plan Detayı" : step === 3 ? "Birikim + Yatırım Planı" : "Akıllı Birikim"} 
        onBack={() => {
          if (step === 4) navigation.goBack();
          else if (step > 1) setStep(step - 1);
          else navigation.goBack();
        }} 
      />
      
      {step === 1 && renderForm()}
      {step === 2 && renderAnalyzing()}
      {step === 3 && renderPlan()}
      {step === 4 && renderExistingPlan()}
      
      {/* Kredi Modal */}
      {showCreditModal && renderCreditModal()}
      
      {/* Para Ekleme Modal */}
      {showContributeModal && renderContributeModal()}
      
      {/* Varlık Alım Modal */}
      {showBuyAssetModal && renderBuyAssetModal()}
      
      {/* Milestone Kredi Öneri Popup */}
      <Modal
        visible={showMilestonePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMilestonePopup(false)}
      >
        <View style={styles.milestonePopupOverlay}>
          <View style={styles.milestonePopupContainer}>
            {/* Başlık ve İkon */}
            <View style={styles.milestonePopupHeader}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.milestonePopupIconBg}
              >
                <Ionicons name="trending-up" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.milestonePopupTitle}>
                {milestoneNotification?.title || '🎯 Kredi Fırsatı!'}
              </Text>
            </View>
            
            {/* İçerik */}
            <View style={styles.milestonePopupContent}>
              <Text style={styles.milestonePopupMessage}>
                {milestoneNotification?.body || 'Hedefinize yaklaşıyorsunuz! Şimdi kredi çekerek hedefinize kavuşabilirsiniz.'}
              </Text>
              
              {/* İlerleme Gösterimi */}
              {milestoneNotification && (
                <View style={styles.milestoneProgressContainer}>
                  <View style={styles.milestoneProgressRow}>
                    <Text style={styles.milestoneProgressLabel}>Önceki</Text>
                    <Text style={styles.milestoneProgressValue}>
                      %{Math.round(milestoneNotification.previousProgress || 0)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#F59E0B" />
                  <View style={styles.milestoneProgressRow}>
                    <Text style={styles.milestoneProgressLabel}>Şimdi</Text>
                    <Text style={[styles.milestoneProgressValue, { color: '#10B981' }]}>
                      %{Math.round(milestoneNotification.currentProgress || 0)}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Kredi Bilgisi */}
              {creditRecommendation?.best_option && (
                <View style={styles.milestoneCreditInfo}>
                  <Text style={styles.milestoneCreditText}>
                    💰 {creditRecommendation.best_option.duration_months} ay vadede aylık{' '}
                    <Text style={{ fontWeight: '700', color: '#059669' }}>
                      {creditRecommendation.best_option.monthly_payment?.toLocaleString('tr-TR')} ₺
                    </Text>
                    {' '}taksit ile hedefinize ulaşabilirsiniz.
                  </Text>
                </View>
              )}
            </View>
            
            {/* Butonlar */}
            <View style={styles.milestonePopupButtons}>
              <TouchableOpacity 
                style={styles.milestoneCancelButton}
                onPress={() => setShowMilestonePopup(false)}
              >
                <Text style={styles.milestoneCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.milestoneCreditButton}
                onPress={() => {
                  setShowMilestonePopup(false);
                  navigation.navigate('BranchLocator');
                }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.milestoneCreditButtonGradient}
                >
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.milestoneCreditButtonText}>Kredi Çek</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  // Market Cards
  marketCardsContainer: {
    marginTop: -15,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  marketTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  marketScroll: {
    marginHorizontal: -spacing.xs,
  },
  marketScrollContent: {
    paddingHorizontal: spacing.xs,
  },
  marketCard: {
    width: 90,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 95,
  },
  marketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  marketCardEmoji: {
    fontSize: 26,
  },
  marketCardLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  marketCardValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  // Form Container
  formContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  formCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  inputWrapper: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    minHeight: 52,
  },
  inputPrefix: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  savingsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  savingsIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  savingsAmount: {
    fontWeight: '700',
  },
  // Risk Options
  riskOptionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  riskOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  riskOptionSelected: {
    borderWidth: 2,
  },
  riskEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  riskOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  riskOptionDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  riskCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Generate Button
  generateButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Analyzing
  analyzingContainer: {
    flex: 1,
  },
  analyzingGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  analyzingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.lg,
  },
  analyzingSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  analyzingStepsContainer: {
    padding: spacing.lg,
  },
  analyzingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  analyzingStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingStepText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  // Plan Header
  planHeader: {
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  planHeaderIcon: {
    marginBottom: spacing.md,
  },
  planHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  planHeaderSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: 4,
  },
  aiGeneratedText: {
    fontSize: fontSize.xs,
    color: '#fff',
    fontWeight: '500',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: -20,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  // Allocation
  allocationChart: {
    gap: spacing.md,
  },
  allocationItem: {
    marginBottom: spacing.sm,
  },
  allocationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  allocationEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  allocationLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  allocationPercent: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  allocationBarBg: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  allocationBar: {
    height: '100%',
    borderRadius: 6,
  },
  // Outcome
  outcomeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  outcomeItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  outcomeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  outcomeValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  loanNeeded: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  loanNeededText: {
    flex: 1,
  },
  loanNeededTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#92400E',
  },
  loanNeededDesc: {
    fontSize: fontSize.xs,
    color: '#92400E',
    marginTop: 4,
  },
  // Tips
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  // Risk Warning
  riskWarning: {
    backgroundColor: '#FFFBEB',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  riskWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  riskWarningTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#92400E',
  },
  riskWarningItem: {
    fontSize: fontSize.sm,
    color: '#92400E',
    marginLeft: spacing.lg,
  },
  riskWarningMitigation: {
    fontSize: fontSize.sm,
    color: '#92400E',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  // Action Buttons
  actionButtonsContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  applyButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  modifyButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Duration Options
  durationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationOption: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  durationLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  durationLabelSelected: {
    color: colors.primary,
  },
  durationDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  durationCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  modeOptionTextSelected: {
    color: colors.primary,
  },
  autoModeInfo: {
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  aiRecommendedBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  aiRecommendedBadgeText: {
    fontSize: fontSize.xs,
    color: '#fff',
    fontWeight: '700',
  },
  autoModeInfoText: {
    fontSize: fontSize.sm,
    color: '#B45309',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  autoModeInfoSubtext: {
    fontSize: fontSize.xs,
    color: '#92400E',
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  // AI Recommendation Styles
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  aiPoweredBadgeText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  aiReasoningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  aiReasoningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#92400E',
    lineHeight: 20,
  },
  aiInsightsContainer: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  aiInsightItem: {
    backgroundColor: '#F0FDF4',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  aiInsightText: {
    fontSize: fontSize.xs,
    color: '#166534',
  },
  // Strategy Selector
  strategySelector: {
    marginTop: spacing.sm,
  },
  strategySelectorTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  strategyCard: {
    width: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  strategyEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  strategyName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  strategyNameSelected: {
    color: colors.primary,
  },
  strategyDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  allocationPreview: {
    marginTop: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  allocationPreviewTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  allocationBars: {
    gap: spacing.xs,
  },
  allocationBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allocationBarLabel: {
    width: 40,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  allocationBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  allocationBarPercent: {
    width: 30,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  // Result Grid
  resultGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  resultItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resultLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  // Shortage Alert
  shortageAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  shortageAlertText: {
    flex: 1,
  },
  shortageTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#92400E',
  },
  shortageDesc: {
    fontSize: fontSize.xs,
    color: '#92400E',
    marginTop: 2,
  },
  // Asset Breakdown
  assetBreakdown: {
    marginTop: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  assetBreakdownTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  assetBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  assetBreakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  assetBreakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  // Credit Suggestion
  creditSuggestion: {
    gap: spacing.md,
  },
  creditMessage: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  creditOption: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  creditOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditOptionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#92400E',
  },
  creditOptionBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  creditOptionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
  },
  creditOptionDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  creditOptionDetail: {
    flex: 1,
  },
  creditDetailLabel: {
    fontSize: fontSize.xs,
    color: '#92400E',
  },
  creditDetailValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 2,
  },
  creditApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  creditApplyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  buyNowOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  buyNowOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buyNowOptionText: {
    flex: 1,
  },
  buyNowOptionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#92400E',
  },
  buyNowOptionDesc: {
    fontSize: fontSize.xs,
    color: '#92400E',
  },
  // Tip Card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  // Credit Plan Button
  creditPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  creditPlanButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  creditOptionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  creditOptionCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  creditOptionCardDisabled: {
    opacity: 0.5,
  },
  creditOptionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditOptionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  creditSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  creditSelectedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  creditOptionCardDuration: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  notAffordableBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  notAffordableText: {
    fontSize: fontSize.xs,
    color: '#DC2626',
  },
  creditOptionCardBody: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  creditOptionCardItem: {
    flex: 1,
  },
  creditOptionCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  creditOptionCardValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  modalButtonsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  planOnlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  planOnlyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  modalApplyButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  modalApplyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalApplyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  // Kredi Özet Kutusu
  creditSummaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  creditSummaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  creditSummaryItem: {
    flex: 1,
  },
  creditSummaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  creditSummaryValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  // Uygunluk Kutusu
  affordabilityBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  affordabilityBoxSuccess: {
    backgroundColor: '#ECFDF5',
  },
  affordabilityBoxWarning: {
    backgroundColor: '#FFFBEB',
  },
  affordabilityBoxDanger: {
    backgroundColor: '#F9FAFB',
  },
  affordabilityTextContainer: {
    flex: 1,
  },
  affordabilityMessage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  affordabilityAction: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  affordabilityTimeline: {
    fontSize: fontSize.xs,
    color: '#F59E0B',
    marginTop: 4,
    fontWeight: '500',
  },
  // Kredi Seçenekleri Listesi (ana ekran)
  creditOptionsList: {
    marginTop: spacing.sm,
  },
  creditOptionsListTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  creditOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  creditOptionItemAffordable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  creditOptionItemHighRisk: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  creditOptionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creditOptionDuration: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    width: 50,
  },
  creditOptionStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeDanger: {
    backgroundColor: '#F3F4F6',
  },
  creditOptionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#059669',
  },
  statusTextWarning: {
    color: '#D97706',
  },
  statusTextDanger: {
    color: '#6B7280',
  },
  creditOptionItemRight: {
    alignItems: 'flex-end',
  },
  creditOptionMonthly: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  creditOptionRatio: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  viewAllCreditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  viewAllCreditButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  // Modal Uygunluk Kutusu
  modalAffordabilityBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  modalAffordabilitySuccess: {
    backgroundColor: '#ECFDF5',
  },
  modalAffordabilityWarning: {
    backgroundColor: '#FFFBEB',
  },
  modalAffordabilityInfo: {
    backgroundColor: '#F9FAFB',
  },
  modalAffordabilityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  modalAffordabilitySubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalCreditList: {
    maxHeight: 350,
  },
  // Modal Kredi Kartı Stilleri
  creditOptionCardAffordable: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  creditOptionCardHighRisk: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  creditStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  creditStatusSuccess: {
    backgroundColor: '#D1FAE5',
  },
  creditStatusWarning: {
    backgroundColor: '#FEF3C7',
  },
  creditStatusDanger: {
    backgroundColor: '#FEE2E2',
  },
  creditStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  creditStatusTextSuccess: {
    color: '#059669',
  },
  creditStatusTextWarning: {
    color: '#D97706',
  },
  creditStatusTextDanger: {
    color: '#DC2626',
  },
  // Gelir Oranı Bar
  incomeRatioBar: {
    marginTop: spacing.sm,
  },
  incomeRatioLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  incomeRatioBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  incomeRatioBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Ek Birikim Bilgisi
  additionalSavingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  additionalSavingsText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: '#6B7280',
  },
  // Step 4: Mevcut Plan Stilleri
  progressSection: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    marginTop: -spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.md,
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFillLarge: {
    height: '100%',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  progressStatValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  assetItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  assetItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  assetLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  assetPercent: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  assetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 32,
  },
  assetValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  assetChange: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  profitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  profitValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeInfoItem: {
    alignItems: 'center',
  },
  timeInfoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  timeInfoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contributeButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  contributeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  contributeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  // Para Ekleme Modal
  contributeModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  contributeModalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  contributeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  contributeInputPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  contributeInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  contributeSubmitButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  contributeSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  contributeSubmitText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  // Asset Item Yeni Stiller
  assetLabelContainer: {
    flex: 1,
  },
  assetUnits: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  buyAssetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  buyAssetButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  assetProfit: {
    fontSize: 10,
    marginTop: 2,
  },
  // Hızlı Alım Grid
  quickBuySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  quickBuyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickBuyCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  quickBuyEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickBuyName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  quickBuyPrice: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickBuyChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  quickBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: 2,
  },
  quickBuyButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  // Varlık Alım Modal
  buyAssetModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  currentPriceBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  currentPriceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  currentPriceValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: 4,
  },
  buyInputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  buyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  buyInputPrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  buyInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  unitsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  unitsPreviewLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  unitsPreviewValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  buySubmitButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  buySubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  buySubmitText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Milestone Popup Styles
  milestonePopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  milestonePopupContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  milestonePopupHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  milestonePopupIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  milestonePopupTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  milestonePopupContent: {
    padding: spacing.lg,
  },
  milestonePopupMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  milestoneProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  milestoneProgressRow: {
    alignItems: 'center',
  },
  milestoneProgressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  milestoneProgressValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 2,
  },
  milestoneCreditInfo: {
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  milestoneCreditText: {
    fontSize: fontSize.sm,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 20,
  },
  milestonePopupButtons: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  milestoneCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  milestoneCancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  milestoneCreditButton: {
    flex: 1.5,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  milestoneCreditButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  milestoneCreditButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
});
