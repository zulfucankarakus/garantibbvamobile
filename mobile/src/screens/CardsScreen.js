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
import { getCards } from '../services/cardService';

export default function CardsScreen({ navigation }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await getCards();
      setCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCards();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getCardTypeName = (type) => {
    return type === 'credit' ? 'Kredi Kartı' : 'Banka Kartı';
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  // Kart yoksa
  if (cards.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Kartlarım" onBack={() => navigation.goBack()} />
        
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyContent}>
            <View style={styles.emptyIcon}>
              <Ionicons name="card-outline" size={80} color={colors.textSecondary} />
            </View>
            
            <Text style={styles.emptyTitle}>Henüz Kartınız Yok</Text>
            <Text style={styles.emptyText}>
              İlk kartınızı oluşturarak alışverişlerinize başlayın
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateCard')}
            >
              <Text style={styles.createButtonText}>İlk Kartınızı Oluşturun</Text>
            </TouchableOpacity>
          </View>

          {/* Kart Türleri */}
          <View style={styles.cardTypesSection}>
            <Text style={styles.sectionTitle}>Kart Türü Seçin</Text>
            
            {/* Bonus Kredi Kartı */}
            <View style={styles.cardTypeCard}>
              <View style={styles.cardTypeHeader}>
                <Ionicons name="card-outline" size={24} color="#1E40AF" />
                <Text style={styles.cardTypeTitle}>Bonus Kredi Kartı</Text>
              </View>
              <Text style={styles.cardTypeDesc}>
                Taksitli alışveriş ve bonus puan kazanın
              </Text>
              <View style={styles.cardPreview} style={{ backgroundColor: '#1E40AF' }}>
                <Text style={styles.cardPreviewBank}>GARANTİ BBVA</Text>
                <Text style={styles.cardPreviewNumber}>•••• •••• •••• ••••</Text>
                <Text style={styles.cardPreviewName}>Bonus Kredi Kartı</Text>
              </View>
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>15.000 TL limit</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>Bonus puan</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>Taksit imkanı</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>Online alışveriş</Text>
                </View>
              </View>
            </View>

            {/* Bankamatik Kartı */}
            <View style={styles.cardTypeCard}>
              <View style={styles.cardTypeHeader}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <Text style={styles.cardTypeTitle}>Bankamatik Kartı</Text>
              </View>
              <Text style={styles.cardTypeDesc}>
                Hesabınızdan direkt harcama yapın
              </Text>
              <View style={styles.cardPreview} style={{ backgroundColor: colors.primary }}>
                <Text style={styles.cardPreviewBank}>GARANTİ BBVA</Text>
                <Text style={styles.cardPreviewNumber}>•••• •••• •••• ••••</Text>
                <Text style={styles.cardPreviewName}>Bankamatik Kartı</Text>
              </View>
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>ATM çekimi</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>POS alışverişi</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>Online ödeme</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.featureText}>Yurtdışı kullanım</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Kartınız onaylandıktan sonra adresinize kargo ile gönderilecektir (3-5 iş günü).
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Kartlar varsa
  return (
    <View style={styles.container}>
      <Header title="Kartlarım" onBack={() => navigation.goBack()} />
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateCard')}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={styles.addButtonText}>Yeni Kart Başvurusu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={styles.cardItem}
            onPress={() => navigation.navigate('CardDetail', { card })}
          >
            <View
              style={[
                styles.cardVisual,
                card.card_type === 'credit' ? styles.creditCardVisual : styles.debitCardVisual,
              ]}
            >
              <View style={styles.cardVisualHeader}>
                <Text style={styles.cardVisualBank}>GARANTİ BBVA</Text>
                <Ionicons
                  name={card.card_type === 'credit' ? 'card-outline' : 'card'}
                  size={32}
                  color="#fff"
                />
              </View>
              <View style={styles.cardVisualNumbers}>
                <Text style={styles.cardVisualNumber}>
                  •••• •••• •••• {card.card_no?.slice(-4) || '****'}
                </Text>
              </View>
              <View style={styles.cardVisualFooter}>
                <Text style={styles.cardVisualName}>{card.name}</Text>
                <View>
                  <Text style={styles.cardVisualLabel}>Son Kullanma</Text>
                  <Text style={styles.cardVisualExpiry}>{card.expiry_date || 'MM/YY'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.cardInfoRow}>
                <Text style={styles.cardInfoLabel}>Kart Türü</Text>
                <Text style={styles.cardInfoValue}>{getCardTypeName(card.card_type)}</Text>
              </View>

              {card.card_type === 'credit' ? (
                <>
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoLabel}>Kullanılabilir Limit</Text>
                    <Text style={[styles.cardInfoValue, styles.limitValue]}>
                      {formatAmount(card.available_limit || 0)} TL
                    </Text>
                  </View>
                  {card.balance > 0 && (
                    <View style={styles.cardInfoRow}>
                      <Text style={styles.cardInfoLabel}>Borç</Text>
                      <Text style={[styles.cardInfoValue, styles.debtValue]}>
                        {formatAmount(card.balance)} TL
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Bakiye</Text>
                  <Text style={styles.cardInfoValue}>
                    {formatAmount(card.balance || 0)} TL
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                <Text style={styles.cardActionsText}>Detaylar</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  emptyContainer: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  createButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  cardTypesSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardTypeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTypeTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  cardTypeDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardPreview: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardPreviewBank: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  cardPreviewNumber: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
  },
  cardPreviewName: {
    fontSize: fontSize.sm,
    color: '#fff',
  },
  features: {
    gap: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: '#92400E',
    textAlign: 'center',
  },
  headerActions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  cardItem: {
    marginBottom: spacing.lg,
  },
  cardVisual: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  creditCardVisual: {
    backgroundColor: '#1E40AF',
  },
  debitCardVisual: {
    backgroundColor: colors.primary,
  },
  cardVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardVisualBank: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  cardVisualNumbers: {
    paddingVertical: spacing.md,
  },
  cardVisualNumber: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
  },
  cardVisualFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardVisualName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  cardVisualLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  cardVisualExpiry: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  cardInfo: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardInfoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cardInfoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  limitValue: {
    color: colors.success,
  },
  debtValue: {
    color: colors.error,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  cardActionsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
