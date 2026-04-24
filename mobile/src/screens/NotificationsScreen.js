import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
// SafeAreaView removed
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { colors, spacing, fontSize } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';
import { getNotifications, markNotificationRead } from '../services/notificationService';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      loadNotifications();
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <View style={styles.container}>
      <Header title="Bildirimler" onBack={() => navigation.goBack()} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Bildirim bulunmuyor</Text>
          </View>
        ) : (
          notifications.map((notif, index) => (
            <Card key={notif.id || index} style={styles.card} onPress={() => handleNotificationPress(notif)}>
              <View style={styles.row}>
                <View style={[styles.icon, !notif.is_read && styles.iconUnread]}>
                  <Ionicons name="notifications" size={20} color="#fff" />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.title, !notif.is_read && styles.titleUnread]}>{notif.title}</Text>
                  <Text style={styles.message}>{notif.message}</Text>
                  <Text style={styles.date}>{formatDateTime(notif.created_at)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 40 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  iconUnread: { backgroundColor: colors.primary },
  content: { flex: 1 },
  title: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  titleUnread: { fontWeight: 'bold' },
  message: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  date: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
});
