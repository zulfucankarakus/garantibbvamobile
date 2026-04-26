import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import api from '../../config/api';

export default function CreditSimulatorScreen({ navigation }) {
  const [formData, setFormData] = useState({
    monthly_income: '',
    age: 35,
    existing_debt: '',
    credit_history_years: 5,
    employment_years: 3,
    requested_amount: '',
    requested_term_months: 12,
    existing_savings: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeRisk = async () => {
    if (!formData.monthly_income || !formData.requested_amount) {
      Alert.alert('Uyarı', 'Lütfen aylık gelir ve kredi tutarını girin');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/deep-learning/credit-risk', {
        monthly_income: parseFloat(formData.monthly_income),
        age: formData.age,
        existing_debt: parseFloat(formData.existing_debt || 0),
        credit_history_years: formData.credit_history_years,
        employment_years: formData.employment_years,
        requested_amount: parseFloat(formData.requested_amount),
        requested_term_months: formData.requested_term_months,
        existing_savings: parseFloat(formData.existing_savings || 0),
      });
      setResult(response.data);
    } catch (error) {
      console.error('Credit risk error:', error);
      Alert.alert('Hata', 'Risk analizi yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (label, key, placeholder, keyboardType = 'numeric') => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        value={formData[key]}
        onChangeText={(value) => setFormData({ ...formData, [key]: value })}
      />
    </View>
  );

  const renderSlider = (label, key, min, max, step, suffix = '') => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{formData[key]}{suffix}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={formData[key]}
        onValueChange={(value) => setFormData({ ...formData, [key]: value })}
        minimumTrackTintColor="#3B82F6"
        maximumTrackTintColor="#374151"
        thumbTintColor="#3B82F6"
      />
    </View>
  );

  const renderResult = () => {
    if (!result || !result.success) return null;

    const riskClass = result.risk_class || {};
    const paymentCapacity = result.payment_capacity || {};
    const recommendations = result.recommendations || [];
    const featureImportance = result.feature_importance || {};

    return (
      <View style={styles.resultContainer}>
        {/* Risk Skoru */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreEmoji}>{riskClass.emoji}</Text>
            <Text style={styles.scoreValue}>{result.risk_score}</Text>
            <Text style={styles.scoreMax}>/1000</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.riskLevel, { color: riskClass.color }]}>
              {riskClass.level}
            </Text>
            <Text style={styles.riskClass}>Sınıf: {riskClass.class}</Text>
          </View>
        </View>

        {/* Ödeme Kapasitesi */}
        <View style={styles.capacityCard}>
          <Text style={styles.cardTitle}>💳 Ödeme Kapasitesi</Text>
          <View style={styles.capacityRow}>
            <View style={styles.capacityItem}>
              <Text style={styles.capacityLabel}>Aylık Taksit</Text>
              <Text style={styles.capacityValue}>
                {paymentCapacity.monthly_payment?.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={styles.capacityItem}>
              <Text style={styles.capacityLabel}>Gelir/Taksit</Text>
              <Text style={[
                styles.capacityValue,
                paymentCapacity.payment_to_income_ratio > 40 ? styles.warning : styles.success
              ]}>
                %{paymentCapacity.payment_to_income_ratio?.toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={styles.affordContainer}>
            <Ionicons 
              name={paymentCapacity.can_afford ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={paymentCapacity.can_afford ? "#22C55E" : "#EF4444"} 
            />
            <Text style={styles.affordText}>
              {paymentCapacity.can_afford 
                ? 'Bu krediyi ödeyebilirsiniz' 
                : 'Ödeme kapasitesi yetersiz'}
            </Text>
          </View>
        </View>

        {/* Öneriler */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>💡 Öneriler</Text>
            {recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendation}>{rec}</Text>
            ))}
          </View>
        )}

        {/* Feature Importance */}
        <View style={styles.featureCard}>
          <Text style={styles.cardTitle}>📊 Faktör Ağırlıkları</Text>
          {Object.entries(featureImportance).map(([key, value]) => (
            <View key={key} style={styles.featureRow}>
              <Text style={styles.featureLabel}>{key}</Text>
              <View style={styles.featureBarContainer}>
                <View style={[styles.featureBar, { width: `${value * 100}%` }]} />
              </View>
              <Text style={styles.featureValue}>{(value * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>

        {/* Model Bilgisi */}
        <View style={styles.modelCard}>
          <Text style={styles.cardTitle}>🧠 MLP Neural Network</Text>
          <Text style={styles.modelText}>
            Mimari: {result.model_info?.architecture}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📊 Kredi Simülatörü</Text>
          <Text style={styles.headerSubtitle}>MLP Risk Skorlama</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Form */}
        <View style={styles.formCard}>
          {renderInputField('Aylık Gelir (₺)', 'monthly_income', 'Örn: 25000')}
          {renderInputField('Talep Edilen Kredi (₺)', 'requested_amount', 'Örn: 200000')}
          {renderInputField('Mevcut Borç (₺)', 'existing_debt', 'Örn: 50000')}
          {renderInputField('Birikim (₺)', 'existing_savings', 'Örn: 30000')}
          
          {renderSlider('Yaş', 'age', 18, 70, 1, ' yaş')}
          {renderSlider('Kredi Geçmişi', 'credit_history_years', 0, 20, 1, ' yıl')}
          {renderSlider('İstihdam Süresi', 'employment_years', 0, 30, 1, ' yıl')}
          {renderSlider('Vade', 'requested_term_months', 3, 60, 3, ' ay')}
        </View>

        {/* Analiz Butonu */}
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={analyzeRisk}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={styles.analyzeButtonText}>Risk Analizi Yap</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sonuçlar */}
        {renderResult()}
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
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderValue: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  analyzeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultContainer: {
    marginBottom: 30,
  },
  scoreCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  scoreEmoji: {
    fontSize: 24,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreMax: {
    color: '#6B7280',
    fontSize: 14,
  },
  scoreInfo: {
    flex: 1,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskClass: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  capacityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  capacityRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  capacityItem: {
    flex: 1,
  },
  capacityLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  capacityValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warning: {
    color: '#F59E0B',
  },
  success: {
    color: '#22C55E',
  },
  affordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
  },
  affordText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  recommendationsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  recommendation: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 20,
  },
  featureCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    width: 80,
  },
  featureBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  featureBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  featureValue: {
    color: '#fff',
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  modelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  modelText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
