import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getAccounts } from '../services/accountService';
import { searchAccount } from '../services/qrService';
import { createTransaction } from '../services/transactionService';

export default function MoneyTransferScreen({ navigation }) {
  const [transferMethod, setTransferMethod] = useState('iban'); // iban or account_no
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientAccount, setRecipientAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount(data[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert('Hata', 'Hesaplar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchRecipient = async () => {
    if (!recipientInput.trim()) {
      Alert.alert('Uyarı', 'Lütfen alıcı bilgisini giriniz');
      return;
    }

    try {
      setSearching(true);
      const account = await searchAccount(recipientInput.trim());
      setRecipientAccount(account);
      Alert.alert('Başarılı', 'Alıcı hesap bulundu');
    } catch (error) {
      console.error('Error searching account:', error);
      setRecipientAccount(null);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'Hesap bulunamadı'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    // Validations
    if (!selectedAccount) {
      Alert.alert('Uyarı', 'Lütfen gönderen hesap seçiniz');
      return;
    }

    if (!recipientAccount) {
      Alert.alert('Uyarı', 'Lütfen önce alıcı hesabı arayın');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tutar giriniz');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount > selectedAccount.balance) {
      Alert.alert('Uyarı', 'Yetersiz bakiye');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Uyarı', 'Lütfen açıklama giriniz');
      return;
    }

    // Confirm transfer
    Alert.alert(
      'Transfer Onayı',
      `${formatAmount(transferAmount)} TL tutarında para transferi yapılacak.\n\nGönderen: ${selectedAccount.name}\nAlıcı: ${recipientAccount.name}\n\nOnaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: confirmTransfer,
        },
      ]
    );
  };

  const confirmTransfer = async () => {
    try {
      setTransferring(true);
      
      await createTransaction({
        from_account_id: selectedAccount.id,
        to_account_iban: recipientAccount.iban,
        amount: parseFloat(amount),
        description: description.trim(),
      });

      Alert.alert(
        'Başarılı! 🎉',
        'Para transferi başarıyla tamamlandı',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Reset form
              setRecipientInput('');
              setRecipientAccount(null);
              setAmount('');
              setDescription('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error transferring:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'Transfer işlemi başarısız'
      );
    } finally {
      setTransferring(false);
    }
  };

  const formatAmount = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getAccountTypeLabel = (type) => {
    const types = {
      checking: 'Vadesiz Mevduat',
      savings: 'Vadeli Mevduat',
      business: 'İşletme Hesabı',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Para Transferi" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Para Transferi" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Hesap Bulunamadı</Text>
          <Text style={styles.emptyText}>
            Para transferi yapabilmek için önce hesap açmanız gerekmektedir
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Para Transferi" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gönderen Hesap Seçimi */}
        <Text style={styles.sectionTitle}>Gönderen Hesap</Text>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountCard,
              selectedAccount?.id === account.id && styles.accountCardSelected,
            ]}
            onPress={() => setSelectedAccount(account)}
          >
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountType}>{getAccountTypeLabel(account.account_type)}</Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>{formatAmount(account.balance)} TL</Text>
              <View style={[styles.radio, selectedAccount?.id === account.id && styles.radioSelected]}>
                {selectedAccount?.id === account.id && <View style={styles.radioDot} />}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Transfer Yöntemi Seçimi */}
        <Text style={styles.sectionTitle}>Transfer Yöntemi</Text>
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              transferMethod === 'iban' && styles.methodButtonSelected,
            ]}
            onPress={() => {
              setTransferMethod('iban');
              setRecipientInput('');
              setRecipientAccount(null);
            }}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={transferMethod === 'iban' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.methodButtonText,
                transferMethod === 'iban' && styles.methodButtonTextSelected,
              ]}
            >
              IBAN ile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              transferMethod === 'account_no' && styles.methodButtonSelected,
            ]}
            onPress={() => {
              setTransferMethod('account_no');
              setRecipientInput('');
              setRecipientAccount(null);
            }}
          >
            <Ionicons
              name="keypad-outline"
              size={20}
              color={transferMethod === 'account_no' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.methodButtonText,
                transferMethod === 'account_no' && styles.methodButtonTextSelected,
              ]}
            >
              Hesap No ile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alıcı Bilgileri */}
        <Text style={styles.sectionTitle}>Alıcı Bilgileri</Text>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Input
              label={transferMethod === 'iban' ? 'IBAN' : 'Hesap Numarası'}
              placeholder={
                transferMethod === 'iban'
                  ? 'TR00 0000 0000 0000 0000 0000 00'
                  : '000000000000'
              }
              value={recipientInput}
              onChangeText={setRecipientInput}
              keyboardType={transferMethod === 'account_no' ? 'numeric' : 'default'}
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchRecipient}
            disabled={searching || !recipientInput.trim()}
          >
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {recipientAccount && (
          <View style={styles.recipientCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{recipientAccount.name}</Text>
              <Text style={styles.recipientDetails}>
                {getAccountTypeLabel(recipientAccount.account_type)}
              </Text>
            </View>
          </View>
        )}

        {/* Tutar ve Açıklama */}
        <Text style={styles.sectionTitle}>İşlem Bilgileri</Text>
        <Input
          label="Tutar (TL)"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Input
          label="Açıklama"
          placeholder="Örn: Kira ödemesi"
          value={description}
          onChangeText={setDescription}
        />

        {/* Transfer Butonu */}
        <Button
          title="Transfer Yap"
          onPress={handleTransfer}
          loading={transferring}
          disabled={transferring || !recipientAccount || !amount || !description}
          style={styles.transferButton}
        />

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
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  accountCard: {
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
  accountCardSelected: {
    borderColor: colors.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  accountType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountBalance: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
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
  methodSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  methodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  methodButtonTextSelected: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  searchInputContainer: {
    flex: 1,
  },
  searchButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  recipientInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  recipientName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  recipientDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transferButton: {
    marginTop: spacing.lg,
  },
  spacer: {
    height: spacing.xl,
  },
});
