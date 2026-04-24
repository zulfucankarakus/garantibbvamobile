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
import { getAllInvestmentAssets, getInvestmentPortfolio } from '../services/investmentService';

export default function InvestmentsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState({});
  const [assets, setAssets] = useState({});
  const [portfolio, setPortfolio] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('gold');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Yatırım varlıklarını al
      const assetsResponse = await getAllInvestmentAssets();
      if (assetsResponse.success) {
        setCategories(assetsResponse.categories);
        setAssets(assetsResponse.assets);
      }

      // Portföyü al
      const portfolioResponse = await getInvestmentPortfolio();
      if (portfolioResponse.success) {
        setPortfolio(portfolioResponse);
      }
    } catch (error) {
      console.error('Load investments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderCategoryTab = (categoryKey) => {
    const category = categories[categoryKey];
    if (!category) return null;

    const isSelected = selectedCategory === categoryKey;

    return (
      <TouchableOpacity
        key={categoryKey}
        style={[
          styles.categoryTab,
          isSelected && styles.categoryTabActive,
        ]}
        onPress={() => setSelectedCategory(categoryKey)}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text
          style={[
            styles.categoryName,
            isSelected && styles.categoryNameActive,
          ]}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAssetCard = (asset) => {
    const isPositive = asset.change_percent >= 0;

    return (
      <TouchableOpacity
        key={asset.id}
        style={styles.assetCard}
        onPress={() =>
          navigation.navigate('InvestmentDetail', { assetId: asset.id })
        }
      >
        <View style={styles.assetHeader}>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName}>{asset.name}</Text>
            <Text style={styles.assetSymbol}>{asset.symbol}</Text>
          </View>
          {asset.is_trending && (
            <View style={styles.trendingBadge}>
              <Ionicons name="flame" size={12} color="#DC2626" />
              <Text style={styles.trendingText}>Trend</Text>
            </View>
          )}
        </View>

        <View style={styles.assetPriceRow}>
          <Text style={styles.assetPrice}>
            {asset.current_price.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₺
          </Text>
          <View
            style={[
              styles.assetChange,
              {
                backgroundColor: isPositive ? '#DCFCE7' : '#FEE2E2',
              },
            ]}
          >
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={isPositive ? '#16A34A' : '#DC2626'}
            />
            <Text
              style={[
                styles.assetChangeText,
                {
                  color: isPositive ? '#16A34A' : '#DC2626',
                },
              ]}
            >
              %{Math.abs(asset.change_percent).toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Yatırımlar"
          subtitle="Altın • Döviz • Hisse • Kripto"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Yatırımlar"
        subtitle="Altın • Döviz • Hisse • Kripto"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Portföy Özeti */}
        {portfolio && portfolio.summary.total_value > 0 && (
          <TouchableOpacity
            style={styles.portfolioCard}
            onPress={() => navigation.navigate('InvestmentPortfolio')}
          >
            <LinearGradient
              colors={['#7C3AED', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.portfolioGradient}
            >
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>Portföyüm</Text>
                <Ionicons name="chevron-forward" size={24} color="white" />
              </View>

              <Text style={styles.portfolioValue}>
                {portfolio.summary.total_value.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })} ₺
              </Text>

              <View style={styles.portfolioChange}>
                <Ionicons
                  name={
                    portfolio.summary.total_profit_loss >= 0
                      ? 'trending-up'
                      : 'trending-down'
                  }
                  size={16}
                  color="white"
                />
                <Text style={styles.portfolioChangeText}>
                  {portfolio.summary.total_profit_loss >= 0 ? '+' : ''}
                  {portfolio.summary.total_profit_loss.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  ₺ (
                  {portfolio.summary.total_profit_loss_percent.toFixed(2)}%)
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Kategori Tabları */}
        <View style={styles.categoryTabs}>
          {Object.keys(categories).map((key) => renderCategoryTab(key))}
        </View>

        {/* Varlık Listesi */}
        <View style={styles.assetsContainer}>
          {assets[selectedCategory] && assets[selectedCategory].length > 0 ? (
            assets[selectedCategory].map((asset) => renderAssetCard(asset))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                Bu kategoride yatırım bulunamadı
              </Text>
            </View>
          )}
        </View>
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
  portfolioCard: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  portfolioGradient: {
    padding: spacing.lg,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  portfolioTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
  portfolioValue: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: 'white',
    marginBottom: spacing.sm,
  },
  portfolioChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioChangeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'white',
    marginLeft: spacing.xs,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.xs,
  },
  categoryName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  categoryNameActive: {
    color: 'white',
  },
  assetsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  assetCard: {
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
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  assetSymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trendingText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: spacing.xs,
  },
  assetPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetPrice: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  assetChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  assetChangeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
