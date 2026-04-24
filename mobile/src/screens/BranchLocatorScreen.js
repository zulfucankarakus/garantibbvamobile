import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

const { width } = Dimensions.get('window');

// OpenStreetMap HTML oluşturucu
const generateOpenStreetMapHTML = (userLat, userLng, branchLat, branchLng, branchName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        .branch-marker {
          background-color: #00A19A;
          border: 3px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .user-marker {
          background-color: #4285F4;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #00A19A;
          color: white;
          font-weight: bold;
          border-radius: 8px;
        }
        .custom-popup .leaflet-popup-tip {
          background: #00A19A;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        });

        // OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        const branchLocation = [${branchLat}, ${branchLng}];
        const userLocation = [${userLat}, ${userLng}];

        // Şube marker'ı
        const branchIcon = L.divIcon({
          className: 'branch-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const branchMarker = L.marker(branchLocation, { icon: branchIcon })
          .addTo(map)
          .bindPopup('<b style="color: #00A19A;">${branchName}</b>', {
            className: 'custom-popup'
          });

        // Kullanıcı marker'ı
        const userIcon = L.divIcon({
          className: 'user-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker(userLocation, { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Konumunuz</b>');

        // Her iki noktayı gösterecek şekilde haritayı ayarla
        const bounds = L.latLngBounds([branchLocation, userLocation]);
        map.fitBounds(bounds, { padding: [30, 30] });

        // Şube popup'ını otomatik aç
        setTimeout(() => {
          branchMarker.openPopup();
        }, 500);
      </script>
    </body>
    </html>
  `;
};

export default function BranchLocatorScreen({ route, navigation }) {
  const { applicationId, amount, productName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestBranch, setNearestBranch] = useState(null);
  const [nearbyBranches, setNearbyBranches] = useState([]);
  const [distance, setDistance] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapHtml, setMapHtml] = useState('');

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      setLoading(true);
      
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Konum izni verilmedi. En yakın şubeyi bulmak için konum izni gereklidir.');
        // Default olarak İstanbul merkezi kullan
        const defaultLocation = { latitude: 41.0082, longitude: 28.9784 };
        setUserLocation(defaultLocation);
        await findNearestBranch(defaultLocation.latitude, defaultLocation.longitude);
        return;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(userLoc);
      await findNearestBranch(userLoc.latitude, userLoc.longitude);
      
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Konum alınamadı. Varsayılan konum kullanılıyor.');
      // Default olarak İstanbul merkezi kullan
      const defaultLocation = { latitude: 41.0082, longitude: 28.9784 };
      setUserLocation(defaultLocation);
      await findNearestBranch(defaultLocation.latitude, defaultLocation.longitude);
    } finally {
      setLoading(false);
    }
  };

  const findNearestBranch = async (userLat, userLng) => {
    try {
      // API'den en yakın şubeleri al
      const response = await api.get(`/branches/nearest?lat=${userLat}&lng=${userLng}&limit=5`);
      const branches = response.data.branches;
      
      if (branches && branches.length > 0) {
        const nearest = branches[0];
        setNearestBranch(nearest);
        setDistance(nearest.distance);
        setNearbyBranches(branches.slice(1)); // İlk şube hariç diğerleri
        
        // Harita HTML'i oluştur
        const html = generateOpenStreetMapHTML(
          userLat,
          userLng,
          nearest.lat,
          nearest.lng,
          nearest.name
        );
        setMapHtml(html);
      }
    } catch (error) {
      console.error('Branch fetch error:', error);
      // API hatası durumunda fallback
      setLocationError('Şube bilgileri alınamadı. Lütfen tekrar deneyin.');
    }
  };

  const openMaps = () => {
    if (!nearestBranch) return;
    
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `${scheme}?q=${nearestBranch.lat},${nearestBranch.lng}&z=16`,
      android: `${scheme}${nearestBranch.lat},${nearestBranch.lng}?q=${nearestBranch.lat},${nearestBranch.lng}(${encodeURIComponent(nearestBranch.name)})`,
    });

    Linking.openURL(url).catch(() => {
      // Google Maps web linkini aç
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${nearestBranch.lat},${nearestBranch.lng}`);
    });
  };

  const callBranch = () => {
    if (!nearestBranch) return;
    const phoneNumber = nearestBranch.phone.replace(/\s/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const selectBranch = (branch) => {
    setNearestBranch(branch);
    setDistance(branch.distance);
    
    if (userLocation) {
      const html = generateOpenStreetMapHTML(
        userLocation.latitude,
        userLocation.longitude,
        branch.lat,
        branch.lng,
        branch.name
      );
      setMapHtml(html);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Şube Bulucu" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Konumunuz alınıyor ve en yakın şubeler aranıyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="En Yakın Şube" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Başvuru Bilgisi */}
        {(applicationId || amount || productName) && (
          <View style={styles.applicationInfo}>
            <LinearGradient
              colors={['#00A19A', '#007A75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applicationGradient}
            >
              <Ionicons name="checkmark-circle" size={32} color="#fff" />
              <View style={styles.applicationTextContainer}>
                <Text style={styles.applicationTitle}>Başvurunuz Alındı!</Text>
                <Text style={styles.applicationSubtitle}>
                  {productName ? `${productName} için` : ''} {amount ? `${amount.toLocaleString('tr-TR')} TL` : 'Kredi'} başvurunuz değerlendirmeye alındı.
                </Text>
                {applicationId && (
                  <Text style={styles.applicationId}>Başvuru No: {applicationId}</Text>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Bilgilendirme */}
        <View style={styles.infoBox}>
          <Ionicons name="location" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Size en yakın Garanti BBVA şubesi gösteriliyor. Türkiye genelinde 200+ şube arasından size en yakını bulundu.
          </Text>
        </View>

        {/* Harita - WebView ile */}
        <View style={styles.mapContainer}>
          {mapHtml ? (
            <WebView
              style={styles.map}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mapLoadingText}>Harita yükleniyor...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.mapLoadingText}>Harita hazırlanıyor...</Text>
            </View>
          )}
          
          {/* Mesafe etiketi */}
          {distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.distanceText}>{distance} km</Text>
            </View>
          )}
        </View>

        {/* En Yakın Şube Bilgileri */}
        {nearestBranch && (
          <View style={styles.branchCard}>
            <View style={styles.branchHeader}>
              <View style={styles.branchIconContainer}>
                <Ionicons name="business" size={28} color={colors.primary} />
              </View>
              <View style={styles.branchTitleContainer}>
                <Text style={styles.branchName}>{nearestBranch.name}</Text>
                <Text style={styles.branchDistance}>{distance} km uzaklıkta • {nearestBranch.city}</Text>
              </View>
            </View>

            <View style={styles.branchDetails}>
              {/* Adres */}
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color={colors.textSecondary} />
                <Text style={styles.detailText}>{nearestBranch.address}</Text>
              </View>

              {/* Telefon */}
              <TouchableOpacity style={styles.detailRow} onPress={callBranch}>
                <Ionicons name="call" size={20} color={colors.primary} />
                <Text style={[styles.detailText, styles.linkText]}>{nearestBranch.phone}</Text>
              </TouchableOpacity>

              {/* Çalışma Saatleri */}
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color={colors.textSecondary} />
                <Text style={styles.detailText}>{nearestBranch.workingHours}</Text>
              </View>
            </View>

            {/* Aksiyon Butonları */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Yol Tarifi Al</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={callBranch}>
                <View style={styles.actionButtonOutline}>
                  <Ionicons name="call" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonTextOutline}>Şubeyi Ara</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Yakındaki Diğer Şubeler */}
        {nearbyBranches.length > 0 && (
          <View style={styles.nearbySection}>
            <Text style={styles.nearbySectionTitle}>Yakındaki Diğer Şubeler</Text>
            {nearbyBranches.map((branch) => (
              <TouchableOpacity 
                key={branch.id} 
                style={styles.nearbyBranchCard}
                onPress={() => selectBranch(branch)}
              >
                <View style={styles.nearbyBranchInfo}>
                  <Ionicons name="business-outline" size={24} color={colors.primary} />
                  <View style={styles.nearbyBranchText}>
                    <Text style={styles.nearbyBranchName}>{branch.name}</Text>
                    <Text style={styles.nearbyBranchAddress}>{branch.city}</Text>
                  </View>
                </View>
                <View style={styles.nearbyBranchDistance}>
                  <Text style={styles.nearbyDistanceText}>{branch.distance} km</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Gerekli Belgeler */}
        {applicationId && (
          <View style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>Şubeye Gelirken Yanınızda Bulunması Gerekenler</Text>
            
            <View style={styles.documentItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.documentText}>Kimlik belgesi (Nüfus cüzdanı veya ehliyet)</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.documentText}>Gelir belgesi (Son 3 aylık maaş bordrosu)</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.documentText}>İkametgah belgesi</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.documentText}>Başvuru numaranız: {applicationId}</Text>
            </View>
          </View>
        )}

        {/* Ana Sayfa Butonu */}
        <TouchableOpacity style={styles.homeButton} onPress={goHome}>
          <Ionicons name="home" size={20} color={colors.primary} />
          <Text style={styles.homeButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  applicationInfo: {
    margin: spacing.md,
  },
  applicationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  applicationTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  applicationTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  applicationSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  applicationId: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  mapContainer: {
    height: 280,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  distanceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  distanceText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  branchCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchTitleContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  branchName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  branchDistance: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  branchDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonTextOutline: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  nearbySection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  nearbySectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  nearbyBranchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  nearbyBranchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nearbyBranchText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nearbyBranchName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  nearbyBranchAddress: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nearbyBranchDistance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyDistanceText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  documentsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  documentsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  documentText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  homeButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
