import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Loading } from '../components/Loading';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getAccounts } from '../services/accountService';
import { getCards } from '../services/cardService';

export default function AccountsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' veya 'cards'
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, cardsData] = await Promise.all([
        getAccounts(),
        getCards(),
      ]);
      setAccounts(accountsData || []);
      setCards(cardsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeLabel = (type) => {
    const types = {
      checking: 'Vadesiz Mevduat Hesabı',
      savings: 'Tasarruf Hesabı',
      business: 'İşletme Hesabı',
    };
    return types[type] || type;
  };

  const getCardTypeLabel = (type) => {
    const types = {
      debit: 'Bankamatik Kartı',
      credit: 'Kredi Kartı',
    };
    return types[type] || type;
  };

  const getAccountIcon = (type) => {
    const icons = {
      checking: 'wallet',
      savings: 'trending-up',
      business: 'briefcase',
    };
    return icons[type] || 'wallet';
  };

  const maskCardNumber = (cardNo) => {
    if (!cardNo) return '';
    const lastFour = cardNo.slice(-4);
    return `**** **** **** ${lastFour}`;
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      <Header title="Hesap ve Kart" />

      {/* Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accounts' && styles.activeTab]}
          onPress={() => setActiveTab('accounts')}
        >
          <Ionicons
            name="wallet"
            size={20}
            color={activeTab === 'accounts' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'accounts' && styles.activeTabText,
            ]}
          >
            Hesaplar
          </Text>
          {accounts.length > 0 && (
            <View
              style={[
                styles.badge,
                activeTab === 'accounts' && styles.activeBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  activeTab === 'accounts' && styles.activeBadgeText,
                ]}
              >
                {accounts.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cards' && styles.activeTab]}
          onPress={() => setActiveTab('cards')}
        >
          <Ionicons
            name="card"
            size={20}
            color={activeTab === 'cards' ? '#7C3AED' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'cards' && styles.activeTabTextPurple,
            ]}
          >
            Kartlar
          </Text>
          {cards.length > 0 && (
            <View
              style={[
                styles.badge,
                activeTab === 'cards' && styles.activeBadgePurple,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  activeTab === 'cards' && styles.activeBadgeText,
                ]}
              >
                {cards.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Hesaplar Sekmesi */}
      {activeTab === 'accounts' && (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Yeni Hesap Butonu */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateAccount')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.createButtonText}>Yeni Hesap Aç</Text>
            </TouchableOpacity>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={80} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Henüz Hesabınız Yok</Text>
              <Text style={styles.emptyText}>
                İlk hesabınızı açarak bankacılık işlemlerinize başlayın
              </Text>
            </View>
          ) : (
            accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountCard}
                onPress={() => navigation.navigate('AccountDetail', { account })}
              >
                <View style={styles.accountHeader}>
                  <View style={styles.accountIconContainer}>
                    <Ionicons
                      name={getAccountIcon(account.account_type)}
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountType}>
                      {getAccountTypeLabel(account.account_type)}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountBalance}>
                  <Text style={styles.balanceLabel}>Kullanılabilir Bakiye</Text>
                  <Text style={styles.balanceAmount}>
                    {formatAmount(account.balance)} TL
                  </Text>
                </View>

                <View style={styles.accountFooter}>
                  <View style={styles.accountDetail}>
                    <Text style={styles.accountDetailLabel}>Hesap No</Text>
                    <Text style={styles.accountDetailValue}>{account.account_no}</Text>
                  </View>
                  <View style={styles.accountDetail}>
                    <Text style={styles.accountDetailLabel}>IBAN</Text>
                    <Text style={styles.accountDetailValue}>
                      {account.iban?.substring(0, 8)}...
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>Hesap Hareketleri</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Kartlar Sekmesi */}
      {activeTab === 'cards' && (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Yeni Kart Butonu */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.createButtonPurple}
              onPress={() => navigation.navigate('CreateCard')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.createButtonText}>Yeni Kart Başvurusu</Text>
            </TouchableOpacity>
          </View>

          {cards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={80} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Henüz Kartınız Yok</Text>
              <Text style={styles.emptyText}>
                İlk kartınızı oluşturarak alışverişlerinize başlayın
              </Text>
            </View>
          ) : (
            cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.cardItem}
                onPress={() => navigation.navigate('CardDetail', { card })}
              >
                <View style={styles.cardGradient}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardType}>{getCardTypeLabel(card.card_type)}</Text>
                      <Text style={styles.cardName}>{card.name}</Text>
                    </View>
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="card" size={28} color="white" />
                    </View>
                  </View>

                  <View style={styles.cardNumber}>
                    <Text style={styles.cardNumberText}>{maskCardNumber(card.card_no)}</Text>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.cardDetail}>
                      <Text style={styles.cardDetailLabel}>Son Kullanma</Text>
                      <Text style={styles.cardDetailValue}>
                        {String(card.expiry_month).padStart(2, '0')}/{String(card.expiry_year).slice(-2)}
                      </Text>
                    </View>
                    <View style={styles.cardDetail}>
                      <Text style={styles.cardDetailLabel}>Durum</Text>
                      <Text style={styles.cardDetailValue}>
                        {card.status === 'active' ? '✓ Aktif' : card.status}
                      </Text>
                    </View>
                  </View>

                  {card.card_type === 'credit' && (
                    <View style={styles.cardLimit}>
                      <View style={styles.limitRow}>
                        <Text style={styles.limitLabel}>Kullanılabilir Limit</Text>
                        <Text style={styles.limitAmount}>
                          {formatAmount(card.available_limit || 0)} TL
                        </Text>
                      </View>
                      <View style={styles.limitRow}>
                        <Text style={styles.limitSubLabel}>Toplam Limit</Text>
                        <Text style={styles.limitSubValue}>
                          {formatAmount(card.limit || 0)} TL
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.cardActionButton}>
                    <Text style={styles.cardActionText}>Kart Hareketlerini Görüntüle</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  activeTabText: {
    color: colors.primary,
  },
  activeTabTextPurple: {
    color: '#7C3AED',
  },
  badge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  activeBadgePurple: {
    backgroundColor: '#F3E8FF',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeBadgeText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  actionButtonContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  createButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  createButtonPurple: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  accountIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  accountType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  accountBalance: {
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  accountFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accountDetail: {
    flex: 1,
  },
  accountDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  accountDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  viewDetailsText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'white',
  },
  cardItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    backgroundColor: '#7C3AED',
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  cardType: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  cardName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: 'white',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    marginBottom: spacing.lg,
  },
  cardNumberText: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardDetail: {},
  cardDetailLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  cardDetailValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
  cardLimit: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  limitLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  limitAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: 'white',
  },
  limitSubLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  limitSubValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardActionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'white',
  },
});
