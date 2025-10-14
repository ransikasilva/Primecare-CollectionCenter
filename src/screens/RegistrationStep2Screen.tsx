import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Building, Users } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';

interface RegistrationStep2ScreenProps {
  onNext: (centerType: 'dependent' | 'independent') => void;
  onBack: () => void;
}

type CenterType = 'dependent' | 'independent';

const RegistrationStep2Screen: React.FC<RegistrationStep2ScreenProps> = ({ 
  onNext, 
  onBack 
}) => {
  const [selectedType, setSelectedType] = useState<CenterType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onNext(selectedType);
    }
  };

  const centerTypes = [
    {
      type: 'dependent' as CenterType,
      title: 'Dependent Center',
      description: 'Always delivers to one contracted hospital (e.g., National Hospital Colombo)',
      example: 'Colombo National, Kandy General',
      icon: Building,
      badge: 'Most Common',
      badgeColor: COLORS.success,
    },
    {
      type: 'independent' as CenterType,
      title: 'Independent Center', 
      description: 'Choose different hospitals per delivery across Sri Lanka',
      example: 'Colombo, Kandy, Galle, Jaffna hospitals',
      icon: Users,
      badge: 'Flexible',
      badgeColor: COLORS.info,
    }
  ];

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
      <View style={styles.container}>
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
          <View style={styles.progressCircleComplete}>
            <Text style={styles.progressNumberComplete}>✓</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Details</Text>
        </View>

        <View style={styles.progressLineComplete} />

        <View style={styles.progressStep}>
          <View style={[styles.progressCircle, styles.progressCircleActive]}>
            <Text style={styles.progressNumberActive}>2</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>Type</Text>
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

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Select Center Type</Text>
        <Text style={styles.subtitle}>
          Choose how your center operates in Sri{'\n'}Lanka
        </Text>

        <View style={styles.optionsContainer}>
          {centerTypes.map((centerType) => {
            const Icon = centerType.icon;
            const isSelected = selectedType === centerType.type;
            
            return (
              <TouchableOpacity
                key={centerType.type}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected
                ]}
                onPress={() => setSelectedType(centerType.type)}
                activeOpacity={0.8}
              >
                {/* Badge */}
                <View style={[styles.badge, { backgroundColor: centerType.badgeColor }]}>
                  <Text style={styles.badgeText}>{centerType.badge}</Text>
                </View>

                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: centerType.badgeColor + '20' }]}>
                  <Icon size={32} color={centerType.badgeColor} />
                </View>

                {/* Content */}
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{centerType.title}</Text>
                  <Text style={styles.optionDescription}>{centerType.description}</Text>
                  <Text style={styles.optionExample}>{centerType.example}</Text>
                </View>

                {/* Radio Button */}
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected
                  ]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Compliance Note */}
        <View style={styles.complianceNote}>
          <Text style={styles.complianceText}>
            Must comply with Sri Lankan Health Ministry guidelines
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedType && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedType}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedType && styles.continueButtonTextDisabled
          ]}>
            Continue to Hospital Selection →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  progressCircleComplete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
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
  progressNumberComplete: {
    fontSize: 16,
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
  progressLabelComplete: {
    color: COLORS.success,
    fontWeight: '500',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.gray300,
    marginHorizontal: SPACING.sm,
  },
  progressLineComplete: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.success,
    marginHorizontal: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'left',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: SPACING.xxxl,
  },
  optionsContainer: {
    marginBottom: SPACING.xl,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    position: 'relative',
    ...SHADOWS.sm,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  badge: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  optionContent: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  optionDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  optionExample: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  radioContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  complianceNote: {
    marginBottom: SPACING.xl,
  },
  complianceText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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

export default RegistrationStep2Screen;