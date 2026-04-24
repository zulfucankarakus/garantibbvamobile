import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getCardTransactions, deleteCard } from '../services/cardService';

export default function CardDetailScreen({ route, navigation }) {
  const { card } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getCardTransactions(card.id);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Hata', 'İşlemler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleDeleteCard = () => {
    const cardTypeName = card.card_type === 'credit' ? 'kredi kartınızı' : 'banka kartınızı';
    
    Alert.alert(
      'Kart Kapatma',
      `${card.name} ${cardTypeName} kapatmak istediğinizden emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: confirmDeleteCard,
        },
      ]
    );
  };

  const confirmDeleteCard = async () => {
    try {
      setDeleting(true);
      await deleteCard(card.id);
      
      Alert.alert(
        'Başarılı! ✅',
        'Kartınız başarıyla kapatıldı',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting card:', error);
      const errorMessage = error.response?.data?.detail || 'Kart kapatılırken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setDeleting(false);
    }
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
    }).format(amount);
  };

  const renderCardInfo = () => {
    const isCredit = card.card_type === 'credit';
    
    return (
      <View style={styles.cardInfoSection}>
        <View style={[styles.cardBanner, isCredit ? styles.creditCard : styles.debitCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{card.name}</Text>
            <Ionicons 
              name={isCredit ? 'card-outline' : 'card'} 
              size={32} 
              color="#fff" 
            />
          </View>
          
          <View style={styles.cardNumbers}>
            <Text style={styles.cardNumber}>•••• •••• •••• {card.card_no?.slice(-4) || '****'}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>Son Kullanma</Text>
              <Text style={styles.cardValue}>{card.expiry_date || 'MM/YY'}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>CVV</Text>
              <Text style={styles.cardValue}>•••</Text>
            </View>
          </View>
        </View>

        <View style={styles.balanceSection}>
          {isCredit ? (
            <>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Toplam Limit</Text>
                <Text style={styles.balanceAmount}>{formatAmount(card.limit || 0)} TL</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Kullanılabilir Limit</Text>
                <Text style={[styles.balanceAmount, styles.availableAmount]}>
                  {formatAmount(card.available_limit || 0)} TL
                </Text>
              </View>
              {card.balance > 0 && (
                <>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Borç</Text>
                    <Text style={[styles.balanceAmount, styles.debtAmount]}>
                      {formatAmount(card.balance)} TL
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Bakiye</Text>
              <Text style={styles.balanceAmount}>{formatAmount(card.balance || 0)} TL</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTransactions = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>İşlemler yükleniyor...</Text>
        </View>
      );
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Henüz işlem yok</Text>
          <Text style={styles.emptyText}>
            Bu kartla yapılan işlemler burada görünecek
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Kart Hareketleri</Text>
        {transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
              <Ionicons 
                name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'} 
                size={24} 
                color={transaction.amount > 0 ? colors.success : colors.error} 
              />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>
                {transaction.description || 'İşlem'}
              </Text>
              <Text style={styles.transactionDate}>
                {formatDate(transaction.created_at)}
              </Text>
            </View>
            <Text 
              style={[
                styles.transactionAmount,
                transaction.amount > 0 ? styles.positiveAmount : styles.negativeAmount
              ]}
            >
              {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)} TL
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Kart Detayı" onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderCardInfo()}
        {renderTransactions()}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteCard}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Kartı Kapat</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  content: {
    flex: 1,
  },
  cardInfoSection: {
    padding: spacing.lg,
  },
  cardBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  creditCard: {
    backgroundColor: '#2C3E50',
  },
  debitCard: {
    backgroundColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  cardNumbers: {
    marginVertical: spacing.lg,
  },
  cardNumber: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  balanceSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  balanceItem: {
    paddingVertical: spacing.sm,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  availableAmount: {
    color: colors.success,
  },
  debtAmount: {
    color: colors.error,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
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
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
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
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  deleteButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
    marginLeft: spacing.sm,
  },
  spacer: {
    height: spacing.xl,
  },
});
