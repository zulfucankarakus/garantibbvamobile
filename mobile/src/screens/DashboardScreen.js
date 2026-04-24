import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';
import { getAccounts } from '../services/accountService';
import { getCards } from '../services/cardService';
import { getTransactions } from '../services/transactionService';
import { getNotifications } from '../services/notificationService';
import api from '../config/api';

// İlerleme yüzdesine göre renk
const getProgressColor = (percentage) => {
  if (percentage < 33) return '#EF4444'; // Kırmızı
  if (percentage < 67) return '#F59E0B'; // Sarı
  return '#10B981'; // Yeşil
};

// İlerleme barı gradient
const getProgressGradient = (percentage) => {
  if (percentage < 33) return ['#EF4444', '#DC2626'];
  if (percentage < 67) return ['#F59E0B', '#D97706'];
  return ['#10B981', '#059669'];
};

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [savingsInvestmentPlans, setSavingsInvestmentPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Arama için sayfa listesi
  const pages = [
    { name: 'Hesaplar', screen: 'Accounts', icon: 'wallet', keywords: ['hesap', 'accounts', 'balance', 'bakiye'] },
    { name: 'Kartlar', screen: 'Cards', icon: 'card', keywords: ['kart', 'cards', 'credit', 'kredi'] },
    { name: 'Para Transferi', screen: 'MoneyTransfer', icon: 'send', keywords: ['transfer', 'gönder', 'iban'] },
    { name: 'QR Kod Öde', screen: 'QRPayment', icon: 'qr-code', keywords: ['qr', 'kod', 'ödeme'] },
    { name: 'İşlemler', screen: 'Transactions', icon: 'receipt', keywords: ['işlem', 'transactions', 'history'] },
    { name: 'Bildirimler', screen: 'Notifications', icon: 'notifications', keywords: ['bildirim', 'notifications'] },
    { name: 'Hesap Aç', screen: 'CreateAccount', icon: 'add-circle', keywords: ['yeni hesap', 'aç', 'create'] },
    { name: 'Kart Oluştur', screen: 'CreateCard', icon: 'card-outline', keywords: ['yeni kart', 'başvuru'] },
    { name: 'Finansal Hedefler', screen: 'FinancialGoal', icon: 'trending-up', keywords: ['hedef', 'goal', 'saving'] },
    { name: 'Profil', screen: 'Profile', icon: 'person', keywords: ['profil', 'profile', 'ayarlar'] },
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(false);
      const [accountsData, cardsData, transactionsData, notificationsData, goalsData, plansData] = await Promise.all([
        getAccounts().catch(err => { console.error('Error loading accounts:', err); return []; }),
        getCards().catch(err => { console.error('Error loading cards:', err); return []; }),
        getTransactions(10).catch(err => { console.error('Error loading transactions:', err); return []; }),
        getNotifications(true).catch(err => { console.error('Error loading notifications:', err); return []; }),
        api.get('/financial-goals').then(res => res.data).catch(err => { console.error('Error loading goals:', err); return []; }),
        api.get('/savings-investment/plans').then(res => res.data?.plans || []).catch(err => { console.error('Error loading plans:', err); return []; }),
      ]);

      setAccounts(accountsData || []);
      setCards(cardsData || []);
      setTransactions(transactionsData || []);
      setNotifications(notificationsData || []);
      setSavingsGoals(Array.isArray(goalsData) ? goalsData : []);
      setSavingsInvestmentPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Plan silme işlemi
  const handleDeletePlan = (plan) => {
    Alert.alert(
      '🗑️ Planı Sil',
      `"${plan.product_name || 'Birikim Planı'}" silinecektir.\n\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?`,
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/savings-investment/${plan.id}`);
              if (response.data.success) {
                Alert.alert('✅ Silindi', response.data.message);
                loadDashboardData(); // Listeyi yenile
              }
            } catch (error) {
              console.error('Delete plan error:', error);
              Alert.alert('Hata', 'Plan silinirken bir hata oluştu');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  };

  const getTotalAssets = () => {
    const accountsTotal = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    return accountsTotal;
  };

  const getTotalDebt = () => {
    return cards
      .filter(card => card.card_type === 'credit')
      .reduce((sum, card) => sum + (card.balance || 0), 0);
  };

  const getNetWorth = () => {
    return getTotalAssets() - getTotalDebt();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredPages = pages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.keywords.some(keyword => keyword.includes(searchQuery.toLowerCase()))
  );

  const navigateToPage = (screen) => {
    setSearchVisible(false);
    setSearchQuery('');
    navigation.navigate(screen);
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setSearchVisible(true)}
        >
          <Ionicons name="search" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('UgiAssistant')}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={24} color={colors.text} />
            {notifications.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('MoneyTransfer')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Para Transferi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('QRPayment')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#7C3AED' }]}>
              <Ionicons name="qr-code" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>QR Kod Öde</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Payments')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EC4899' }]}>
              <Ionicons name="receipt" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Fatura Öde</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('More')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#6B7280' }]}>
              <Ionicons name="apps" size={24} color="#fff" />
            </View>
            <Text style={styles.quickActionText}>Daha Fazlası</Text>
          </TouchableOpacity>
        </View>

        {/* Hesaplar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hesaplar</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
              <Text style={styles.seeAll}>Tümü</Text>
            </TouchableOpacity>
          </View>

          {accounts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz hesabınız bulunmuyor</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('CreateAccount')}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.addButtonText}>Hesap Aç</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.accountCardHorizontal}
                  onPress={() => navigation.navigate('AccountDetail', { account })}
                >
                  <View style={styles.accountIconSmall}>
                    <Ionicons name="wallet" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.accountNameSmall} numberOfLines={1}>{account.name}</Text>
                  <Text style={styles.accountBalanceSmall}>{formatAmount(account.balance)} TL</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Kredi Kartları */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kredi Kartları</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Cards')}>
              <Text style={styles.seeAll}>Tümü</Text>
            </TouchableOpacity>
          </View>

          {cards.filter(c => c.card_type === 'credit').length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz kredi kartınız bulunmuyor</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('CreateCard')}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.addButtonText}>Kart Oluştur</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            cards.filter(c => c.card_type === 'credit').slice(0, 1).map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.creditCardPreview}
                onPress={() => navigation.navigate('CardDetail', { card })}
              >
                <View style={styles.creditCardContent}>
                  <View style={styles.creditCardHeader}>
                    <Text style={styles.creditCardName}>{card.name}</Text>
                    <Ionicons name="card-outline" size={24} color={colors.text} />
                  </View>
                  <View style={styles.creditCardStats}>
                    <View style={styles.creditCardStat}>
                      <Text style={styles.creditCardStatLabel}>Kullanılabilir Limit</Text>
                      <Text style={styles.creditCardStatValue}>
                        {formatAmount(card.available_limit || 0)} TL
                      </Text>
                    </View>
                    {card.balance > 0 && (
                      <View style={styles.creditCardStat}>
                        <Text style={styles.creditCardStatLabel}>Güncel Borç</Text>
                        <Text style={[styles.creditCardStatValue, styles.debtValue]}>
                          {formatAmount(card.balance)} TL
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Birikim + Yatırım Planlarım */}
        {savingsInvestmentPlans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💰 Birikim + Yatırım Planlarım</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SmartInvestment')}>
                <Text style={styles.seeAll}>Tümü</Text>
              </TouchableOpacity>
            </View>

            {savingsInvestmentPlans.slice(0, 3).map((plan) => {
              // Backend'den gelen hesaplanmış değerleri kullan
              const currentAmount = parseFloat(plan.total_current_value || plan.current_amount || 0);
              const targetAmount = parseFloat(plan.target_amount || 0);
              // Backend'den gelen progress_percentage varsa onu kullan, yoksa hesapla
              const progressPercentage = plan.progress_percentage || (targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0);
              const progressColor = getProgressColor(progressPercentage);
              const progressGradient = getProgressGradient(progressPercentage);
              
              // Yatırım dağılımı
              const allocation = plan.allocation || {};
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.investmentPlanCard}
                  onPress={() => navigation.navigate('SmartInvestment', { planId: plan.id })}
                >
                  <View style={styles.investmentPlanHeader}>
                    <View style={[styles.investmentPlanIcon, { backgroundColor: `${progressColor}20` }]}>
                      <Ionicons 
                        name={progressPercentage >= 100 ? "checkmark-circle" : "trending-up"} 
                        size={24} 
                        color={progressColor} 
                      />
                    </View>
                    <View style={styles.investmentPlanInfo}>
                      <Text style={styles.investmentPlanName} numberOfLines={1}>
                        {plan.product_name || 'Birikim Planı'}
                      </Text>
                      <Text style={styles.investmentPlanTarget}>
                        Hedef: {targetAmount.toLocaleString('tr-TR')} TL • {plan.duration_months} ay
                      </Text>
                    </View>
                    <View style={styles.investmentPlanHeaderActions}>
                      <View style={styles.investmentPlanPercentage}>
                        <Text style={[styles.investmentPlanPercentageText, { color: progressColor }]}>
                          %{progressPercentage.toFixed(0)}
                        </Text>
                      </View>
                      {/* Silme Butonu */}
                      <TouchableOpacity 
                        style={styles.deletePlanButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* İlerleme Barı */}
                  <View style={styles.investmentProgressContainer}>
                    <View style={styles.investmentProgressBackground}>
                      <LinearGradient
                        colors={progressGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.investmentProgressFill, { width: `${progressPercentage}%` }]}
                      />
                    </View>
                  </View>

                  {/* Yatırım Dağılımı Mini Gösterim */}
                  <View style={styles.investmentAllocationMini}>
                    {Object.entries(allocation).map(([key, value]) => {
                      const labels = { tl_savings: 'TL', gold: 'Altın', usd: 'USD', eur: 'EUR' };
                      const colors_map = { tl_savings: '#6366F1', gold: '#F59E0B', usd: '#10B981', eur: '#3B82F6' };
                      if (value <= 0) return null;
                      return (
                        <View key={key} style={styles.allocationMiniItem}>
                          <View style={[styles.allocationMiniDot, { backgroundColor: colors_map[key] }]} />
                          <Text style={styles.allocationMiniText}>{labels[key]} %{value}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.investmentPlanFooter}>
                    <Text style={styles.investmentPlanCurrentAmount}>
                      {currentAmount.toLocaleString('tr-TR')} TL biriktiniz
                    </Text>
                    <View style={styles.investmentPlanActions}>
                      <TouchableOpacity 
                        style={styles.addMoneyButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('SmartInvestment', { planId: plan.id, action: 'contribute' });
                        }}
                      >
                        <Ionicons name="add-circle" size={16} color={colors.primary} />
                        <Text style={styles.addMoneyText}>Para Ekle</Text>
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Yeni Plan Oluştur Butonu */}
            <TouchableOpacity 
              style={styles.createNewPlanButton}
              onPress={() => navigation.navigate('SmartInvestment')}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.createNewPlanText}>Yeni Birikim Planı Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Birikim Planı Yoksa */}
        {savingsInvestmentPlans.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💰 Akıllı Birikim</Text>
            </View>
            <TouchableOpacity 
              style={styles.createPlanPromoCard}
              onPress={() => navigation.navigate('SmartInvestment')}
            >
              <View style={styles.createPlanPromoIcon}>
                <Ionicons name="sparkles" size={32} color="#F59E0B" />
              </View>
              <View style={styles.createPlanPromoContent}>
                <Text style={styles.createPlanPromoTitle}>Akıllı Birikim Planı Oluştur</Text>
                <Text style={styles.createPlanPromoDesc}>
                  Hedefinize ulaşmak için AI destekli yatırım planı oluşturun
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Tasarruf Hedeflerim */}
        {savingsGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎯 Birikim Hedeflerim</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FinancialGoal')}>
                <Text style={styles.seeAll}>Tümü</Text>
              </TouchableOpacity>
            </View>

            {savingsGoals.slice(0, 3).map((goal) => {
              const currentAmount = parseFloat(goal.current_amount || 0);
              const targetAmount = parseFloat(goal.target_amount || 0);
              const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
              const progressColor = getProgressColor(progressPercentage);
              const progressGradient = getProgressGradient(progressPercentage);

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.savingsGoalCard}
                  onPress={() => navigation.navigate('SavingsGoalDetail', { goalId: goal.id, goal })}
                >
                  <View style={styles.savingsGoalHeader}>
                    <View style={[styles.savingsGoalIcon, { backgroundColor: `${progressColor}20` }]}>
                      <Ionicons 
                        name={progressPercentage >= 100 ? "checkmark-circle" : "wallet"} 
                        size={24} 
                        color={progressColor} 
                      />
                    </View>
                    <View style={styles.savingsGoalInfo}>
                      <Text style={styles.savingsGoalName} numberOfLines={1}>
                        {goal.goal_name || goal.product_name || 'Birikim Hedefi'}
                      </Text>
                      <Text style={styles.savingsGoalTarget}>
                        Hedef: {targetAmount.toLocaleString('tr-TR')} TL
                      </Text>
                    </View>
                    <View style={styles.savingsGoalPercentage}>
                      <Text style={[styles.savingsGoalPercentageText, { color: progressColor }]}>
                        %{progressPercentage.toFixed(0)}
                      </Text>
                    </View>
                  </View>

                  {/* İlerleme Barı */}
                  <View style={styles.savingsProgressContainer}>
                    <View style={styles.savingsProgressBackground}>
                      <LinearGradient
                        colors={progressGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.savingsProgressFill, { width: `${progressPercentage}%` }]}
                      />
                    </View>
                  </View>

                  <View style={styles.savingsGoalFooter}>
                    <Text style={styles.savingsGoalCurrentAmount}>
                      {currentAmount.toLocaleString('tr-TR')} TL biriktiniz
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Net Varlığım */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Net Varlığım</Text>
          <Card style={styles.netWorthCard}>
            <View style={styles.netWorthHeader}>
              <Text style={styles.netWorthAmount}>{formatAmount(getNetWorth())} TL</Text>
              <Ionicons name="trending-up" size={24} color={colors.success} />
            </View>
            <View style={styles.netWorthDetails}>
              <View style={styles.netWorthDetailItem}>
                <Text style={styles.netWorthDetailLabel}>Varlıklarım</Text>
                <Text style={styles.netWorthDetailValue}>
                  {formatAmount(getTotalAssets())} TL
                </Text>
              </View>
              <View style={styles.netWorthDetailItem}>
                <Text style={styles.netWorthDetailLabel}>Borçlarım</Text>
                <Text style={[styles.netWorthDetailValue, styles.debtValue]}>
                  {formatAmount(getTotalDebt())} TL
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Son Hatalı Giriş */}
        <View style={styles.section}>
          <Card style={styles.lastLoginCard}>
            <View style={styles.lastLoginHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
              <Text style={styles.lastLoginTitle}>Güvenlik</Text>
            </View>
            <Text style={styles.lastLoginText}>Son hatalı giriş denemesi bulunmamaktadır</Text>
            <Text style={styles.lastLoginDate}>Son giriş: Bugün, 14:30</Text>
          </Card>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <Ionicons name="search" size={24} color={colors.text} />
              <TextInput
                style={styles.searchInput}
                placeholder="Sayfa ara..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredPages}
              keyExtractor={(item) => item.screen}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => navigateToPage(item.screen)}
                >
                  <View style={styles.searchResultIcon}>
                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.searchResultText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>Sonuç bulunamadı</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  emptyCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  accountCardHorizontal: {
    width: 120,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  accountNameSmall: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  accountBalanceSmall: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  creditCardPreview: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creditCardContent: {
    padding: spacing.md,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  creditCardName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  creditCardStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  creditCardStat: {
    flex: 1,
  },
  creditCardStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  creditCardStatValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
  },
  debtValue: {
    color: colors.error,
  },
  netWorthCard: {
    padding: spacing.md,
  },
  netWorthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  netWorthAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  netWorthDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  netWorthDetailItem: {
    flex: 1,
  },
  netWorthDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  netWorthDetailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  lastLoginCard: {
    padding: spacing.md,
  },
  lastLoginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lastLoginTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  lastLoginText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  lastLoginDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  // Savings Goals Styles
  savingsGoalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  savingsGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  savingsGoalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsGoalInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  savingsGoalName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  savingsGoalTarget: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  savingsGoalPercentage: {
    alignItems: 'flex-end',
  },
  savingsGoalPercentageText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  savingsProgressContainer: {
    marginBottom: spacing.sm,
  },
  savingsProgressBackground: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  savingsProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  savingsGoalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsGoalCurrentAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  searchModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  emptySearch: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  // Birikim + Yatırım Plan Kartları
  investmentPlanCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  investmentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  investmentPlanIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  investmentPlanInfo: {
    flex: 1,
  },
  investmentPlanName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  investmentPlanTarget: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  investmentPlanHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  investmentPlanPercentage: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  investmentPlanPercentageText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  deletePlanButton: {
    padding: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.sm,
  },
  investmentProgressContainer: {
    marginBottom: spacing.sm,
  },
  investmentProgressBackground: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  investmentProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  investmentAllocationMini: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  allocationMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allocationMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allocationMiniText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  investmentPlanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentPlanCurrentAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  investmentPlanActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  addMoneyText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  createNewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  createNewPlanText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  createPlanPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  createPlanPromoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlanPromoContent: {
    flex: 1,
  },
  createPlanPromoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  createPlanPromoDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
