import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

export default function SavingsPlanScreen({ route, navigation }) {
  const { productName, price, plan } = route.params;
  
  const [monthlySavings, setMonthlySavings] = useState(
    plan?.savings_phase?.monthly_savings?.toString() || ''
  );
  const [targetAmount, setTargetAmount] = useState(price.toString());
  const [planName, setPlanName] = useState(`${productName} Birikim Planı`);
  const [autoTransfer, setAutoTransfer] = useState(true);

  const calculateDuration = () => {
    const savings = parseFloat(monthlySavings) || 0;
    const target = parseFloat(targetAmount) || 0;
    if (savings <= 0) return 0;
    return Math.ceil(target / savings);
  };

  const handleCreatePlan = async () => {
    if (!monthlySavings || parseFloat(monthlySavings) <= 0) {
      Alert.alert('Uyarı', 'Lütfen aylık birikim tutarını girin');
      return;
    }

    const duration = calculateDuration();

    try {
      // Birikim planı oluştur
      const response = await api.post('/financial-goals', {
        goal_type: 'savings',
        title: planName,
        target_amount: parseFloat(targetAmount),
        current_amount: 0,
        target_date: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString(),
        monthly_contribution: parseFloat(monthlySavings),
        auto_transfer: autoTransfer,
        product_name: productName,
      });

      if (response.data.success) {
        Alert.alert(
          '✅ Birikim Planı Oluşturuldu!',
          `${planName}\n\nAylık: ${parseFloat(monthlySavings).toLocaleString('tr-TR')} TL\nSüre: ${duration} ay\nHedef: ${parseFloat(targetAmount).toLocaleString('tr-TR')} TL\n\n${autoTransfer ? 'Otomatik transfer aktif edildi.' : 'Manuel transfer gerekecek.'}`,
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
      }
    } catch (error) {
      console.error('Savings plan error:', error);
      Alert.alert('Hata', 'Birikim planı oluşturulamadı. Lütfen tekrar deneyin.');
    }
  };

  const duration = calculateDuration();
  const targetDate = new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000);

  return (
    <View style={styles.container}>
      <Header title="Birikim Planı" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plan Özeti */}
        <View style={styles.planSummary}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={48} color={colors.primary} />
          </View>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.targetAmount}>{price.toLocaleString('tr-TR')} TL</Text>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Plan Adı</Text>
            <TextInput
              style={styles.input}
              value={planName}
              onChangeText={setPlanName}
              placeholder="Örn: iPhone Birikim Planı"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Aylık Birikim Tutarı (TL)</Text>
            <TextInput
              style={styles.input}
              value={monthlySavings}
              onChangeText={setMonthlySavings}
              keyboardType="numeric"
              placeholder="Örn: 5000"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Hedef Tutar (TL)</Text>
            <TextInput
              style={styles.input}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder={price.toString()}
            />
          </View>

          {/* Otomatik Transfer */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAutoTransfer(!autoTransfer)}
          >
            <View style={[styles.checkbox, autoTransfer && styles.checkboxChecked]}>
              {autoTransfer && (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </View>
            <View style={styles.checkboxLabel}>
              <Text style={styles.checkboxText}>Otomatik Transfer</Text>
              <Text style={styles.checkboxSubtext}>
                Her ay otomatik olarak birikim hesabına aktar
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hesaplama Özeti */}
        {monthlySavings && parseFloat(monthlySavings) > 0 && (
          <View style={styles.section}>
            <View style={styles.calculationCard}>
              <Text style={styles.calculationTitle}>Plan Özeti</Text>
              
              <View style={styles.calculationRow}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <View style={styles.calculationInfo}>
                  <Text style={styles.calculationLabel}>Birikim Süresi</Text>
                  <Text style={styles.calculationValue}>{duration} ay</Text>
                </View>
              </View>

              <View style={styles.calculationRow}>
                <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
                <View style={styles.calculationInfo}>
                  <Text style={styles.calculationLabel}>Aylık Birikim</Text>
                  <Text style={styles.calculationValue}>
                    {parseFloat(monthlySavings).toLocaleString('tr-TR')} TL
                  </Text>
                </View>
              </View>

              <View style={styles.calculationRow}>
                <Ionicons name="flag-outline" size={24} color={colors.primary} />
                <View style={styles.calculationInfo}>
                  <Text style={styles.calculationLabel}>Hedef Tarih</Text>
                  <Text style={styles.calculationValue}>
                    {targetDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                  </Text>
                </View>
              </View>

              <View style={styles.calculationRow}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                <View style={styles.calculationInfo}>
                  <Text style={styles.calculationLabel}>Toplam Birikim</Text>
                  <Text style={[styles.calculationValue, { color: colors.success, fontWeight: '700' }]}>
                    {parseFloat(targetAmount).toLocaleString('tr-TR')} TL
                  </Text>
                </View>
              </View>
            </View>

            {/* Bildirim Bilgisi */}
            <View style={styles.notificationInfo}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
              <Text style={styles.notificationText}>
                Hedefe ulaştığınızda bildirim alacaksınız
              </Text>
            </View>
          </View>
        )}

        {/* Oluştur Butonu */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePlan}
          >
            <LinearGradient
              colors={[colors.success, '#2ecc71']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Planı Oluştur</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Akıllı Yatırım Danışmanı */}
          <TouchableOpacity
            style={styles.smartInvestmentButton}
            onPress={() => navigation.navigate('SmartInvestment', {
              targetAmount: parseFloat(targetAmount),
              productName: productName,
              monthlyIncome: 0,
              monthlyExpenses: 0
            })}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={styles.smartInvestmentText}>
              🤖 AI ile Akıllı Yatırım Planı Oluştur
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.smartInvestmentHint}>
            Dolar, Euro, Altın yatırımları ile hedefinize daha hızlı ulaşın
          </Text>
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
  planSummary: {
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  productName: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  targetAmount: {
    fontSize: fontSize.xxlarge,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: fontSize.medium,
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  checkboxSubtext: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  calculationCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculationTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  calculationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calculationInfo: {
    flex: 1,
  },
  calculationLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  calculationValue: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  notificationText: {
    fontSize: fontSize.small,
    color: colors.primary,
    flex: 1,
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  createButton: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: fontSize.large,
    fontWeight: '700',
  },
  smartInvestmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.lg,
  },
  smartInvestmentText: {
    flex: 1,
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  smartInvestmentHint: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
