import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

export default function ProductComparisonScreen({ route, navigation }) {
  const { productName, productCategory, visionData } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [priceData, setPriceData] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [currentProductName, setCurrentProductName] = useState(productName);  // Düzenlenebilir

  useEffect(() => {
    fetchPrices();
  }, []);
  
  // Ürün adını düzenle
  const handleEditProductName = () => {
    Alert.prompt(
      'Ürün Adını Düzenle',
      'Daha doğru sonuçlar için ürün adını düzenleyebilirsiniz:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ara',
          onPress: (newName) => {
            if (newName && newName.trim() && newName !== currentProductName) {
              setCurrentProductName(newName.trim());
              // Yeni isimle tekrar ara
              fetchPricesWithName(newName.trim());
            }
          }
        }
      ],
      'plain-text',
      currentProductName
    );
  };
  
  const fetchPricesWithName = async (customName) => {
    try {
      setLoading(true);
      setPriceData(null);
      setSelectedSite(null);
      
      console.log(`🔄 Re-searching with custom name: ${customName}`);
      
      const response = await api.post('/vision/scrape-prices', {
        product_name: customName,
        category: productCategory
      });

      if (response.data.success && response.data.data.results && response.data.data.results.length > 0) {
        setPriceData(response.data.data);
        
        const cheapest = response.data.data.results.reduce((min, site) => 
          site.price < min.price ? site : min
        );
        setSelectedSite(cheapest);
        
        Alert.alert('✅ Başarılı', `"${customName}" için fiyatlar güncellendi!`);
      } else {
        Alert.alert(
          'Fiyat Bulunamadı',
          `"${customName}" için fiyat bulunamadı. Başka bir isim deneyin veya manuel arama yapın.`,
          [
            { text: 'Tekrar Dene', onPress: () => handleEditProductName() },
            { text: 'Manuel Ara', onPress: () => {
              Linking.openURL(`https://www.hepsiburada.com/ara?q=${encodeURIComponent(customName)}`);
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Re-search error:', error);
      Alert.alert('Hata', 'Fiyatlar yeniden çekilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/vision/scrape-prices', {
        product_name: productName,
        category: productCategory
      });

      if (response.data.success && response.data.data.results && response.data.data.results.length > 0) {
        setPriceData(response.data.data);
        
        // En ucuz siteyi otomatik seç
        const cheapest = response.data.data.results.reduce((min, site) => 
          site.price < min.price ? site : min
        );
        setSelectedSite(cheapest);
      } else {
        // Gerçek fiyat çekilemedi
        Alert.alert(
          'Fiyat Bilgisi Alınamadı',
          `${productName} için gerçek fiyatlar şu anda çekilemiyor.\n\n${response.data.data?.message || response.data.data?.recommendation || 'Lütfen manuel olarak arama yapın.'}\n\nManuel arama yapmak ister misiniz?`,
          [
            { text: 'Geri Dön', onPress: () => navigation.goBack() },
            {
              text: 'Manuel Ara',
              onPress: () => {
                // Hepsiburada'da ara
                const searchUrl = `https://www.hepsiburada.com/ara?q=${encodeURIComponent(productName)}`;
                Linking.openURL(searchUrl);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Price fetch error:', error);
      Alert.alert(
        'Bağlantı Hatası',
        'Fiyat bilgisi alınamadı. Lütfen internet bağlantınızı kontrol edin.',
        [
          { text: 'Tekrar Dene', onPress: () => fetchPrices() },
          { text: 'Geri', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  const handleContinue = () => {
    if (!selectedSite) return;

    // Sade finansman ekranına yönlendir
    navigation.navigate('SimpleFinancial', {
      productName: currentProductName,
      productCategory,
      selectedPrice: selectedSite.price,
      selectedSite: selectedSite.site,
      visionData
    });
  };

  const openSiteLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Link açma hatası:', err));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Fiyat Karşılaştırması" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fiyatlar taranıyor...</Text>
          <Text style={styles.loadingSubtext}>Hepsiburada, N11 ve Trendyol kontrol ediliyor</Text>
        </View>
      </View>
    );
  }

  if (!priceData || !priceData.results || priceData.results.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Fiyat Karşılaştırması" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>Fiyat bulunamadı</Text>
          <Text style={styles.errorSubtext}>Lütfen daha sonra tekrar deneyin</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPrices}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = priceData.statistics;

  return (
    <View style={styles.container}>
      <Header title="Fiyat Karşılaştırması" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ürün Başlığı */}
        <View style={styles.productHeader}>
          <View style={styles.productTitleRow}>
            <Text style={styles.productName}>{currentProductName}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProductName}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {priceData.estimated && (
            <View style={styles.estimatedBadge}>
              <Ionicons name="information-circle" size={16} color={colors.warning} />
              <Text style={styles.estimatedText}>Tahmini Fiyatlar</Text>
            </View>
          )}
          
          {priceData.note && (
            <Text style={styles.noteText}>{priceData.note}</Text>
          )}
          
          <TouchableOpacity
            style={styles.retrySearchButton}
            onPress={handleEditProductName}
          >
            <Ionicons name="search" size={16} color={colors.primary} />
            <Text style={styles.retrySearchText}>
              Ürün adını düzenle ve tekrar ara
            </Text>
          </TouchableOpacity>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ortalama</Text>
            <Text style={styles.statValue}>{stats.average_price.toLocaleString('tr-TR')} TL</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>En Düşük</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.min_price.toLocaleString('tr-TR')} TL
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>En Yüksek</Text>
            <Text style={styles.statValue}>{stats.max_price.toLocaleString('tr-TR')} TL</Text>
          </View>
        </View>

        {/* Fiyat Listesi */}
        <View style={styles.pricesContainer}>
          <Text style={styles.sectionTitle}>Siteler</Text>
          
          {priceData.results.map((site, index) => {
            const isSelected = selectedSite?.site === site.site;
            const isCheapest = site.site === stats.cheapest_site;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.siteCard,
                  isSelected && styles.siteCardSelected
                ]}
                onPress={() => handleSiteSelect(site)}
              >
                <View style={styles.siteHeader}>
                  <View style={styles.siteInfo}>
                    <Text style={styles.siteName}>{site.site}</Text>
                    {isCheapest && (
                      <View style={styles.cheapestBadge}>
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <Text style={styles.cheapestText}>En Ucuz</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.radioButton}>
                    {isSelected && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>

                <Text style={styles.priceText}>
                  {site.price.toLocaleString('tr-TR')} TL
                </Text>

                {site.product_title && (
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {site.product_title}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openSiteLink(site.url)}
                >
                  <Text style={styles.linkButtonText}>Siteye Git</Text>
                  <Ionicons name="open-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Devam Butonu */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedSite && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedSite}
          >
            <LinearGradient
              colors={!selectedSite ? [colors.gray, colors.gray] : [colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                {selectedSite ? `${selectedSite.price.toLocaleString('tr-TR')} TL - Devam Et` : 'Site Seçin'}
              </Text>
              {selectedSite && (
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.large,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  loadingSubtext: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.large,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  errorSubtext: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSize.medium,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  productHeader: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  productName: {
    fontSize: fontSize.xlarge,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.medium,
    marginLeft: spacing.sm,
  },
  estimatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
  },
  estimatedText: {
    fontSize: fontSize.small,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  noteText: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  retrySearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.medium,
    alignSelf: 'flex-start',
  },
  retrySearchText: {
    fontSize: fontSize.small,
    color: colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
  },
  pricesContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  siteCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  siteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  siteName: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
  },
  cheapestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
  },
  cheapestText: {
    fontSize: fontSize.small,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  priceText: {
    fontSize: fontSize.xxlarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  productTitle: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  linkButtonText: {
    fontSize: fontSize.medium,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  continueButton: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: fontSize.large,
    fontWeight: '700',
  },
});
