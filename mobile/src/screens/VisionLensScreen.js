import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { analyzeImage, getFinancialAdvice } from '../services/visionService';
import { scrapePrices } from '../services/investmentService';
import api from '../config/api';

export default function VisionLensScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [financialAdvice, setFinancialAdvice] = useState(null);
  const [scrapingPrices, setScrapingPrices] = useState(false);
  const [priceComparison, setPriceComparison] = useState(null);
  // CNN Deep Learning State
  const [cnnResult, setCnnResult] = useState(null);
  const [cnnLoading, setCnnLoading] = useState(false);

  const pickImage = async (useCamera = false) => {
    try {
      // İzin iste
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'İzin Gerekli',
          useCamera
            ? 'Kamera kullanmak için izin vermeniz gerekiyor.'
            : 'Galeriye erişmek için izin vermeniz gerekiyor.'
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setAnalysisResult(null);
        setFinancialAdvice(null);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !selectedImage.base64) {
      Alert.alert('Hata', 'Lütfen önce bir fotoğraf seçin');
      return;
    }

    setAnalyzing(true);

    try {
      // 1. Görsel analizi
      const analyzeResponse = await analyzeImage(selectedImage.base64);

      if (analyzeResponse.success) {
        setAnalysisResult(analyzeResponse.data);
        
        // Mock data uyarısı
        if (analyzeResponse.is_mock) {
          Alert.alert(
            'Demo Modu',
            'AI servisi şu anda kullanılamıyor. Demo verileri gösteriliyor. Finansal öneriler gerçek verilere dayanmaktadır.',
            [{ text: 'Anladım' }]
          );
        }
        
        // 2. Finansal öneri al
        const adviceResponse = await getFinancialAdvice(
          analyzeResponse.data.object_data,
          analyzeResponse.data.price_data
        );

        if (adviceResponse.success) {
          setFinancialAdvice(adviceResponse.data);
          
          // Başarı mesajı
          if (!analyzeResponse.is_mock) {
            // Gerçek AI analizi yapıldı
            console.log('AI Provider:', analyzeResponse.provider || 'openai');
          }
        }
        
        // 3. Fiyat karşılaştırması yap (web scraping)
        handlePriceScraping(analyzeResponse.data.object_data);
        
        // 4. CNN Deep Learning sınıflandırması
        const labels = [];
        if (analyzeResponse.data.object_data?.object_name) {
          labels.push(analyzeResponse.data.object_data.object_name);
        }
        if (analyzeResponse.data.object_data?.category) {
          labels.push(analyzeResponse.data.object_data.category);
        }
        if (analyzeResponse.data.object_data?.description) {
          // Description'dan anahtar kelimeler çıkar
          const words = analyzeResponse.data.object_data.description.split(' ').slice(0, 5);
          labels.push(...words);
        }
        if (labels.length > 0) {
          handleCnnClassification(labels);
        }
      } else {
        Alert.alert('Hata', analyzeResponse.error || 'Analiz başarısız oldu');
      }
    } catch (error) {
      console.error('Analiz hatası:', error);
      
      // Hata mesajını daha anlaşılır yap
      let errorMessage = 'Analiz sırasında bir hata oluştu';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.error_code === 'RATE_LIMIT') {
        errorMessage = 'API limiti aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Analiz Hatası', errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setFinancialAdvice(null);
    setPriceComparison(null);
    setCnnResult(null);
  };
  
  // CNN Deep Learning Product Classification
  const handleCnnClassification = async (labels) => {
    try {
      setCnnLoading(true);
      const response = await api.post('/deep-learning/product-classification', {
        image_data: selectedImage?.base64 || '',
        detected_labels: labels || []
      });
      
      if (response.data?.success) {
        setCnnResult(response.data);
      }
    } catch (error) {
      console.error('CNN classification error:', error);
    } finally {
      setCnnLoading(false);
    }
  };
  
  const handlePriceScraping = async (objectData) => {
    try {
      setScrapingPrices(true);
      
      const productName = objectData.object_name;
      const category = objectData.category;
      
      const scrapeResult = await scrapePrices(productName, category);
      
      if (scrapeResult.success) {
        setPriceComparison(scrapeResult);
      }
    } catch (error) {
      console.error('Price scraping error:', error);
      // Hata durumunda sessizce devam et (zorunlu özellik değil)
    } finally {
      setScrapingPrices(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      electronics: '📱',
      vehicle: '🚗',
      jewelry: '💍',
      clothing: '👔',
      food: '🍕',
      home: '🏠',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getRecommendationIcon = (type) => {
    const icons = {
      loan: 'cash',
      installment: 'card',
      investment: 'trending-up',
    };
    return icons[type] || 'star';
  };

  return (
    <View style={styles.container}>
      <Header
        title="Vision Lens"
        subtitle="Görsel Finansal Asistan"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content}>
        {/* Info Banner */}
        <LinearGradient
          colors={['#7C3AED', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.infoBanner}
        >
          <Ionicons name="eye" size={24} color="white" />
          <Text style={styles.infoBannerText}>
            Beğendiğiniz bir ürünün fotoğrafını çekin, size özel finansman seçeneklerini hemen görün!
          </Text>
        </LinearGradient>

        {/* Video Asistan Butonu */}
        <TouchableOpacity
          style={styles.videoAssistantButton}
          onPress={() => navigation.navigate('VideoVisionAssistant')}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.videoAssistantGradient}
          >
            <View style={styles.videoAssistantIcon}>
              <Ionicons name="videocam" size={32} color="white" />
            </View>
            <View style={styles.videoAssistantText}>
              <Text style={styles.videoAssistantTitle}>🎙️ Video Asistan (YENİ!)</Text>
              <Text style={styles.videoAssistantSubtitle}>
                Kamera + Sesli Komutlarla Ürün Sorgula
              </Text>
              <Text style={styles.videoAssistantFeature}>
                ✨ Canlı kamera • 📸 Fotoğraf • 🗣️ Text komutlar
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {!selectedImage ? (
          /* Fotoğraf Seçme Butonları */
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(true)}
            >
              <LinearGradient
                colors={['#7C3AED', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.imagePickerGradient}
              >
                <View style={styles.imagePickerIcon}>
                  <Ionicons name="camera" size={40} color="white" />
                </View>
                <Text style={styles.imagePickerTitle}>Fotoğraf Çek</Text>
                <Text style={styles.imagePickerSubtitle}>
                  Kameranızla ürünün fotoğrafını çekin
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(false)}
            >
              <LinearGradient
                colors={['#0D9488', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.imagePickerGradient}
              >
                <View style={styles.imagePickerIcon}>
                  <Ionicons name="images" size={40} color="white" />
                </View>
                <Text style={styles.imagePickerTitle}>Galeriden Seç</Text>
                <Text style={styles.imagePickerSubtitle}>
                  Galerinizdeki bir fotoğrafı seçin
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectedImageContainer}>
            {/* Seçilen Fotoğraf */}
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity style={styles.closeButton} onPress={handleReset}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Analiz Butonu */}
            {!analyzing && !analysisResult && (
              <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                <LinearGradient
                  colors={['#7C3AED', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.analyzeButtonGradient}
                >
                  <Ionicons name="eye" size={24} color="white" />
                  <Text style={styles.analyzeButtonText}>Analiz Et</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Analiz Durumu */}
            {analyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.analyzingTitle}>Analiz Ediliyor...</Text>
                <Text style={styles.analyzingText}>
                  Görseliniz AI tarafından inceleniyor ve size özel finansal öneriler hazırlanıyor
                </Text>
              </View>
            )}

            {/* Analiz Sonucu */}
            {analysisResult && (
              <View style={styles.resultContainer}>
                <LinearGradient
                  colors={['#F3E8FF', '#EDE9FE']}
                  style={styles.resultHeader}
                >
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(analysisResult.object_data.category)}
                  </Text>
                  <View style={styles.resultHeaderText}>
                    <Text style={styles.resultTitle}>
                      {analysisResult.object_data.object_name}
                    </Text>
                    <Text style={styles.resultDescription}>
                      {analysisResult.object_data.description}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Fiyat */}
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Tahmini Piyasa Fiyatı</Text>
                  <Text style={styles.priceValue}>
                    {analysisResult.object_data.estimated_price_range || 'Hesaplanıyor...'}
                  </Text>
                </View>

                {/* Güven Skoru */}
                <View style={styles.confidenceContainer}>
                  <View style={styles.confidenceHeader}>
                    <Text style={styles.confidenceLabel}>Analiz Güvenilirliği</Text>
                    <Text style={styles.confidenceValue}>
                      %{((analysisResult.object_data.confidence || 0) * 100).toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${(analysisResult.object_data.confidence || 0) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Fiyat Karşılaştırma - Web Scraping Sonuçları */}
            {priceComparison && priceComparison.results && priceComparison.results.length > 0 && (
              <View style={styles.priceComparisonContainer}>
                <View style={styles.priceComparisonHeader}>
                  <Ionicons name="pricetags" size={24} color={colors.primary} />
                  <Text style={styles.priceComparisonTitle}>Gerçek Fiyat Karşılaştırma</Text>
                </View>

                {/* Analiz Özeti */}
                {priceComparison.analysis && (
                  <LinearGradient
                    colors={['#DBEAFE', '#BFDBFE']}
                    style={styles.priceAnalysisCard}
                  >
                    <View style={styles.priceAnalysisRow}>
                      <View style={styles.priceAnalysisItem}>
                        <Text style={styles.priceAnalysisLabel}>Ortalama Fiyat</Text>
                        <Text style={styles.priceAnalysisValue}>
                          {priceComparison.analysis.average_price.toLocaleString('tr-TR')} ₺
                        </Text>
                      </View>
                      <View style={styles.priceAnalysisItem}>
                        <Text style={styles.priceAnalysisLabel}>En Ucuz</Text>
                        <Text style={[styles.priceAnalysisValue, { color: '#16A34A' }]}>
                          {priceComparison.analysis.min_price.toLocaleString('tr-TR')} ₺
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.bestDealBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={styles.bestDealText}>
                        En iyi fiyat: {priceComparison.analysis.cheapest_site}
                      </Text>
                    </View>
                    
                    {priceComparison.analysis.savings_potential > 0 && (
                      <View style={styles.savingsPotential}>
                        <Ionicons name="trending-down" size={16} color="#DC2626" />
                        <Text style={styles.savingsText}>
                          {priceComparison.analysis.savings_potential.toLocaleString('tr-TR')} ₺ tasarruf fırsatı
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                )}

                {/* Fiyat Listesi */}
                {priceComparison.results.map((result, index) => (
                  <View key={index} style={styles.priceResultCard}>
                    <View style={styles.priceResultHeader}>
                      <View style={styles.priceResultSite}>
                        <Text style={styles.priceResultSiteName}>{result.site_name}</Text>
                        {result.site_name === priceComparison.analysis?.cheapest_site && (
                          <View style={styles.bestPriceBadge}>
                            <Text style={styles.bestPriceText}>EN UCUZ</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.priceResultAmount}>
                        {result.price.toLocaleString('tr-TR')} ₺
                      </Text>
                    </View>
                    
                    {result.product_name && (
                      <Text style={styles.priceResultProduct} numberOfLines={2}>
                        {result.product_name}
                      </Text>
                    )}
                  </View>
                ))}

                {scrapingPrices && (
                  <View style={styles.scrapingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.scrapingText}>Güncel fiyatlar kontrol ediliyor...</Text>
                  </View>
                )}
              </View>
            )}

            {/* 🧠 CNN Deep Learning Sınıflandırma */}
            {(cnnResult || cnnLoading) && (
              <View style={styles.cnnContainer}>
                <LinearGradient
                  colors={['#7C3AED', '#8B5CF6']}
                  style={styles.cnnHeader}
                >
                  <Ionicons name="hardware-chip" size={24} color="white" />
                  <Text style={styles.cnnHeaderTitle}>🧠 CNN Derin Öğrenme Analizi</Text>
                </LinearGradient>

                {cnnLoading ? (
                  <View style={styles.cnnLoading}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.cnnLoadingText}>CNN modeli analiz ediyor...</Text>
                  </View>
                ) : cnnResult && cnnResult.success && (
                  <>
                    {/* Ana Sınıflandırma Sonucu */}
                    <View style={styles.cnnMainResult}>
                      <Text style={styles.cnnEmoji}>{cnnResult.predicted_emoji}</Text>
                      <View style={styles.cnnMainInfo}>
                        <Text style={styles.cnnPredictedName}>{cnnResult.predicted_name}</Text>
                        <Text style={styles.cnnConfidence}>
                          Güven: %{cnnResult.confidence?.toFixed(1)} {cnnResult.confidence_level}
                        </Text>
                      </View>
                    </View>

                    {/* Top 3 Tahminler */}
                    <View style={styles.cnnTop3Container}>
                      <Text style={styles.cnnTop3Title}>📊 En Olası Kategoriler</Text>
                      {cnnResult.top_3_predictions?.map((pred, index) => (
                        <View key={index} style={styles.cnnTop3Item}>
                          <View style={styles.cnnTop3Left}>
                            <Text style={styles.cnnTop3Rank}>#{index + 1}</Text>
                            <Text style={styles.cnnTop3Emoji}>{pred.emoji}</Text>
                            <Text style={styles.cnnTop3Name}>{pred.name}</Text>
                          </View>
                          <View style={styles.cnnTop3Right}>
                            <View style={styles.cnnTop3BarContainer}>
                              <View 
                                style={[
                                  styles.cnnTop3Bar, 
                                  { width: `${pred.probability}%` }
                                ]} 
                              />
                            </View>
                            <Text style={styles.cnnTop3Percent}>%{pred.probability?.toFixed(1)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Finansal Kategori */}
                    <View style={styles.cnnFinancialCategory}>
                      <Ionicons name="cash" size={20} color="#10B981" />
                      <Text style={styles.cnnFinancialText}>{cnnResult.financial_category}</Text>
                    </View>

                    {/* Ortalama Fiyat Aralığı */}
                    <View style={styles.cnnPriceRange}>
                      <Text style={styles.cnnPriceRangeLabel}>Kategori Fiyat Aralığı</Text>
                      <Text style={styles.cnnPriceRangeValue}>{cnnResult.avg_price_range}</Text>
                    </View>

                    {/* Model Bilgisi */}
                    <View style={styles.cnnModelInfo}>
                      <Text style={styles.cnnModelTitle}>🔬 Model Detayları</Text>
                      <Text style={styles.cnnModelText}>
                        • Tip: {cnnResult.model_info?.type}{'\n'}
                        • Framework: {cnnResult.model_info?.framework}{'\n'}
                        • Pretrained: {cnnResult.model_info?.pretrained}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Finansal Öneriler */}
            {financialAdvice && (
              <View style={styles.adviceContainer}>
                <View style={styles.adviceHeader}>
                  <Ionicons name="sparkles" size={24} color={colors.primary} />
                  <Text style={styles.adviceTitle}>Size Özel Finansman Seçenekleri</Text>
                </View>

                {/* Bakiye Kontrolü */}
                <LinearGradient
                  colors={['#DCFCE7', '#D1FAE5']}
                  style={styles.balanceCard}
                >
                  <View style={styles.balanceInfo}>
                    <Text style={styles.balanceLabel}>Toplam Bakiyeniz</Text>
                    <Text style={styles.balanceAmount}>
                      {financialAdvice.user_balance.toFixed(2)} TL
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.balanceBadge,
                      {
                        backgroundColor: financialAdvice.can_afford ? '#16A34A' : '#EA580C',
                      },
                    ]}
                  >
                    <Text style={styles.balanceBadgeText}>
                      {financialAdvice.can_afford ? 'Peşin Alabilirsiniz' : 'Finansman Gerekli'}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Öneriler */}
                {financialAdvice.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                      <LinearGradient
                        colors={['#7C3AED', '#2563EB']}
                        style={styles.recommendationIcon}
                      >
                        <Ionicons
                          name={getRecommendationIcon(rec.type)}
                          size={24}
                          color="white"
                        />
                      </LinearGradient>
                      <View style={styles.recommendationInfo}>
                        <Text style={styles.recommendationTitle}>{rec.title}</Text>
                        <Text style={styles.recommendationDescription}>
                          {rec.description}
                        </Text>
                      </View>
                    </View>

                    {/* Detaylar */}
                    {rec.type === 'loan' && (
                      <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Kredi Tutarı</Text>
                          <Text style={styles.detailValue}>
                            {rec.details.amount.toFixed(2)} TL
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Vade</Text>
                          <Text style={styles.detailValue}>{rec.details.months} Ay</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Faiz Oranı</Text>
                          <Text style={styles.detailValue}>%{rec.details.interest_rate}</Text>
                        </View>
                        <View style={[styles.detailRow, styles.detailRowHighlight]}>
                          <Text style={styles.detailLabelBold}>Aylık Ödeme</Text>
                          <Text style={styles.detailValueBold}>
                            {rec.details.monthly_payment.toFixed(2)} TL
                          </Text>
                        </View>
                      </View>
                    )}

                    {rec.type === 'installment' && rec.details.installment_options && (
                      <View style={styles.installmentGrid}>
                        {rec.details.installment_options.map((opt, idx) => (
                          <View key={idx} style={styles.installmentOption}>
                            <Text style={styles.installmentMonths}>{opt.months} Ay</Text>
                            <Text style={styles.installmentAmount}>
                              {opt.monthly_payment.toFixed(2)} TL
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {rec.type === 'investment' && (
                      <View style={styles.investmentDetails}>
                        <Text style={styles.investmentText}>{rec.details.recommendation}</Text>
                        {rec.details.current_price && (
                          <View style={styles.priceRow}>
                            <Text style={styles.priceRowLabel}>Güncel Fiyat</Text>
                            <Text style={styles.priceRowValue}>
                              {rec.details.current_price} TL/{rec.details.unit}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <TouchableOpacity style={styles.ctaButton}>
                      <LinearGradient
                        colors={['#7C3AED', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaGradient}
                      >
                        <Text style={styles.ctaText}>{rec.cta}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Yeni Analiz Butonu */}
                <TouchableOpacity
                  style={styles.newAnalysisButton}
                  onPress={handleReset}
                >
                  <Text style={styles.newAnalysisText}>Yeni Ürün Analiz Et</Text>
                </TouchableOpacity>
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
    paddingTop: 40,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.sm,
    color: 'white',
    lineHeight: 20,
  },
  imagePickerContainer: {
    padding: spacing.lg,
  },
  imagePickerButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imagePickerGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  imagePickerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  imagePickerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: 'white',
    marginBottom: spacing.xs,
  },
  imagePickerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  videoAssistantButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  videoAssistantGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  videoAssistantIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  videoAssistantText: {
    flex: 1,
  },
  videoAssistantTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  videoAssistantSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  videoAssistantFeature: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  selectedImageContainer: {
    padding: spacing.lg,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    backgroundColor: colors.border,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  analyzeButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.sm,
  },
  analyzingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  analyzingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  analyzingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  resultHeader: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resultDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  confidenceContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  confidenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  confidenceValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.success,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  adviceContainer: {
    marginTop: spacing.md,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  adviceTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  balanceCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceInfo: {},
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  balanceBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  balanceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: 'white',
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  recommendationHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recommendationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailsContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  detailLabelBold: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  detailValueBold: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  installmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  installmentOption: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  installmentMonths: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  installmentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  investmentDetails: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  investmentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceRowLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceRowValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#EA580C',
  },
  ctaButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
  },
  newAnalysisButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newAnalysisText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  // Price Comparison Styles
  priceComparisonContainer: {
    marginVertical: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceComparisonTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  priceAnalysisCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  priceAnalysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  priceAnalysisItem: {
    alignItems: 'center',
  },
  priceAnalysisLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceAnalysisValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  bestDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  bestDealText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#16A34A',
    marginLeft: spacing.xs,
  },
  savingsPotential: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsText: {
    fontSize: fontSize.sm,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  priceResultCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceResultSite: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceResultSiteName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  bestPriceBadge: {
    backgroundColor: '#16A34A',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  bestPriceText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: 'white',
  },
  priceResultAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  priceResultProduct: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrapingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  scrapingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  // CNN Deep Learning Styles
  cnnContainer: {
    marginVertical: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cnnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  cnnHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.sm,
  },
  cnnLoading: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  cnnLoadingText: {
    fontSize: fontSize.sm,
    color: '#8B5CF6',
    marginTop: spacing.sm,
  },
  cnnMainResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F5F3FF',
  },
  cnnEmoji: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  cnnMainInfo: {
    flex: 1,
  },
  cnnPredictedName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#5B21B6',
  },
  cnnConfidence: {
    fontSize: fontSize.sm,
    color: '#7C3AED',
    marginTop: spacing.xs,
  },
  cnnTop3Container: {
    padding: spacing.md,
  },
  cnnTop3Title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cnnTop3Item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cnnTop3Left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cnnTop3Rank: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#8B5CF6',
    width: 24,
  },
  cnnTop3Emoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  cnnTop3Name: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  cnnTop3Right: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'flex-end',
  },
  cnnTop3BarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: spacing.sm,
    maxWidth: 100,
  },
  cnnTop3Bar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  cnnTop3Percent: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#8B5CF6',
    width: 45,
    textAlign: 'right',
  },
  cnnFinancialCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  cnnFinancialText: {
    fontSize: fontSize.sm,
    color: '#065F46',
    marginLeft: spacing.sm,
    flex: 1,
  },
  cnnPriceRange: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cnnPriceRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cnnPriceRangeValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  cnnModelInfo: {
    backgroundColor: '#F3F4F6',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.md,
  },
  cnnModelTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cnnModelText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
