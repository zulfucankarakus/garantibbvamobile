import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import api from '../config/api';

export default function VideoVisionAssistantScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastResponse, setLastResponse] = useState(null);
  
  const cameraRef = useRef(null);
  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animasyonu
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
  };

  // Kamera izni
  if (!permission) {
    return (
      <View style={styles.container}>
        <Header title="Sesli Asistan" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Header title="Sesli Asistan" onBack={() => navigation.goBack()} />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            Görsel tarama için kamera iznine ihtiyacımız var.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Ses kaydı başlat
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('İzin Gerekli', 'Mikrofon iznine ihtiyacımız var');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setStatusMessage('🎤 Dinliyorum...');
      startPulseAnimation();
    } catch (error) {
      console.error('Recording start error:', error);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  // Ses kaydı durdur ve akıllı işle
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      stopPulseAnimation();
      setStatusMessage('⏳ İşleniyor...');

      await recordingRef.current.stopAndUnloadAsync();
      const audioUri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!audioUri) {
        Alert.alert('Hata', 'Ses kaydedilemedi');
        setStatusMessage('');
        return;
      }

      setIsProcessing(true);

      // 1. Ses tanıma (Speech-to-Text)
      setStatusMessage('🗣️ Ses tanınıyor...');
      
      const audioFormData = new FormData();
      audioFormData.append('audio_file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });

      const speechResponse = await api.post('/vision/speech-to-text', audioFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!speechResponse.data.success) {
        throw new Error('Ses tanınamadı');
      }

      const transcribedText = speechResponse.data.text;
      console.log('📝 Transcribed:', transcribedText);
      
      setLastResponse({
        type: 'user',
        text: transcribedText
      });

      // 2. Akıllı sorgu analizi - Görsel gerekli mi?
      setStatusMessage('🧠 Analiz ediliyor...');
      
      const parseResponse = await api.post('/vision/parse-query', {
        query: transcribedText
      });

      console.log('🔍 Parse result:', parseResponse.data);

      if (parseResponse.data.success) {
        if (parseResponse.data.needs_visual) {
          // GÖRSEL TARAMA GEREKLİ
          setStatusMessage('📷 Görsel taranıyor...');
          Speech.speak('Ürünü tarıyorum', { language: 'tr-TR' });
          
          await performVisualScan(transcribedText);
        } else {
          // ÜRÜN ADI TESPİT EDİLDİ - DİREKT GİT
          const productName = parseResponse.data.product_name;
          const category = parseResponse.data.category;
          
          setStatusMessage(`✅ ${productName} bulundu!`);
          Speech.speak(`${productName} için fiyatları getiriyorum`, { language: 'tr-TR' });
          
          setLastResponse({
            type: 'ai',
            text: `✅ ${productName} tespit edildi.\nFiyat karşılaştırması başlatılıyor...`
          });

          // 1 saniye bekle ve yönlendir
          setTimeout(() => {
            navigation.navigate('ProductComparison', {
              productName: productName,
              productCategory: category,
              visionData: null
            });
            setStatusMessage('');
            setIsProcessing(false);
          }, 1000);
          
          return;
        }
      } else {
        // Parse başarısız - görsel tarama yap
        setStatusMessage('📷 Görsel taranıyor...');
        await performVisualScan(transcribedText);
      }

    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Hata', error.message || 'İşlem sırasında bir hata oluştu');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Görsel tarama yap
  const performVisualScan = async (userQuery) => {
    if (!cameraRef.current) {
      Alert.alert('Hata', 'Kamera kullanılamıyor');
      setStatusMessage('');
      return;
    }

    try {
      // Fotoğraf çek
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      setStatusMessage('🔍 Ürün tanımlanıyor...');

      // Vision API'ye gönder
      const analyzeResponse = await api.post('/vision/analyze', {
        image_base64: photo.base64
      });

      if (analyzeResponse.data.success) {
        const objectInfo = analyzeResponse.data.data?.object_info || {};
        const productName = objectInfo.object_name || 'Bilinmeyen Ürün';
        const category = objectInfo.category || 'other';
        const confidence = objectInfo.confidence || 0;

        console.log('👁️ Vision result:', productName, category, confidence);

        if (confidence > 0.3) {
          setStatusMessage(`✅ ${productName} bulundu!`);
          Speech.speak(`${productName} tespit edildi`, { language: 'tr-TR' });

          setLastResponse({
            type: 'ai',
            text: `✅ ${productName} tespit edildi.\nFiyat karşılaştırması başlatılıyor...`
          });

          // Yönlendir
          setTimeout(() => {
            navigation.navigate('ProductComparison', {
              productName: productName,
              productCategory: category,
              visionData: analyzeResponse.data.data
            });
            setStatusMessage('');
          }, 1000);
        } else {
          // Düşük güven - kullanıcıya sor
          Speech.speak('Ürünü net göremedim', { language: 'tr-TR' });
          promptManualEntry();
        }
      } else {
        Speech.speak('Ürün tespit edilemedi', { language: 'tr-TR' });
        promptManualEntry();
      }

    } catch (error) {
      console.error('Visual scan error:', error);
      promptManualEntry();
    }
  };

  // Manuel ürün girişi
  const promptManualEntry = () => {
    setStatusMessage('');
    setIsProcessing(false);
    
    Alert.prompt(
      'Ürün Adı',
      'Almak istediğiniz ürünün adını girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ara',
          onPress: (productName) => {
            if (productName && productName.trim()) {
              selectCategory(productName.trim());
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  // Kategori seç
  const selectCategory = (productName) => {
    Alert.alert(
      'Kategori Seçin',
      'Ürün hangi kategoride?',
      [
        { text: 'Araç', onPress: () => goToComparison(productName, 'vehicle') },
        { text: 'Elektronik', onPress: () => goToComparison(productName, 'electronics') },
        { text: 'Ev Eşyası', onPress: () => goToComparison(productName, 'home') },
        { text: 'Diğer', onPress: () => goToComparison(productName, 'other') }
      ]
    );
  };

  // Karşılaştırma ekranına git
  const goToComparison = (productName, category) => {
    navigation.navigate('ProductComparison', {
      productName: productName,
      productCategory: category,
      visionData: null
    });
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Sesli Asistan" 
        subtitle="Konuşarak sorgula"
        onBack={() => navigation.goBack()} 
      />

      {/* Kamera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Durum Mesajı */}
          {statusMessage ? (
            <View style={styles.statusOverlay}>
              <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
                style={styles.statusBox}
              >
                {isProcessing && <ActivityIndicator size="small" color="#fff" style={styles.statusSpinner} />}
                <Text style={styles.statusText}>{statusMessage}</Text>
              </LinearGradient>
            </View>
          ) : null}

          {/* Son Yanıt */}
          {lastResponse && !statusMessage && (
            <View style={styles.responseOverlay}>
              <View style={[
                styles.responseBubble,
                lastResponse.type === 'user' ? styles.userBubble : styles.aiBubble
              ]}>
                <Text style={styles.responseText}>{lastResponse.text}</Text>
              </View>
            </View>
          )}

          {/* Yardım Metni */}
          {!isRecording && !isProcessing && !statusMessage && (
            <View style={styles.helpOverlay}>
              <Text style={styles.helpText}>
                💡 "BMW X3 nasıl alabilirim?" gibi sorular sorun{'\n'}
                veya ürünü kameraya gösterin
              </Text>
            </View>
          )}
        </CameraView>
      </View>

      {/* Alt Kontrol Alanı */}
      <View style={styles.bottomContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', '#000']}
          style={styles.controlsGradient}
        >
          {/* Mikrofon Butonu */}
          <View style={styles.microphoneContainer}>
            <Text style={styles.microphoneHint}>
              {isRecording ? '🎤 Konuşun...' : 'Basılı tutun ve konuşun'}
            </Text>
            
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.microphoneButton,
                  { transform: [{ scale: pulseAnim }] },
                  isProcessing && styles.microphoneDisabled
                ]}
              >
                <LinearGradient
                  colors={isRecording ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                  style={styles.microphoneGradient}
                >
                  <Ionicons 
                    name={isRecording ? "mic" : "mic-outline"} 
                    size={56} 
                    color="white" 
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>

            <Text style={styles.exampleText}>
              Örnek: "iPhone 15 fiyatı ne kadar?"
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  permissionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: 'white',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  statusSpinner: {
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  responseOverlay: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
  },
  responseBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
  },
  responseText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  helpOverlay: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  helpText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    lineHeight: 22,
  },
  bottomContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlsGradient: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  microphoneContainer: {
    alignItems: 'center',
  },
  microphoneHint: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  microphoneButton: {
    borderRadius: 70,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  microphoneDisabled: {
    opacity: 0.5,
  },
  microphoneGradient: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});
