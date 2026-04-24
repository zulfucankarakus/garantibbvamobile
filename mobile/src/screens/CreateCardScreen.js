import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { createCard, createDebitCardWithAccount } from '../services/cardService';

export default function CreateCardScreen({ navigation }) {
  const [cardName, setCardName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cardType, setCardType] = useState('debit');
  const [accountType, setAccountType] = useState('checking');
  const [loading, setLoading] = useState(false);

  const cardTypes = [
    { 
      key: 'debit', 
      label: 'Banka Kartı', 
      icon: 'card',
      description: 'Hesabınızdaki para kadar harcama',
    },
    { 
      key: 'credit', 
      label: 'Kredi Kartı', 
      icon: 'card-outline',
      description: 'Limit dahilinde harcama (15.000 TL)',
    },
  ];

  const accountTypes = [
    {
      key: 'checking',
      label: 'Vadesiz Mevduat',
      description: 'Günlük işlemleriniz için',
      icon: 'wallet',
    },
    {
      key: 'savings',
      label: 'Vadeli Mevduat',
      description: 'Birikimleriniz için',
      icon: 'trending-up',
    },
    {
      key: 'business',
      label: 'İşletme Hesabı',
      description: 'İş işlemleriniz için',
      icon: 'briefcase',
    },
  ];

  const handleCreate = async () => {
    if (!cardName.trim()) {
      Alert.alert('Uyarı', 'Lütfen kart adı giriniz');
      return;
    }

    if (cardType === 'debit' && !accountName.trim()) {
      Alert.alert('Uyarı', 'Lütfen hesap adı giriniz');
      return;
    }

    setLoading(true);
    try {
      let result;

      if (cardType === 'debit') {
        // Banka kartı + otomatik hesap oluşturma
        result = await createDebitCardWithAccount({
          card_name: cardName,
          account_name: accountName,
          account_type: accountType,
        });

        console.log('✅ Debit card + account created:', result);

        Alert.alert(
          'Başarılı! 🎉',
          `${cardName} ve ${accountName} başarıyla oluşturuldu!`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Dashboard'a dön ve refresh olsun
                navigation.navigate('Main', { screen: 'Dashboard' });
              },
            },
          ]
        );
      } else {
        // Sadece kredi kartı oluşturma
        result = await createCard({
          name: cardName,
          card_type: cardType,
        });

        console.log('✅ Credit card created:', result);

        Alert.alert(
          'Başarılı! 🎉',
          'Kredi kartınız başarıyla oluşturuldu!',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Dashboard'a dön ve refresh olsun
                navigation.navigate('Main', { screen: 'Dashboard' });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error creating card:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'Kart oluşturulurken bir hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Yeni Kart Başvurusu" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Kart Tipi Seçin</Text>
        
        {cardTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.typeCard,
              cardType === type.key && styles.typeCardSelected,
            ]}
            onPress={() => setCardType(type.key)}
          >
            <View style={styles.typeCardLeft}>
              <View
                style={[
                  styles.typeIcon,
                  cardType === type.key && styles.typeIconSelected,
                ]}
              >
                <Ionicons
                  name={type.icon}
                  size={24}
                  color={cardType === type.key ? '#fff' : colors.primary}
                />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeLabel, cardType === type.key && styles.typeLabelSelected]}>
                  {type.label}
                </Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </View>
            </View>
            <View style={[styles.radio, cardType === type.key && styles.radioSelected]}>
              {cardType === type.key && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Kart Bilgileri</Text>
        
        <Input
          label="Kart Adı"
          placeholder="Örn: Alışveriş Kartım"
          value={cardName}
          onChangeText={setCardName}
        />

        {cardType === 'debit' && (
          <>
            <Text style={styles.sectionTitle}>Hesap Türü Seçin</Text>
            <Text style={styles.helperText}>
              Banka kartınız için otomatik olarak hesap açılacaktır
            </Text>

            {accountTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.accountTypeCard,
                  accountType === type.key && styles.accountTypeCardSelected,
                ]}
                onPress={() => setAccountType(type.key)}
              >
                <View style={styles.typeCardLeft}>
                  <View
                    style={[
                      styles.accountTypeIcon,
                      accountType === type.key && styles.accountTypeIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={type.icon}
                      size={20}
                      color={accountType === type.key ? '#fff' : colors.primary}
                    />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={[styles.accountTypeLabel, accountType === type.key && styles.accountTypeLabelSelected]}>
                      {type.label}
                    </Text>
                    <Text style={styles.accountTypeDescription}>{type.description}</Text>
                  </View>
                </View>
                <View style={[styles.radio, accountType === type.key && styles.radioSelected]}>
                  {accountType === type.key && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            <Input
              label="Hesap Adı"
              placeholder="Örn: Ana Hesabım"
              value={accountName}
              onChangeText={setAccountName}
            />
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            {cardType === 'debit'
              ? 'Banka kartınız ile hesabınızdaki bakiye kadar harcama yapabilirsiniz. Hesabınız ve kartınız birlikte oluşturulacaktır.'
              : 'Kredi kartınız ile 15.000 TL limit dahilinde harcama yapabilir, ay sonunda ödeme yapabilirsiniz.'}
          </Text>
        </View>

        <Button
          title={cardType === 'debit' ? 'Banka Kartı ve Hesap Oluştur' : 'Kredi Kartı Oluştur'}
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
        />
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
  },
  typeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  typeIconSelected: {
    backgroundColor: colors.primary,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeDescription: {
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
  accountTypeCard: {
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
  accountTypeCardSelected: {
    borderColor: colors.primary,
  },
  accountTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountTypeIconSelected: {
    backgroundColor: colors.primary,
  },
  accountTypeLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  accountTypeLabelSelected: {
    color: colors.primary,
  },
  accountTypeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  createButton: {
    marginBottom: spacing.xl,
  },
});
