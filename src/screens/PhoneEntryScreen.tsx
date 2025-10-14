import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft, Shield, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

interface PhoneEntryScreenProps {
  onNext: (phoneNumber: string, otpId: string) => void;
  onBack: () => void;
  onLoginSuccess: () => void;
}

const PhoneEntryScreen: React.FC<PhoneEntryScreenProps> = ({ 
  onNext, 
  onBack, 
  onLoginSuccess 
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Validate Sri Lankan phone number format
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      Alert.alert('Error', 'Please enter a valid Sri Lankan phone number (9 digits)');
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = '+94' + cleanPhone;
      const response = await authService.sendOTP(fullPhoneNumber);

      if (response.success && response.data) {
        setIsLoading(false);
        onNext(fullPhoneNumber, response.data.otp_id);
      } else {
        setIsLoading(false);
        Alert.alert('Error', response.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
    }
  };

  const handleBypassLogin = async () => {
    if (__DEV__) {
      setIsLoading(true);
      try {
        const response = await authService.bypassLogin();

        if (response.success && response.data) {
          setAuth({
            user: response.data.user,
            token: response.data.access_token,
            refreshToken: response.data.refresh_token,
            centerInfo: response.data.center_info,
            features: response.data.features,
          });
          onLoginSuccess();
        } else {
          Alert.alert('Error', response.message || 'Bypass login failed');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Bypass login failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 9 digits
    const limited = cleaned.slice(0, 9);
    
    // Format as XXX XXX XXXX
    if (limited.length >= 6) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    } else if (limited.length >= 3) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    }
    return limited;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const isValidPhone = phoneNumber.replace(/\s/g, '').length === 9;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.white}
          translucent={false}
        />

        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Enter Phone Number</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Shield size={16} color={COLORS.textSecondary} />
          <Text style={styles.securityText}>Secure verification</Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.countryCode}>
              <Text style={styles.flagText}>🇱🇰</Text>
              <Text style={styles.countryCodeText}>+94</Text>
            </View>
            
            <TextInput
              style={styles.phoneInput}
              placeholder="77 123 4567"
              placeholderTextColor={COLORS.textTertiary}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              maxLength={11} // Formatted length: XXX XXX XXXX
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          We'll send you a 6-digit verification code
        </Text>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!isValidPhone || isLoading) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!isValidPhone || isLoading}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            (!isValidPhone || isLoading) && styles.continueButtonTextDisabled
          ]}>
            {isLoading ? 'Sending...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {/* Development Bypass Button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.bypassButton}
            onPress={handleBypassLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.bypassButtonText}>
              Dev: Bypass Login
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32, // Same width as back button
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
  },
  securityText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLORS.gray300,
    marginRight: SPACING.md,
  },
  flagText: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    paddingVertical: 0, // Remove default padding
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.massive,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  continueButtonTextDisabled: {
    color: COLORS.gray500,
  },
  bypassButton: {
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  bypassButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});

export default PhoneEntryScreen;