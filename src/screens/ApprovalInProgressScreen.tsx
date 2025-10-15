import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CheckCircle, AlertCircle, Phone, Mail, HelpCircle, RefreshCw } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';

interface ApprovalInProgressScreenProps {
  onCheckStatus?: () => void;
  onNeedHelp?: () => void;
}

interface ApprovalStatus {
  application_ref: string;
  center_name: string;
  status: string;
  stage: string;
  created_at: string;
  estimated_completion?: string;
}

const ApprovalInProgressScreen: React.FC<ApprovalInProgressScreenProps> = ({
  onCheckStatus,
  onNeedHelp,
}) => {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load approval status from backend
  useEffect(() => {
    loadApprovalStatus();
  }, []);

  const loadApprovalStatus = async () => {
    try {
      setLoading(true);
      const response = await authService.checkRegistrationStatus();

      if (response.success && response.data) {
        // Calculate estimated completion (add 3-5 business days from creation)
        const createdDate = new Date(response.data.created_at || new Date());
        const estimatedDate = new Date(createdDate.getTime() + (5 * 24 * 60 * 60 * 1000)); // Add 5 days

        setApprovalStatus({
          application_ref: response.data.application_ref,
          center_name: response.data.center_name || 'Your Medical Center',
          status: response.data.status,
          stage: response.data.stage,
          created_at: response.data.created_at || new Date().toISOString(),
          estimated_completion: estimatedDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        });
      } else {
        Alert.alert('Error', 'Failed to load approval status');
      }
    } catch (error: any) {
      console.error('Load approval status error:', error);
      Alert.alert('Error', 'Failed to load approval status');
    } finally {
      setLoading(false);
    }
  };
  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const handleEmail = (email: string) => {
    const url = `mailto:${email}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open email app');
    });
  };

  const handleCheckStatus = async () => {
    setRefreshing(true);
    await loadApprovalStatus();
    setRefreshing(false);
    if (onCheckStatus) {
      onCheckStatus();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading approval status...</Text>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.white}
          translucent={false}
        />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Icon */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIconContainer}>
            <Clock size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* Title and Info */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Approval in Progress</Text>
          <Text style={styles.subtitle}>Average approval time: 3-5 business days</Text>
          
          <View style={styles.refContainer}>
            <Text style={styles.refLabel}>REF: {approvalStatus?.application_ref || 'Loading...'}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyText}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Completion Estimate */}
        <View style={styles.estimateContainer}>
          <Text style={styles.estimateLabel}>Estimated completion: 3-5 business days</Text>
          <Text style={styles.estimateDate}>Next update expected by 5:00 PM today (Sri Lanka Time)</Text>
        </View>

        {/* Process Steps */}
        <View style={styles.processContainer}>
          {/* Hospital Verification - Completed */}
          <View style={styles.processStep}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepIconCompleted}>
                <CheckCircle size={20} color={COLORS.success} />
              </View>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Hospital Verification</Text>
              <Text style={styles.stepSubtitle}>National Hospital Colombo</Text>
              <Text style={styles.stepDateCompleted}>Approved on 15 Jan 2024, 2:30 PM</Text>
              <TouchableOpacity style={styles.contactLink}>
                <Text style={styles.contactLinkText}>Contact Hospital Admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TransFleet Final Approval - In Progress */}
          <View style={styles.processStep}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepIconInProgress}>
                <AlertCircle size={20} color={COLORS.warning} />
              </View>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>TransFleet Final Approval</Text>
              <Text style={styles.stepSubtitleInProgress}>Pending Previous Steps</Text>
              
              <View style={styles.stepDetails}>
                <Text style={styles.stepDetailItem}>• System setup</Text>
                <Text style={styles.stepDetailItem}>• Feature configuration</Text>
                <Text style={styles.stepDetailItem}>• Payment setup</Text>
              </View>
              
              <Text style={styles.stepProgress}>In Progress - Estimated completion: {approvalStatus?.estimated_completion || 'TBD'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckStatus}
            activeOpacity={0.8}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <RefreshCw size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNeedHelp}
            activeOpacity={0.8}
          >
            <HelpCircle size={20} color={COLORS.textSecondary} />
            <Text style={styles.secondaryButtonText}>Need Help?</Text>
          </TouchableOpacity>
        </View>

        {/* Questions Section */}
        <View style={styles.questionsContainer}>
          <Text style={styles.questionsTitle}>Questions about your application?</Text>
          
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleCall('+94 77 788 4049')}
            activeOpacity={0.8}
          >
            <Phone size={20} color={COLORS.primary} />
            <Text style={styles.contactButtonText}>+94 77 788 4049</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleEmail('transfleet.primecare@gmail.com')}
            activeOpacity={0.8}
          >
            <Mail size={20} color={COLORS.primary} />
            <Text style={styles.contactButtonText}>transfleet.primecare@gmail.com</Text>
          </TouchableOpacity>

          <View style={styles.officeHours}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.officeHoursText}>
              Mon-Fri 8:00 AM - 6:00 PM (Sri Lanka Time)
            </Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  refContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  refLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  copyButton: {
    padding: SPACING.xs,
  },
  copyText: {
    fontSize: 16,
  },
  estimateContainer: {
    backgroundColor: COLORS.primaryUltraLight,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  estimateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  estimateDate: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  processContainer: {
    marginBottom: SPACING.xl,
  },
  processStep: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  stepIconCompleted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconInProgress: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.success,
    marginTop: SPACING.sm,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  stepSubtitleInProgress: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  stepDateCompleted: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  contactLink: {
    marginTop: SPACING.xs,
  },
  contactLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  stepDetails: {
    marginVertical: SPACING.sm,
  },
  stepDetailItem: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  stepProgress: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  questionsContainer: {
    marginBottom: SPACING.massive,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: SPACING.md,
  },
  officeHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  officeHoursText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default ApprovalInProgressScreen;