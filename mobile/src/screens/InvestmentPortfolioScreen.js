import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { getInvestmentPortfolio, getInvestmentTransactions } from '../services/investmentService';

export default function InvestmentPortfolioScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTab, setSelectedTab] = useState('portfolio'); // 'portfolio' or 'transactions'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Portföy
      const portfolioResponse = await getInvestmentPortfolio();
      if (portfolioResponse.success) {
        setPortfolio(portfolioResponse);
      }

      // İşlem geçmişi
      const transactionsResponse = await getInvestmentTransactions();
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.transactions);
      }
    } catch (error) {
      console.error('Load portfolio error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderPortfolioItem = (item) => {
    const isProfit = item.profit_loss >= 0;

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.portfolioItem}
        onPress={() => navigation.navigate('InvestmentDetail', { assetId: item.investment_id })}
      >
        <View style={styles.portfolioItemHeader}>
          <View style={styles.portfolioItemInfo}>
            <Text style={styles.portfolioItemName}>{item.investment_name}</Text>
            <Text style={styles.portfolioItemSymbol}>{item.investment_symbol}</Text>
          </View>
          <View style={styles.portfolioItemValues}>
            <Text style={styles.portfolioItemValue}>
              {item.total_value?.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })} ₺
            </Text>
            <View
              style={[
                styles.portfolioItemChange,
                { backgroundColor: isProfit ? '#DCFCE7' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={isProfit ? 'trending-up' : 'trending-down'}
                size={12}
                color={isProfit ? '#16A34A' : '#DC2626'}
              />
              <Text
                style={[
                  styles.portfolioItemChangeText,
                  { color: isProfit ? '#16A34A' : '#DC2626' },
                ]}
              >
                {isProfit ? '+' : ''}
                {item.profit_loss?.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })} ₺
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.portfolioItemDetails}>
          <View style={styles.portfolioItemDetail}>
            <Text style={styles.portfolioItemDetailLabel}>Miktar</Text>
            <Text style={styles.portfolioItemDetailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.portfolioItemDetail}>
            <Text style={styles.portfolioItemDetailLabel}>Ort. Maliyet</Text>
            <Text style={styles.portfolioItemDetailValue}>
              {item.purchase_price?.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })} ₺
            </Text>
          </View>
          <View style={styles.portfolioItemDetail}>
            <Text style={styles.portfolioItemDetailLabel}>Güncel</Text>
            <Text style={styles.portfolioItemDetailValue}>
              {item.current_price?.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })} ₺
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTransaction = (transaction) => {
    const isBuy = transaction.transaction_type === 'buy';

    return (
      <View key={transaction._id} style={styles.transactionItem}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: isBuy ? '#DCFCE7' : '#FEE2E2' },
          ]}
        >
          <Ionicons
            name={isBuy ? 'add' : 'remove'}
            size={20}
            color={isBuy ? '#16A34A' : '#DC2626'}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionName}>{transaction.investment_name}</Text>
          <Text style={styles.transactionDate}>
            {new Date(transaction.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.transactionValues}>
          <Text style={styles.transactionQuantity}>
            {isBuy ? '+' : '-'}
            {transaction.quantity} adet
          </Text>
          <Text
            style={[
              styles.transactionAmount,
              { color: isBuy ? '#16A34A' : '#DC2626' },
            ]}
          >
            {isBuy ? '-' : '+'}
            {transaction.total_amount.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })} ₺
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Portföy" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const hasPortfolio = portfolio && portfolio.portfolio && portfolio.portfolio.length > 0;

  return (
    <View style={styles.container}>
      <Header title="Yatırım Portföyüm" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Portföy Özeti */}
        {hasPortfolio && (
          <LinearGradient
            colors={['#7C3AED', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Toplam Değer</Text>
            <Text style={styles.summaryValue}>
              {portfolio.summary.total_value.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })} ₺
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Yatırım</Text>
                <Text style={styles.summaryItemValue}>
                  {portfolio.summary.total_investment.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })} ₺
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Kâr/Zarar</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    {
                      color:
                        portfolio.summary.total_profit_loss >= 0
                          ? '#DCFCE7'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  {portfolio.summary.total_profit_loss >= 0 ? '+' : ''}
                  {portfolio.summary.total_profit_loss.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })} ₺ ({portfolio.summary.total_profit_loss_percent.toFixed(2)}
                  %)
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'portfolio' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('portfolio')}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'portfolio' && styles.tabTextActive,
              ]}
            >
              Portföy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'transactions' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('transactions')}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'transactions' && styles.tabTextActive,
              ]}
            >
              İşlemler
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {selectedTab === 'portfolio' ? (
          <View style={styles.portfolioList}>
            {hasPortfolio ? (
              portfolio.portfolio.map((item) => renderPortfolioItem(item))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="briefcase-outline"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>Portföyünüz Boş</Text>
                <Text style={styles.emptyText}>
                  Henüz herhangi bir yatırım yapmadınız. Yatırımlara göz atın ve
                  portföyünüzü oluşturmaya başlayın.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('Investments')}
                >
                  <Text style={styles.emptyButtonText}>Yatırımlara Git</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.map((transaction) => renderTransaction(transaction))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>İşlem Geçmişi Yok</Text>
                <Text style={styles.emptyText}>
                  Henüz hiç işlem yapmadınız.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxl * 1.5,
    fontWeight: '900',
    color: 'white',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  summaryItemValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  portfolioList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  portfolioItem: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  portfolioItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  portfolioItemInfo: {
    flex: 1,
  },
  portfolioItemName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  portfolioItemSymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  portfolioItemValues: {
    alignItems: 'flex-end',
  },
  portfolioItemValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  portfolioItemChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  portfolioItemChangeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  portfolioItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  portfolioItemDetail: {
    alignItems: 'center',
  },
  portfolioItemDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  portfolioItemDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  transactionsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionValues: {
    alignItems: 'flex-end',
  },
  transactionQuantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
  },
});
