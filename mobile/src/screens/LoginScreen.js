import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { validateTCKN } from '../utils/helpers';

export default function LoginScreen({ navigation }) {
  const [tcNo, setTcNo] = useState('');
  const [password, setPassword] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const passwordRefs = useRef([]);

  const validate = () => {
    const newErrors = {};

    if (!tcNo) {
      newErrors.tcNo = 'TC Kimlik No gerekli';
    } else if (tcNo.length !== 11) {
      newErrors.tcNo = 'TC Kimlik No 11 haneli olmalı';
    } else if (!validateTCKN(tcNo)) {
      newErrors.tcNo = 'Geçersiz TC Kimlik No';
    }

    const passwordStr = password.join('');
    if (passwordStr.length !== 6) {
      newErrors.password = '6 haneli şifre gerekli';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (text, index) => {
    // Sadece rakam kabul et
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    
    const newPassword = [...password];
    newPassword[index] = digit;
    setPassword(newPassword);

    // Sonraki kutuya geç
    if (digit && index < 5) {
      passwordRefs.current[index + 1]?.focus();
    }
  };

  const handlePasswordKeyPress = (e, index) => {
    // Backspace ile önceki kutuya geç
    if (e.nativeEvent.key === 'Backspace' && !password[index] && index > 0) {
      passwordRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const passwordStr = password.join('');
      console.log('🔐 Login attempt with TC:', tcNo);
      
      const result = await login({
        identifier: tcNo,
        password: passwordStr,
      });
      
      console.log('✅ Login successful:', result.user?.name);
      
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      
      let errorMessage = 'TC Kimlik No veya şifre hatalı';
      
      if (error.response?.status === 401) {
        errorMessage = 'TC Kimlik No veya şifre hatalı';
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert(
        'Giriş Başarısız',
        errorMessage,
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>Garanti BBVA</Text>
            </View>
            <Text style={styles.subtitle}>Mobil Bankacılık</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* TC Kimlik No */}
            <Input
              label="TC Kimlik No"
              placeholder="11 haneli TC Kimlik No"
              value={tcNo}
              onChangeText={setTcNo}
              keyboardType="number-pad"
              maxLength={11}
              error={errors.tcNo}
              autoCapitalize="none"
            />

            {/* TC Doğrulama Durumu */}
            {tcNo.length === 11 && (
              <View style={[
                styles.validationStatus,
                validateTCKN(tcNo) ? styles.validationSuccess : styles.validationError
              ]}>
                <Ionicons 
                  name={validateTCKN(tcNo) ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={validateTCKN(tcNo) ? colors.success : colors.error} 
                />
                <Text style={[
                  styles.validationText,
                  { color: validateTCKN(tcNo) ? colors.success : colors.error }
                ]}>
                  {validateTCKN(tcNo) ? 'Geçerli TC Kimlik No' : 'Geçersiz TC Kimlik No'}
                </Text>
              </View>
            )}

            {/* 6 Haneli Şifre */}
            <View style={styles.passwordSection}>
              <Text style={styles.label}>Şifre (6 Haneli)</Text>
              <View style={styles.passwordContainer}>
                {password.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => passwordRefs.current[index] = ref}
                    style={[
                      styles.passwordBox,
                      digit ? styles.passwordBoxFilled : null,
                      errors.password ? styles.passwordBoxError : null
                    ]}
                    value={digit ? '●' : ''}
                    onChangeText={(text) => handlePasswordChange(text, index)}
                    onKeyPress={(e) => handlePasswordKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry={false}
                    selectTextOnFocus
                  />
                ))}
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <Button
              title="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Hesap Oluştur"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
            />
          </View>

          {/* Test Info */}
          <View style={styles.testInfo}>
            <Text style={styles.testInfoTitle}>Test Kullanıcısı:</Text>
            <Text style={styles.testInfoText}>TC: 10000000146</Text>
            <Text style={styles.testInfoText}>Şifre: 123456</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  validationSuccess: {
    backgroundColor: colors.success + '15',
  },
  validationError: {
    backgroundColor: colors.error + '15',
  },
  validationText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  passwordSection: {
    marginBottom: spacing.md,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  passwordBox: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  passwordBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  passwordBoxError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  testInfo: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testInfoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  testInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
