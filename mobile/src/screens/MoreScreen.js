import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
// SafeAreaView removed
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { colors, spacing, fontSize } from '../utils/theme';

export default function MoreScreen({ navigation }) {
  const menuItems = [
    { icon: 'wallet', label: 'Hesaplar', screen: 'Accounts', color: colors.primary },
    { icon: 'card', label: 'Kartlar', screen: 'Cards', color: '#7C3AED' },
    { icon: 'trending-up', label: 'Yatırımlar', screen: 'Investments', color: '#F59E0B', badge: 'YENİ' },
    { icon: 'sparkles', label: 'Akıllı Yatırım', screen: 'SmartInvestment', color: '#10B981', badge: 'AI' },
    { icon: 'send', label: 'Para Transferi', screen: 'MoneyTransfer', color: colors.primary },
    { icon: 'qr-code', label: 'QR Kod Öde', screen: 'QRPayment', color: colors.secondary },
    { icon: 'receipt', label: 'Fatura Öde', screen: 'Payments', color: '#9C27B0' },
    { icon: 'add-circle', label: 'Hesap Aç', screen: 'CreateAccount', color: '#4CAF50' },
    { icon: 'card-outline', label: 'Kart Oluştur', screen: 'CreateCard', color: '#2196F3' },
    { icon: 'flag', label: 'Finansal Hedefler', screen: 'FinancialGoal', color: '#FF9800' },
    { icon: 'chatbubble-ellipses', label: 'Ugi Asistan', screen: 'UgiAssistant', color: '#00BCD4' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daha Fazla</Text>
      </View>
      <ScrollView>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <Card key={index} style={styles.card} onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={28} color="#fff" />
              </View>
              <Text style={styles.label}>{item.label}</Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 40 },
  header: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text },
  grid: { padding: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47%', alignItems: 'center', padding: spacing.lg, position: 'relative' },
  iconContainer: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.text, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
});
