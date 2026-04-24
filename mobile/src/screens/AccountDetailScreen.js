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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getAccountTransactions, deleteAccount, getAccounts } from '../services/accountService';

export default function AccountDetailScreen({ route, navigation }) {
  const { account } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedTargetAccount, setSelectedTargetAccount] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAccountTransactions(account.id);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesap Kapatma',
      `${account.name} hesabını kapatmak istediğinizden emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: checkBalanceAndDelete,
        },
      ]
    );
  };

  const checkBalanceAndDelete = async () => {
    // Bakiye kontrolü
    if (account.balance > 0) {
      // Diğer hesapları yükle
      try {
        setDeleting(true);
        const allAccounts = await getAccounts();
        const otherAccounts = allAccounts.filter(acc => acc.id !== account.id);
        
        if (otherAccounts.length === 0) {
          Alert.alert(
            'Uyarı',
            'Son hesabınızı kapatamazsınız. Hesabınızda bakiye bulunmaktadır.'
          );
          setDeleting(false);
          return;
        }

        setAvailableAccounts(otherAccounts);
        setShowTransferModal(true);
        setDeleting(false);
      } catch (error) {
        console.error('Error loading accounts:', error);
        Alert.alert('Hata', 'Hesaplar yüklenirken bir hata oluştu');
        setDeleting(false);
      }
    } else {
      // Bakiye yoksa direkt sil
      confirmDeleteAccount(null);
    }
  };

  const confirmDeleteAccount = async (targetAccountId) => {
    try {
      setDeleting(true);
      setShowTransferModal(false);
      
      await deleteAccount(account.id, targetAccountId);
      
      Alert.alert(
        'Başarılı! ✅',
        targetAccountId 
          ? 'Hesabınız kapatıldı ve bakiyeniz aktarıldı'
          : 'Hesabınız başarıyla kapatıldı',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.data?.detail || 'Hesap kapatılırken bir hata oluştu';
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

  const getAccountTypeLabel = (type) => {
    const types = {
      checking: 'Vadesiz Mevduat',
      savings: 'Vadeli Mevduat',
      business: 'İşletme Hesabı',
    };
    return types[type] || type;
  };

  const renderAccountInfo = () => {
    return (
      <View style={styles.accountInfoSection}>
        <View style={styles.accountBanner}>
          <View style={styles.accountHeader}>
            <View>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountType}>{getAccountTypeLabel(account.account_type)}</Text>
            </View>
            <Ionicons name="wallet" size={32} color="#fff" />
          </View>
          
          <View style={styles.accountBalance}>
            <Text style={styles.balanceLabel}>Bakiye</Text>
            <Text style={styles.balanceAmount}>{formatAmount(account.balance || 0)} TL</Text>
          </View>

          <View style={styles.accountDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Hesap No</Text>
              <Text style={styles.detailValue}>{account.account_no}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>IBAN</Text>
              <Text style={styles.detailValue}>{account.iban}</Text>
            </View>
          </View>
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
            Bu hesapla yapılan işlemler burada görünecek
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Hesap Hareketleri</Text>
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

  const renderTransferModal = () => {
    return (
      <Modal
        visible={showTransferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bakiye Transferi</Text>
            <Text style={styles.modalText}>
              Hesabınızda {formatAmount(account.balance)} TL bulunmaktadır.
              Bakiyenizi hangi hesaba aktarmak istersiniz?
            </Text>

            <ScrollView style={styles.accountsList}>
              {availableAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountOption,
                    selectedTargetAccount?.id === acc.id && styles.accountOptionSelected
                  ]}
                  onPress={() => setSelectedTargetAccount(acc)}
                >
                  <View style={styles.accountOptionInfo}>
                    <Text style={styles.accountOptionName}>{acc.name}</Text>
                    <Text style={styles.accountOptionType}>{getAccountTypeLabel(acc.account_type)}</Text>
                  </View>
                  <View style={[styles.radio, selectedTargetAccount?.id === acc.id && styles.radioSelected]}>
                    {selectedTargetAccount?.id === acc.id && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTransferModal(false);
                  setSelectedTargetAccount(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !selectedTargetAccount && styles.buttonDisabled]}
                onPress={() => selectedTargetAccount && confirmDeleteAccount(selectedTargetAccount.id)}
                disabled={!selectedTargetAccount}
              >
                <Text style={styles.confirmButtonText}>Aktar ve Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Hesap Detayı" onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderAccountInfo()}
        {renderTransactions()}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Hesabı Kapat</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {renderTransferModal()}
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
  accountInfoSection: {
    padding: spacing.lg,
  },
  accountBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  accountName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  accountType: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  accountBalance: {
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#fff',
  },
  accountDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: spacing.md,
  },
  detailItem: {
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  accountsList: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  accountOptionSelected: {
    borderColor: colors.primary,
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  accountOptionType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});
