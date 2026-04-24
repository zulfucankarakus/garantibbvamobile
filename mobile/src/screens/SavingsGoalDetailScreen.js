import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

// İlerleme yüzdesine göre renk belirleme
const getProgressColor = (percentage) => {
  if (percentage < 33) return '#EF4444'; // Kırmızı
  if (percentage < 67) return '#F59E0B'; // Sarı/Turuncu
  return '#10B981'; // Yeşil
};

// İlerleme barı gradient renkleri
const getProgressGradient = (percentage) => {
  if (percentage < 33) return ['#EF4444', '#DC2626'];
  if (percentage < 67) return ['#F59E0B', '#D97706'];
  return ['#10B981', '#059669'];
};

export default function SavingsGoalDetailScreen({ route, navigation }) {
  const { goalId, goal: initialGoal } = route.params;
  
  const [goal, setGoal] = useState(initialGoal || null);
  const [loading, setLoading] = useState(!initialGoal);
  const [contributing, setContributing] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');

  useEffect(() => {
    if (goalId && !initialGoal) {
      loadGoal();
    }
  }, [goalId]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/financial-goals/${goalId}`);
      setGoal(response.data);
    } catch (error) {
      console.error('Goal load error:', error);
      Alert.alert('Hata', 'Hedef bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      setContributing(true);
      const response = await api.post(`/financial-goals/${goal.id}/contribute`, {
        amount: amount,
        note: 'Manuel birikim'
      });

      if (response.data.success) {
        setGoal(response.data.goal);
        setShowContributeModal(false);
        setContributeAmount('');
        
        const newProgress = response.data.progress_percentage;
        if (newProgress >= 100) {
          Alert.alert(
            '🎉 Tebrikler!',
            'Hedefinize ulaştınız! Artık ürününüzü satın alabilirsiniz.',
            [{ text: 'Harika!' }]
          );
        } else {
          Alert.alert(
            '✅ Başarılı',
            `${amount.toLocaleString('tr-TR')} TL eklendi. İlerleme: %${newProgress.toFixed(0)}`,
            [{ text: 'Tamam' }]
          );
        }
      }
    } catch (error) {
      console.error('Contribute error:', error);
      Alert.alert('Hata', 'Para eklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setContributing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Hedefi Sil',
      'Bu birikim hedefini silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/financial-goals/${goal.id}`);
              Alert.alert('Başarılı', 'Hedef silindi');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', 'Hedef silinemedi');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Birikim Detayı" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.container}>
        <Header title="Birikim Detayı" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Hedef bulunamadı</Text>
        </View>
      </View>
    );
  }

  const currentAmount = parseFloat(goal.current_amount || 0);
  const targetAmount = parseFloat(goal.target_amount || 0);
  const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const monthlySavings = parseFloat(goal.monthly_savings || 0);
  const remainingMonths = monthlySavings > 0 ? Math.ceil(remainingAmount / monthlySavings) : 0;
  const progressColor = getProgressColor(progressPercentage);
  const progressGradient = getProgressGradient(progressPercentage);

  return (
    <View style={styles.container}>
      <Header 
        title="Birikim Detayı" 
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ana Kart */}
        <View style={styles.mainCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${progressColor}20` }]}>
              <Ionicons 
                name={progressPercentage >= 100 ? "checkmark-circle" : "wallet"} 
                size={32} 
                color={progressColor} 
              />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalName}>{goal.goal_name || goal.product_name || 'Birikim Hedefi'}</Text>
              <Text style={styles.goalStatus}>
                {progressPercentage >= 100 ? '✅ Tamamlandı' : 
                 progressPercentage > 0 ? '🔄 Devam Ediyor' : '⏳ Başlamadı'}
              </Text>
            </View>
          </View>

          {/* İlerleme Barı */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>İlerleme Durumu</Text>
              <Text style={[styles.progressPercentage, { color: progressColor }]}>
                %{progressPercentage.toFixed(0)}
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={progressGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                />
              </View>
            </View>

            <View style={styles.progressDetails}>
              <View style={styles.progressDetailItem}>
                <Text style={styles.progressDetailLabel}>Biriken</Text>
                <Text style={[styles.progressDetailValue, { color: progressColor }]}>
                  {currentAmount.toLocaleString('tr-TR')} TL
                </Text>
              </View>
              <View style={styles.progressDetailItem}>
                <Text style={styles.progressDetailLabel}>Hedef</Text>
                <Text style={styles.progressDetailValue}>
                  {targetAmount.toLocaleString('tr-TR')} TL
                </Text>
              </View>
            </View>
          </View>

          {/* Kalan Miktar */}
          {remainingAmount > 0 && (
            <View style={styles.remainingSection}>
              <Ionicons name="flag" size={20} color={colors.warning} />
              <Text style={styles.remainingText}>
                Hedefe <Text style={styles.remainingAmount}>{remainingAmount.toLocaleString('tr-TR')} TL</Text> kaldı
              </Text>
            </View>
          )}
        </View>

        {/* İstatistikler */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{remainingMonths}</Text>
            <Text style={styles.statLabel}>Kalan Ay</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="repeat" size={24} color={colors.success} />
            <Text style={styles.statValue}>{monthlySavings.toLocaleString('tr-TR')}</Text>
            <Text style={styles.statLabel}>Aylık Birikim (TL)</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{(goal.contributions || []).length}</Text>
            <Text style={styles.statLabel}>Toplam Katkı</Text>
          </View>
        </View>

        {/* Katkı Geçmişi */}
        {(goal.contributions || []).length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Katkı Geçmişi</Text>
            {goal.contributions.slice(-5).reverse().map((contribution, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons name="add-circle" size={20} color={colors.success} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyAmount}>+{parseFloat(contribution.amount).toLocaleString('tr-TR')} TL</Text>
                  <Text style={styles.historyDate}>
                    {new Date(contribution.date).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Öneriler */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 İpuçları</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={styles.tipText}>
              Düzenli birikim yaparak hedefinize daha hızlı ulaşabilirsiniz. Her ay {monthlySavings.toLocaleString('tr-TR')} TL biriktirirseniz {remainingMonths} ay içinde hedefinize ulaşırsınız.
            </Text>
          </View>
        </View>

        {/* Para Ekle Butonu */}
        {progressPercentage < 100 && (
          <TouchableOpacity 
            style={styles.contributeButton}
            onPress={() => setShowContributeModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contributeGradient}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.contributeButtonText}>Para Ekle</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Tamamlandı Butonu */}
        {progressPercentage >= 100 && (
          <TouchableOpacity 
            style={styles.completedButton}
            onPress={() => {
              Alert.alert(
                '🎉 Tebrikler!',
                `Hedefinize ulaştınız! ${goal.goal_name || goal.product_name || 'Ürünü'} artık satın alabilirsiniz.`,
                [{ text: 'Harika!' }]
              );
            }}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contributeGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.contributeButtonText}>Hedefe Ulaşıldı!</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Para Ekle Modal */}
      <Modal
        visible={showContributeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContributeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Para Ekle</Text>
              <TouchableOpacity onPress={() => setShowContributeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Eklemek istediğiniz tutar</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={contributeAmount}
                onChangeText={setContributeAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.inputCurrency}>TL</Text>
            </View>

            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 2500].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setContributeAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>{amount} TL</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleContribute}
              disabled={contributing}
            >
              {contributing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  goalName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  goalStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressPercentage: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBarBackground: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetailItem: {
    alignItems: 'center',
  },
  progressDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressDetailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  remainingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight || '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  remainingText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  remainingAmount: {
    fontWeight: '700',
    color: colors.warning,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  historySection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIcon: {
    marginRight: spacing.sm,
  },
  historyInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tipsSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  contributeButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  completedButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  contributeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  contributeButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
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
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputCurrency: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
