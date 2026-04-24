import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getAccounts } from '../services/accountService';
import { generateQRCode, payWithQR } from '../services/qrService';

export default function QRPaymentScreen({ navigation }) {
  const [mode, setMode] = useState('generate'); // generate or scan
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Para Transferi');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [paying, setPaying] = useState(false);

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

  const handleGenerateQR = async () => {
    if (!selectedAccount) {
      Alert.alert('Uyarı', 'Lütfen hesap seçiniz');
      return;
    }

    try {
      setGenerating(true);
      const amountValue = amount && parseFloat(amount) > 0 ? parseFloat(amount) : null;
      
      const result = await generateQRCode({
        account_id: selectedAccount.id,
        amount: amountValue,
        description: description || 'QR ile ödeme',
      });

      setQrCode(result);
      Alert.alert(
        'QR Kod Oluşturuldu! ✅',
        'QR kodunuz oluşturuldu. Karşınızdaki kişi bu kodu okutarak size para gönderebilir.'
      );
    } catch (error) {
      console.error('Error generating QR:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'QR kod oluşturulurken bir hata oluştu'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePayWithQR = async () => {
    if (!selectedAccount) {
      Alert.alert('Uyarı', 'Lütfen hesap seçiniz');
      return;
    }

    if (!qrCodeInput.trim()) {
      Alert.alert('Uyarı', 'Lütfen QR kod giriniz');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tutar giriniz');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount > selectedAccount.balance) {
      Alert.alert('Uyarı', 'Yetersiz bakiye');
      return;
    }

    Alert.alert(
      'Ödeme Onayı',
      `${formatAmount(paymentAmount)} TL tutarında ödeme yapılacak.\n\nOnaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: confirmPayment,
        },
      ]
    );
  };

  const confirmPayment = async () => {
    try {
      setPaying(true);
      
      await payWithQR({
        qr_code: qrCodeInput.trim(),
        from_account_id: selectedAccount.id,
        amount: parseFloat(amount),
      });

      Alert.alert(
        'Başarılı! 🎉',
        'QR ödeme başarıyla tamamlandı',
        [
          {
            text: 'Tamam',
            onPress: () => {
              setQrCodeInput('');
              setAmount('');
              setDescription('Para Transferi');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error paying with QR:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'Ödeme işlemi başarısız'
      );
    } finally {
      setPaying(false);
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
        <Header title="QR ile Ödeme" onBack={() => navigation.goBack()} />
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
        <Header title="QR ile Ödeme" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="qr-code-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Hesap Bulunamadı</Text>
          <Text style={styles.emptyText}>
            QR ile ödeme yapabilmek için önce hesap açmanız gerekmektedir
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="QR ile Ödeme" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'generate' && styles.modeButtonSelected,
            ]}
            onPress={() => {
              setMode('generate');
              setQrCode(null);
              setQrCodeInput('');
            }}
          >
            <Ionicons
              name="qr-code"
              size={24}
              color={mode === 'generate' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'generate' && styles.modeButtonTextSelected,
              ]}
            >
              QR Oluştur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'scan' && styles.modeButtonSelected,
            ]}
            onPress={() => {
              setMode('scan');
              setQrCode(null);
            }}
          >
            <Ionicons
              name="scan"
              size={24}
              color={mode === 'scan' ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'scan' && styles.modeButtonTextSelected,
              ]}
            >
              QR Okut
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hesap Seçimi */}
        <Text style={styles.sectionTitle}>
          {mode === 'generate' ? 'Para Alacak Hesap' : 'Para Gönderecek Hesap'}
        </Text>
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

        {mode === 'generate' ? (
          // QR Oluşturma Modu
          <>
            <Text style={styles.sectionTitle}>QR Kod Bilgileri</Text>
            <Input
              label="Tutar (TL) - Opsiyonel"
              placeholder="Boş bırakırsanız karşı taraf belirler"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Input
              label="Açıklama"
              placeholder="Para transferi"
              value={description}
              onChangeText={setDescription}
            />

            <Button
              title="QR Kod Oluştur"
              onPress={handleGenerateQR}
              loading={generating}
              disabled={generating}
              style={styles.actionButton}
              
            />

            {qrCode && (
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeBox}>
                  <Ionicons name="qr-code" size={120} color={colors.primary} />
                  <Text style={styles.qrCodeLabel}>QR Kod Oluşturuldu</Text>
                </View>
                
                <View style={styles.qrInfoBox}>
                  <Text style={styles.qrInfoTitle}>QR Kod Bilgileri:</Text>
                  <Text style={styles.qrInfoText}>
                    • Hesap: {selectedAccount.name}
                  </Text>
                  {qrCode.qr_data.amount && (
                    <Text style={styles.qrInfoText}>
                      • Tutar: {formatAmount(qrCode.qr_data.amount)} TL
                    </Text>
                  )}
                  <Text style={styles.qrInfoText}>
                    • Açıklama: {qrCode.qr_data.description}
                  </Text>
                </View>

                <View style={styles.qrCodeTextContainer}>
                  <Text style={styles.qrCodeTextLabel}>QR Kod (Test için):</Text>
                  <View style={styles.qrCodeTextBox}>
                    <Text style={styles.qrCodeText} numberOfLines={3}>
                      {qrCode.qr_code}
                    </Text>
                  </View>
                  <Text style={styles.qrCodeHelperText}>
                    * Gerçek uygulamada bu kod QR görsel olarak gösterilir
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          // QR Okutma Modu
          <>
            <Text style={styles.sectionTitle}>QR Kod Okut</Text>
            <View style={styles.scanBox}>
              <Ionicons name="scan-outline" size={80} color={colors.textSecondary} />
              <Text style={styles.scanText}>
                Gerçek uygulamada kamera ile QR kod taranır
              </Text>
              <Text style={styles.scanSubText}>
                Test için QR kodu aşağıya yapıştırın
              </Text>
            </View>

            <View style={styles.qrInputContainer}>
              <Text style={styles.inputLabel}>QR Kod (Test için)</Text>
              <TextInput
                style={styles.qrInput}
                placeholder="QR kodunu buraya yapıştırın..."
                value={qrCodeInput}
                onChangeText={setQrCodeInput}
                multiline
                numberOfLines={3}
              />
            </View>

            <Input
              label="Tutar (TL)"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Button
              title="Ödeme Yap"
              onPress={handlePayWithQR}
              loading={paying}
              disabled={paying || !qrCodeInput.trim() || !amount}
              style={styles.actionButton}
              
            />
          </>
        )}

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
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  modeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  modeButtonTextSelected: {
    color: '#fff',
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
  actionButton: {
    marginTop: spacing.lg,
  },
  qrCodeContainer: {
    marginTop: spacing.lg,
  },
  qrCodeBox: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrCodeLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  qrInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  qrInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  qrInfoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: 4,
  },
  qrCodeTextContainer: {
    marginTop: spacing.md,
  },
  qrCodeTextLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  qrCodeTextBox: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrCodeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  qrCodeHelperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  scanBox: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  scanText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  scanSubText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  qrInputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  qrInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  spacer: {
    height: spacing.xl,
  },
});
