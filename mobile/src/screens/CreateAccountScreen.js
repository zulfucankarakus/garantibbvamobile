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
import { createAccount } from '../services/accountService';

export default function CreateAccountScreen({ navigation }) {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [loading, setLoading] = useState(false);

  const accountTypes = [
    {
      key: 'checking',
      label: 'Vadesiz Mevduat Hesabı',
      description: 'Günlük işlemleriniz için ideal hesap',
      icon: 'wallet',
      features: ['7/24 işlem', 'Sınırsız transfer', 'Online bankacılık'],
    },
    {
      key: 'savings',
      label: 'Tasarruf Hesabı',
      description: 'Birikimleriniz için faiz getiren hesap',
      icon: 'trending-up',
      features: ['Yüksek faiz', 'Aylık kazanç', 'Güvenli birikim'],
    },
    {
      key: 'business',
      label: 'İşletme Hesabı',
      description: 'Yemek kartı ödemeleri için özel hesap',
      icon: 'briefcase',
      features: ['Yemek kartı', 'Otomatik yükleme', 'İşyeren katkısı'],
    },
  ];

  const handleCreate = async () => {
    if (!accountName.trim()) {
      Alert.alert('Uyarı', 'Lütfen hesap adı giriniz');
      return;
    }

    setLoading(true);
    try {
      const newAccount = await createAccount({
        name: accountName,
        account_type: accountType,
      });

      console.log('✅ Account created:', newAccount);

      Alert.alert(
        'Başarılı! 🎉',
        'Hesabınız başarıyla oluşturuldu!',
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
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.detail || 'Hesap oluşturulurken bir hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Yeni Hesap Aç" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Hesap Türü Seçin</Text>
          <Text style={styles.subtitle}>
            İhtiyacınıza uygun hesap türünü seçin
          </Text>
        </View>

        {accountTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.typeCard,
              accountType === type.key && styles.typeCardSelected,
            ]}
            onPress={() => setAccountType(type.key)}
          >
            <View style={styles.typeCardHeader}>
              <View
                style={[
                  styles.typeIcon,
                  accountType === type.key && styles.typeIconSelected,
                ]}
              >
                <Ionicons
                  name={type.icon}
                  size={28}
                  color={accountType === type.key ? '#fff' : colors.primary}
                />
              </View>
              <View style={styles.typeInfo}>
                <Text
                  style={[
                    styles.typeLabel,
                    accountType === type.key && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  accountType === type.key && styles.radioSelected,
                ]}
              >
                {accountType === type.key && <View style={styles.radioDot} />}
              </View>
            </View>

            <View style={styles.features}>
              {type.features.map((feature, index) => (
                <View key={index} style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          
          <Input
            label="Hesap Adı"
            placeholder="Örn: Ana Hesabım"
            value={accountName}
            onChangeText={setAccountName}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Hesabınız anında oluşturulacak ve kullanıma hazır olacaktır. 
              Hesap numarası ve IBAN bilgileriniz otomatik atanacaktır.
            </Text>
          </View>

          <Button
            title="Hesap Oluştur"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            style={styles.createButton}
          />
        </View>
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
  headerSection: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  typeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  typeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
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
  features: {
    gap: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  formSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  createButton: {
    marginBottom: spacing.xl,
  },
});
