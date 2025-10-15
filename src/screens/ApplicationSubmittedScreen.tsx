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
  Clipboard,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Copy, Phone, Mail, Clock, Download, MessageCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface ApplicationSubmittedScreenProps {
  onTrackStatus: () => void;
  onDownloadReceipt?: () => void;
}

interface RegistrationStatus {
  application_ref: string;
  center_name: string;
  status: string;
  stage: string;
  created_at: string;
}

const ApplicationSubmittedScreen: React.FC<ApplicationSubmittedScreenProps> = ({
  onTrackStatus,
  onDownloadReceipt,
}) => {
  const [copiedRef, setCopiedRef] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Load registration status from backend
  useEffect(() => {
    loadRegistrationStatus();
  }, []);

  const loadRegistrationStatus = async () => {
    try {
      setLoading(true);
      const response = await authService.checkRegistrationStatus();

      if (response.success && response.data) {
        setRegistrationStatus({
          application_ref: response.data.application_ref,
          center_name: response.data.center_name || 'Your Medical Center',
          status: response.data.status,
          stage: response.data.stage,
          created_at: response.data.created_at || new Date().toISOString()
        });
      } else {
        Alert.alert('Error', 'Failed to load application status');
      }
    } catch (error: any) {
      console.error('Load registration status error:', error);
      Alert.alert('Error', 'Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReference = async () => {
    try {
      const refNumber = registrationStatus?.application_ref || 'PC-CC-DEFAULT';
      await Clipboard.setString(refNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy reference number');
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

  const handleWhatsApp = () => {
    Alert.alert('WhatsApp', 'WhatsApp support will be available soon');
  };

  const handleDownloadReceipt = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Application Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #4ECDC4;
              padding-bottom: 20px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #4ECDC4;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .ref-box {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin: 30px 0;
              font-size: 18px;
              font-weight: bold;
            }
            .section {
              margin: 30px 0;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #4ECDC4;
            }
            .info-row {
              display: flex;
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .label {
              font-weight: bold;
              width: 200px;
            }
            .value {
              flex: 1;
            }
            .steps {
              margin: 20px 0;
            }
            .step {
              padding: 15px;
              margin: 10px 0;
              background-color: #f9f9f9;
              border-left: 4px solid #4ECDC4;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">TransFleet</div>
            <div class="title">Collection Center Application Receipt</div>
            <p>Medical Sample Delivery Network</p>
          </div>

          <div class="ref-box">
            Reference Number: ${registrationStatus?.application_ref || 'N/A'}
          </div>

          <div class="section">
            <div class="section-title">Application Information</div>
            <div class="info-row">
              <div class="label">Center Name:</div>
              <div class="value">${registrationStatus?.center_name || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="label">Application Date:</div>
              <div class="value">${new Date(registrationStatus?.created_at || '').toLocaleDateString()}</div>
            </div>
            <div class="info-row">
              <div class="label">Status:</div>
              <div class="value">${registrationStatus?.status || 'Pending'}</div>
            </div>
            <div class="info-row">
              <div class="label">Current Stage:</div>
              <div class="value">${registrationStatus?.stage || 'Under Review'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Approval Process</div>
            <div class="steps">
              <div class="step">
                <strong>Step 1: Hospital Review</strong>
                <p>Your selected hospitals will verify your credentials (2-4 hours)</p>
              </div>
              <div class="step">
                <strong>Step 2: TransFleet Approval</strong>
                <p>Final system setup and feature configuration</p>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="info-row">
              <div class="label">Phone:</div>
              <div class="value">+94 77 788 4049</div>
            </div>
            <div class="info-row">
              <div class="label">Email:</div>
              <div class="value">transfleet.primecare@gmail.com</div>
            </div>
            <div class="info-row">
              <div class="label">Office Hours:</div>
              <div class="value">Mon-Fri 8:00 AM - 6:00 PM (Sri Lanka Time)</div>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated receipt generated by TransFleet Medical Sample Delivery System</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>&copy; ${new Date().getFullYear()} TransFleet. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Application Receipt',
          UTI: 'com.adobe.pdf',
        });
        Alert.alert('Success', 'Receipt has been generated successfully!');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Download receipt error:', error);
      Alert.alert('Error', 'Failed to generate receipt. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading application status...</Text>
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
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={64} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successSubtitle}>Your registration is being reviewed</Text>
        </View>

        {/* Reference Number */}
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>REF: {registrationStatus?.application_ref || 'Loading...'}</Text>
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={handleCopyReference}
            activeOpacity={0.7}
          >
            <Copy size={16} color={copiedRef ? COLORS.success : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Process Steps */}
        <View style={styles.processContainer}>
          {/* Hospital Review Step */}
          <View style={styles.processStep}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepNumberActive}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Hospital Review</Text>
              <Text style={styles.stepStatus}>In Progress</Text>
              <Text style={styles.stepDescription}>2-4 hours</Text>
              <Text style={styles.stepDetails}>Selected hospitals verify your credentials</Text>
            </View>
          </View>

          {/* TransFleet Approval Step */}
          <View style={styles.processStep}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberTextInactive}>2</Text>
              </View>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>TransFleet Approval</Text>
              <Text style={styles.stepStatusPending}>Pending</Text>
              <Text style={styles.stepDescription}>Previous Steps</Text>
              <Text style={styles.stepDetails}>Final system setup and feature configuration</Text>
            </View>
          </View>
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

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onTrackStatus}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Track Application Status →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDownloadReceipt}
            activeOpacity={0.8}
          >
            <Download size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Mail size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Check your email for confirmation</Text>
          </View>

          <View style={styles.infoItem}>
            <MessageCircle size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Get updates via WhatsApp</Text>
          </View>

          <Text style={styles.notificationText}>
            We'll notify you of updates via email and SMS
          </Text>
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xxxl,
  },
  referenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  copyButton: {
    padding: SPACING.xs,
  },
  processContainer: {
    marginBottom: SPACING.xxxl,
  },
  processStep: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  stepIconContainer: {
    marginRight: SPACING.lg,
    alignItems: 'center',
  },
  stepNumberActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  stepNumberTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
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
  stepStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  stepStatusPending: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  stepDetails: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  questionsContainer: {
    marginBottom: SPACING.xxxl,
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
  actionContainer: {
    marginBottom: SPACING.xl,
  },
  primaryButton: {
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
    borderColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  infoContainer: {
    marginBottom: SPACING.massive,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
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

export default ApplicationSubmittedScreen;