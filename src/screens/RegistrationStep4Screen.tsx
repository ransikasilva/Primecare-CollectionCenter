import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Package2, Zap, Building2, Info } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';

interface RegistrationStep4ScreenProps {
  onNext: (selectedFeatures: SelectedFeatures) => void;
  onBack: () => void;
}

export interface SelectedFeatures {
  [key: string]: boolean;
}

interface BackendFeature {
  feature_id: string;
  feature_name: string;
  description: string;
  feature_type: 'core' | 'premium' | 'enterprise';
  requires_approval: boolean;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  details: string;
  icon: any;
  iconColor: string;
  iconBgColor: string;
  recommended?: boolean;
  requires_approval?: boolean;
  feature_type?: string;
}

const RegistrationStep4Screen: React.FC<RegistrationStep4ScreenProps> = ({
  onNext,
  onBack
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeatures>({});
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load features from backend
  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.getAllFeatures();

      if (response.success && response.data) {
        const backendFeatures = response.data.features as BackendFeature[];

        // Map backend features to UI features with icons
        const mappedFeatures = backendFeatures.map((feature): Feature => {
          // Map feature IDs to appropriate icons and colors
          const getFeatureUI = (featureId: string) => {
            switch (featureId) {
              case 'sample_type_quantity':
                return {
                  icon: Package2,
                  iconColor: COLORS.primary,
                  iconBgColor: COLORS.primaryUltraLight,
                  recommended: true,
                };
              case 'urgent_delivery':
                return {
                  icon: Zap,
                  iconColor: COLORS.warning,
                  iconBgColor: '#FFF3E0',
                  recommended: true,
                };
              case 'multi_hospital_delivery':
                return {
                  icon: Building2,
                  iconColor: COLORS.info,
                  iconBgColor: '#E3F2FD',
                };
              default:
                return {
                  icon: Package2,
                  iconColor: COLORS.textSecondary,
                  iconBgColor: COLORS.gray100,
                };
            }
          };

          const uiConfig = getFeatureUI(feature.feature_id);

          return {
            id: feature.feature_id,
            title: feature.feature_name,
            description: feature.description,
            details: feature.description, // Use description as details for now
            requires_approval: feature.requires_approval,
            feature_type: feature.feature_type,
            ...uiConfig,
          };
        });

        setFeatures(mappedFeatures);

        // Initialize selectedFeatures state
        const initialSelected: SelectedFeatures = {};
        mappedFeatures.forEach(feature => {
          initialSelected[feature.id] = false;
        });
        setSelectedFeatures(initialSelected);

      } else {
        setError(response.message || 'Failed to load features');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load features');
      console.error('Load features error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const handleContinue = () => {
    onNext(selectedFeatures);
  };

  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;

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
          <View style={styles.progressCircleComplete}>
            <Text style={styles.progressNumberComplete}>✓</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Type</Text>
        </View>

        <View style={styles.progressLineComplete} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircleComplete}>
            <Text style={styles.progressNumberComplete}>✓</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Hospitals</Text>
        </View>

        <View style={styles.progressLineComplete} />

        <View style={styles.progressStep}>
          <View style={[styles.progressCircle, styles.progressCircleActive]}>
            <Text style={styles.progressNumberActive}>4</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>Features</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Request Features</Text>
        <Text style={styles.subtitle}>
          Select additional features for your center{'\n'}(Optional - can be enabled later)
        </Text>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info size={16} color={COLORS.info} />
          <Text style={styles.infoText}>
            Features require approval from hospitals and TransFleet operations team
          </Text>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading available features...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadFeatures}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Features List */}
        {!loading && !error && (
          <View style={styles.featuresContainer}>
            {features.map((feature) => {
              const Icon = feature.icon;
              const isSelected = selectedFeatures[feature.id];

              return (
                <TouchableOpacity
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    isSelected && styles.featureCardSelected
                  ]}
                  onPress={() => handleFeatureToggle(feature.id)}
                  activeOpacity={0.8}
                >
                  {/* Recommended Badge */}
                  {feature.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}

                  {/* Icon */}
                  <View style={[styles.iconContainer, { backgroundColor: feature.iconBgColor }]}>
                    <Icon size={32} color={feature.iconColor} />
                  </View>

                  {/* Content */}
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                    {feature.requires_approval && (
                      <Text style={styles.approvalText}>⚠️ Requires approval</Text>
                    )}
                  </View>

                  {/* Checkbox */}
                  <View style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected
                    ]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {features.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No features available</Text>
                <Text style={styles.emptySubtext}>Please contact support if this seems incorrect</Text>
              </View>
            )}
          </View>
        )}

        {/* Selected Count */}
        {selectedCount > 0 && (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionText}>
              {selectedCount} feature{selectedCount > 1 ? 's' : ''} requested
            </Text>
          </View>
        )}

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Note: You can request additional features later from your profile settings
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Continue to Submit Registration →
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  progressCircleActive: {
    backgroundColor: COLORS.primary,
  },
  progressCircleComplete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  progressNumberActive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressNumberComplete: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressLabel: {
    fontSize: 10,
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
  progressLineComplete: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.success,
    marginHorizontal: SPACING.xs,
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
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.info,
    marginLeft: SPACING.sm,
    lineHeight: 16,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    position: 'relative',
    ...SHADOWS.sm,
  },
  featureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  recommendedBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
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
  featureContent: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  featureDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  selectionSummary: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  noteContainer: {
    marginBottom: SPACING.xl,
  },
  noteText: {
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
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  approvalText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.warning,
    marginTop: SPACING.xs,
  },
  checkboxContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});

export default RegistrationStep4Screen;