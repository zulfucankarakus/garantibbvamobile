import React, { useState } from 'react';
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

export default function PaymentConfirmationScreen({ route, navigation }) {
  const { method, amount, productName, selectedPrice, cardInfo } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [showSmsInput, setShowSmsInput] = useState(false);

  const getMethodIcon = () => {
    if (method === 'cash') return 'cash-outline';
    if (method === 'installment') return 'card-outline';
    if (method === 'loan') return 'business-outline';
    return 'wallet-outline';
  };

  const getMethodTitle = () => {
    if (method === 'cash') return 'Nakit Ödeme';
    if (method === 'installment') return 'Taksitli Ödeme';
    if (method === 'loan') return 'Kredi ile Ödeme';
    return 'Ödeme';
  };

  const handleConfirm = async () => {
    setShowSmsInput(true);
  };

  const handleSmsConfirm = async () => {
    if (!smsCode || smsCode.length !== 6) {
      Alert.alert('Uyarı', 'Lütfen 6 haneli SMS kodunu girin');
      return;
    }

    try {
      setLoading(true);

      // Ödeme işlemini simüle et (2 saniye)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Başarı ekranı göster
      Alert.alert(
        '🎉 Satın Alma Başarılı!',
        `${productName}\n\nÖdeme yöntemi: ${getMethodTitle()}\nTutar: ${amount.toLocaleString('tr-TR')} TL\n\nİşleminiz başarıyla tamamlandı!`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Ana sayfaya dön
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Hata', 'Ödeme işlemi başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Ödeme Onayı" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Başarı Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={getMethodIcon()} size={64} color={colors.primary} />
          </View>
        </View>

        {/* Ürün Bilgisi */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.amount}>{amount.toLocaleString('tr-TR')} TL</Text>
          <Text style={styles.method}>{getMethodTitle()}</Text>
        </View>

        {/* SMS Onay */}
        {!showSmsInput ? (
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              <Text style={styles.infoTitle}>Güvenli Ödeme</Text>
              <Text style={styles.infoText}>
                Ödemenizi onaylamak için SMS ile güvenlik kodu göndereceğiz.
              </Text>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ödeme Yöntemi:</Text>
                <Text style={styles.detailValue}>{getMethodTitle()}</Text>
              </View>
              
              {cardInfo && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Kart:</Text>
                  <Text style={styles.detailValue}>**** {cardInfo.last4}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tutar:</Text>
                <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '700' }]}>
                  {amount.toLocaleString('tr-TR')} TL
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.smsCard}>
              <Ionicons name="mail-outline" size={48} color={colors.primary} />
              <Text style={styles.smsTitle}>SMS Kodu Girin</Text>
              <Text style={styles.smsSubtitle}>
                Telefon numaranıza gönderilen 6 haneli kodu girin
              </Text>

              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity>
                <Text style={styles.resendText}>Kodu tekrar gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Onay Butonu */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={showSmsInput ? handleSmsConfirm : handleConfirm}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.success, '#2ecc71']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.confirmButtonText}>
                    {showSmsInput ? 'Ödemeyi Tamamla' : 'SMS Kodu Gönder'}
                  </Text>
                </>
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
  scrollView: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  productName: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  amount: {
    fontSize: fontSize.xxlarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  method: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  smsCard: {
    backgroundColor: '#fff',
    padding: spacing.xl,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  smsTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  smsSubtitle: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  codeInput: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
    fontSize: fontSize.xlarge,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendText: {
    fontSize: fontSize.medium,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  confirmButton: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: fontSize.large,
    fontWeight: '700',
  },
});
