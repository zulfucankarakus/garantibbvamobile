import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function TransactionSecurityScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [location, setLocation] = useState('Istanbul');
  const [isInternational, setIsInternational] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);

  const LOCATIONS = ['Istanbul', 'Ankara', 'Izmir', 'London', 'New York', 'Dubai'];
  const TX_TYPES = ['transfer', 'payment', 'withdrawal', 'deposit'];

  const [txType, setTxType] = useState('transfer');

  const analyzeTransaction = async () => {
    if (!amount) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/deep-learning/anomaly-detection', {
        amount: parseFloat(amount),
        type: txType,
        location: location,
        is_international: isInternational,
        merchant_category: 'retail',
        time: new Date().toISOString(),
      });
      setResult(response.data);
    } catch (error) {
      console.error('Anomaly detection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBatchAnalysis = async () => {
    setLoading(true);
    try {
      // Örnek işlemler
      const sampleTransactions = [
        { amount: 5000, type: 'transfer', location: 'Istanbul', is_international: false },
        { amount: 150000, type: 'transfer', location: 'Dubai', is_international: true },
        { amount: 2500, type: 'payment', location: 'Ankara', is_international: false },
        { amount: 80000, type: 'withdrawal', location: 'Istanbul', is_international: false },
        { amount: 500, type: 'deposit', location: 'Izmir', is_international: false },
      ];

      const response = await api.post('/deep-learning/anomaly-detection/batch', {
        transactions: sampleTransactions,
      });
      setBatchResults(response.data);
    } catch (error) {
      console.error('Batch analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRiskBadge = (riskLevel) => {
    return (
      <View style={[styles.riskBadge, { backgroundColor: riskLevel?.color + '30' }]}>
        <Text style={styles.riskEmoji}>{riskLevel?.emoji}</Text>
        <Text style={[styles.riskLabel, { color: riskLevel?.color }]}>
          {riskLevel?.label}
        </Text>
      </View>
    );
  };

  const renderResult = () => {
    if (!result || !result.success) return null;

    return (
      <View style={styles.resultCard}>
        {/* Ana Sonuç */}
        <View style={styles.mainResult}>
          <View style={[
            styles.anomalyIndicator,
            { backgroundColor: result.is_anomaly ? '#EF444430' : '#22C55E30' }
          ]}>
            <Ionicons
              name={result.is_anomaly ? 'warning' : 'shield-checkmark'}
              size={40}
              color={result.is_anomaly ? '#EF4444' : '#22C55E'}
            />
          </View>
          <View style={styles.mainResultInfo}>
            <Text style={styles.mainResultTitle}>
              {result.is_anomaly ? 'Şüpheli İşlem Tespit Edildi!' : 'İşlem Normal'}
            </Text>
            <Text style={styles.anomalyScore}>
              Anomali Skoru: {(result.anomaly_score * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Risk Seviyesi */}
        <View style={styles.riskContainer}>
          {renderRiskBadge(result.risk_level)}
          <Text style={styles.reconstructionError}>
            Reconstruction Error: {result.reconstruction_error?.toFixed(4)}
          </Text>
        </View>

        {/* Anomali Bayrakları */}
        {result.anomaly_flags?.length > 0 && (
          <View style={styles.flagsContainer}>
            <Text style={styles.sectionTitle}>⚠️ Tespit Edilen Sorunlar</Text>
            {result.anomaly_flags.map((flag, index) => (
              <View key={index} style={styles.flagItem}>
                <View style={[
                  styles.severityDot,
                  { backgroundColor: flag.severity === 'high' ? '#EF4444' : 
                                    flag.severity === 'medium' ? '#F59E0B' : '#3B82F6' }
                ]} />
                <Text style={styles.flagText}>{flag.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Açıklama */}
        <View style={styles.explanationContainer}>
          <Ionicons name="information-circle" size={20} color="#9CA3AF" />
          <Text style={styles.explanationText}>{result.explanation}</Text>
        </View>

        {/* Önerilen Aksiyon */}
        <View style={[
          styles.actionContainer,
          { backgroundColor: result.is_anomaly ? '#EF444420' : '#22C55E20' }
        ]}>
          <Text style={styles.actionTitle}>Önerilen Aksiyon</Text>
          <Text style={styles.actionText}>{result.recommended_action}</Text>
        </View>

        {/* Model Bilgisi */}
        <View style={styles.modelInfo}>
          <Text style={styles.modelTitle}>🧠 Autoencoder Model</Text>
          <Text style={styles.modelText}>
            {result.model_info?.architecture}
          </Text>
        </View>
      </View>
    );
  };

  const renderBatchResults = () => {
    if (!batchResults || !batchResults.success) return null;

    return (
      <View style={styles.batchCard}>
        <Text style={styles.sectionTitle}>📊 Toplu Analiz Sonuçları</Text>
        
        <View style={styles.batchSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{batchResults.total_transactions}</Text>
            <Text style={styles.summaryLabel}>Toplam</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              {batchResults.anomaly_count}
            </Text>
            <Text style={styles.summaryLabel}>Şüpheli</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{batchResults.anomaly_rate}%</Text>
            <Text style={styles.summaryLabel}>Oran</Text>
          </View>
        </View>

        <Text style={styles.batchStatus}>{batchResults.summary?.status}</Text>

        {/* İşlem Listesi */}
        <FlatList
          data={batchResults.results}
          scrollEnabled={false}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.batchItem}>
              <View style={styles.batchItemLeft}>
                <Ionicons
                  name={item.is_anomaly ? 'alert-circle' : 'checkmark-circle'}
                  size={24}
                  color={item.is_anomaly ? '#EF4444' : '#22C55E'}
                />
                <View style={styles.batchItemInfo}>
                  <Text style={styles.batchItemAmount}>
                    {item.transaction_summary?.amount?.toLocaleString('tr-TR')} ₺
                  </Text>
                  <Text style={styles.batchItemLocation}>
                    {item.transaction_summary?.location}
                  </Text>
                </View>
              </View>
              <Text style={styles.batchItemScore}>
                {(item.anomaly_score * 100).toFixed(0)}%
              </Text>
            </View>
          )}
        />
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
          <Text style={styles.headerTitle}>🔍 İşlem Güvenliği</Text>
          <Text style={styles.headerSubtitle}>Autoencoder Anomali Tespiti</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tek İşlem Analizi</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>İşlem Tutarı (₺)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 50000"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* İşlem Türü */}
          <Text style={styles.inputLabel}>İşlem Türü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {TX_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  txType === type && styles.typeButtonActive
                ]}
                onPress={() => setTxType(type)}
              >
                <Text style={[
                  styles.typeText,
                  txType === type && styles.typeTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lokasyon */}
          <Text style={styles.inputLabel}>Lokasyon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.typeButton,
                  location === loc && styles.typeButtonActive
                ]}
                onPress={() => {
                  setLocation(loc);
                  setIsInternational(!['Istanbul', 'Ankara', 'Izmir'].includes(loc));
                }}
              >
                <Text style={[
                  styles.typeText,
                  location === loc && styles.typeTextActive
                ]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Uluslararası */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsInternational(!isInternational)}
          >
            <Ionicons
              name={isInternational ? 'checkbox' : 'square-outline'}
              size={24}
              color="#3B82F6"
            />
            <Text style={styles.checkboxLabel}>Uluslararası İşlem</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={analyzeTransaction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="scan" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>Anomali Tara</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tek İşlem Sonucu */}
        {renderResult()}

        {/* Toplu Analiz */}
        <TouchableOpacity
          style={styles.batchButton}
          onPress={runBatchAnalysis}
          disabled={loading}
        >
          <Ionicons name="layers" size={20} color="#fff" />
          <Text style={styles.batchButtonText}>Örnek Toplu Analiz Çalıştır</Text>
        </TouchableOpacity>

        {/* Toplu Analiz Sonucu */}
        {renderBatchResults()}
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
  formTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  typeScroll: {
    marginBottom: 15,
  },
  typeButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  typeText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  typeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    color: '#fff',
    marginLeft: 10,
  },
  analyzeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
  },
  mainResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  anomalyIndicator: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  mainResultInfo: {
    flex: 1,
  },
  mainResultTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  anomalyScore: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  riskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  riskEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reconstructionError: {
    color: '#6B7280',
    fontSize: 12,
  },
  flagsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  flagText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  explanationText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  actionContainer: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  modelInfo: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
  },
  modelTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modelText: {
    color: '#6B7280',
    fontSize: 11,
  },
  batchButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  batchCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    marginBottom: 30,
  },
  batchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  batchStatus: {
    color: '#22C55E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  batchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  batchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchItemInfo: {
    marginLeft: 10,
  },
  batchItemAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  batchItemLocation: {
    color: '#6B7280',
    fontSize: 12,
  },
  batchItemScore: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
