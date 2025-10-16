import React, { useState, useRef, useEffect } from 'react';
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

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

interface OTPVerificationScreenProps {
  phoneNumber: string;
  otpId: string;
  onNext: () => void;
  onBack: () => void;
  onResend: () => void;
  onLoginSuccess: () => void;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  phoneNumber,
  otpId,
  onNext,
  onBack,
  onResend,
  onLoginSuccess,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds countdown
  const [canResend, setCanResend] = useState(false);
  const [hasError, setHasError] = useState(false);

  const inputRefs = useRef<TextInput[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length > 6) {
      return phone.slice(0, 6) + ' *** ***' + phone.slice(-2);
    }
    return phone;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setHasError(false);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleVerify = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp.join('');

    if (codeToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      const response = await authService.verifyOTP(phoneNumber, codeToVerify, otpId);

      if (response.success && response.data) {
        // Check user status and determine next screen
        const user = response.data.user;
        const centerInfo = response.data.center_info;

        if (!user || !user.profile_complete) {
          // New user or incomplete profile - start registration
          onNext();
        } else if (centerInfo && centerInfo.status === 'approved') {
          // Approved center - go to dashboard
          setAuth({
            user: response.data.user,
            token: response.data.access_token,
            refreshToken: response.data.refresh_token,
            centerInfo: response.data.center_info,
            features: response.data.features,
          });
          onLoginSuccess();
        } else {
          // Registration complete but pending approval
          // Set auth so they can see approval status
          setAuth({
            user: response.data.user,
            token: response.data.access_token,
            refreshToken: response.data.refresh_token,
            centerInfo: response.data.center_info,
            features: response.data.features,
          });
          // Navigate to approval screen instead of dashboard
          // This will be handled by NavigationContainer
          onLoginSuccess();
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setHasError(true);
        Alert.alert('Error', response.message || 'Invalid verification code');
      }
    } catch (error: any) {
      setIsLoading(false);
      setHasError(true);
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    
    setTimeLeft(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setHasError(false);
    onResend();
    
    // Focus first input
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every(digit => digit !== '');

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
        
        <Text style={styles.headerTitle}>Verify Phone</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Info Text */}
        <Text style={styles.infoText}>
          Code sent to {maskPhoneNumber(phoneNumber)}
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                hasError && styles.otpInputError
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend code in {formatTime(timeLeft)}
            </Text>
          )}
        </View>

        {/* Error Message */}
        {hasError && (
          <Text style={styles.errorText}>
            Invalid code. Please try again.
          </Text>
        )}

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!isComplete || isLoading) && styles.verifyButtonDisabled
          ]}
          onPress={() => handleVerify()}
          disabled={!isComplete || isLoading}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.verifyButtonText,
            (!isComplete || isLoading) && styles.verifyButtonTextDisabled
          ]}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>
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
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  otpInputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    ...SHADOWS.sm,
  },
  verifyButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  verifyButtonTextDisabled: {
    color: COLORS.gray500,
  },
});

export default OTPVerificationScreen;