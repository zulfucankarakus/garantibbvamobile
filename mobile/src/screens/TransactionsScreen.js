import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Loading } from '../components/Loading';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getTransactions } from '../services/transactionService';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions(50); // Son 50 işlem
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const getTransactionIcon = (type) => {
    const icons = {
      transfer: 'arrow-forward',
      qr_payment: 'qr-code',
      payment: 'card',
      deposit: 'arrow-down',
      withdrawal: 'arrow-up',
    };
    return icons[type] || 'swap-horizontal';
  };

  const getTransactionColor = (amount) => {
    return amount > 0 ? colors.success : colors.error;
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      <Header title="İşlemler" />

      {/* Vision Lens - Özel Banner */}
      <View style={styles.visionLensContainer}>
        <TouchableOpacity
          style={styles.visionLensButton}
          onPress={() => navigation.navigate('VisionLens')}
          activeOpacity={0.8}
        >
          <View style={styles.visionLensGradient}>
            <View style={styles.visionLensContent}>
              <View style={styles.visionLensIconContainer}>
                <Ionicons name="eye" size={32} color="white" />
              </View>
              <View style={styles.visionLensTextContainer}>
                <View style={styles.visionLensTitleRow}>
                  <Text style={styles.visionLensTitle}>Vision Lens</Text>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                </View>
                <Text style={styles.visionLensSubtitle}>Görsel Finansal Asistan</Text>
                <Text style={styles.visionLensDescription}>
                  Fotoğrafla, Analiz Et, Finansmanını Bul
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Para Transferi ve QR Ödemeler */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MoneyTransfer')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="send" size={24} color={colors.primary} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Para Transferleri</Text>
            <Text style={styles.actionSubtitle}>Hızlı para gönder</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('QRPayment')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="qr-code" size={24} color="#7C3AED" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>QR Ödemeler</Text>
            <Text style={styles.actionSubtitle}>QR ile öde veya al</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* İşlemler Listesi */}
      {transactions.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyContent}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Henüz İşlem Yok</Text>
            <Text style={styles.emptyText}>
              Yaptığınız tüm işlemler burada görünecek
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.transactionsList}>
            <Text style={styles.listTitle}>Son İşlemler</Text>
            
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View
                  style={[
                    styles.transactionIconContainer,
                    { backgroundColor: transaction.amount > 0 ? '#DCFCE7' : '#FEE2E2' },
                  ]}
                >
                  <Ionicons
                    name={getTransactionIcon(transaction.transaction_type)}
                    size={24}
                    color={getTransactionColor(transaction.amount)}
                  />
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || 'İşlem'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                  {transaction.to_account_iban && (
                    <Text style={styles.transactionDetail}>
                      IBAN: {transaction.to_account_iban.substring(0, 12)}...
                    </Text>
                  )}
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.amount > 0 ? styles.positiveAmount : styles.negativeAmount,
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : '-'}{formatAmount(transaction.amount)} TL
                  </Text>
                  <View
                    style={[
                      styles.transactionStatus,
                      transaction.status === 'completed'
                        ? styles.statusCompleted
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        transaction.status === 'completed'
                          ? styles.statusTextCompleted
                          : styles.statusTextPending,
                      ]}
                    >
                      {transaction.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  visionLensContainer: {
    padding: spacing.lg,
  },
  visionLensButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    marginBottom: spacing.md,
  },
  visionLensGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: '#7C3AED',
  },
  visionLensContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  visionLensIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  visionLensTextContainer: {
    flex: 1,
  },
  visionLensTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  visionLensTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
    marginRight: spacing.sm,
  },
  aiBadge: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  aiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#7C3AED',
  },
  visionLensSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
  },
  visionLensDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickActions: {
    padding: spacing.lg,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  transactionsList: {
    padding: spacing.lg,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  transactionDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  transactionStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#16A34A',
  },
  statusTextPending: {
    color: '#CA8A04',
  },
});
