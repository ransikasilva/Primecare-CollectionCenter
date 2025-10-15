import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import {
  ArrowLeft,
  Trophy,
  CheckCircle,
  User,
  Building2,
  Share2,
  Plus,
  Clock,
  Eye,
  Navigation,
  MessageCircle,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import { orderService } from '../services/orderService';

interface DeliveryCompletedScreenProps {
  onBack: () => void;
  onCreateAnotherDelivery: () => void;
  onViewHistory: () => void;
  onTrackAnother: () => void;
  onContactSupport: () => void;
  deliveryId: string;
  activeCount?: number;
}

interface SampleItem {
  type: string;
  quantity: number;
  details?: string;
}

interface DeliveryData {
  deliveryId: string;
  hospitalName: string;
  hospitalDepartment: string;
  completedAt: string;
  totalTime: string;
  receivedBy: string;
  riderInfo: {
    name: string;
    vehicle: string;
    rating: number;
  };
  hospitalConfirmed: {
    staffName: string;
    position: string;
    confirmedAt: string;
  };
  samples: SampleItem[];
  hasSampleTypeFeature: boolean;
  deliveryChecks: {
    qrScanned: boolean;
    temperatureControlled: boolean;
    receivedByStaff: boolean;
  };
}

const DeliveryCompletedScreen: React.FC<DeliveryCompletedScreenProps> = ({
  onBack,
  onCreateAnotherDelivery,
  onViewHistory,
  onTrackAnother,
  onContactSupport,
  deliveryId,
  activeCount = 4,
}) => {
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load delivery data from backend
  const loadOrderDetails = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getOrderById(deliveryId);

      if (response.success && response.data?.order) {
        const order = response.data.order;

        // Calculate total delivery time from order creation to delivery completion
        const createdTime = new Date(order.created_at);
        const deliveredTime = new Date(order.timing?.delivered_at || order.updated_at);
        const totalTimeMs = deliveredTime.getTime() - createdTime.getTime();
        const totalTimeHours = Math.floor(totalTimeMs / (1000 * 60 * 60));
        const totalTimeMinutes = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const totalTimeFormatted = totalTimeHours > 0
          ? `${totalTimeHours} hour${totalTimeHours > 1 ? 's' : ''} ${totalTimeMinutes} minutes`
          : `${totalTimeMinutes} minutes`;

        // Format completion time
        const completedAt = new Date(order.timing?.delivered_at || order.updated_at);
        const isToday = completedAt.toDateString() === new Date().toDateString();
        const timeString = completedAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const completedAtFormatted = isToday
          ? `Today, ${timeString}`
          : `${completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeString}`;

        // Transform samples data
        const samples: SampleItem[] = [];
        if (order.sample_type && order.sample_quantity) {
          samples.push({
            type: order.sample_type,
            quantity: order.sample_quantity,
            details: order.special_instructions || undefined
          });
        }

        // Hospital confirmation from status history
        const statusHistory = response.data.status_history || [];
        const deliveredStatus = statusHistory.find((s: any) => s.status === 'delivered');

        const transformedData: DeliveryData = {
          deliveryId: order.order_number,
          hospitalName: order.hospital_name || 'Hospital',
          hospitalDepartment: order.hospital_department || 'Reception',
          completedAt: completedAtFormatted,
          totalTime: totalTimeFormatted,
          receivedBy: 'hospital staff',
          riderInfo: {
            name: order.rider_info?.name || order.rider_name || 'Rider',
            vehicle: order.rider_info?.vehicle || `Vehicle ${order.rider_id?.slice(-4) || 'N/A'}`,
            rating: order.rider_info?.rating || 4.5,
          },
          hospitalConfirmed: {
            staffName: deliveredStatus?.updated_by || order.hospital_contact_person || 'Hospital Staff',
            position: 'Lab Technician',
            confirmedAt: timeString,
          },
          samples,
          hasSampleTypeFeature: Boolean(order.sample_type), // Check if order has sample type data
          deliveryChecks: {
            qrScanned: Boolean((order as any).qr_verification),
            temperatureControlled: Boolean((order as any).temperature_controlled),
            receivedByStaff: order.status === 'delivered',
          },
        };

        setDeliveryData(transformedData);
      }
    } catch (error) {
      console.error('Failed to load delivery details:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryId) {
      loadOrderDetails();
    }
  }, [deliveryId]);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact support:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Support', onPress: () => Linking.openURL('tel:+94777884049') },
        { text: 'WhatsApp', onPress: () => Linking.openURL('whatsapp://send?phone=94777884049') },
      ]
    );
  };

  const renderDeliveryInfo = () => {
    if (!deliveryData) return null;

    return (
      <View style={styles.deliveryInfoCard}>
        <View style={styles.deliveryHeader}>
          <Text style={styles.deliveryLabel}>Delivery ID</Text>
          <Text style={styles.deliveryId}>{deliveryData.deliveryId}</Text>
        </View>

        <View style={styles.hospitalInfo}>
          <Text style={styles.hospitalName}>{deliveryData.hospitalName}</Text>
          <Text style={styles.hospitalDepartment}>{deliveryData.hospitalDepartment}</Text>
        </View>

        <View style={styles.timeInfo}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Completed at</Text>
            <Text style={styles.timeValue}>{deliveryData.completedAt}</Text>
          </View>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Total time</Text>
            <Text style={styles.timeValueHighlight}>{deliveryData.totalTime}</Text>
          </View>
        </View>

        <View style={styles.receivedByContainer}>
          <CheckCircle size={16} color={COLORS.success} />
          <Text style={styles.receivedByText}>Received by {deliveryData.receivedBy}</Text>
        </View>
      </View>
    );
  };

  const renderSamplesDelivered = () => {
    if (!deliveryData || !deliveryData.hasSampleTypeFeature) {
      // If collection center doesn't have sample type feature, don't show this section
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Samples Delivered</Text>

        {deliveryData.samples.map((sample, index) => (
          <View key={index} style={styles.sampleItem}>
            <CheckCircle size={16} color={COLORS.success} />
            <Text style={styles.sampleText}>
              {sample.quantity} {sample.type}
              {sample.details && <Text style={styles.sampleDetails}> {sample.details}</Text>}
            </Text>
          </View>
        ))}

        {/* Additional delivery checks */}
        <View style={styles.additionalChecks}>
          {deliveryData.deliveryChecks.temperatureControlled && (
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.checkText}>All samples temperature controlled</Text>
            </View>
          )}

          {deliveryData.deliveryChecks.qrScanned && (
            <View style={styles.checkItem}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.checkText}>QR code scanned and verified</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRiderInfo = () => {
    if (!deliveryData) return null;

    return (
      <View style={styles.riderCard}>
        <View style={styles.riderHeader}>
          <View style={styles.riderAvatar}>
            <User size={20} color={COLORS.white} />
          </View>
          <View style={styles.riderDetails}>
            <Text style={styles.riderName}>{deliveryData.riderInfo.name}</Text>
            <Text style={styles.riderVehicle}>{deliveryData.riderInfo.vehicle}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHospitalConfirmation = () => {
    if (!deliveryData) return null;

    return (
      <View style={styles.confirmationCard}>
        <View style={styles.confirmationHeader}>
          <View style={styles.confirmationIcon}>
            <Building2 size={20} color={COLORS.primary} />
          </View>
          <View style={styles.confirmationDetails}>
            <Text style={styles.confirmationTitle}>Hospital confirmed receipt</Text>
            <Text style={styles.confirmationStaff}>
              {deliveryData.hospitalConfirmed.staffName} - {deliveryData.hospitalConfirmed.position}
            </Text>
            <Text style={styles.confirmationTime}>
              Confirmed at {deliveryData.hospitalConfirmed.confirmedAt}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={styles.primaryActionButton}
        onPress={onCreateAnotherDelivery}
      >
        <Plus size={16} color={COLORS.white} />
        <Text style={styles.primaryActionText}>Create Another Delivery</Text>
      </TouchableOpacity>

      <View style={styles.secondaryActions}>
        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={onViewHistory}
        >
          <Clock size={16} color={COLORS.textPrimary} />
          <Text style={styles.secondaryActionText}>View History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={onTrackAnother}
        >
          <Navigation size={16} color={COLORS.textPrimary} />
          <Text style={styles.secondaryActionText}>Track Another</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.supportButton}
        onPress={handleContactSupport}
      >
        <MessageCircle size={16} color={COLORS.primary} />
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Active ({activeCount})</Text>
        </View>

        <TouchableOpacity style={styles.shareButton}>
          <Share2 size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Trophy size={32} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>Delivery Completed!</Text>
          <Text style={styles.successSubtitle}>Your samples were delivered successfully</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading delivery details...</Text>
          </View>
        ) : deliveryData ? (
          <>
            {/* Delivery Information */}
            {renderDeliveryInfo()}

            {/* Samples Delivered */}
            {renderSamplesDelivered()}

            {/* Rider Information */}
            {renderRiderInfo()}

            {/* Hospital Confirmation */}
            {renderHospitalConfirmation()}

            {/* Action Buttons */}
            {renderActionButtons()}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load delivery details</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  deliveryInfoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    ...SHADOWS.card,
  },
  deliveryHeader: {
    marginBottom: SPACING.md,
  },
  deliveryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  hospitalInfo: {
    marginBottom: SPACING.md,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hospitalDepartment: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  timeValueHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  receivedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  receivedByText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  sampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sampleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  sampleDetails: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  additionalChecks: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  checkText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  riderCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  riderVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  confirmationCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  confirmationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationDetails: {
    flex: 1,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  confirmationStaff: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  confirmationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButtonsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.massive,
    gap: SPACING.lg,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
});

export default DeliveryCompletedScreen;