import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: 'person', label: 'Kişisel Bilgiler', screen: null },
    { icon: 'shield-checkmark', label: 'Güvenlik', screen: null },
    { icon: 'notifications', label: 'Bildirimler', screen: 'Notifications' },
    { icon: 'help-circle', label: 'Yardım', screen: null },
    { icon: 'information-circle', label: 'Hakkında', screen: null },
  ];

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal' },
      { text: 'Çıkış', onPress: () => logout() }
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Profil" onBack={() => navigation.goBack()} />
      <ScrollView>
        {/* Profil Başlığı */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.tc_no && (
            <Text style={styles.tcNo}>TC: {user.tc_no.slice(0, 3)}****{user.tc_no.slice(-2)}</Text>
          )}
        </View>

        {/* Menü Öğeleri */}
        <View style={styles.section}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              style={styles.menuItem}
              onPress={item.screen ? () => navigation.navigate(item.screen) : null}
            >
              <View style={styles.menuRow}>
                <Ionicons name={item.icon} size={24} color={colors.text} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </Card>
          ))}
        </View>

        {/* Çıkış Butonu */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* Versiyon */}
        <Text style={styles.versionText}>Versiyon 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    paddingTop: 40 
  },
  profileHeader: { 
    alignItems: 'center', 
    padding: spacing.xl, 
    backgroundColor: colors.card 
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: spacing.md 
  },
  name: { 
    fontSize: fontSize.xl, 
    fontWeight: 'bold', 
    color: colors.text 
  },
  email: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    marginTop: spacing.xs 
  },
  tcNo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: { 
    padding: spacing.lg 
  },
  menuItem: { 
    marginBottom: spacing.sm 
  },
  menuRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.md 
  },
  menuLabel: { 
    flex: 1, 
    fontSize: fontSize.md, 
    color: colors.text 
  },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.lg, 
    margin: spacing.lg, 
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
  },
  logoutText: { 
    fontSize: fontSize.md, 
    color: colors.error, 
    fontWeight: '600' 
  },
  versionText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
});
