import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

export default function InstallmentSelectionScreen({ route, navigation }) {
  const { productName, price, term, monthly_payment, interest_rate = 0 } = route.params;
  
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(term || 12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(false);
      
      // Kullanıcının kartlarını çek
      const response = await api.get('/cards');
      if (response.data.success) {
        const userCards = response.data.data.filter(c => c.card_type === 'credit' || c.card_type === 'debit');
        setCards(userCards);
        if (userCards.length > 0) {
          setSelectedCard(userCards[0]);
        }
      }
    } catch (error) {
      console.error('Cards fetch error:', error);
      Alert.alert('Bilgi', 'Kredi kartınız yok gibi görünüyor. Yeni kart başvurusu yapabilirsiniz.', [
        { text: 'Tamam' },
        { text: 'Kart Başvurusu', onPress: () => navigation.navigate('CreateCard') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateInstallment = (termMonths) => {
    if (interest_rate === 0) {
      // Faizsiz taksit
      return {
        monthly: price / termMonths,
        total: price,
        interest: 0
      };
    } else {
      // Faizli taksit
      const monthlyRate = interest_rate / 100;
      const monthly = (price * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                     (Math.pow(1 + monthlyRate, termMonths) - 1);
      const total = monthly * termMonths;
      return {
        monthly: monthly,
        total: total,
        interest: total - price
      };
    }
  };

  const installmentOptions = [3, 6, 9, 12, 18, 24];

  const handleConfirm = async () => {
    if (!selectedCard) {
      Alert.alert('Uyarı', 'Lütfen bir kredi kartı seçin');
      return;
    }

    const calc = calculateInstallment(selectedTerm);

    Alert.alert(
      'Satın Alma Onayı',
      `${productName}\n\nToplam: ${calc.total.toLocaleString('tr-TR')} TL\nTaksit: ${selectedTerm} ay × ${calc.monthly.toLocaleString('tr-TR')} TL\n\nOnaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              // Satın alma işlemini simüle et
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Başarı mesajı
              Alert.alert(
                '✅ Başarılı!',
                `${productName} başarıyla satın alındı!\n\n${selectedTerm} ay × ${calc.monthly.toLocaleString('tr-TR')} TL\n\nSatın alma işleminiz tamamlandı.`,
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      // Ana sayfaya dön
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      });
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Hata', 'İşlem tamamlanamadı. Lütfen tekrar deneyin.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Taksit Seçimi" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ürün Özeti */}
        <View style={styles.productSummary}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.priceText}>{price.toLocaleString('tr-TR')} TL</Text>
        </View>

        {/* Kredi Kartı Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kredi Kartı Seçin</Text>
          
          {cards.length === 0 ? (
            <View style={styles.noCardsContainer}>
              <Ionicons name="card-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noCardsText}>Henüz kredi kartınız yok</Text>
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={() => navigation.navigate('CreateCard')}
              >
                <Text style={styles.addCardButtonText}>Kart Başvurusu Yap</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.cardItem,
                  selectedCard?.id === card.id && styles.cardItemSelected
                ]}
                onPress={() => setSelectedCard(card)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Ionicons name="card" size={24} color={colors.primary} />
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardNumber}>**** **** **** {card.card_no.slice(-4)}</Text>
                      <Text style={styles.cardType}>
                        {card.card_type === 'credit' ? 'Kredi Kartı' : 'Banka Kartı'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.radioButton}>
                    {selectedCard?.id === card.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Taksit Seçenekleri */}
        {cards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Taksit Seçeneği</Text>
            
            <View style={styles.installmentGrid}>
              {installmentOptions.map((termOption) => {
                const calc = calculateInstallment(termOption);
                const isSelected = selectedTerm === termOption;
                
                return (
                  <TouchableOpacity
                    key={termOption}
                    style={[
                      styles.installmentCard,
                      isSelected && styles.installmentCardSelected
                    ]}
                    onPress={() => setSelectedTerm(termOption)}
                  >
                    <Text style={[styles.termText, isSelected && styles.termTextSelected]}>
                      {termOption} Ay
                    </Text>
                    <Text style={[styles.monthlyText, isSelected && styles.monthlyTextSelected]}>
                      {calc.monthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </Text>
                    <Text style={styles.monthlyLabel}>aylık</Text>
                    
                    {calc.interest > 0 && (
                      <Text style={styles.interestText}>
                        +{calc.interest.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL faiz
                      </Text>
                    )}
                    
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Özet */}
        {selectedCard && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ödeme Özeti</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ürün Fiyatı:</Text>
                <Text style={styles.summaryValue}>{price.toLocaleString('tr-TR')} TL</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taksit Sayısı:</Text>
                <Text style={styles.summaryValue}>{selectedTerm} ay</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Aylık Ödeme:</Text>
                <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
                  {calculateInstallment(selectedTerm).monthly.toLocaleString('tr-TR')} TL
                </Text>
              </View>
              
              {interest_rate > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Toplam Faiz:</Text>
                  <Text style={[styles.summaryValue, { color: colors.error }]}>
                    {calculateInstallment(selectedTerm).interest.toLocaleString('tr-TR')} TL
                  </Text>
                </View>
              )}
              
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Toplam Ödeme:</Text>
                <Text style={styles.summaryTotalValue}>
                  {calculateInstallment(selectedTerm).total.toLocaleString('tr-TR')} TL
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Onay Butonu */}
        {cards.length > 0 && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.confirmButtonText}>Satın Al</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  productSummary: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  productName: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  priceText: {
    fontSize: fontSize.xxlarge,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  noCardsContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderRadius: borderRadius.medium,
  },
  noCardsText: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addCardButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
  },
  addCardButtonText: {
    color: '#fff',
    fontSize: fontSize.medium,
    fontWeight: '600',
  },
  cardItem: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  cardType: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
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
  installmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  installmentCard: {
    width: '30%',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  installmentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  termText: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  termTextSelected: {
    color: colors.primary,
  },
  monthlyText: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  monthlyTextSelected: {
    color: colors.primary,
  },
  monthlyLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  interestText: {
    fontSize: fontSize.xsmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.medium,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotal: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: fontSize.large,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  confirmButton: {
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: fontSize.large,
    fontWeight: '700',
  },
});
