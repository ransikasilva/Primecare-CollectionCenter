import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Building2, User, Mail, CheckCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import LocationInput from '../components/LocationInput';
import { LocationCoordinates } from '../services/locationService';

interface RegistrationStep1ScreenProps {
  onNext: (formData: RegistrationStep1Data) => void;
  onBack: () => void;
}

export interface RegistrationStep1Data {
  center_name: string;
  center_type: 'laboratory' | 'clinic' | 'diagnostic_center' | 'hospital_lab';
  address: string;
  contact_person: string;
  email: string;
  phone: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  city?: string;
  province?: string;
  postal_code?: string;
  license_number?: string;
  landline?: string;
  contact_person_phone?: string;
  emergency_contact?: string;
}

const RegistrationStep1Screen: React.FC<RegistrationStep1ScreenProps> = ({ 
  onNext, 
  onBack 
}) => {
  const [formData, setFormData] = useState<RegistrationStep1Data>({
    center_name: '',
    center_type: 'laboratory',
    address: '',
    contact_person: '',
    email: '',
    phone: '',
    license_number: '',
    coordinates_lat: undefined,
    coordinates_lng: undefined,
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.center_name.trim()) {
      newErrors.center_name = 'Medical center name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Complete address is required';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Please enter a valid full name';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.license_number?.trim()) {
      newErrors.license_number = 'License number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      onNext(formData);
    }
  };

  const updateFormData = (field: keyof RegistrationStep1Data, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle location selection from LocationInput
  const handleLocationSelect = (address: string, coordinates?: LocationCoordinates) => {
    setFormData(prev => ({
      ...prev,
      address,
      coordinates_lat: coordinates?.lat,
      coordinates_lng: coordinates?.lng,
    }));

    // Clear address error
    if (errors.address) {
      setErrors(prev => ({ ...prev, address: '' }));
    }
  };

  const isFormValid = () => {
    return formData.center_name.trim() &&
           formData.address.trim() &&
           formData.contact_person.trim() &&
           formData.email.trim() &&
           validateEmail(formData.email) &&
           formData.license_number?.trim();
  };

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
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
        
        <Text style={styles.headerTitle}>Registration</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressCircle, styles.progressCircleActive]}>
            <Text style={styles.progressNumberActive}>1</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>Details</Text>
        </View>

        <View style={styles.progressLine} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNumber}>2</Text>
          </View>
          <Text style={styles.progressLabel}>Type</Text>
        </View>

        <View style={styles.progressLine} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNumber}>3</Text>
          </View>
          <Text style={styles.progressLabel}>Hospitals</Text>
        </View>

        <View style={styles.progressLine} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNumber}>4</Text>
          </View>
          <Text style={styles.progressLabel}>Features</Text>
        </View>
      </View>

      {/* Form Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Medical Center Name */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            formData.center_name && styles.inputWrapperFilled,
            errors.center_name && styles.inputWrapperError
          ]}>
            <Building2 size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter medical center name"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.center_name}
              onChangeText={(value) => updateFormData('center_name', value)}
              returnKeyType="next"
            />
            {formData.center_name && (
              <CheckCircle size={20} color={COLORS.success} />
            )}
          </View>
        </View>

        {/* Address - Smart Location Input */}
        <View style={styles.inputContainer}>
          <LocationInput
            value={formData.address}
            onLocationSelect={handleLocationSelect}
            placeholder="Enter your complete address"
            error={errors.address}
          />
        </View>

        {/* Contact Person */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            formData.contact_person && styles.inputWrapperFilled,
            errors.contact_person && styles.inputWrapperError
          ]}>
            <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter full name"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.contact_person}
              onChangeText={(value) => updateFormData('contact_person', value)}
              returnKeyType="next"
            />
            {errors.contact_person && (
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconText}>!</Text>
              </View>
            )}
          </View>
          {errors.contact_person && (
            <Text style={styles.errorText}>{errors.contact_person}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            formData.email && styles.inputWrapperFilled,
            errors.email && styles.inputWrapperError
          ]}>
            <Mail size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        {/* License Number */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            formData.license_number && styles.inputWrapperFilled,
            errors.license_number && styles.inputWrapperError
          ]}>
            <Building2 size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter license number"
              placeholderTextColor={COLORS.textTertiary}
              value={formData.license_number}
              onChangeText={(value) => updateFormData('license_number', value)}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {formData.license_number && (
              <CheckCircle size={20} color={COLORS.success} />
            )}
          </View>
          {errors.license_number && (
            <Text style={styles.errorText}>{errors.license_number}</Text>
          )}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFormValid() && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !isFormValid() && styles.continueButtonTextDisabled
          ]}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  progressCircleActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressNumberActive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  progressLabelActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.gray300,
    marginHorizontal: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  inputWrapperFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.lg,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.massive,
    paddingTop: SPACING.lg,
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
});

export default RegistrationStep1Screen;