import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import { validateTCKN, validateEmail, validatePhone } from '../utils/helpers';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    tcNo: '',
    email: '',
    phone: '',
  });
  const [password, setPassword] = useState(['', '', '', '', '', '']);
  const [confirmPassword, setConfirmPassword] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const passwordRefs = useRef([]);
  const confirmPasswordRefs = useRef([]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Ad Soyad gereklidir';
    }
    
    if (!formData.tcNo.trim()) {
      newErrors.tcNo = 'TC Kimlik No gereklidir';
    } else if (formData.tcNo.length !== 11) {
      newErrors.tcNo = 'TC Kimlik No 11 haneli olmalıdır';
    } else if (!validateTCKN(formData.tcNo)) {
      newErrors.tcNo = 'Geçersiz TC Kimlik No';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz (10 hane)';
    }
    
    const passwordStr = password.join('');
    if (passwordStr.length !== 6) {
      newErrors.password = '6 haneli şifre gerekli';
    }
    
    const confirmStr = confirmPassword.join('');
    if (confirmStr !== passwordStr) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (text, index, isConfirm = false) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    
    if (isConfirm) {
      const newPassword = [...confirmPassword];
      newPassword[index] = digit;
      setConfirmPassword(newPassword);
      
      if (digit && index < 5) {
        confirmPasswordRefs.current[index + 1]?.focus();
      }
    } else {
      const newPassword = [...password];
      newPassword[index] = digit;
      setPassword(newPassword);
      
      if (digit && index < 5) {
        passwordRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePasswordKeyPress = (e, index, isConfirm = false) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (isConfirm && !confirmPassword[index] && index > 0) {
        confirmPasswordRefs.current[index - 1]?.focus();
      } else if (!isConfirm && !password[index] && index > 0) {
        passwordRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const passwordStr = password.join('');
      console.log('📝 Register attempt:', formData.name);
      
      const result = await register({
        name: formData.name,
        tc_no: formData.tcNo,
        email: formData.email,
        phone: formData.phone,
        password: passwordStr,
      });
      
      console.log('✅ Register successful:', result.user?.name);
      
      Alert.alert(
        'Başarılı! 🎉', 
        'Hesabınız başarıyla oluşturuldu. Ana sayfaya yönlendiriliyorsunuz.'
      );
    } catch (error) {
      console.error('❌ Register error:', error.response?.data || error.message);
      
      let errorMessage = 'Kayıt başarısız. Lütfen tekrar deneyin.';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (detail.includes('TC') || detail.includes('Kimlik')) {
          errorMessage = 'Geçersiz TC Kimlik Numarası';
        } else if (detail.includes('already exists') || detail.includes('zaten')) {
          errorMessage = 'Bu TC Kimlik Numarası zaten kayıtlı. Giriş yapmayı deneyin.';
        } else if (detail.includes('password') || detail.includes('Şifre')) {
          errorMessage = 'Şifre 6 haneli sayı olmalıdır';
        } else {
          errorMessage = detail;
        }
      } else if (error.message === 'Network Error') {
        errorMessage = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Kayıt Başarısız', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordBoxes = (values, refs, onChange, onKeyPress, error, isConfirm = false) => (
    <View>
      <View style={styles.passwordContainer}>
        {values.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => refs.current[index] = ref}
            style={[
              styles.passwordBox,
              digit ? styles.passwordBoxFilled : null,
              error ? styles.passwordBoxError : null
            ]}
            value={digit ? '●' : ''}
            onChangeText={(text) => onChange(text, index, isConfirm)}
            onKeyPress={(e) => onKeyPress(e, index, isConfirm)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Kayıt Ol" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Ad Soyad */}
          <Input
            label="Ad Soyad"
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
            error={errors.name}
            placeholder="Örn: Ahmet Yılmaz"
          />
          
          {/* TC Kimlik No */}
          <Input
            label="TC Kimlik No"
            value={formData.tcNo}
            onChangeText={(text) => setFormData({...formData, tcNo: text.replace(/[^0-9]/g, '')})}
            keyboardType="number-pad"
            maxLength={11}
            error={errors.tcNo}
            placeholder="11 haneli TC Kimlik No"
          />
          
          {/* TC Doğrulama Durumu */}
          {formData.tcNo.length === 11 && (
            <View style={[
              styles.validationStatus,
              validateTCKN(formData.tcNo) ? styles.validationSuccess : styles.validationError
            ]}>
              <Ionicons 
                name={validateTCKN(formData.tcNo) ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={validateTCKN(formData.tcNo) ? colors.success : colors.error} 
              />
              <Text style={[
                styles.validationText,
                { color: validateTCKN(formData.tcNo) ? colors.success : colors.error }
              ]}>
                {validateTCKN(formData.tcNo) ? 'Geçerli TC Kimlik No' : 'Geçersiz TC Kimlik No'}
              </Text>
            </View>
          )}
          
          {/* E-posta */}
          <Input
            label="E-posta"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            placeholder="ornek@email.com"
          />
          
          {/* Telefon */}
          <Input
            label="Telefon"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text.replace(/[^0-9]/g, '')})}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
            placeholder="5XX XXX XX XX"
          />
          
          {/* 6 Haneli Şifre */}
          <View style={styles.passwordSection}>
            <Text style={styles.label}>Şifre (6 Haneli Sayı)</Text>
            {renderPasswordBoxes(
              password, 
              passwordRefs, 
              handlePasswordChange, 
              handlePasswordKeyPress, 
              errors.password
            )}
          </View>
          
          {/* Şifre Tekrar */}
          <View style={styles.passwordSection}>
            <Text style={styles.label}>Şifre Tekrar</Text>
            {renderPasswordBoxes(
              confirmPassword, 
              confirmPasswordRefs, 
              handlePasswordChange, 
              handlePasswordKeyPress, 
              errors.confirmPassword,
              true
            )}
          </View>
          
          {/* Kayıt Butonu */}
          <Button
            title="Kayıt Ol"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
          />
          
          {/* Bilgi */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              TC Kimlik Numaranız doğrulanacaktır. Lütfen gerçek bilgilerinizi girin.
            </Text>
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
    paddingTop: 40 
  },
  content: { 
    flex: 1, 
    padding: spacing.lg 
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
    height: 50,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: fontSize.lg,
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
  registerButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 20,
  },
});
